from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from app.models.auth import AuthUser
from app.services.auth import AuthService
from app.services.billing import (
    _subscription_for_user,
    _paypal_subscription_for_user,
)
from app.services.quota import get_entitlements


router = APIRouter(prefix="/billing", tags=["billing"])


class CheckoutRequest(BaseModel):
    interval: Literal["monthly", "yearly"]
    # The backend validates these URLs against STRIPE_ALLOWED_FRONTEND_ORIGINS.
    success_url: str | None = None
    cancel_url: str | None = None


class PortalRequest(BaseModel):
    # The backend validates this URL against STRIPE_ALLOWED_FRONTEND_ORIGINS.
    return_url: str | None = None


class BillingLinkResponse(BaseModel):
    url: str


@router.get("/me")
def billing_me(authorization: str | None = Header(default=None)) -> dict:
    user = _current_user(authorization)
    subscription = _subscription_for_user(user.id)
    paypal_subscription = _paypal_subscription_for_user(user.id)
    return {
        **get_entitlements(user.id),
        "subscription_status": subscription.get("status") if subscription else None,
        "current_period_end": subscription.get("current_period_end") if subscription else None,
        "cancel_at_period_end": bool(subscription.get("cancel_at_period_end"))
        if subscription
        else False,
        "paypal_subscription_status": (
            paypal_subscription.get("status") if paypal_subscription else None
        ),
        "paypal_current_period_end": (
            paypal_subscription.get("current_period_end") if paypal_subscription else None
        ),
        "paypal_cancel_at_period_end": bool(
            paypal_subscription.get("cancel_at_period_end")
        ) if paypal_subscription else False,
    }


def _current_user(authorization: str | None) -> AuthUser:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Bearer token is required")
    return AuthService().current_user(token.strip())
