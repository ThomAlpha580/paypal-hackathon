import logging
from typing import Any

from app.core.config import get_settings


logger = logging.getLogger(__name__)


def save_screen(payload: dict[str, Any]) -> None:
    """Best-effort mirror of a screen record to the auxiliary Postgres database."""
    settings = get_settings()
    if not all(
        (
            settings.postgres_host,
            settings.postgres_user,
            settings.postgres_password,
            settings.postgres_db,
        )
    ):
        logger.warning("Postgres screen mirror is not configured")
        return

    try:
        import psycopg
        from psycopg.types.json import Jsonb

        with psycopg.connect(
            host=settings.postgres_host,
            port=settings.postgres_port,
            user=settings.postgres_user,
            password=settings.postgres_password,
            dbname=settings.postgres_db,
            sslmode="require",
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO screens (user_id, query, filters, metadata, market)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        payload["user_id"],
                        payload["query"],
                        Jsonb(payload["filters"]),
                        Jsonb(payload["metadata"]),
                        payload["market"],
                    ),
                )
    except Exception:
        # This database is an auxiliary, write-only mirror. Its failure must not
        # affect the Supabase-backed request flow.
        logger.exception("Failed to mirror screen record to Postgres")
