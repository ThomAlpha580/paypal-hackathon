from functools import lru_cache

from supabase import Client, ClientOptions, create_client

from app.core.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    settings = get_settings()
    settings.validate_supabase()
    key = settings.supabase_service_role_key or settings.supabase_anon_key
    return create_client(
        settings.supabase_url,
        key,
        options=ClientOptions(schema=settings.supabase_schema),
    )


@lru_cache
def get_supabase_service_role_client() -> Client:
    settings = get_settings()
    settings.validate_supabase_service_role()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
        options=ClientOptions(schema=settings.supabase_schema),
    )
