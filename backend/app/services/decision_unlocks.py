from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.services.quota import get_entitlements
from app.services.supabase_client import get_supabase_service_role_client


def has_task_unlock(user_id: str, task_id: str) -> bool:
    try:
        rows = (
            get_supabase_service_role_client()
            .table("decision_task_unlocks")
            .select("status")
            .eq("user_id", user_id)
            .eq("task_id", task_id)
            .eq("status", "active")
            .limit(1)
            .execute()
        ).data or []
    except Exception as exc:
        if str(getattr(exc, "code", "")) in {"42P01", "PGRST205"}:
            return False
        raise HTTPException(status_code=503, detail="Decision unlock service unavailable") from exc
    return bool(rows)


def unlocked_task_ids(user_id: str, task_ids: list[str]) -> set[str]:
    if not task_ids:
        return set()
    try:
        rows = (
            get_supabase_service_role_client()
            .table("decision_task_unlocks")
            .select("task_id")
            .eq("user_id", user_id)
            .eq("status", "active")
            .in_("task_id", task_ids)
            .execute()
        ).data or []
    except Exception as exc:
        if str(getattr(exc, "code", "")) in {"42P01", "PGRST205"}:
            return set()
        raise HTTPException(status_code=503, detail="Decision unlock service unavailable") from exc
    return {str(row["task_id"]) for row in rows if row.get("task_id")}


def has_full_access(user_id: str, task_id: str) -> tuple[bool, str]:
    entitlements = get_entitlements(user_id)
    if entitlements.get("is_pro"):
        return True, "pro"
    if has_task_unlock(user_id, task_id):
        return True, "paypal_one_time"
    return False, "free"


def unlock_status(user_id: str, task_id: str) -> dict[str, Any]:
    full_access, source = has_full_access(user_id, task_id)
    return {"is_full_access": full_access, "source": source, "status": "active" if full_access else "locked"}
