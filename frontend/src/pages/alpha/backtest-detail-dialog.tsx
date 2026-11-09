import { useTranslation } from "react-i18next"
import { useRequest } from "ahooks"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { getAlphaBacktestDetail } from "@/lib/service"
import {
  alphaMetrics,
  alphaMetricClass,
  formatAlphaDate,
  formatAlphaMetric,
} from "@/lib/alpha-format"

const paramsOrder = [
  "start_time",
  "end_time",
  "account",
  "benchmark",
  "topk",
  "hold_days",
  "deal_price",
  "open_cost",
  "close_cost",
  "min_cost",
  "limit_threshold",
]

function BacktestContent({
  factor,
}: {
  factor: Pick<API.AlphaFactor, "id" | "name" | "expr">
}) {
  const { t, i18n } = useTranslation()
  const { data, loading, error, refresh } = useRequest(() =>
    getAlphaBacktestDetail(factor.id)
  )
  const chartRows = Array.isArray(data?.report_normal)
    ? data.report_normal
        .filter(
          (row) => Number.isFinite(row.return) && Number.isFinite(row.bench)
        )
        .map((row) => ({
          ...row,
          return: row.return - 1,
          bench: row.bench - 1,
        }))
    : []
  const icRows = Array.isArray(data?.ic_detail)
    ? data.ic_detail.filter(
        (row) => Number.isFinite(row.ic) && Number.isFinite(row.rank_ic)
      )
    : []
  if (loading)
    return (
      <div className="space-y-4" aria-label={t("alpha.loading")}>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  if (error)
    return (
      <div role="alert" className="py-12 text-center text-sm">
        <p>{t("alpha.errors.backtest")}</p>
        <Button onClick={refresh} variant="outline" className="mt-3">
          {t("alpha.retry")}
        </Button>
      </div>
    )
  if (!data)
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {t("alpha.noBacktest")}
      </p>
    )
  const formatParam = (
    key: string,
    value: string | number | boolean | null
  ) => {
    if (value == null) return "—"
    if (
      ["open_cost", "close_cost", "limit_threshold"].includes(key) &&
      typeof value === "number"
    )
      return `${(value * 100).toFixed(2)}%`
    if (key === "deal_price" && (value === "open" || value === "close"))
      return t(`alpha.${value}Price`)
    return typeof value === "number"
      ? new Intl.NumberFormat(i18n.language).format(value)
      : String(value)
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {t("alpha.createdAt")}:{" "}
          {formatAlphaDate(data.created_at, i18n.language)}
        </span>
      </div>
      <code className="block rounded-xl bg-muted p-4 text-xs leading-6 break-all whitespace-pre-wrap">
        {factor.expr}
      </code>
      <section
        aria-label={t("alpha.backtestResult")}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {alphaMetrics.map(([key, label]) => (
          <div key={key} className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">
              {t(`alpha.metric.${label}`)}
            </div>
            <div
              className={`mt-2 text-xl font-semibold tabular-nums ${alphaMetricClass(key, data.results?.[key])}`}
            >
              {formatAlphaMetric(key, data.results?.[key])}
            </div>
          </div>
        ))}
      </section>
      <Card>
        <CardHeader>
          <CardTitle>{t("alpha.cumulativeReturn")}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartRows.length ? (
            <div
              className="h-72 min-w-0"
              role="img"
              aria-label={t("alpha.cumulativeReturn")}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="datetime"
                    minTickGap={48}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) =>
                      formatAlphaDate(String(value), i18n.language)
                    }
                  />
                  <YAxis
                    width={60}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value: number) =>
                      `${(value * 100).toFixed(0)}%`
                    }
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      formatAlphaDate(String(value), i18n.language)
                    }
                    formatter={(value) =>
                      `${(Number(value) * 100).toFixed(2)}%`
                    }
                    contentStyle={{
                      background: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Line
                    name={t("alpha.strategyReturn")}
                    type="monotone"
                    dataKey="return"
                    stroke="#e76e50"
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Line
                    name={t("alpha.benchmarkReturn")}
                    type="monotone"
                    dataKey="bench"
                    stroke="#2584d5"
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {t("alpha.noChart")}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("alpha.icDetail")}</CardTitle>
        </CardHeader>
        <CardContent>
          {icRows.length ? (
            <div
              className="h-64 min-w-0"
              role="img"
              aria-label={t("alpha.icDetail")}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={icRows} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="datetime"
                    minTickGap={48}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) =>
                      formatAlphaDate(String(value), i18n.language)
                    }
                  />
                  <YAxis width={60} tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(value) =>
                      formatAlphaDate(String(value), i18n.language)
                    }
                    formatter={(value) => Number(value).toFixed(4)}
                    contentStyle={{
                      background: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Line
                    name="IC"
                    dataKey="ic"
                    stroke="#2584d5"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    name="Rank IC"
                    dataKey="rank_ic"
                    stroke="#a78bfa"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {t("alpha.noChart")}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("alpha.backtestParams")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ...paramsOrder,
              ...Object.keys(data.params ?? {}).filter(
                (key) => !paramsOrder.includes(key)
              ),
            ]
              .filter((key) => data.params?.[key] != null)
              .map((key) => (
                <div key={key} className="rounded-lg border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t(`alpha.params.${key}`, { defaultValue: key })}
                  </div>
                  <div className="mt-1 text-sm font-medium break-all">
                    {formatParam(key, data.params![key])}
                  </div>
                </div>
              ))}
          </div>
          {!Object.keys(data.params ?? {}).length && (
            <p className="text-sm text-muted-foreground">
              {t("alpha.noBacktest")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function BacktestDetailDialog({
  factor,
  onClose,
}: {
  factor: Pick<API.AlphaFactor, "id" | "name" | "expr"> | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={Boolean(factor)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="flex max-h-[92dvh] min-w-0 flex-col overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4">
          <DialogTitle>{t("alpha.backtestDetails")}</DialogTitle>
          <DialogDescription>{factor?.name}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-4 pb-6 sm:px-6">
          {factor && <BacktestContent key={factor.id} factor={factor} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
