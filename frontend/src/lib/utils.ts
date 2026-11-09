import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Normalized display name for both classic securities and TradingView crypto rows. */
export function getScreenerRowName(row: API.ScreenerResultRow) {
  return (
    row.name ||
    row["ticker-view"]?.name ||
    row.description ||
    row["ticker-view"]?.description ||
    ""
  )
}

/** The decision API accepts the symbol code, not TradingView's exchange-qualified ticker. */
export function getScreenerRowCode(row: API.ScreenerResultRow) {
  const name = getScreenerRowName(row)
  if (row.market === "coin" || row.ticker?.startsWith("CRYPTO:")) {
    return row.ticker
  }
  return name
}

export function getScreenerRowCodeAndDescription(row: API.ScreenerResultRow) {
  if (row.market === "coin" || row.ticker?.startsWith("CRYPTO:")) {
    return row.ticker
  }
  return row.name + (row.description ? `(${row.description})` : "")
}

export function getStockQuoteUrl(data: API.ScreenerResultRow) {
  if (data.market === "china") {
    const exchangePrefix = data.ticker.startsWith("SZSE") ? "sz" : "sh"

    return `https://quote.eastmoney.com/${exchangePrefix}${data.name}.html`
  }

  if (data.market === "korea") {
    return `https://finance.naver.com/item/main.naver?code=${data.name}`
  }

  if (data.market === "japan") {
    return `https://finance.yahoo.co.jp/quote/${data.name}.T`
  }

  const symbol = data.ticker.includes(":")
    ? data.ticker.replace(":", "-")
    : `${data.exchange}-${data.name}`

  return `https://www.tradingview.com/symbols/${symbol}/`
}

export function getStockQuoteUrl2(
  stock: string,
  market: API.StockScreenerMarket
) {
  if (market === "china") {
    const exchangePrefix = stock.startsWith("SZSE") ? "sz" : "sh"

    return `https://quote.eastmoney.com/${exchangePrefix}${stock}.html`
  }

  if (market === "korea") {
    return `https://finance.naver.com/item/main.naver?code=${stock}`
  }

  if (market === "japan") {
    return `https://finance.yahoo.co.jp/quote/${stock}.T`
  }

  if (market === "america") {
    return `https://finance.yahoo.com/quote/${stock}/`
  }

  return `https://www.tradingview.com/symbols/${stock}}/`
}
