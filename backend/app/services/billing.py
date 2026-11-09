from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Literal
from urllib.parse import urlsplit

from fastapi import HTTPException

from app.core.config import get_settings
from app.models.auth import AuthUser
from app.services.supabase_client import get_supabase_service_role_client


BillingInterval = Literal["monthly", "yearly"]
_PAYPAL_MISSING_RELATION_CODES = {"42P01", "PGRST205"}


def _subscription_for_user(user_id: str) -> dict[str, Any] | None:
    try:
        response = (
            get_supabase_service_role_client()
            .table("screener_subscriptions")
            .select(
                "stripe_customer_id,stripe_subscription_id,plan,status,"
                "current_period_end,cancel_at_period_end"
            )
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Subscription lookup failed") from exc
    rows = response.data or []
    return rows[0] if rows else None


def _paypal_subscription_for_user(user_id: str) -> dict[str, Any] | None:
    """Return the most recently updated PayPal subscription, if migrated."""
    try:
        response = (
            get_supabase_service_role_client()
            .table("screener_paypal_subscriptions")
            .select(
                "paypal_subscription_id,paypal_plan_id,interval,status,"
                "current_period_start,current_period_end,cancel_at_period_end"
            )
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        if str(getattr(exc, "code", "")) in _PAYPAL_MISSING_RELATION_CODES:
            return None
        raise HTTPException(status_code=500, detail="PayPal subscription lookup failed") from exc
    rows = response.data or []
    return rows[0] if rows else None


def _other_provider_active_for_user(user_id: str, *, supabase=None, settings=None) -> bool:
    """Check PayPal/MON only when PayPal is enabled, preserving old deployments."""
    settings = settings if settings is not None else get_settings()
    if not getattr(settings, "paypal_enabled", False):
        return False
    client = supabase or get_supabase_service_role_client()
    try:
        paypal_rows = (
            client.table("screener_paypal_subscriptions")
            .select("status,current_period_end")
            .eq("user_id", user_id)
            .eq("status", "active")
            .limit(20)
            .execute()
        ).data or []
        now = datetime.now(timezone.utc)
        if any(
            row.get("current_period_end")
            and datetime.fromisoformat(str(row["current_period_end"]).replace("Z", "+00:00")) > now
            for row in paypal_rows
        ):
            return True
        crypto_rows = (
            client.table("screener_payment_entitlements")
            .select("id")
            .eq("user_id", user_id)
            .eq("plan", "pro")
            .eq("status", "active")
            .gt("current_period_end", now.isoformat())
            .limit(1)
            .execute()
        ).data or []
        return bool(crypto_rows)
    except Exception as exc:
        if str(getattr(exc, "code", "")) in _PAYPAL_MISSING_RELATION_CODES:
            return False
        raise HTTPException(status_code=500, detail="Payment entitlement lookup failed") from exc


def _effective_pro(subscription: dict[str, Any] | None) -> bool:
    if not subscription or subscription.get("plan") != "pro":
        return False
    if subscription.get("status") not in {"active", "trialing"}:
        return False
    period_end = subscription.get("current_period_end")
    if not period_end:
        return True
    try:
        value = datetime.fromisoformat(str(period_end).replace("Z", "+00:00"))
    except ValueError:
        return False
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value > datetime.now(timezone.utc)


def _origin(value: str) -> str | None:
    """Return a normalized origin for an HTTP(S) URL, or None if invalid."""
    try:
        parsed = urlsplit(value)
    except ValueError:
        return None
    if (
        parsed.scheme.lower() not in {"http", "https"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
    ):
        return None
    hostname = parsed.hostname.lower().rstrip(".")
    try:
        port = parsed.port
    except ValueError:
        return None
    default_port = 80 if parsed.scheme.lower() == "http" else 443
    port_suffix = f":{port}" if port and port != default_port else ""
    return f"{parsed.scheme.lower()}://{hostname}{port_suffix}"


def _allowed_frontend_origins(settings: Any) -> set[str]:
    configured = getattr(settings, "stripe_allowed_frontend_origins", "")
    origins = {
        normalized
        for value in configured.split(",")
        if (normalized := _origin(value.strip())) is not None
    }
    if configured.strip():
        return origins

    # Backward compatible fallback for deployments that only have the old fixed
    # URL variables. A deployment with multiple frontends should configure the
    # explicit allowlist instead.
    return {
        normalized
        for value in (
            getattr(settings, "stripe_success_url", ""),
            getattr(settings, "stripe_cancel_url", ""),
            getattr(settings, "stripe_portal_return_url", ""),
        )
        if (normalized := _origin(value)) is not None
    }


def _redirect_url(
    candidate: str | None,
    fallback: str,
    settings: Any,
    field_name: str,
) -> str:
    value = candidate or fallback
    if not value:
        raise HTTPException(status_code=503, detail=f"Stripe {field_name} is not configured")
    origin = _origin(value)
    if origin is None:
        raise HTTPException(status_code=400, detail=f"Invalid Stripe {field_name}")
    if origin not in _allowed_frontend_origins(settings):
        raise HTTPException(
            status_code=400,
            detail=f"Stripe {field_name} origin is not allowed",
        )
    return value


def create_checkout_session(
    user: AuthUser,
    interval: BillingInterval,
    *,
    success_url: str | None = None,
    cancel_url: str | None = None,
) -> str:
    settings = get_settings()
    resolved_success_url = _redirect_url(
        success_url,
        settings.stripe_success_url,
        settings,
        "success URL",
    )
    resolved_cancel_url = _redirect_url(
        cancel_url,
        settings.stripe_cancel_url,
        settings,
        "cancel URL",
    )
    subscription = _subscription_for_user(user.id)
    if _effective_pro(subscription) or _other_provider_active_for_user(user.id, settings=settings):
        raise HTTPException(status_code=409, detail="An active Pro subscription already exists")

    price_id = {
        "monthly": settings.stripe_price_monthly,
        "yearly": settings.stripe_price_yearly,
    }[interval]
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Stripe {interval} price is not configured")

    stripe = _stripe()
    params: dict[str, Any] = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "client_reference_id": user.id,
        "success_url": resolved_success_url,
        "cancel_url": resolved_cancel_url,
        "metadata": {"user_id": user.id, "plan": "pro"},
        "subscription_data": {"metadata": {"user_id": user.id, "plan": "pro"}},
    }
    if user.email:
        params["customer_email"] = user.email
    if subscription and subscription.get("stripe_customer_id"):
        params.pop("customer_email", None)
        params["customer"] = subscription["stripe_customer_id"]

    try:
        session = stripe.checkout.Session.create(**params)
    except Exception as exc:
        raise _stripe_error(exc) from exc
    url = session.get("url") if hasattr(session, "get") else getattr(session, "url", None)
    if not url:
        raise HTTPException(status_code=502, detail="Stripe did not return a checkout URL")
    return str(url)


def create_portal_session(user: AuthUser, *, return_url: str | None = None) -> str:
    settings = get_settings()
    resolved_return_url = _redirect_url(
        return_url,
        settings.stripe_portal_return_url,
        settings,
        "portal return URL",
    )
    subscription = _subscription_for_user(user.id)
    customer_id = subscription.get("stripe_customer_id") if subscription else None
    if not customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer is attached to this account")

    stripe = _stripe()
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=resolved_return_url,
        )
    except Exception as exc:
        raise _stripe_error(exc) from exc
    url = session.get("url") if hasattr(session, "get") else getattr(session, "url", None)
    if not url:
        raise HTTPException(status_code=502, detail="Stripe did not return a portal URL")
    return str(url)


def _value(value: Any, key: str, default: Any = None) -> Any:
    if isinstance(value, dict):
        return value.get(key, default)
    try:
        return value.get(key, default)
    except AttributeError:
        return getattr(value, key, default)


def _unix_datetime(value: Any) -> str | None:
    if value is None:
        return None
    return datetime.fromtimestamp(int(value), tz=timezone.utc).isoformat()


def _event_payload(value: Any) -> dict[str, Any]:
    try:
        return json.loads(value.to_json())
    except (AttributeError, TypeError, json.JSONDecodeError):
        return {}


def _subscription_details(subscription: Any) -> dict[str, Any]:
    items = _value(_value(subscription, "items", {}), "data", []) or []
    item = items[0] if items else {}
    price = _value(item, "price", {})
    return {
        "subscription_id": _value(subscription, "id"),
        "customer_id": _value(subscription, "customer"),
        "price_id": _value(price, "id"),
        "status": _value(subscription, "status") or "incomplete",
        "current_period_start": _unix_datetime(_value(subscription, "current_period_start")),
        "current_period_end": _unix_datetime(_value(subscription, "current_period_end")),
        "cancel_at_period_end": bool(_value(subscription, "cancel_at_period_end", False)),
        "metadata": _value(subscription, "metadata", {}) or {},
    }


def _find_user_by_customer(customer_id: str | None) -> str | None:
    subscription = _subscription_by_customer(customer_id)
    return str(subscription["user_id"]) if subscription else None


def _subscription_by_customer(customer_id: str | None) -> dict[str, Any] | None:
    if not customer_id:
        return None
    response = (
        get_supabase_service_role_client()
        .table("screener_subscriptions")
        .select("user_id,stripe_subscription_id")
        .eq("stripe_customer_id", customer_id)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return rows[0] if rows else None


def _sync_subscription(
    event: Any,
    subscription: Any,
    user_id: str | None,
) -> None:
    details = _subscription_details(subscription)
    metadata = details["metadata"]
    user_id = user_id or str(metadata.get("user_id") or "") or _find_user_by_customer(details["customer_id"])
    if not user_id:
        # A subscription not created by this application must not be attached
        # to an arbitrary account.
        return

    event_id = str(_value(event, "id", ""))
    created = _unix_datetime(_value(event, "created"))
    if not event_id or not created:
        raise HTTPException(status_code=400, detail="Stripe event is missing id or created timestamp")
    try:
        get_supabase_service_role_client().rpc(
            "screener_sync_subscription",
            {
                "p_stripe_event_id": event_id,
                "p_event_type": str(_value(event, "type", "")),
                "p_stripe_event_created_at": created,
                "p_user_id": user_id,
                "p_stripe_customer_id": details["customer_id"],
                "p_stripe_subscription_id": details["subscription_id"],
                "p_stripe_price_id": details["price_id"],
                "p_status": details["status"],
                "p_current_period_start": details["current_period_start"],
                "p_current_period_end": details["current_period_end"],
                "p_cancel_at_period_end": details["cancel_at_period_end"],
                "p_plan": "pro",
                "p_payload": _event_payload(subscription),
            },
        ).execute()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Subscription state sync failed") from exc


def _sync_refund(stripe, event: Any, refund: Any) -> None:
    refund_id = str(_value(refund, "id", ""))
    if not refund_id:
        return

    charge_id = _value(refund, "charge")
    charge: Any = None
    if charge_id:
        try:
            charge = stripe.Charge.retrieve(charge_id)
        except Exception as exc:
            raise _stripe_error(exc) from exc

    payment_intent_id = _value(refund, "payment_intent") or _value(charge, "payment_intent")
    customer_id = _value(charge, "customer") or _value(refund, "customer")
    subscription = _subscription_by_customer(customer_id)
    metadata = _value(refund, "metadata", {}) or {}
    if not metadata:
        metadata = _value(charge, "metadata", {}) or {}
    user_id = str(metadata.get("user_id") or "") or (
        str(subscription["user_id"]) if subscription else None
    )
    if not user_id and payment_intent_id:
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        except Exception as exc:
            raise _stripe_error(exc) from exc
        pi_metadata = _value(payment_intent, "metadata", {}) or {}
        user_id = str(pi_metadata.get("user_id") or "") or None
        customer_id = customer_id or _value(payment_intent, "customer")
        if not subscription:
            subscription = _subscription_by_customer(customer_id)
            user_id = user_id or (str(subscription["user_id"]) if subscription else None)
    if not user_id:
        # Ignore refunds that do not belong to a Stock Screener customer.
        return

    charge_amount = _value(charge, "amount")
    amount_refunded = _value(charge, "amount_refunded")
    is_full_refund = bool(
        charge_amount is not None
        and amount_refunded is not None
        and int(charge_amount) > 0
        and int(amount_refunded) >= int(charge_amount)
    )
    status = str(_value(refund, "status") or "pending")
    if status not in {"pending", "succeeded", "failed", "canceled"}:
        status = "pending"
    event_id = str(_value(event, "id", ""))
    created = _unix_datetime(_value(event, "created"))
    if not event_id or not created:
        raise HTTPException(status_code=400, detail="Stripe refund event is missing id or created timestamp")

    try:
        get_supabase_service_role_client().rpc(
            "screener_sync_refund",
            {
                "p_stripe_event_id": event_id,
                "p_event_type": str(_value(event, "type", "")),
                "p_stripe_event_created_at": created,
                "p_user_id": user_id,
                "p_stripe_refund_id": refund_id,
                "p_stripe_customer_id": customer_id,
                "p_stripe_subscription_id": (
                    str(subscription["stripe_subscription_id"])
                    if subscription and subscription.get("stripe_subscription_id")
                    else None
                ),
                "p_stripe_payment_intent_id": payment_intent_id,
                "p_stripe_charge_id": charge_id,
                "p_amount": int(_value(refund, "amount", 0) or 0),
                "p_charge_amount": int(charge_amount) if charge_amount is not None else None,
                "p_currency": _value(refund, "currency") or _value(charge, "currency"),
                "p_status": status,
                "p_is_full_refund": is_full_refund,
                "p_refunded_at": _unix_datetime(_value(refund, "created")),
                "p_payload": _event_payload(refund),
            },
        ).execute()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Refund state sync failed") from exc


def handle_webhook(payload: bytes, signature: str | None) -> None:
    stripe = _stripe()
    settings = get_settings()
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook is not configured")
    if not signature:
        raise HTTPException(status_code=400, detail="Stripe-Signature header is required")
    try:
        event = stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature") from exc

    event_type = str(_value(event, "type", ""))
    event_object = _value(_value(event, "data", {}), "object", {})
    if event_type == "checkout.session.completed":
        user_id = str(
            _value(_value(event_object, "metadata", {}), "user_id")
            or _value(event_object, "client_reference_id")
            or ""
        ) or None
        subscription_id = _value(event_object, "subscription")
        if subscription_id:
            try:
                subscription = stripe.Subscription.retrieve(subscription_id)
            except Exception as exc:
                raise _stripe_error(exc) from exc
            _sync_subscription(event, subscription, user_id)
    elif event_type.startswith("customer.subscription."):
        _sync_subscription(event, event_object, None)
    elif event_type in {"refund.created", "refund.updated", "refund.failed"}:
        _sync_refund(stripe, event, event_object)
