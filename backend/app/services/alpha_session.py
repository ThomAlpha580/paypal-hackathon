from __future__ import annotations

import json
from functools import lru_cache

from agents.extensions.memory import SQLAlchemySession
from agents.items import TResponseInputItem
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import get_settings


def _session_url() -> str:
    settings = get_settings()
    url = (
        settings.alpha_session_database_url
        or settings.alpha_database_url
        or settings.agent_session_database_url
    )
    if not url:
        raise RuntimeError("AGENT_SESSION_DATABASE_URL or ALPHA_DATABASE_URL is required")
    if url.startswith("postgresql+psycopg://"):
        return url.replace("postgresql+psycopg://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


@lru_cache(maxsize=1)
def get_alpha_session_engine() -> AsyncEngine:
    return create_async_engine(_session_url(), pool_pre_ping=True)


class AlphaPostgresSession(SQLAlchemySession):
    def __init__(self, session_id: str, *, engine: AsyncEngine | None = None):
        super().__init__(
            session_id,
            engine=engine or get_alpha_session_engine(),
            create_tables=False,
            sessions_table="ea_agent_sessions",
            messages_table="ea_agent_session_items",
            ensure_ascii=False,
        )

    async def get_items(self, limit: int | None = None) -> list[TResponseInputItem]:
        items = await super().get_items()
        settings = get_settings()
        starts = [i for i, item in enumerate(items) if item.get("role") == "user"]
        if len(starts) >= settings.alpha_context_max_user_turns:
            items = items[starts[-settings.alpha_context_max_user_turns] :]
        while len(json.dumps(items, ensure_ascii=False)) > settings.alpha_context_max_chars:
            next_turn = next(
                (i for i, item in enumerate(items) if i > 0 and item.get("role") == "user"),
                None,
            )
            if next_turn is None:
                raise ValueError("agent_context_too_large")
            items = items[next_turn:]
        return [] if limit == 0 else items


async def close_alpha_session_engine() -> None:
    if get_alpha_session_engine.cache_info().currsize:
        await get_alpha_session_engine().dispose()
        get_alpha_session_engine.cache_clear()
