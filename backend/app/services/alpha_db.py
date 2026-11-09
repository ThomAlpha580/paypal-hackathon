from __future__ import annotations

from contextlib import contextmanager
from functools import lru_cache
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


def _database_url() -> str:
    settings = get_settings()
    url = settings.alpha_database_url or settings.agent_session_database_url
    if not url:
        raise RuntimeError("ALPHA_DATABASE_URL or AGENT_SESSION_DATABASE_URL is required")
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


@lru_cache(maxsize=1)
def get_alpha_engine() -> Engine:
    return create_engine(
        _database_url(),
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
    )


@lru_cache(maxsize=1)
def get_alpha_session_factory() -> sessionmaker[Session]:
    return sessionmaker(get_alpha_engine(), expire_on_commit=False, class_=Session)


@contextmanager
def alpha_session() -> Iterator[Session]:
    session = get_alpha_session_factory()()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def close_alpha_engine() -> None:
    if get_alpha_engine.cache_info().currsize:
        get_alpha_engine().dispose()
        get_alpha_engine.cache_clear()
        get_alpha_session_factory.cache_clear()
