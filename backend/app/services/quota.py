from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import HTTPException

from app.services.supabase_client import get_supabase_service_role_client


QuotaFeature = Literal["screen", "analysis", "agent", "alpha"]
logger = logging.getLogger(__name__)


def get_entitlements(user_id: str) -> dict[str, Any]:
    try:
        response = get_supabase_service_role_client().rpc(
            "screener_get_entitlements",
            {"p_user_id": user_id},
        ).execute()
    except Exception as exc:
        logger.exception("Supabase entitlement RPC failed", extra=_supabase_error_context(exc))
        raise HTTPException(status_code=503, detail="Subscription entitlement service unavailable") from exc

    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Subscription entitlement lookup returned no data")
    return rows[0]


def consume_quota(user_id: str, feature: QuotaFeature) -> dict[str, Any]:
    try:
        response = get_supabase_service_role_client().rpc(
            "screener_consume_quota",
            {"p_user_id": user_id, "p_feature": feature},
        ).execute()
    except Exception as exc:
        logger.exception("Supabase quota RPC failed", extra=_supabase_error_context(exc))
        raise HTTPException(status_code=503, detail="Usage quota service unavailable") from exc

    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Usage quota check returned no data")

    result = rows[0]
    if not result.get("allowed"):
        raise HTTPException(
            status_code=429,
            detail={
                "code": "daily_quota_exceeded",
                "feature": feature,
                "plan": result.get("plan") or "free",
                "used": result.get("used", 0),
                "quota": result.get("quota", 0),
                "usage_date": result.get("usage_date"),
                "reset_at": result.get("reset_at"),
            },
            headers={"X-Quota-Reset-At": str(result.get("reset_at") or "")},
        )
    return result


def release_quota(user_id: str, feature: QuotaFeature) -> None:
    try:
        get_supabase_service_role_client().rpc(
            "screener_release_quota",
            {"p_user_id": user_id, "p_feature": feature},
        ).execute()
    except Exception:
        # The primary request already failed.  Keep the original error while
        # logging/monitoring can be added around this best-effort refund later.
        return


def _supabase_error_context(exc: Exception) -> dict[str, Any]:
    """Keep PostgREST's actionable error fields in server logs without exposing them to clients."""
    return {
        "supabase_error_code": getattr(exc, "code", None),
        "supabase_error_message": getattr(exc, "message", None) or str(exc),
        "supabase_error_details": getattr(exc, "details", None),
        "supabase_error_hint": getattr(exc, "hint", None),
    }
