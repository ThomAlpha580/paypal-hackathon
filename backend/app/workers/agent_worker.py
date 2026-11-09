from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException

from app.core.config import get_settings
from app.services.agent_redis import AgentRedis, GROUP, LeaseLost
from app.services.agent_runtime import run_agent
from app.services.agent_service import AgentService
from app.services.supabase_client import get_supabase_service_role_client

logger = logging.getLogger(__name__)


def utc_now():
    return datetime.now(timezone.utc).isoformat()


async def process_run(repo: AgentService, redis: AgentRedis, run: dict) -> None:
    settings = get_settings()
    run_id, user_id = str(run['id']), str(run['user_id'])
    token = str(uuid.uuid4())
    if not await redis.acquire(run_id, token):
        return
    claimed = await asyncio.to_thread(repo.claim, user_id, run_id, token)
    if not claimed:
        await redis.release(run_id, token)
        return
    content = ''
    steps = {}
    stop = asyncio.Event()

    async def lease_loop():
        try:
            while not stop.is_set():
                await asyncio.sleep(20)
                await redis.renew(run_id, token)
                await asyncio.to_thread(repo.heartbeat, user_id, run_id, token)
        except (asyncio.CancelledError, LeaseLost):
            return

    lease_task = asyncio.create_task(lease_loop())

    async def finalize(result):
        for step in steps.values():
            if step['status'] == 'running' and result['status'] in {'failed', 'cancelled'}:
                step['status'] = result['status']
                step['completed_at'] = utc_now()
        result['steps'] = list(steps.values())
        finished = await asyncio.to_thread(repo.finish, user_id, run_id, token, result)
        status = finished.get('status', result['status'])
        extra = {
            key: finished[key]
            for key in ('error_code', 'error_message')
            if finished.get(key)
        }
        await redis.publish(
            finished,
            token,
            status,
            result.get('content', content),
            steps=finished.get('steps', result['steps']),
            **extra,
        )
        return finished

    try:
        await redis.publish(claimed, token, 'running', content, steps=[])
        if await redis.cancelled(run_id):
            result = {'status': 'cancelled', 'content': content}
            await finalize(result)
            return
        prompt_rows = await asyncio.to_thread(
            lambda: repo.db.table('es_agent_messages').select('content')
            .eq('id', claimed['user_message_id']).eq('user_id', user_id).limit(1).execute().data or []
        )
        prompt = prompt_rows[0]['content'] if prompt_rows else ''
        last_publish = 0.0
        async with asyncio.timeout(settings.agent_run_timeout_seconds):
            async for agent_event in run_agent(user_id, str(claimed['conversation_id']), prompt):
                if agent_event['type'] == 'step':
                    step = agent_event['step']
                    previous = steps.get(step['id'], {})
                    steps[step['id']] = previous | step
                    await asyncio.to_thread(repo.save_steps, user_id, run_id, token, list(steps.values()))
                    if await redis.cancelled(run_id):
                        await finalize({'status': 'cancelled', 'content': content})
                        return
                    await redis.publish(
                        claimed, token, 'running', content, steps=list(steps.values())
                    )
                    continue
                if await redis.cancelled(run_id):
                    result = {'status': 'cancelled', 'content': content}
                    await finalize(result)
                    return
                if agent_event['type'] == 'content':
                    # Replace citation markers after the SDK finishes collecting annotations.
                    content = agent_event['content']
                else:
                    content += agent_event['delta']
                current = asyncio.get_running_loop().time()
                if current - last_publish >= settings.agent_snapshot_write_interval_ms / 1000:
                    await redis.publish(
                        claimed, token, 'running', content, steps=list(steps.values())
                    )
                    last_publish = current
        result = {'status': 'completed', 'content': content}
        await finalize(result)
    except LeaseLost:
        logger.warning('Agent run lease lost: %s', run_id)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.exception('Agent run failed: %s', run_id)
        error_message = str(exc)[:2000]
        error_code = type(exc).__name__
        if isinstance(exc, TimeoutError):
            error_code = 'run_timeout'
            error_message = f'Agent run exceeded {get_settings().agent_run_timeout_seconds} seconds'
        elif type(exc).__name__ == 'McpError' and 'Timed out while waiting for response' in error_message:
            error_code = 'mcp_timeout'
        for step in steps.values():
            if step['status'] == 'running':
                step['status'] = 'failed'
                step['completed_at'] = utc_now()
        result = {'status': 'failed', 'content': content, 'error_code': error_code, 'error_message': error_message}
        try:
            await finalize(result)
        except Exception:
            logger.exception('Failed to persist failed run: %s', run_id)
    finally:
        stop.set()
        lease_task.cancel()
        await asyncio.gather(lease_task, return_exceptions=True)
        await redis.release(run_id, token)


