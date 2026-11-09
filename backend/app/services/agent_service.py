from __future__ import annotations

import base64
import json
from datetime import datetime, timezone
from uuid import NAMESPACE_URL, UUID, uuid4, uuid5

from fastapi import HTTPException
from postgrest.exceptions import APIError

from app.models.agent import CreateRunRequest, RenameConversationRequest
from app.services.supabase_client import get_supabase_service_role_client

TERMINAL = {'completed', 'failed', 'cancelled'}


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def decode_cursor(cursor: str | None):
    if cursor is None:
        return None
    try:
        timestamp, row_id = json.loads(base64.urlsafe_b64decode(cursor.encode()))
        # Canonicalize before interpolation into the PostgREST filter grammar.
        date = datetime.fromisoformat(timestamp)
        if date.tzinfo is None:
            raise ValueError('timezone required')
        return date.isoformat(), str(UUID(row_id))
    except (ValueError, TypeError, UnicodeError) as exc:
        raise HTTPException(422, 'Invalid cursor') from exc


def page(query, limit: int, cursor: str | None, column: str, descending: bool) -> dict:
    key = decode_cursor(cursor)
    if key:
        date, row_id = key
        op = 'lt' if descending else 'gt'
        query = query.or_(f'{column}.{op}.{date},and({column}.eq.{date},id.{op}.{row_id})')
    rows = query.order(column, desc=descending).order('id', desc=descending).limit(limit + 1).execute().data or []
    more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = None
    if more:
        next_cursor = base64.urlsafe_b64encode(json.dumps([rows[-1][column], rows[-1]['id']]).encode()).decode()
    return {'items': rows, 'next_cursor': next_cursor}


