export const alphaMetrics = [
  ["Annual Return", "annualReturn"],
  ["Information Ratio", "informationRatio"],
  ["Max Drawdown", "maxDrawdown"],
  ["IC Mean", "icMean"],
  ["ICIR", "icir"],
  ["Rank IC Mean", "rankIcMean"],
  ["Rank ICIR", "rankIcir"],
] as const

export function formatAlphaMetric(key: string, raw: unknown) {
  if (raw == null || raw === "") return "—"
  const value = Number(raw)
  if (!Number.isFinite(value)) return "—"
  return key === "Annual Return" || key === "Max Drawdown"
    ? `${(value * 100).toFixed(2)}%`
    : value.toFixed(4)
}

export function alphaMetricClass(key: string, raw: unknown) {
  if (raw == null || raw === "") return ""
  const value = Number(raw)
  if (
    !Number.isFinite(value) ||
    !["Annual Return", "Information Ratio", "Max Drawdown"].includes(key)
  )
    return ""
  return value > 0
    ? "text-red-600 dark:text-red-400"
    : value < 0
      ? "text-emerald-600 dark:text-emerald-400"
      : ""
}

export function formatAlphaDate(value: string, locale: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date)
}
