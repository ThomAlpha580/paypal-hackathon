from typing import Any, Literal

from app.api.decision.market_data.providers import america, cryptocurrency, hongkong, korea


Market = Literal["korea", "america", "hongkong", "coin", "monad", "solana"]
FinancialPeriodType = Literal["annual", "quarter"]
KoreaMarketIndex = korea.KoreaMarketIndex


def resolve_ticker(
    market: Market,
    query: str,
) -> dict[str, Any]:
    if market == "korea":
        return korea.resolve_ticker(query)
    return _unsupported_market(market)


def fetch_realtime_quote(
    market: Market,
    ticker: str,
) -> dict[str, Any]:
    if market == "korea":
        return korea.fetch_realtime_quote(ticker)
    return _unsupported_market(market)


def fetch_integration_snapshot(
    market: Market,
    ticker: str,
) -> dict[str, Any]:
    if market == "korea":
        return korea.fetch_integration_snapshot(ticker)
    return _unsupported_market(market)


def fetch_financials(
    market: Market,
    ticker: str,
    period_type: FinancialPeriodType,
) -> dict[str, Any]:
    if market == "korea":
        return korea.fetch_financials(ticker, period_type)
    return _unsupported_market(market)


def fetch_annual_financials(
    market: Market,
    ticker: str,
) -> dict[str, Any]:
    if market == "korea":
        return korea.fetch_annual_financials(ticker)
    return _unsupported_market(market)


def fetch_quarter_financials(
    market: Market,
    ticker: str,
) -> dict[str, Any]:
    if market == "korea":
        return korea.fetch_quarter_financials(ticker)
    return _unsupported_market(market)


def fetch_price_history(
    market: Market,
    ticker: str,
    *,
    page_size: int = 60,
    page: int = 1,
) -> dict[str, Any]:
    if market == "korea":
        return korea.fetch_price_history(ticker, page_size=page_size, page=page)
    return _unsupported_market(market)


def fetch_market_index(
    market: Market,
    index_code: KoreaMarketIndex,
) -> dict[str, Any]:
    if market == "korea":
        return korea.fetch_market_index(index_code)
    return _unsupported_market(market)


def fetch_compact_quote_snapshot(
    market: Market,
    ticker: str,
) -> dict[str, Any]:
    if market == "korea":
        return korea.fetch_compact_quote_snapshot(ticker)
    if market == "america":
        return america.provider.fetch_compact_quote_snapshot(ticker)
    if market == "hongkong":
        return hongkong.provider.fetch_compact_quote_snapshot(ticker)
    if market in {"coin", "monad", "solana"}:
        return cryptocurrency.provider.fetch_compact_quote_snapshot(ticker)
    return _unsupported_market(market)


def fetch_stock_news(
    market: Market,
    ticker: str,
) -> dict[str, Any]:
    if market == "korea":
        return korea.fetch_stock_news(ticker)
    if market == "america":
        return america.provider.fetch_stock_news(ticker)
    if market == "hongkong":
        return hongkong.provider.fetch_stock_news(ticker)
    if market in {"coin", "monad", "solana"}:
        return cryptocurrency.provider.fetch_stock_news(ticker)
    return _unsupported_market(market)


def get_report(
    market: Market,
    ticker: str,
) -> dict[str, Any]:
    if market == "korea":
        return korea.get_report(ticker)
    if market == "america":
        return america.provider.get_report(ticker)
    if market == "hongkong":
        return hongkong.provider.get_report(ticker)
    if market in {"coin", "monad", "solana"}:
        return cryptocurrency.provider.get_report(ticker, market=market)
    return _unsupported_market(market)


def _unsupported_market(market: str) -> dict[str, Any]:
    return {
        "success": False,
        "error_reasoning": f"Unsupported market: {market}",
    }
