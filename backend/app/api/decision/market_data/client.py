import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


DEFAULT_TIMEOUT_SECONDS = 10
DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"


class MarketDataRequestError(RuntimeError):
    """Raised when a market data endpoint cannot be fetched or decoded."""


class MarketDataClient:
    """Small JSON request wrapper for market data providers.

    Keep all HTTP calls behind this class so proxy, retry, or shared headers can
    be added in one place later.
    """

    def __init__(
        self,
        *,
        timeout: int = DEFAULT_TIMEOUT_SECONDS,
        user_agent: str = DEFAULT_USER_AGENT,
    ) -> None:
        self.timeout = timeout
        self.user_agent = user_agent

    def request(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        if method.upper() != "GET":
            raise ValueError("MarketDataClient currently supports GET only")

        target_url = self._with_query(url, params)
        request = Request(
            target_url,
            method="GET",
            headers={
                "Accept": "application/json",
                "User-Agent": self.user_agent,
                **(headers or {}),
            },
        )

        try:
            with urlopen(request, timeout=self.timeout) as response:
                status = response.status
                body = response.read()
        except HTTPError as exc:
            raise MarketDataRequestError(
                f"Endpoint returned non-200 status: {exc.code}"
            ) from exc
        except URLError as exc:
            raise MarketDataRequestError(f"Endpoint request failed: {exc.reason}") from exc

        if status < 200 or status >= 300:
            raise MarketDataRequestError(f"Endpoint returned non-200 status: {status}")

        try:
            return json.loads(body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise MarketDataRequestError("Endpoint returned invalid JSON") from exc

    def request_text(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> str:
        if method.upper() != "GET":
            raise ValueError("MarketDataClient currently supports GET only")

        target_url = self._with_query(url, params)
        request = Request(
            target_url,
            method="GET",
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "User-Agent": self.user_agent,
                **(headers or {}),
            },
        )

        try:
            with urlopen(request, timeout=self.timeout) as response:
                status = response.status
                body = response.read()
                charset = response.headers.get_content_charset()
        except HTTPError as exc:
            raise MarketDataRequestError(
                f"Endpoint returned non-200 status: {exc.code}"
            ) from exc
        except URLError as exc:
            raise MarketDataRequestError(f"Endpoint request failed: {exc.reason}") from exc

        if status < 200 or status >= 300:
            raise MarketDataRequestError(f"Endpoint returned non-200 status: {status}")

        encodings = [charset, "utf-8", "euc-kr"]
        for encoding in encodings:
            if not encoding:
                continue
            try:
                return body.decode(encoding)
            except UnicodeDecodeError:
                continue
        return body.decode("utf-8", errors="replace")

    def get(
        self,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        return self.request("GET", url, params=params, headers=headers)

    def get_text(
        self,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> str:
        return self.request_text("GET", url, params=params, headers=headers)

    def _with_query(self, url: str, params: dict[str, Any] | None) -> str:
        if not params:
            return url

        query = urlencode(
            {key: value for key, value in params.items() if value is not None},
            doseq=True,
        )
        if not query:
            return url

        separator = "&" if "?" in url else "?"
        return f"{url}{separator}{query}"