class AgentService:
    """Synchronous PostgREST repository; async callers must use a thread pool."""

    def __init__(self, db=None):
        self.db = db if db is not None else get_supabase_service_role_client()

    def rpc(self, name, params):
        try:
            data = self.db.rpc(name, params).execute().data
            # PostgREST returns a scalar JSON value for a jsonb RPC, while
            # some client/server combinations wrap the same value in a
            # single-item array.  Keep the repository API stable for both.
            if isinstance(data, list) and len(data) == 1:
                return data[0]
            return data
        except APIError as exc:
            message = exc.message
            statuses = {'conversation_not_found': 404, 'run_not_found': 404,
                        'active_run_exists': 409, 'idempotency_conflict': 409,
                        'run_lease_lost': 409, 'invalid_input': 422}
            if message in statuses:
                raise HTTPException(statuses[message], message) from exc
            if message == 'daily_quota_exceeded':
                try:
                    detail = json.loads(exc.details or '{}')
                except (TypeError, ValueError):
                    detail = {}
                detail = {
                    'code': 'daily_quota_exceeded',
                    'feature': detail.get('feature', 'agent'),
                    'plan': detail.get('plan', 'free'),
                    'used': detail.get('used', 0),
                    'quota': detail.get('quota', 0),
                    'usage_date': detail.get('usage_date'),
                    'reset_at': detail.get('reset_at'),
                }
                raise HTTPException(
                    429,
                    detail=detail,
                    headers={'X-Quota-Reset-At': str(detail.get('reset_at') or '')},
                ) from exc
            raise

    def create_run(self, user_id: str, request: CreateRunRequest) -> dict:
        client_message_id = request.client_message_id or str(uuid4())
        # A retry of the first request has no conversation id yet.  Deriving a
        # stable candidate id prevents duplicate conversations before the RPC
        # performs its user/message scoped idempotency check.
        conversation_id = request.conversation_id or uuid5(
            NAMESPACE_URL, f'es:first:{user_id}:{client_message_id}'
        )
        return self.rpc('es_agent_create_run', {
            'p_user_id': user_id, 'p_conversation_id': str(conversation_id),
            'p_new': request.conversation_id is None,
            'p_client_message_id': client_message_id, 'p_content': request.content,
        })

    def get_run(self, user_id: str, run_id: str) -> dict:
        rows = self.db.table('es_agent_runs').select('*').eq('id', run_id).eq('user_id', user_id).limit(1).execute().data or []
        if not rows:
            raise HTTPException(404, 'run_not_found')
        return rows[0]

    def conversation(self, user_id, conversation_id):
        rows = self.db.table('es_agent_conversations').select('*').eq('id', conversation_id).eq('user_id', user_id).eq('status', 'active').limit(1).execute().data or []
        if not rows:
            raise HTTPException(404, 'conversation_not_found')
        return rows[0]

    def message(self, user_id, conversation_id, message_id):
        rows = self.db.table('es_agent_messages').select('*').eq('id', message_id).eq('conversation_id', conversation_id).eq('user_id', user_id).limit(1).execute().data or []
        if not rows:
            raise HTTPException(404, 'message_not_found')
        return rows[0]

    def active_runs(self, user_id):
        return self.db.table('es_agent_runs').select('*').eq('user_id', user_id).in_('status', ['queued', 'running']).order('created_at').order('id').execute().data or []

    def conversations(self, user_id, limit, cursor=None):
        query = self.db.table('es_agent_conversations').select('*').eq('user_id', user_id).eq('status', 'active')
        return page(query, limit, cursor, 'updated_at', True)

    def rename_conversation(self, user_id: str, conversation_id: str,
                            request: RenameConversationRequest | str) -> dict:
        title = request.title if isinstance(request, RenameConversationRequest) else request
        if not isinstance(title, str) or not 1 <= len(title.strip()) <= 80:
            raise HTTPException(422, 'invalid_input')
        return self.rpc('es_agent_rename_conversation', {
            'p_user_id': user_id,
            'p_conversation_id': conversation_id,
            'p_title': title.strip(),
        })

    def delete_conversation(self, user_id: str, conversation_id: str) -> dict:
        return self.rpc('es_agent_delete_conversation', {
            'p_user_id': user_id,
            'p_conversation_id': conversation_id,
        })

    def messages(self, user_id, conversation_id, limit, cursor=None):
        self.conversation(user_id, conversation_id)
        query = self.db.table('es_agent_messages').select('*').eq('user_id', user_id).eq('conversation_id', conversation_id)
        result = page(query, limit, cursor, 'created_at', False)
        for message in result['items']:
            message['steps'] = (message.get('metadata') or {}).get('steps', [])
        return result

    def recoverable(self, after_id=None):
        # Worker-only cross-user scan; all subsequent operations use row.user_id.
        query = self.db.table('es_agent_runs').select('*').in_('status', ['queued', 'running']).order('id').limit(100)
        if after_id:
            query = query.gt('id', after_id)
        return query.execute().data or []

    def claim(self, user_id, run_id, token):
        rows = self.db.table('es_agent_runs').update({
            'status': 'running', 'worker_token': token, 'started_at': now(),
            'heartbeat_at': now(), 'updated_at': now(),
        }).eq('id', run_id).eq('user_id', user_id).eq('status', 'queued').execute().data or []
        return rows[0] if rows else None

    def heartbeat(self, user_id, run_id, token):
        return bool(self.db.table('es_agent_runs').update({'heartbeat_at': now(), 'updated_at': now()}).eq('id', run_id).eq('user_id', user_id).eq('worker_token', token).eq('status', 'running').execute().data)

    def save_steps(self, user_id, run_id, token, steps):
        rows = self.db.table('es_agent_runs').update({
            'steps': steps, 'updated_at': now(),
        }).eq('id', run_id).eq('user_id', user_id).eq('worker_token', token).eq('status', 'running').execute().data
        if not rows:
            raise HTTPException(409, 'run_lease_lost')

    def finish(self, user_id, run_id, token, result):
        return self.rpc('es_agent_finish_run', {
            'p_user_id': user_id, 'p_run_id': run_id, 'p_worker_token': token,
            'p_status': result['status'], 'p_content': result.get('content', ''),
            'p_error_code': result.get('error_code'), 'p_error_message': result.get('error_message'),
            'p_input_tokens': result.get('input_tokens', 0), 'p_output_tokens': result.get('output_tokens', 0),
            'p_steps': result.get('steps', []),
        })

    def terminal_snapshot(self, run, partial=''):
        content = partial
        steps = run.get('steps') or []
        if run['status'] == 'completed':
            message = self.message(run['user_id'], run['conversation_id'], run['assistant_message_id'])
            content = message['content']
            steps = (message.get('metadata') or {}).get('steps', steps)
        if run['status'] in {'failed', 'cancelled'}:
            steps = [step | {'status': run['status'], 'completed_at': run.get('completed_at')}
                     if step.get('status') == 'running' else step for step in steps]
        return {key: run.get(key) for key in ('conversation_id', 'status', 'error_code', 'error_message', 'updated_at')} | {
            'run_id': run['id'], 'content': content, 'steps': steps,
        }
