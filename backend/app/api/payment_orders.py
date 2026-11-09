from __future__ import annotations

import re
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.auth import AuthUser
from app.services.auth import AuthService
from app.services.crypto_payments import CryptoPaymentService


router = APIRouter(prefix="/billing", tags=["billing"])


class PaymentOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: Literal["crypto"] = "crypto"
    plan: Literal["pro"] = "pro"
    interval: Literal["monthly", "yearly"]
    chain: Literal["monad", "solana"] = "monad"
    asset: Literal["MON", "SOL"] = "MON"
    payer_address: str = Field(min_length=32, max_length=44)

    @model_validator(mode="after")
    def validate_chain_address(self):
        if self.chain == "monad" and not re.fullmatch(r"0x[0-9a-fA-F]{40}", self.payer_address):
            raise ValueError("payer_address must be an EVM address for Monad payments")
        if self.chain == "solana" and not re.fullmatch(r"[1-9A-HJ-NP-Za-km-z]{32,44}", self.payer_address):
            raise ValueError("payer_address must be a Solana address for SOL payments")
        return self


class PaymentVerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tx_hash: str = Field(pattern=r"^(0x[0-9a-fA-F]{64}|[1-9A-HJ-NP-Za-km-z]{80,100})$")


@router.post("/payment-orders")
def create_payment_order(
    request: PaymentOrderRequest,
    authorization: str | None = Header(default=None),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> dict:
    user = _current_user(authorization)
    if idempotency_key is not None:
        if not 1 <= len(idempotency_key) <= 128:
            raise HTTPException(status_code=400, detail="Invalid Idempotency-Key")
    return CryptoPaymentService().create_order(
        user,
        interval=request.interval,
        payer_address=request.payer_address,
        chain=request.chain,
        asset=request.asset,
        idempotency_key=idempotency_key,
    )


@router.get("/payment-orders/{order_id}")
def get_payment_order(
    order_id: UUID,
    authorization: str | None = Header(default=None),
) -> dict:
    return CryptoPaymentService().get_order(_current_user(authorization), order_id)


@router.post("/payment-orders/{order_id}/verify")
def verify_payment_order(
    order_id: UUID,
    request: PaymentVerifyRequest,
    response: Response,
    authorization: str | None = Header(default=None),
) -> dict:
    result = CryptoPaymentService().verify_order(
        _current_user(authorization), order_id, request.tx_hash
    )
    if result.get("status") != "paid":
        response.status_code = 202
    return result


def _current_user(authorization: str | None) -> AuthUser:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Bearer token is required")
    return AuthService().current_user(token.strip())
