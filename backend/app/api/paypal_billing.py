from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from app.models.auth import AuthUser
from app.services.auth import AuthService
from app.services.paypal import PayPalService


router = APIRouter(prefix="/billing/paypal", tags=["billing"])


class PayPalSubscriptionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    interval: Literal["monthly", "yearly"]


class PayPalCancelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(default="Customer requested cancellation", min_length=1, max_length=128)


@router.get("/config")
def paypal_config(authorization: str | None = Header(default=None)) -> dict:
    _current_user(authorization)
    return PayPalService().provider_config()


@router.post("/subscriptions")
def paypal_create_subscription(
    request: PayPalSubscriptionRequest,
    authorization: str | None = Header(default=None),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> dict:
    user = _current_user(authorization)
    if idempotency_key is not None and not 1 <= len(idempotency_key) <= 128:
        raise HTTPException(status_code=400, detail="Invalid Idempotency-Key")
    return PayPalService().create_subscription(
        user,
        interval=request.interval,
        idempotency_key=idempotency_key,
    )


@router.post("/subscriptions/{subscription_id}/confirm")
def paypal_confirm_subscription(
    subscription_id: str,
    authorization: str | None = Header(default=None),
) -> dict:
    return PayPalService().confirm_subscription(_current_user(authorization), subscription_id)


@router.post("/subscriptions/{subscription_id}/cancel")
def paypal_cancel_subscription(
    subscription_id: str,
    request: PayPalCancelRequest | None = None,
    authorization: str | None = Header(default=None),
) -> dict:
    return PayPalService().cancel_subscription(
        _current_user(authorization),
        subscription_id,
        request.reason if request else "Customer requested cancellation",
    )


@router.post("/webhook", include_in_schema=False)
async def paypal_webhook(
    request: Request,
    paypal_transmission_id: str | None = Header(default=None, alias="paypal-transmission-id"),
    paypal_transmission_time: str | None = Header(default=None, alias="paypal-transmission-time"),
    paypal_cert_url: str | None = Header(default=None, alias="paypal-cert-url"),
    paypal_auth_algo: str | None = Header(default=None, alias="paypal-auth-algo"),
    paypal_transmission_sig: str | None = Header(default=None, alias="paypal-transmission-sig"),
) -> dict[str, bool]:
    PayPalService().handle_webhook(
        await request.body(),
        transmission_id=paypal_transmission_id,
        transmission_time=paypal_transmission_time,
        cert_url=paypal_cert_url,
        auth_algo=paypal_auth_algo,
        transmission_sig=paypal_transmission_sig,
    )
    return {"received": True}


def _current_user(authorization: str | None) -> AuthUser:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Bearer token is required")
    return AuthService().current_user(token.strip())