async def recovery_scan(repo: AgentService, redis: AgentRedis) -> None:
    settings = get_settings()
    after_id = None
    while True:
        runs = await asyncio.to_thread(repo.recoverable, after_id)
        if not runs:
            return
        for run in runs:
            # queued rows repair a lost enqueue.  A running row is recovered
            # only after its DB heartbeat is stale; a missing Redis lock alone
            # can be a transient Redis failure while the worker is progressing.
            if run['status'] == 'queued':
                await redis.enqueue(run)
            elif run['status'] == 'running':
                heartbeat_at = run.get('heartbeat_at')
                if heartbeat_at:
                    heartbeat = datetime.fromisoformat(str(heartbeat_at).replace('Z', '+00:00'))
                    if heartbeat.tzinfo is None:
                        heartbeat = heartbeat.replace(tzinfo=timezone.utc)
                    heartbeat_age = (datetime.now(timezone.utc) - heartbeat).total_seconds()
                else:
                    heartbeat_age = float('inf')
                lock_exists = await redis.client.exists(f"agent:run:{run['id']}:lock")
                if lock_exists or heartbeat_age < settings.agent_worker_heartbeat_timeout_seconds:
                    continue
                # A worker that died after claiming a run must not replay the
                # SDK session. Mark it terminal and let the client retry.
                await asyncio.to_thread(
                    lambda: repo.db.table('es_agent_runs').update({
                        'status': 'failed', 'error_code': 'worker_lost',
                        'error_message': 'Agent worker lease expired',
                        'completed_at': utc_now(), 'updated_at': utc_now(),
                    }).eq('id', run['id']).eq('status', 'running').execute()
                )
                await asyncio.to_thread(
                    lambda: repo.db.table('es_agent_conversations').update({
                        'active_run_id': None, 'updated_at': utc_now(),
                    }).eq('id', run['conversation_id']).eq('active_run_id', run['id']).execute()
                )
        if len(runs) < 100:
            return
        after_id = str(runs[-1]['id'])


async def handle_entries(repo, redis, entries):
    for entry_id, fields in entries:
        try:
            rows = await asyncio.to_thread(repo.get_run, fields['user_id'], fields['run_id'])
            await process_run(repo, redis, rows)
        except HTTPException as exc:
            if exc.status_code == 404:
                # The product row was deleted after enqueue; discard this
                # orphaned queue entry instead of retrying it forever.
                await redis.ack(entry_id)
                continue
            logger.exception('Agent job handling failed: entry=%s', entry_id)
            continue
        except Exception:
            # Leave the entry pending so the consumer group can reclaim it
            # after a transient DB/Redis failure instead of dropping the job.
            logger.exception('Agent job handling failed: entry=%s', entry_id)
            continue
        try:
            await redis.ack(entry_id)
        except Exception:
            logger.exception('Agent job acknowledgement failed: entry=%s', entry_id)


async def worker_loop() -> None:
    settings = get_settings()
    redis = AgentRedis(settings)
    repo = AgentService(get_supabase_service_role_client())
    await redis.ensure_group()
    consumer = f'worker-{uuid.uuid4()}'
    try:
        while True:
            await recovery_scan(repo, redis)
            pending = await redis.reclaim(consumer)
            if pending:
                await handle_entries(repo, redis, pending)
                continue
            records = await redis.client.xreadgroup(GROUP, consumer, {'agent:jobs': '>'}, count=1, block=5000)
            for _, entries in records:
                await handle_entries(repo, redis, entries)
    finally:
        await redis.close()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    asyncio.run(worker_loop())
