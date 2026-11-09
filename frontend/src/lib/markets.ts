export const DEFAULT_STOCK_SCREENER_MARKET: API.StockScreenerMarket = "korea"

export const stockScreenerMarketOptions: {
  code: API.StockScreenerMarket
  countryCode: string
  labelKey: string
}[] = [
  {
    code: "america",
    countryCode: "US",
    labelKey: "stockScreener.markets.america",
  },
  {
    code: "coin",
    countryCode: "CRYPTO",
    labelKey: "stockScreener.markets.coin",
  },
  {
    code: "cex",
    countryCode: "CEX",
    labelKey: "stockScreener.markets.cex",
  },
  {
    code: "dex",
    countryCode: "DEX",
    labelKey: "stockScreener.markets.dex",
  },
  {
    code: "korea",
    countryCode: "KR",
    labelKey: "stockScreener.markets.korea",
  },
  {
    code: "monad",
    countryCode: "MONAD",
    labelKey: "stockScreener.markets.monad",
  },
  {
    code: "china",
    countryCode: "CN",
    labelKey: "stockScreener.markets.china",
  },
  {
    code: "japan",
    countryCode: "JP",
    labelKey: "stockScreener.markets.japan",
  },
  {
    code: "hongkong",
    countryCode: "HK",
    labelKey: "stockScreener.markets.hongkong",
  },
  {
    code: "taiwan",
    countryCode: "TW",
    labelKey: "stockScreener.markets.taiwan",
  },
  {
    code: "india",
    countryCode: "IN",
    labelKey: "stockScreener.markets.india",
  },
  {
    code: "russia",
    countryCode: "RU",
    labelKey: "stockScreener.markets.russia",
  },
]

export function getCountryLogoUrl(countryCode: string) {
  return `https://s3-symbol-logo.tradingview.com/country/${countryCode}.svg`
}
