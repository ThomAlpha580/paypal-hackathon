from __future__ import annotations

import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from redis.exceptions import RedisError
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.models.agent import (
    CreateRunRequest,
    DeleteConversationResponse,
    RenameConversationRequest,
    RunDetail,
    RunResponse,
)
from app.services.agent_redis import AgentRedis
from app.services.agent_service import AgentService, TERMINAL
from app.services.auth import AuthService

router = APIRouter(prefix='/agent', tags=['agent'])
logger = logging.getLogger(__name__)


def current_user_id(authorization: str | None = Header(default=None)) -> str:
    scheme, _, token = (authorization or '').partition(' ')
    if scheme.lower() != 'bearer' or not token.strip():
        raise HTTPException(401, 'Bearer token is required')
    return AuthService().current_user(token.strip()).id


def repository(user_id: str = Depends(current_user_id)) -> AgentService:
    return AgentService()


def event(name, data):
    return f'event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n'


@router.post('/runs', response_model=RunResponse, status_code=202)
async def create_run(payload: CreateRunRequest, user_id: str = Depends(current_user_id),
                     repo: AgentService = Depends(repository)):
    run = await run_in_threadpool(repo.create_run, user_id, payload)
    if run['status'] == 'queued':
        redis = AgentRedis(get_settings())
        try:
            # Await the enqueue; the DB recovery scan repairs a failed enqueue.
            await redis.enqueue(run)
        except RedisError:
            logger.warning('Agent enqueue deferred to recovery: run=%s', run['id'])
        finally:
            await redis.close()
    return {'run_id': run['id'], 'conversation_id': run['conversation_id'],
            'user_message_id': run['user_message_id'], 'status': run['status']}


@router.get('/runs/active', response_model=list[RunDetail])
def active_runs(user_id: str = Depends(current_user_id), repo: AgentService = Depends(repository)):
    return repo.active_runs(user_id)


@router.get('/runs/{run_id}', response_model=RunDetail)
def get_run(run_id: UUID, user_id: str = Depends(current_user_id), repo: AgentService = Depends(repository)):
    return repo.get_run(user_id, str(run_id))


@router.get('/conversations')
def conversations(limit: int = Query(20, ge=1, le=100), cursor: str | None = Query(None, max_length=512),
                  user_id: str = Depends(current_user_id), repo: AgentService = Depends(repository)):
    return repo.conversations(user_id, limit, cursor)


@router.patch('/conversations/{conversation_id}')
def rename_conversation(conversation_id: UUID, payload: RenameConversationRequest,
                        user_id: str = Depends(current_user_id),
                        repo: AgentService = Depends(repository)):
    return repo.rename_conversation(user_id, str(conversation_id), payload)


@router.delete('/conversations/{conversation_id}', response_model=DeleteConversationResponse)
def delete_conversation(conversation_id: UUID, user_id: str = Depends(current_user_id),
                        repo: AgentService = Depends(repository)):
    result = repo.delete_conversation(user_id, str(conversation_id))
    return {'conversation_id': result.get('id', str(conversation_id)), 'status': 'deleted'}


@router.get('/conversations/{conversation_id}/messages')
def messages(conversation_id: UUID, limit: int = Query(50, ge=1, le=200),
             cursor: str | None = Query(None, max_length=512),
             user_id: str = Depends(current_user_id), repo: AgentService = Depends(repository)):
    return repo.messages(user_id, str(conversation_id), limit, cursor)


@router.post('/runs/{run_id}/cancel')
async def cancel_run(run_id: UUID, user_id: str = Depends(current_user_id), repo: AgentService = Depends(repository)):
    run = await run_in_threadpool(repo.get_run, user_id, str(run_id))
    if run['status'] in TERMINAL:
        return {'run_id': str(run_id), 'status': run['status']}
    redis = AgentRedis(get_settings())
    try:
        await redis.cancel(str(run_id))
    except RedisError as exc:
        raise HTTPException(503, 'cancel_unavailable') from exc
    finally:
        await redis.close()
    return {'run_id': str(run_id), 'status': 'cancellation_requested'}


async def stream_events(repo, redis, user_id, run_id, snapshot, cursor):
    """Redis is a recoverable cache. The product DB is authoritative for terminal state."""
    try:
        if snapshot:
            yield event('snapshot', snapshot)
            if snapshot['status'] in TERMINAL:
                yield event(snapshot['status'], snapshot)
                return
        else:
            yield event('heartbeat', {'run_id': run_id})
        while True:
            try:
                records = await redis.events(run_id, cursor)
            except RedisError:
                # Headers are already sent. Tell the client to retry/poll instead of faking completion.
                run = await run_in_threadpool(repo.get_run, user_id, run_id)
                if run['status'] in TERMINAL:
                    final = await run_in_threadpool(repo.terminal_snapshot, run, (snapshot or {}).get('content', ''))
                    yield event('snapshot', final)
                    yield event(final['status'], final)
                else:
                    yield event('error', {'run_id': run_id, 'error_code': 'stream_unavailable', 'retryable': True})
                return
            for _, entries in records:
                for cursor, fields in entries:
                    snapshot = json.loads(fields['data'])
                    yield event('snapshot', snapshot)
                    if snapshot['status'] in TERMINAL:
                        yield event(snapshot['status'], snapshot)
                        return
            if not records:
                run = await run_in_threadpool(repo.get_run, user_id, run_id)
                if run['status'] in TERMINAL:
                    final = await run_in_threadpool(repo.terminal_snapshot, run, (snapshot or {}).get('content', ''))
                    yield event('snapshot', final)
                    yield event(final['status'], final)
                    return
                yield event('heartbeat', {'run_id': run_id})
    finally:
        await redis.close()


@router.get('/runs/{run_id}/events')
async def events(run_id: UUID, user_id: str = Depends(current_user_id), repo: AgentService = Depends(repository)):
    run_id = str(run_id)
    run = await run_in_threadpool(repo.get_run, user_id, run_id)
    redis = AgentRedis(get_settings())
    snapshot, cursor = None, '0-0'
    try:
        if run['status'] in TERMINAL:
            snapshot = await run_in_threadpool(repo.terminal_snapshot, run)
        else:
            try:
                snapshot, cursor = await redis.read_snapshot(run_id)
            except RedisError as exc:
                # A worker may have committed while Redis was failing.
                run = await run_in_threadpool(repo.get_run, user_id, run_id)
                if run['status'] not in TERMINAL:
                    raise HTTPException(503, 'stream_unavailable') from exc
                snapshot = await run_in_threadpool(repo.terminal_snapshot, run)
            if not snapshot and run['status'] == 'running':
                run = await run_in_threadpool(repo.get_run, user_id, run_id)
                if run['status'] in TERMINAL:
                    snapshot = await run_in_threadpool(repo.terminal_snapshot, run)
                else:
                    raise HTTPException(503, 'stream_unavailable')
    except BaseException:
        await redis.close()
        raise
    return StreamingResponse(stream_events(repo, redis, user_id, run_id, snapshot, cursor),
        media_type='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})
