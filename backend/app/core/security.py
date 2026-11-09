import base64
import binascii
import hashlib
import hmac
import json
import time
from typing import Any


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def sign_payload(payload: dict[str, Any], secret: str) -> str:
    body = _base64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signature = hmac.new(secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest()
    return f"{body}.{_base64url_encode(signature)}"


def verify_signed_payload(token: str, secret: str) -> dict[str, Any]:
    try:
        body, signature = token.split(".", 1)
    except ValueError as exc:
        raise ValueError("Invalid signed payload") from exc

    expected = hmac.new(secret.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest()
    received = _base64url_decode(signature)
    if not hmac.compare_digest(expected, received):
        raise ValueError("Invalid signed payload signature")

    return json.loads(_base64url_decode(body))


def create_access_token(payload: dict[str, Any], secret: str, expires_in_seconds: int) -> str:
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    claims = {**payload, "iat": now, "exp": now + expires_in_seconds}
    encoded_header = _base64url_encode(
        json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    encoded_claims = _base64url_encode(
        json.dumps(claims, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signing_input = f"{encoded_header}.{encoded_claims}".encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{encoded_header}.{encoded_claims}.{_base64url_encode(signature)}"


WALLET_JWT_ISSUER = "stock-screener-server"
WALLET_JWT_AUDIENCE = "stock-screener"


def verify_access_token(
    token: str, secret: str, *, issuer: str | None = None, audience: str | None = None
) -> dict[str, Any]:
    try:
        encoded_header, encoded_claims, encoded_signature = token.split(".", 2)
    except ValueError as exc:
        raise ValueError("Invalid access token") from exc

    try:
        header = json.loads(_base64url_decode(encoded_header))
        if not isinstance(header, dict) or header.get("alg") != "HS256":
            raise ValueError("Invalid access token algorithm")

        signing_input = f"{encoded_header}.{encoded_claims}".encode("ascii")
        expected = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
        received = _base64url_decode(encoded_signature)
        if not hmac.compare_digest(expected, received):
            raise ValueError("Invalid access token signature")

        claims = json.loads(_base64url_decode(encoded_claims))
        if not isinstance(claims, dict):
            raise ValueError("Invalid access token claims")
        expires_at = int(claims.get("exp") or 0)
    except (binascii.Error, json.JSONDecodeError, TypeError) as exc:
        raise ValueError("Invalid access token") from exc

    if expires_at <= int(time.time()):
        raise ValueError("Access token expired")
    if issuer is not None and claims.get("iss") != issuer:
        raise ValueError("Invalid access token issuer")
    if audience is not None and claims.get("aud") != audience:
        raise ValueError("Invalid access token audience")

    return claims
