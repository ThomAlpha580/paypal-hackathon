from __future__ import annotations

import json
from datetime import datetime, timezone

from redis.asyncio import Redis
from redis.exceptions import ResponseError

JOBS_STREAM = 'agent:jobs'
GROUP = 'agent-workers'
LEASE_SECONDS = 60

PUBLISH = '''
if redis.call('GET', KEYS[3]) ~= ARGV[4] then return false end
local id = redis.call('XADD', KEYS[2], 'MAXLEN', '~', 1000, '*', 'data', ARGV[1])
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
redis.call('EXPIRE', KEYS[2], ARGV[3])
return id
'''
READ = '''
local snapshot = redis.call('GET', KEYS[1])
local last = redis.call('XREVRANGE', KEYS[2], '+', '-', 'COUNT', 1)
local cursor = '0-0'
if #last > 0 then cursor = last[1][1] end
return {snapshot or '', cursor}
'''
ENQUEUE = '''
if redis.call('EXISTS', KEYS[2]) == 1 then return false end
local id = redis.call('XADD', KEYS[1], '*', 'run_id', ARGV[1], 'user_id', ARGV[2])
redis.call('SET', KEYS[2], id, 'EX', 30)
return id
'''
RENEW = '''
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('EXPIRE', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[2])
return 1
'''
RELEASE = '''
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
return redis.call('DEL', KEYS[1], KEYS[2])
'''
SAVE_RESULT = '''
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
return 1
'''


class LeaseLost(Exception):
    pass


def run_key(run_id, suffix):
    return f'agent:run:{run_id}:{suffix}'


def snapshot_payload(run_id, conversation_id, status, content, **extra):
    return {'run_id': run_id, 'conversation_id': conversation_id, 'status': status,
            'content': content, 'updated_at': datetime.now(timezone.utc).isoformat(), **extra}


class AgentRedis:
    def __init__(self, settings, client=None):
        self.settings = settings
        self.client = client if client is not None else Redis.from_url(
            settings.agent_redis_url, decode_responses=True, socket_connect_timeout=5,
            socket_timeout=20, health_check_interval=30,
        )

    async def close(self):
        await self.client.aclose()

    async def ensure_group(self):
        try:
            await self.client.xgroup_create(JOBS_STREAM, GROUP, id='0-0', mkstream=True)
        except ResponseError as exc:
            if 'BUSYGROUP' not in str(exc):
                raise

    async def enqueue(self, run):
        return await self.client.eval(ENQUEUE, 2, JOBS_STREAM, run_key(run['id'], 'dispatch'), run['id'], run['user_id'])

    async def acquire(self, run_id, token):
        return await self.client.set(run_key(run_id, 'lock'), token, nx=True, ex=LEASE_SECONDS)

    async def renew(self, run_id, token):
        ok = await self.client.eval(RENEW, 2, run_key(run_id, 'lock'), run_key(run_id, 'heartbeat'), token, LEASE_SECONDS)
        if not ok:
            raise LeaseLost()

    async def release(self, run_id, token):
        await self.client.eval(RELEASE, 2, run_key(run_id, 'lock'), run_key(run_id, 'heartbeat'), token)

    async def publish(self, run, token, status, content, **extra):
        data = snapshot_payload(run['id'], run['conversation_id'], status, content, **extra)
        ok = await self.client.eval(PUBLISH, 3, run_key(run['id'], 'snapshot'),
            run_key(run['id'], 'events'), run_key(run['id'], 'lock'),
            json.dumps(data, ensure_ascii=False), self.settings.agent_redis_snapshot_ttl_seconds,
            self.settings.agent_redis_stream_ttl_seconds, token)
        if not ok:
            raise LeaseLost()

    async def read_snapshot(self, run_id):
        snapshot, cursor = await self.client.eval(READ, 2, run_key(run_id, 'snapshot'), run_key(run_id, 'events'))
        return (json.loads(snapshot) if snapshot else None), cursor

    async def events(self, run_id, cursor, block=15000):
        return await self.client.xread({run_key(run_id, 'events'): cursor}, block=block, count=20)

    async def cancel(self, run_id):
        # Cover queued jobs as well as runs already executing.
        await self.client.set(run_key(run_id, 'cancel'), '1', ex=self.settings.agent_redis_snapshot_ttl_seconds)

    async def cancelled(self, run_id):
        return bool(await self.client.exists(run_key(run_id, 'cancel')))

    async def save_result(self, run_id, token, result):
        ok = await self.client.eval(SAVE_RESULT, 2, run_key(run_id, 'lock'), run_key(run_id, 'result'),
            token, json.dumps(result, ensure_ascii=False), self.settings.agent_redis_snapshot_ttl_seconds)
        if not ok:
            raise LeaseLost()

    async def result(self, run_id):
        data = await self.client.get(run_key(run_id, 'result'))
        return json.loads(data) if data else None

    async def ack(self, entry_id):
        async with self.client.pipeline(transaction=True) as pipe:
            pipe.xack(JOBS_STREAM, GROUP, entry_id)
            pipe.xdel(JOBS_STREAM, entry_id)
            await pipe.execute()

    async def reclaim(self, consumer, min_idle_ms=60000):
        result = await self.client.xautoclaim(
            JOBS_STREAM, GROUP, consumer, min_idle_ms, start_id='0-0', count=20
        )
        # Redis returns [next_start_id, messages, deleted_ids].
        return result[1] if result else []
