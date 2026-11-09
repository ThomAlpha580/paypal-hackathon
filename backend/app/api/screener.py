from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel, Field
from typing import Any

from app.models.auth import AuthUser
from app.models.screener import ScreenResponse, ScreenerResponse
from app.services.auth import AuthService
from app.services.azure_blob import save_query as save_query_to_blob
from app.services.openai_screener import parse_filters
from app.services.postgres_screen import save_screen as save_screen_to_postgres
from app.services.quota import consume_quota, release_quota
from app.services.supabase_client import get_supabase_client
from app.services.tradingview_screener import (
    Market,
    run_default_screener,
    run_screener,
    run_search_screener,
)


router = APIRouter(prefix="/screener", tags=["screener"])


class ScreenerRequest(BaseModel):
    market: Market = Field(
        description=(
            "Supported markets: coin, monad, solana, cex, dex, china, korea, america, japan, "
            "hongkong, taiwan, india, russia"
        )
    )
    query: str = Field(min_length=1, description="Natural language screener query")


@router.post("", response_model=ScreenResponse)
def screener(
    request: ScreenerRequest,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(default=None),
) -> ScreenResponse:
    user = _current_user(authorization)
    consume_quota(user.id, "screen")

    try:
        parsed = parse_filters(request.query, request.market)
        results = run_screener(request.market, parsed.filters)
        metadata = ScreenerResponse(summary=parsed.summary, results=results)
        return _save_screen(
            user=user,
            request=request,
            filters=parsed.model_dump(mode="json")["filters"],
            metadata=metadata.model_dump(mode="json"),
            background_tasks=background_tasks,
        )
    except RuntimeError as exc:
        release_quota(user.id, "screen")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception:
        release_quota(user.id, "screen")
        raise


@router.get("/default")
def default_screener(market: Market) -> list[dict[str, Any]]:
    try:
        results = run_default_screener(market)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return results


@router.get("/search")
def search_screener(market: Market, keyword: str) -> list[dict[str, Any]]:
    try:
        results = run_search_screener(market, keyword)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return results


@router.get("/{screen_id}", response_model=ScreenResponse)
def get_screen(
    screen_id: str,
    authorization: str | None = Header(default=None),
) -> ScreenResponse:
    return _get_screen(_current_user(authorization), screen_id)


def _current_user(authorization: str | None) -> AuthUser:
    token = _get_bearer_token(authorization)
    return AuthService().current_user(token)


def _get_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Bearer token is required")

    return token.strip()


def _save_screen(
    user: AuthUser,
    request: ScreenerRequest,
    filters: list[dict[str, Any]],
    metadata: dict[str, Any],
    background_tasks: BackgroundTasks,
) -> ScreenResponse:
    payload = {
        "user_id": user.id,
        "query": request.query,
        "filters": filters,
        "metadata": metadata,
        "market": request.market,
    }

    try:
        response = get_supabase_client().table("screens").insert(payload).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Screen record creation failed") from exc

    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Screen record creation failed")
    background_tasks.add_task(save_screen_to_postgres, payload)
    background_tasks.add_task(save_query_to_blob, request.query)
    return ScreenResponse(**rows[0])


def _get_screen(user: AuthUser, screen_id: str) -> ScreenResponse:
    try:
        response = (
            get_supabase_client()
            .table("screens")
            .select("id,query,metadata,created_at,updated_at,market")
            .eq("id", screen_id)
            .eq("user_id", user.id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Screen record fetch failed") from exc

    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Screen record not found")
    return ScreenResponse(**rows[0])
