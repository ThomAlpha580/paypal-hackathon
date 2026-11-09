from __future__ import annotations

import base64
import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Literal
from uuid import UUID, uuid4

from fastapi import HTTPException

from app.core.config import get_settings
from app.models.auth import AuthUser
from app.services.billing import _effective_pro
from app.services.supabase_client import get_supabase_service_role_client


logger = logging.getLogger(__name__)

PayPalInterval = Literal["monthly", "yearly"]
PAYPAL_ID_RE = re.compile(r"^[A-Za-z0-9_-]{5,127}$")
MISSING_RELATION_CODES = {"42P01", "PGRST205"}
PAYPAL_STATUS_MAP = {
    "APPROVAL_PENDING": "approval_pending",
    "APPROVED": "approved",
    "ACTIVE": "active",
    "SUSPENDED": "suspended",
    "CANCELLED": "cancelled",
    "EXPIRED": "expired",
}


class PayPalAPIError(RuntimeError):
    def __init__(self, message: str, *, status_code: int | None = None, payload: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


def _iso_datetime(value: Any) -> str | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


def _event_datetime(value: Any) -> str:
    return _iso_datetime(value) or datetime.now(timezone.utc).isoformat()


def _missing_relation(exc: Exception) -> bool:
    return str(getattr(exc, "code", "")) in MISSING_RELATION_CODES


class PayPalService:
    """PayPal REST integration for recurring Sandbox subscriptions."""

    def __init__(self, *, settings=None, supabase=None):
        self.settings = settings if settings is not None else get_settings()
        self.supabase = supabase if supabase is not None else get_supabase_service_role_client()

    def _ensure_enabled(self, *, webhook: bool = False) -> None:
        if not getattr(self.settings, "paypal_enabled", False):
            raise HTTPException(status_code=404, detail="PayPal payments are disabled")
        if not getattr(self.settings, "paypal_client_id", "") or not getattr(
            self.settings, "paypal_client_secret", ""
        ):
            raise HTTPException(status_code=503, detail="PayPal credentials are not configured")
        base_url = str(getattr(self.settings, "paypal_base_url", ""))
        if not base_url.startswith(("http://", "https://")):
            raise HTTPException(status_code=503, detail="PayPal API URL is not configured")
        if webhook and not getattr(self.settings, "paypal_webhook_id", ""):
            raise HTTPException(status_code=503, detail="PayPal webhook is not configured")

    def _plan_id(self, interval: PayPalInterval) -> str:
        value = (
            getattr(self.settings, "paypal_plan_monthly", "")
            if interval == "monthly"
            else getattr(self.settings, "paypal_plan_yearly", "")
        )
        if not value:
            raise HTTPException(status_code=503, detail=f"PayPal {interval} plan is not configured")
        return str(value)

    def _request(
        self,
        method: str,
        path: str,
        *,
        access_token: str | None = None,
        payload: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        form: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        body: bytes | None = None
        request_headers = {"Accept": "application/json"}
        if headers:
            request_headers.update(headers)
        if form is not None:
            body = urllib.parse.urlencode(form).encode("utf-8")
            request_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
        elif payload is not None:
            body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            request_headers.setdefault("Content-Type", "application/json")
        if access_token:
            request_headers["Authorization"] = f"Bearer {access_token}"

        url = f"{str(self.settings.paypal_base_url).rstrip('/')}/{path.lstrip('/')}"
        request = urllib.request.Request(url, data=body, headers=request_headers, method=method)
        try:
            with urllib.request.urlopen(
                request, timeout=float(getattr(self.settings, "paypal_http_timeout_seconds", 10))
            ) as response:
                raw = response.read()
                if not raw:
                    return {}
                return json.loads(raw.decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raw = exc.read()
            try:
                response_payload = json.loads(raw.decode("utf-8")) if raw else {}
            except json.JSONDecodeError:
                response_payload = {"message": raw.decode("utf-8", errors="replace")}
            raise PayPalAPIError(
                f"PayPal API returned HTTP {exc.code}",
                status_code=exc.code,
                payload=response_payload,
            ) from exc
        except (OSError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise PayPalAPIError("PayPal API request failed") from exc

    def _access_token(self) -> str:
        credentials = f"{self.settings.paypal_client_id}:{self.settings.paypal_client_secret}".encode()
        basic = base64.b64encode(credentials).decode("ascii")
        try:
            response = self._request(
                "POST",
                "/v1/oauth2/token",
                headers={"Authorization": f"Basic {basic}"},
                form={"grant_type": "client_credentials"},
            )
        except PayPalAPIError as exc:
            raise HTTPException(status_code=502, detail="PayPal authentication failed") from exc
        token = response.get("access_token")
        if not token:
            raise HTTPException(status_code=502, detail="PayPal did not return an access token")
        return str(token)

    def _paypal_request(
        self,
        method: str,
        path: str,
        *,
        payload: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        token = self._access_token()
        try:
            return self._request(method, path, access_token=token, payload=payload, headers=headers)
        except PayPalAPIError as exc:
            # Do not log payload values: PayPal validation errors can echo
            # customer data. Codes and debug_id are enough to trace failures.
            error = exc.payload if isinstance(exc.payload, dict) else {}
            details = error.get("details") or []
            issues = [
                str(item["issue"]) for item in details
                if isinstance(item, dict) and item.get("issue")
            ]
            diagnostic = {
                "code": "paypal_request_failed",
                "message": "PayPal request failed",
                "paypal_status": exc.status_code,
                "paypal_error": error.get("name"),
                "paypal_issues": issues,
                "paypal_debug_id": error.get("debug_id"),
            }
            if "INVALID_RESOURCE_ID" in issues:
                diagnostic["message"] = (
                    "PayPal resource is not accessible. Check the configured Plan ID, "
                    "Sandbox/Live environment, and merchant account."
                )
            logger.warning("PayPal API request failed: %s", diagnostic)
            raise HTTPException(status_code=502, detail=diagnostic) from exc

    def provider_config(self) -> dict[str, Any]:
        if not getattr(self.settings, "paypal_enabled", False):
            return {"enabled": False}
        self._ensure_enabled()
        return {
            "enabled": True,
            "client_id": str(getattr(self.settings, "paypal_client_id", "")),
            "currency": str(getattr(self.settings, "paypal_currency", "USD")),
            "plans": {
                "monthly": {"plan_id": self._plan_id("monthly")},
                "yearly": {"plan_id": self._plan_id("yearly")},
            },
        }

    def _decision_price(self) -> tuple[str, str]:
        try:
            amount = Decimal(str(getattr(self.settings, "paypal_decision_unlock_amount", "0.99"))).quantize(Decimal("0.01"))
        except (InvalidOperation, ValueError) as exc:
            raise HTTPException(status_code=503, detail="PayPal decision unlock price is invalid") from exc
        if amount <= 0:
            raise HTTPException(status_code=503, detail="PayPal decision unlock price is invalid")
        currency = str(getattr(self.settings, "paypal_decision_unlock_currency", "USD")).upper()
        if not re.fullmatch(r"[A-Z]{3}", currency):
            raise HTTPException(status_code=503, detail="PayPal decision unlock currency is invalid")
        return format(amount, ".2f"), currency

    @staticmethod
    def _alpha_price(content: str) -> str:
        # Map the supported 1..8000 character input range to $1.0..$5.0.
        length = max(1, min(len(content), 8000))
        amount = Decimal("1") + (Decimal(length - 1) * Decimal("4") / Decimal("999"))
        return format(amount.quantize(Decimal("0.1")), ".1f")

    def _alpha_price_currency(self, content: str) -> tuple[str, str]:
        return self._alpha_price(content), "USD"

    def _decision_redirect_url(self, value: str | None, fallback: str, field: str) -> str | None:
        candidate = value or fallback
        if not candidate:
            return None
        parsed = urllib.parse.urlsplit(candidate)
        local_http = parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        if (parsed.scheme != "https" and not local_http) or not parsed.netloc or parsed.username or parsed.password or parsed.fragment:
            raise HTTPException(status_code=400, detail=f"Invalid PayPal {field}")
        configured = str(getattr(self.settings, "paypal_allowed_frontend_origins", ""))
        if not configured.strip():
            configured = ",".join(
                [fallback]
                if fallback
                else []
            )
        allowed = set()
        for raw in configured.split(","):
            origin = urllib.parse.urlsplit(raw.strip())
            if origin.scheme and origin.netloc:
                allowed.add(f"{origin.scheme.lower()}://{origin.netloc.lower().rstrip('/')}")
        origin = f"{parsed.scheme.lower()}://{parsed.netloc.lower().rstrip('/')}"
        if origin not in allowed:
            raise HTTPException(status_code=400, detail=f"PayPal {field} origin is not allowed")
        return candidate

    def _decision_order(self, user_id: str, task_id: str, paypal_order_id: str | None = None) -> dict[str, Any] | None:
        query = self.supabase.table("decision_paypal_orders").select("*").eq("user_id", user_id).eq("task_id", task_id)
        if paypal_order_id:
            query = query.eq("paypal_order_id", paypal_order_id)
        rows = query.order("created_at", desc=True).limit(1).execute().data or []
        return rows[0] if rows else None

    def _decision_order_by_paypal_id(self, paypal_order_id: str) -> dict[str, Any] | None:
        try:
            rows = self.supabase.table("decision_paypal_orders").select("*").eq(
                "paypal_order_id", paypal_order_id
            ).limit(1).execute().data or []
        except Exception as exc:
            if _missing_relation(exc):
                return None
            raise HTTPException(status_code=503, detail="PayPal decision order lookup failed") from exc
        return rows[0] if rows else None

    @staticmethod
    def _amount_matches(remote: dict[str, Any], amount: str, currency: str) -> bool:
        expected = Decimal(amount)
        candidates: list[dict[str, Any]] = []

        def collect(value: Any) -> None:
            if isinstance(value, dict):
                if "value" in value and "currency_code" in value:
                    candidates.append(value)
                for child in value.values():
                    collect(child)
            elif isinstance(value, list):
                for child in value:
                    collect(child)

        collect(remote)
        for candidate in candidates:
            value = candidate.get("value")
            cur = str(candidate.get("currency_code") or "").upper()
            if value is not None and cur == currency:
                try:
                    return Decimal(str(value)).quantize(Decimal("0.01")) == expected.quantize(Decimal("0.01"))
                except InvalidOperation:
                    continue
        return False

    def _grant_decision_unlock(self, order: dict[str, Any], remote: dict[str, Any]) -> dict[str, Any]:
        amount, currency = self._decision_price()
        if not self._amount_matches(remote, amount, currency):
            raise HTTPException(status_code=400, detail="PayPal order amount does not match the decision unlock price")
        now = datetime.now(timezone.utc).isoformat()
        try:
            self.supabase.table("decision_task_unlocks").upsert(
                {
                    "user_id": order["user_id"],
                    "task_id": order["task_id"],
                    "provider": "paypal",
                    "provider_order_id": order["paypal_order_id"],
                    "status": "active",
                    "amount": amount,
                    "currency": currency,
                    "unlocked_at": now,
                    "updated_at": now,
                },
                on_conflict="user_id,task_id",
            ).execute()
            updated = self.supabase.table("decision_paypal_orders").update(
                {"status": "captured", "captured_at": now, "raw_payload": remote, "updated_at": now}
            ).eq("paypal_order_id", order["paypal_order_id"]).execute().data or []
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Decision unlock could not be recorded") from exc
        return updated[0] if updated else {**order, "status": "captured", "captured_at": now}

    def create_decision_unlock_order(
        self, user: AuthUser, task_id: str, *, idempotency_key: str | None = None,
        return_url: str | None = None, cancel_url: str | None = None,
    ) -> dict[str, Any]:
        self._ensure_enabled()
        try:
            task_rows = self.supabase.table("decision_tasks").select("id").eq("id", task_id).eq("user_id", user.id).limit(1).execute().data or []
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Decision task lookup failed") from exc
        if not task_rows:
            raise HTTPException(status_code=404, detail="Decision task not found")
        from app.services.decision_unlocks import has_full_access
        full_access, _ = has_full_access(user.id, task_id)
        if full_access:
            raise HTTPException(status_code=409, detail="Decision report is already unlocked")
        try:
            if idempotency_key:
                existing = self.supabase.table("decision_paypal_orders").select("*").eq("user_id", user.id).eq("idempotency_key", idempotency_key).limit(1).execute().data or []
                if existing:
                    if str(existing[0].get("task_id")) != str(task_id):
                        raise HTTPException(status_code=409, detail="Idempotency-Key is already bound to another decision task")
                    return existing[0]
            amount, currency = self._decision_price()
            local_id = str(uuid4())
            payload: dict[str, Any] = {
                "intent": "CAPTURE",
                "purchase_units": [{"reference_id": local_id, "custom_id": task_id, "amount": {"currency_code": currency, "value": amount}, "description": "Complete decision report unlock"}],
            }
            app_context: dict[str, Any] = {"user_action": "PAY_NOW", "shipping_preference": "NO_SHIPPING"}
            resolved_return_url = self._decision_redirect_url(return_url, getattr(self.settings, "paypal_decision_return_url", ""), "return_url")
            resolved_cancel_url = self._decision_redirect_url(cancel_url, getattr(self.settings, "paypal_decision_cancel_url", ""), "cancel_url")
            if resolved_return_url:
                app_context["return_url"] = resolved_return_url
            if resolved_cancel_url:
                app_context["cancel_url"] = resolved_cancel_url
            payload["application_context"] = app_context
            response = self._paypal_request("POST", "/v2/checkout/orders", payload=payload, headers={"PayPal-Request-Id": local_id})
            paypal_order_id = str(response.get("id") or "")
            if not PAYPAL_ID_RE.fullmatch(paypal_order_id):
                raise HTTPException(status_code=502, detail="PayPal did not return a valid order ID")
            approval_url = self._approval_url(response)
            row = {
                "id": local_id, "user_id": user.id, "task_id": task_id, "paypal_order_id": paypal_order_id,
                "status": str(response.get("status") or "CREATED").lower(), "amount": amount, "currency": currency,
                "idempotency_key": idempotency_key, "approval_url": approval_url, "raw_payload": response,
            }
            inserted = self.supabase.table("decision_paypal_orders").insert(row).execute().data or []
            if not inserted:
                raise HTTPException(status_code=503, detail="PayPal order could not be recorded")
            return inserted[0]
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=503, detail="PayPal decision order creation failed") from exc

    def capture_decision_unlock_order(self, user: AuthUser, task_id: str, paypal_order_id: str) -> dict[str, Any]:
        self._ensure_enabled()
        if not PAYPAL_ID_RE.fullmatch(paypal_order_id):
            raise HTTPException(status_code=400, detail="Invalid PayPal order ID")
        order = self._decision_order(user.id, task_id, paypal_order_id)
        if not order:
            raise HTTPException(status_code=404, detail="PayPal decision order not found")
        existing_unlock = self.supabase.table("decision_task_unlocks").select("*").eq("user_id", user.id).eq("task_id", task_id).eq("status", "active").limit(1).execute().data or []
        if existing_unlock:
            return {"status": "active", "is_full_access": True, "unlock": existing_unlock[0]}
        remote = self._paypal_request("GET", f"/v2/checkout/orders/{paypal_order_id}")
        if str(remote.get("status") or "").upper() != "COMPLETED":
            remote = self._paypal_request(
                "POST",
                f"/v2/checkout/orders/{paypal_order_id}/capture",
                headers={
                    "PayPal-Request-Id": str(order["id"]),
                    "Content-Type": "application/json",
                },
            )
        status = str(remote.get("status") or "").upper()
        if status not in {"COMPLETED", "APPROVED"}:
            self.supabase.table("decision_paypal_orders").update({"status": status.lower() or "failed", "raw_payload": remote}).eq("id", order["id"]).execute()
            raise HTTPException(status_code=402, detail="PayPal payment is not completed")
        result = self._grant_decision_unlock(order, remote)
        return {"status": "active", "is_full_access": True, "order": result}

    def _alpha_order(self, user_id: str, chat_id: str, paypal_order_id: str | None = None) -> dict[str, Any] | None:
        query = self.supabase.table("alpha_paypal_orders").select("*").eq("user_id", user_id).eq("chat_id", chat_id)
        if paypal_order_id:
            query = query.eq("paypal_order_id", paypal_order_id)
        rows = query.order("created_at", desc=True).limit(1).execute().data or []
        return rows[0] if rows else None

    def _alpha_order_by_paypal_id(self, paypal_order_id: str) -> dict[str, Any] | None:
        try:
            rows = self.supabase.table("alpha_paypal_orders").select("*").eq(
                "paypal_order_id", paypal_order_id
            ).limit(1).execute().data or []
        except Exception as exc:
            if _missing_relation(exc):
                return None
            raise HTTPException(status_code=503, detail="PayPal alpha order lookup failed") from exc
        return rows[0] if rows else None

    def create_alpha_order(
        self, user: AuthUser, chat_id: str, content: str, *, idempotency_key: str | None = None,
        return_url: str | None = None, cancel_url: str | None = None,
    ) -> dict[str, Any]:
        self._ensure_enabled()
        if not getattr(self.settings, "paypal_alpha_enabled", False):
            raise HTTPException(status_code=404, detail="PayPal alpha payments are disabled")
        try:
            existing = self._alpha_order(user.id, chat_id)
        except Exception as exc:
            if _missing_relation(exc):
                raise HTTPException(status_code=503, detail="Alpha PayPal tables are not deployed") from exc
            raise HTTPException(status_code=503, detail="PayPal alpha order lookup failed") from exc
        if existing:
            return existing
        amount, currency = self._alpha_price_currency(content)
        local_id = str(uuid4())
        payload: dict[str, Any] = {
            "intent": "CAPTURE",
            "purchase_units": [{
                "reference_id": local_id,
                "custom_id": chat_id,
                "amount": {"currency_code": currency, "value": amount},
                "description": "Start EasyAlpha conversation",
            }],
        }
        app_context: dict[str, Any] = {"user_action": "PAY_NOW", "shipping_preference": "NO_SHIPPING"}
        resolved_return_url = self._decision_redirect_url(
            return_url, getattr(self.settings, "paypal_alpha_return_url", ""), "return_url"
        )
        resolved_cancel_url = self._decision_redirect_url(
            cancel_url, getattr(self.settings, "paypal_alpha_cancel_url", ""), "cancel_url"
        )
        if resolved_return_url:
            app_context["return_url"] = resolved_return_url
        if resolved_cancel_url:
            app_context["cancel_url"] = resolved_cancel_url
        payload["application_context"] = app_context
        try:
            response = self._paypal_request(
                "POST", "/v2/checkout/orders", payload=payload,
                headers={"PayPal-Request-Id": local_id},
            )
            paypal_order_id = str(response.get("id") or "")
            if not PAYPAL_ID_RE.fullmatch(paypal_order_id):
                raise HTTPException(status_code=502, detail="PayPal did not return a valid order ID")
            row = {
                "id": local_id, "user_id": user.id, "chat_id": chat_id,
                "paypal_order_id": paypal_order_id,
                "status": str(response.get("status") or "CREATED").lower(),
                "amount": amount, "currency": currency,
                "idempotency_key": idempotency_key,
                "approval_url": self._approval_url(response), "raw_payload": response,
            }
            inserted = self.supabase.table("alpha_paypal_orders").insert(row).execute().data or []
            if not inserted:
                raise HTTPException(status_code=503, detail="PayPal alpha order could not be recorded")
            return inserted[0]
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=503, detail="PayPal alpha order creation failed") from exc

    def _grant_alpha_order(self, order: dict[str, Any], remote: dict[str, Any]) -> dict[str, Any]:
        expected = format(Decimal(str(order["amount"])).quantize(Decimal("0.1")), ".1f")
        if not self._amount_matches(remote, expected, str(order["currency"]).upper()):
            raise HTTPException(status_code=400, detail="PayPal order amount does not match the alpha price")
        now = datetime.now(timezone.utc).isoformat()
        try:
            updated = self.supabase.table("alpha_paypal_orders").update(
                {"status": "captured", "captured_at": now, "raw_payload": remote, "updated_at": now}
            ).eq("paypal_order_id", order["paypal_order_id"]).execute().data or []
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Alpha PayPal payment could not be recorded") from exc
        return updated[0] if updated else {**order, "status": "captured", "captured_at": now}

    def capture_alpha_order(self, user: AuthUser, chat_id: str, paypal_order_id: str) -> dict[str, Any]:
        self._ensure_enabled()
        if not PAYPAL_ID_RE.fullmatch(paypal_order_id):
            raise HTTPException(status_code=400, detail="Invalid PayPal order ID")
        order = self._alpha_order(user.id, chat_id, paypal_order_id)
        if not order:
            raise HTTPException(status_code=404, detail="PayPal alpha order not found")
        if str(order.get("status") or "").lower() == "captured":
            return {"status": "active", "order": order}
        remote = self._paypal_request("GET", f"/v2/checkout/orders/{paypal_order_id}")
        if str(remote.get("status") or "").upper() != "COMPLETED":
            remote = self._paypal_request(
                "POST", f"/v2/checkout/orders/{paypal_order_id}/capture",
                headers={"PayPal-Request-Id": str(order["id"]), "Content-Type": "application/json"},
            )
        if str(remote.get("status") or "").upper() not in {"COMPLETED", "APPROVED"}:
            self.supabase.table("alpha_paypal_orders").update(
                {"status": str(remote.get("status") or "failed").lower(), "raw_payload": remote}
            ).eq("id", order["id"]).execute()
            raise HTTPException(status_code=402, detail="PayPal payment is not completed")
        result = self._grant_alpha_order(order, remote)
        return {"status": "active", "order": result}

    def _stripe_active(self, user_id: str) -> bool:
        try:
            rows = (
                self.supabase.table("screener_subscriptions")
                .select("plan,status,current_period_end")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            ).data or []
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Subscription lookup failed") from exc
        return _effective_pro(rows[0] if rows else None)

    def _paypal_active(self, user_id: str) -> bool:
        try:
            rows = (
                self.supabase.table("screener_paypal_subscriptions")
                .select("status,current_period_end")
                .eq("user_id", user_id)
                .eq("status", "active")
                .limit(20)
                .execute()
            ).data or []
        except Exception as exc:
            if _missing_relation(exc):
                return False
            raise HTTPException(status_code=500, detail="PayPal subscription lookup failed") from exc
        now = datetime.now(timezone.utc)
        for row in rows:
            period_end = _iso_datetime(row.get("current_period_end"))
            if period_end and datetime.fromisoformat(period_end) > now:
                return True
        return False

    def _crypto_active(self, user_id: str) -> bool:
        try:
            rows = (
                self.supabase.table("screener_payment_entitlements")
                .select("id")
                .eq("user_id", user_id)
                .eq("plan", "pro")
                .eq("status", "active")
                .gt("current_period_end", datetime.now(timezone.utc).isoformat())
                .limit(1)
                .execute()
            ).data or []
        except Exception as exc:
            if _missing_relation(exc):
                return False
            raise HTTPException(status_code=500, detail="Payment entitlement lookup failed") from exc
        return bool(rows)

    def _has_active_pro(self, user_id: str) -> bool:
        return self._stripe_active(user_id) or self._paypal_active(user_id) or self._crypto_active(user_id)

    def _checkout_by_idempotency(self, user_id: str, key: str) -> dict[str, Any] | None:
        try:
            rows = (
                self.supabase.table("screener_paypal_checkouts")
                .select("*")
                .eq("user_id", user_id)
                .eq("idempotency_key", key)
                .limit(1)
                .execute()
            ).data or []
        except Exception as exc:
            raise HTTPException(status_code=500, detail="PayPal checkout lookup failed") from exc
        return rows[0] if rows else None

    def _checkout_for_subscription(self, subscription_id: str) -> dict[str, Any] | None:
        try:
            rows = (
                self.supabase.table("screener_paypal_checkouts")
                .select("*")
                .eq("paypal_subscription_id", subscription_id)
                .limit(1)
                .execute()
            ).data or []
        except Exception as exc:
            if _missing_relation(exc):
                return None
            raise HTTPException(status_code=500, detail="PayPal checkout lookup failed") from exc
        return rows[0] if rows else None

    def _checkout_by_id(self, checkout_id: str) -> dict[str, Any] | None:
        try:
            rows = (
                self.supabase.table("screener_paypal_checkouts")
                .select("*")
                .eq("id", checkout_id)
                .limit(1)
                .execute()
            ).data or []
        except Exception as exc:
            if _missing_relation(exc):
                return None
            raise HTTPException(status_code=500, detail="PayPal checkout lookup failed") from exc
        return rows[0] if rows else None

    def _subscription_owner(self, subscription_id: str) -> dict[str, Any] | None:
        try:
            rows = (
                self.supabase.table("screener_paypal_subscriptions")
                .select("*")
                .eq("paypal_subscription_id", subscription_id)
                .limit(1)
                .execute()
            ).data or []
        except Exception as exc:
            if _missing_relation(exc):
                return None
            raise HTTPException(status_code=500, detail="PayPal subscription lookup failed") from exc
        return rows[0] if rows else None

    @staticmethod
    def _approval_url(response: dict[str, Any]) -> str | None:
        fallback = None
        for link in response.get("links") or []:
            if not isinstance(link, dict) or not link.get("href"):
                continue
            if link.get("rel") == "approve":
                return str(link["href"])
            if link.get("rel") == "payer-action":
                fallback = str(link["href"])
        return fallback

    def create_subscription(
        self,
        user: AuthUser,
        *,
        interval: PayPalInterval,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        self._ensure_enabled()
        plan_id = self._plan_id(interval)
        if self._has_active_pro(user.id):
            raise HTTPException(status_code=409, detail="An active Pro subscription already exists")
        # Check upstream before allowing replacement: approval may have happened
        # while our local row still says pending (delayed Webhook).
        try:
            open_rows = self.supabase.table("screener_paypal_checkouts").select("*").eq(
                "user_id", user.id
            ).in_("status", ["created", "approval_pending", "approved", "active"]).limit(1).execute().data or []
        except Exception as exc:
            raise HTTPException(503, "PayPal checkout lookup failed") from exc
        replace_id = None
        if open_rows:
            pending = open_rows[0]
            if pending.get("paypal_plan_id") != plan_id:
                if pending.get("status") != "approval_pending" or not pending.get("paypal_subscription_id"):
                    raise HTTPException(409, "Checkout is being created or already approved; refresh and retry")
                remote = self._paypal_request(
                    "GET", f"/v1/billing/subscriptions/{pending['paypal_subscription_id']}"
                )
                if remote.get("status") != "APPROVAL_PENDING":
                    raise HTTPException(409, "Previous subscription is already approved or changed; confirm it first")
                replace_id = pending["id"]
        try:
            rows = self.supabase.rpc("screener_reserve_paypal_checkout", {
                "p_user_id": user.id, "p_interval": interval, "p_plan_id": plan_id,
                "p_idempotency_key": idempotency_key, "p_replace_id": replace_id,
            }).execute().data or []
        except Exception as exc:
            if str(getattr(exc, "code", "")) in {"22023", "23505"}:
                raise HTTPException(409, "Checkout changed, plan changed, or key was already used; refresh and use a new Idempotency-Key") from exc
            raise HTTPException(503, "PayPal checkout reservation failed; check the checkout-switch migration") from exc
        if not rows:
            raise HTTPException(500, "PayPal checkout reservation returned no result")
        checkout = dict(rows[0])
        checkout_id = checkout["id"]
        if checkout.get("status") in {"superseded", "cancelled", "expired"}:
            raise HTTPException(409, "Checkout is no longer current; use a new Idempotency-Key")
        if checkout.get("paypal_subscription_id"):
            remote = self._paypal_request("GET", f"/v1/billing/subscriptions/{checkout['paypal_subscription_id']}")
            checkout["approval_url"] = self._approval_url(remote)
            return checkout

        subscriber = {"email_address": user.email} if user.email else None
        payload: dict[str, Any] = {
            "plan_id": plan_id,
            "custom_id": str(checkout_id),
            "application_context": {
                "shipping_preference": "NO_SHIPPING",
                "user_action": "SUBSCRIBE_NOW",
            },
        }
        if subscriber:
            payload["subscriber"] = subscriber
        try:
            response = self._paypal_request(
                "POST",
                "/v1/billing/subscriptions",
                payload=payload,
                headers={"PayPal-Request-Id": str(checkout_id)},
            )
        except HTTPException:
            try:
                self.supabase.table("screener_paypal_checkouts").update({"status": "failed"}).eq(
                    "id", str(checkout_id)
                ).execute()
            except Exception:
                logger.exception("Failed to mark PayPal checkout as failed")
            raise

        subscription_id = str(response.get("id") or "")
        if not PAYPAL_ID_RE.fullmatch(subscription_id):
            raise HTTPException(status_code=502, detail="PayPal did not return a valid subscription ID")
        status = PAYPAL_STATUS_MAP.get(str(response.get("status") or "").upper(), "approval_pending")
        update = {
            "paypal_subscription_id": subscription_id,
            "status": status,
        }
        try:
            self.supabase.table("screener_paypal_checkouts").update(update).eq(
                "id", str(checkout_id)
            ).execute()
        except Exception as exc:
            raise HTTPException(status_code=500, detail="PayPal checkout state update failed") from exc
        checkout.update(update)
        checkout["approval_url"] = self._approval_url(response)
        return checkout

    @staticmethod
    def _remote_details(response: dict[str, Any], checkout: dict[str, Any]) -> dict[str, Any]:
        status = str(response.get("status") or "").upper()
        billing_info = response.get("billing_info") or {}
        subscriber = response.get("subscriber") or {}
        return {
            "paypal_subscription_id": str(response.get("id") or checkout.get("paypal_subscription_id")),
            "paypal_plan_id": str(response.get("plan_id") or checkout.get("paypal_plan_id")),
            "paypal_payer_id": subscriber.get("payer_id"),
            "paypal_payer_email": subscriber.get("email_address"),
            "status": PAYPAL_STATUS_MAP.get(status, "payment_failed"),
            "current_period_start": _iso_datetime(
                billing_info.get("last_payment", {}).get("time") or response.get("start_time")
            ),
            "current_period_end": _iso_datetime(billing_info.get("next_billing_time")),
            "cancel_at_period_end": status in {"CANCELLED", "EXPIRED"},
            "paypal_update_time": _iso_datetime(response.get("update_time") or response.get("create_time")),
        }

    def _sync(
        self,
        *,
        user_id: str,
        checkout: dict[str, Any],
        remote: dict[str, Any],
        event_id: str,
        event_type: str,
        event_created_at: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        details = self._remote_details(remote, checkout)
        try:
            result = self.supabase.rpc(
                "screener_sync_paypal_subscription",
                {
                    "p_paypal_event_id": event_id,
                    "p_event_type": event_type,
                    "p_paypal_event_created_at": event_created_at,
                    "p_user_id": user_id,
                    "p_checkout_id": checkout.get("checkout_id") or checkout.get("id"),
                    "p_paypal_subscription_id": details["paypal_subscription_id"],
                    "p_paypal_plan_id": details["paypal_plan_id"],
                    "p_paypal_payer_id": details["paypal_payer_id"],
                    "p_paypal_payer_email": details["paypal_payer_email"],
                    "p_interval": checkout.get("interval"),
                    "p_status": details["status"],
                    "p_current_period_start": details["current_period_start"],
                    "p_current_period_end": details["current_period_end"],
                    "p_cancel_at_period_end": details["cancel_at_period_end"],
                    "p_paypal_update_time": details["paypal_update_time"],
                    "p_payload": payload,
                },
            ).execute()
        except Exception as exc:
            logger.exception("PayPal subscription sync failed", extra={"paypal_event_id": event_id})
            raise HTTPException(status_code=500, detail="PayPal subscription state sync failed") from exc
        rows = result.data or []
        if not rows:
            raise HTTPException(status_code=500, detail="PayPal subscription sync returned no result")
        latest = self._checkout_by_id(str(checkout.get("checkout_id") or checkout["id"]))
        if latest and latest.get("status") == "superseded":
            self._resolve_superseded(latest, remote, event_type)
        return rows[0]

    def _resolve_superseded(self, checkout: dict[str, Any], remote: dict[str, Any], event_type: str) -> None:
        subscription_id = remote["id"]
        status = str(remote.get("status") or "")
        # Flag actual sale events, and approvals with a payment already recorded,
        # for manual refund review; never blindly refund an unrelated sale.
        if event_type == "PAYMENT.SALE.COMPLETED" or (remote.get("billing_info") or {}).get("last_payment"):
            self.supabase.table("screener_paypal_checkouts").update({
                "refund_review_required": True,
            }).eq("id", checkout["id"]).execute()
            logger.error("Superseded PayPal checkout needs refund review: checkout=%s subscription=%s",
                         checkout["id"], subscription_id)
        if status in {"ACTIVE", "SUSPENDED"}:
            self._paypal_request("POST", f"/v1/billing/subscriptions/{subscription_id}/cancel",
                                 payload={"reason": "Checkout replaced by another plan"})
        elif status == "APPROVED":
            # PayPal only allows cancellation once ACTIVE/SUSPENDED. Keep
            # webhook delivery retryable rather than acknowledging cleanup.
            raise HTTPException(503, "Superseded subscription awaits activation for cancellation")

    def confirm_subscription(self, user: AuthUser, subscription_id: str) -> dict[str, Any]:
        self._ensure_enabled()
        if not PAYPAL_ID_RE.fullmatch(subscription_id):
            raise HTTPException(status_code=400, detail="Invalid PayPal subscription ID")
        remote = self._paypal_request("GET", f"/v1/billing/subscriptions/{subscription_id}")
        custom_id = str(remote.get("custom_id") or "")
        checkout = self._checkout_for_subscription(subscription_id)
        if custom_id:
            try:
                UUID(custom_id)
            except ValueError:
                candidate = None
            else:
                candidate = self._checkout_by_id(custom_id)
            checkout = candidate if candidate and str(candidate.get("user_id")) == str(user.id) else None
        owner = self._subscription_owner(subscription_id)
        if checkout is None and owner and str(owner.get("user_id")) == str(user.id):
            checkout = owner
        if checkout is None or str(checkout.get("user_id")) != str(user.id):
            raise HTTPException(status_code=403, detail="PayPal subscription is not attached to this account")
        if str(remote.get("plan_id") or checkout.get("paypal_plan_id")) != str(checkout.get("paypal_plan_id")):
            raise HTTPException(status_code=400, detail="PayPal subscription plan does not match the checkout")
        result = self._sync(
            user_id=user.id,
            checkout=checkout,
            remote=remote,
            event_id=f"confirm:{uuid4()}",
            event_type="client.confirm",
            event_created_at=_event_datetime(remote.get("update_time")),
            payload=remote,
        )
        return result

    def cancel_subscription(self, user: AuthUser, subscription_id: str, reason: str) -> dict[str, Any]:
        self._ensure_enabled()
        if not PAYPAL_ID_RE.fullmatch(subscription_id):
            raise HTTPException(status_code=400, detail="Invalid PayPal subscription ID")
        owner = self._subscription_owner(subscription_id)
        if not owner or str(owner.get("user_id")) != str(user.id):
            raise HTTPException(status_code=404, detail="PayPal subscription not found")
        self._paypal_request(
            "POST",
            f"/v1/billing/subscriptions/{subscription_id}/cancel",
            payload={"reason": reason[:128]},
        )
        checkout = self._checkout_for_subscription(subscription_id) or owner
        remote = self._paypal_request("GET", f"/v1/billing/subscriptions/{subscription_id}")
        return self._sync(
            user_id=user.id,
            checkout=checkout,
            remote=remote,
            event_id=f"cancel:{uuid4()}",
            event_type="client.cancel",
            event_created_at=_event_datetime(remote.get("update_time")),
            payload=remote,
        )

    def _verify_webhook(
        self,
        *,
        payload: bytes,
        transmission_id: str | None,
        transmission_time: str | None,
        cert_url: str | None,
        auth_algo: str | None,
        transmission_sig: str | None,
    ) -> None:
        self._ensure_enabled(webhook=True)
        required = {
            "transmission_id": transmission_id,
            "transmission_time": transmission_time,
            "cert_url": cert_url,
            "auth_algo": auth_algo,
            "transmission_sig": transmission_sig,
        }
        if any(not value for value in required.values()):
            raise HTTPException(status_code=400, detail="PayPal webhook signature headers are required")
        try:
            event = json.loads(payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=400, detail="Invalid PayPal webhook payload") from exc
        response = self._paypal_request(
            "POST",
            "/v1/notifications/verify-webhook-signature",
            payload={
                "transmission_id": transmission_id,
                "transmission_time": transmission_time,
                "cert_url": cert_url,
                "auth_algo": auth_algo,
                "transmission_sig": transmission_sig,
                "webhook_id": self.settings.paypal_webhook_id,
                "webhook_event": event,
            },
        )
        if str(response.get("verification_status") or "").upper() != "SUCCESS":
            raise HTTPException(status_code=400, detail="Invalid PayPal webhook signature")

    def handle_webhook(
        self,
        payload: bytes,
        *,
        transmission_id: str | None,
        transmission_time: str | None,
        cert_url: str | None,
        auth_algo: str | None,
        transmission_sig: str | None,
    ) -> None:
        self._verify_webhook(
            payload=payload,
            transmission_id=transmission_id,
            transmission_time=transmission_time,
            cert_url=cert_url,
            auth_algo=auth_algo,
            transmission_sig=transmission_sig,
        )
        try:
            event = json.loads(payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=400, detail="Invalid PayPal webhook payload") from exc
        event_id = str(event.get("id") or "")
        event_type = str(event.get("event_type") or "")
        resource = event.get("resource") or {}
        # One-time decision unlock events use Orders v2 and are intentionally
        # handled before the existing subscription webhook path.
        order_id = str(
            resource.get("id")
            if event_type.startswith("CHECKOUT.ORDER.")
            else ((resource.get("supplementary_data") or {}).get("related_ids") or {}).get("order_id")
            or ""
        )
        if order_id and PAYPAL_ID_RE.fullmatch(order_id) and event_type in {
            "CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.REFUNDED",
        }:
            order = self._decision_order_by_paypal_id(order_id)
            if order:
                remote = self._paypal_request("GET", f"/v2/checkout/orders/{order_id}")
                if event_type == "PAYMENT.CAPTURE.REFUNDED":
                    self.supabase.table("decision_task_unlocks").update(
                        {"status": "refunded", "refunded_at": datetime.now(timezone.utc).isoformat()}
                    ).eq("provider", "paypal").eq("provider_order_id", order_id).execute()
                    self.supabase.table("decision_paypal_orders").update(
                        {"status": "refunded", "raw_payload": remote}
                    ).eq("paypal_order_id", order_id).execute()
                elif str(remote.get("status") or "").upper() == "COMPLETED":
                    self._grant_decision_unlock(order, remote)
            return
            alpha_order = self._alpha_order_by_paypal_id(order_id)
            if alpha_order:
                remote = self._paypal_request("GET", f"/v2/checkout/orders/{order_id}")
                if event_type == "PAYMENT.CAPTURE.REFUNDED":
                    self.supabase.table("alpha_paypal_orders").update(
                        {"status": "refunded", "raw_payload": remote, "updated_at": datetime.now(timezone.utc).isoformat()}
                    ).eq("paypal_order_id", order_id).execute()
                elif str(remote.get("status") or "").upper() == "COMPLETED":
                    self._grant_alpha_order(alpha_order, remote)
                    # The webhook can be the first confirmation path. The
                    # worker uses an atomic queued -> running transition, so
                    # duplicate notifications remain harmless.
                    try:
                        from app.api.alpha.router import _launch_paid_run
                        _launch_paid_run(uuid.UUID(str(alpha_order["chat_id"])), uuid.UUID(str(alpha_order["user_id"])))
                    except Exception:
                        logger.exception("Failed to launch paid alpha run", extra={"chat_id": alpha_order.get("chat_id")})
                return
        subscription_id = str(
            resource.get("billing_agreement_id")
            or resource.get("subscription_id")
            or resource.get("id")
            or ""
        )
        if not event_id or not subscription_id or not PAYPAL_ID_RE.fullmatch(subscription_id):
            return
        checkout = self._checkout_for_subscription(subscription_id)
        owner = self._subscription_owner(subscription_id)
        custom_id = str(resource.get("custom_id") or "")
        if checkout is None and custom_id:
            try:
                UUID(custom_id)
            except ValueError:
                checkout = None
            else:
                checkout = self._checkout_by_id(custom_id)
        if checkout is None and owner is not None:
            checkout = owner
        if checkout is None:
            # Ignore subscriptions created outside this application. They must
            # never be attached to an arbitrary local user.
            return
        remote = self._paypal_request("GET", f"/v1/billing/subscriptions/{subscription_id}")
        if str(remote.get("plan_id") or "") != str(checkout.get("paypal_plan_id") or ""):
            return
        if event_type in {"PAYMENT.SALE.REFUNDED", "PAYMENT.SALE.REVERSED"}:
            # A refunded/reversed billing cycle must stop access immediately.
            # A later successful recurring sale can move the subscription back
            # to ACTIVE through a fresh PayPal event.
            remote = dict(remote)
            remote["status"] = "SUSPENDED"
        self._sync(
            user_id=str(checkout["user_id"]),
            checkout=checkout,
            remote=remote,
            event_id=event_id,
            event_type=event_type,
            event_created_at=_event_datetime(event.get("create_time")),
            payload=event,
        )
