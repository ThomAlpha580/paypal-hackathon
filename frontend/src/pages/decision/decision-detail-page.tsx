import * as React from "react"
import { fetchEventSource } from "@microsoft/fetch-event-source"
import { cjk } from "@streamdown/cjk"
import { Streamdown } from "streamdown"
import { Link, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import {
  BrainCircuitIcon,
  CalculatorIcon,
  ChartCandlestickIcon,
  ChevronLeftIcon,
  FileSearchCornerIcon,
  LockKeyholeIcon,
  NewspaperIcon,
  UnlockIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DecisionOperationTable } from "@/pages/decision/decision-operation"
import { ApiPrefix, getDecisionTask, getToken } from "@/lib/service"
import { cn } from "@/lib/utils"
import { FlickeringGrid } from "@/components/ui/flickering-grid.tsx"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import useDecisionTasks from "@/hooks/use-decision-tasks.ts"
import { DecisionPaypalUnlockDialog } from "@/pages/decision/decision-paypal-unlock-dialog"

type SnapshotField = {
  key: keyof API.PriceSnapshotKorea
  labelKey: string
  type?: "number" | "percent"
}

const snapshotFields: SnapshotField[] = [
  {
    key: "price",
    labelKey: "decisionDetail.snapshot.price",
    type: "number",
  },
  {
    key: "change_pct",
    labelKey: "decisionDetail.snapshot.changePct",
    type: "percent",
  },
  {
    key: "change",
    labelKey: "decisionDetail.snapshot.change",
    type: "number",
  },
  {
    key: "volume",
    labelKey: "decisionDetail.snapshot.volume",
    type: "number",
  },
  {
    key: "open",
    labelKey: "decisionDetail.snapshot.open",
    type: "number",
  },
  {
    key: "high",
    labelKey: "decisionDetail.snapshot.high",
    type: "number",
  },
  {
    key: "low",
    labelKey: "decisionDetail.snapshot.low",
    type: "number",
  },
  {
    key: "prev_close",
    labelKey: "decisionDetail.snapshot.prevClose",
    type: "number",
  },
  {
    key: "market_cap",
    labelKey: "decisionDetail.snapshot.marketCap",
    type: "number",
  },
  {
    key: "currency",
    labelKey: "decisionDetail.snapshot.currency",
  },
  {
    key: "ticker",
    labelKey: "decisionDetail.snapshot.ticker",
  },
  {
    key: "market",
    labelKey: "decisionDetail.snapshot.market",
  },
  {
    key: "high_52w",
    labelKey: "decisionDetail.snapshot.high52w",
    type: "number",
  },
  {
    key: "low_52w",
    labelKey: "decisionDetail.snapshot.low52w",
    type: "number",
  },
  {
    key: "per",
    labelKey: "decisionDetail.snapshot.per",
  },
  {
    key: "pbr",
    labelKey: "decisionDetail.snapshot.pbr",
  },
  {
    key: "foreign_rate",
    labelKey: "decisionDetail.snapshot.foreignRate",
    type: "percent",
  },
  {
    key: "dividend_yield",
    labelKey: "decisionDetail.snapshot.dividendYield",
    type: "percent",
  },
]
const decisionLoadingMessageKeys = [
  "queryingPrice",
  "retrievingNews",
  "checkingFinancials",
  "analyzingTrend",
  "calculatingRisk",
  "generatingDecision",
] as const
const decisionLoadingMessageIcons = [
  <ChartCandlestickIcon />,
  <NewspaperIcon />,
  <FileSearchCornerIcon />,
  <BrainCircuitIcon />,
  <ShieldCheckIcon />,
  <CalculatorIcon />,
]
const previewAnalysisSuffix = "……完整分析报告和 AI 决策建议请解锁后查看。"
const previewOperationSuggestions: NonNullable<
  API.DecisionTask["operation_suggestion"]
> = [
  {
    type: "buy",
    price: 123.45,
    amount: 100,
    EV: 8.6,
    confidence: 0.78,
  },
  {
    type: "hold",
    price: 0,
    amount: 0,
    EV: 0,
    confidence: 0.52,
  },
]

function removePreviewAnalysisSuffix(value: string) {
  return value.endsWith(previewAnalysisSuffix)
    ? value.slice(0, -previewAnalysisSuffix.length).trimEnd()
    : value
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null
  }

  const numberValue = typeof value === "number" ? value : Number(value)

  return Number.isNaN(numberValue) ? null : numberValue
}

function formatNumber(value: number | string | null | undefined) {
  if (typeof value === "string") {
    value = value.replaceAll(",", "")
  }

  const numberValue = toNumber(value)

  if (numberValue === null) {
    return value ?? "-"
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 6,
  }).format(numberValue)
}

function formatPercent(value: number | string | null | undefined) {
  const numberValue = toNumber(value)

  if (numberValue === null) {
    return value ?? "-"
  }

  return `${numberValue.toFixed(2)}%`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatSnapshotValue(
  value: API.PriceSnapshotKorea[keyof API.PriceSnapshotKorea] | undefined,
  type: SnapshotField["type"]
) {
  if (type === "number") {
    return formatNumber(value)
  }

  if (type === "percent") {
    return formatPercent(value)
  }

  return value ?? "-"
}

function getChangeColorClass(value: number | string | null | undefined) {
  const numberValue = toNumber(value)

  if (numberValue === null || numberValue === 0) {
    return "text-muted-foreground"
  }

  return numberValue > 0 ? "text-red-600" : "text-green-600"
}

export function DecisionDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const { refreshDecisionTasks } = useDecisionTasks()
  const { i18n, t } = useTranslation()
  const [task, setTask] = React.useState<API.DecisionTask | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [streamedAnalysis, setStreamedAnalysis] = React.useState("")
  const [loadingMessageIndex, setLoadingMessageIndex] = React.useState(0)
  const [unlockOpen, setUnlockOpen] = React.useState(false)

  const loadTask = React.useCallback(async () => {
    if (!taskId) {
      return
    }

    setLoading(true)

    try {
      const nextTask = await getDecisionTask({ taskId })
      setTask(nextTask)
      setStreamedAnalysis(nextTask.analysis_content ?? "")
    } catch (error) {
      console.error("Failed to load decision task:", error)
      toast.error(t("decisionDetail.error"))
    } finally {
      setLoading(false)
    }
  }, [taskId, t])

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTask()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadTask])

  React.useEffect(() => {
    if (!taskId || task?.status !== "processing") {
      return
    }

    const controller = new AbortController()

    void fetchEventSource(`${ApiPrefix}/decision/tasks/${taskId}/stream`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      signal: controller.signal,
      onmessage: (event) => {
        if (!event.data) {
          return
        }

        try {
          const payload = JSON.parse(event.data) as { analysis?: string }

          if (typeof payload.analysis === "string") {
            setStreamedAnalysis(payload.analysis)
          }
        } catch (error) {
          console.error("Failed to parse decision stream event:", error)
        }
      },
      onerror: (error) => {
        throw error
      },
    })
      .then(async () => {
        refreshDecisionTasks()
        if (!controller.signal.aborted) {
          await loadTask()
          setTimeout(() => {
            window.scrollTo({
              top: document.documentElement.scrollHeight,

              behavior: "smooth",
            })
          }, 0)
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error("Decision stream failed:", error)
          toast.error(t("decisionDetail.streamError"))
        }
      })

    return () => {
      controller.abort()
    }
  }, [loadTask, refreshDecisionTasks, task?.status, taskId, t])

  React.useEffect(() => {
    if (task?.status !== "processing" || streamedAnalysis.trim().length > 0) {
      return
    }

    const intervalId = window.setInterval(() => {
      setLoadingMessageIndex(
        (index) => (index + 1) % decisionLoadingMessageKeys.length
      )
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [streamedAnalysis, task?.status])

  const analysis =
    task?.status === "processing"
      ? streamedAnalysis
      : task?.analysis_content || ""
  const hasAnalysis = analysis.trim().length > 0
  const hasFullAccess = task?.access?.is_full_access !== false
  const isPreview = task?.access?.preview === true || !hasFullAccess
  const renderedAnalysis = isPreview
    ? removePreviewAnalysisSuffix(analysis)
    : analysis
  const loadingMessageKey = decisionLoadingMessageKeys[loadingMessageIndex]
  const handleUnlocked = React.useCallback(async () => {
    await loadTask()
    await refreshDecisionTasks()
  }, [loadTask, refreshDecisionTasks])

  if (loading && !task) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {t("decisionDetail.loading")}
      </div>
    )
  }

  if (!task) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {t("decisionDetail.notFound")}
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <Link to="/decision">
              <ChevronLeftIcon />
            </Link>
            {task.stock_name || task.stock_code}
          </CardTitle>
          <CardDescription>
            {t("decisionDetail.snapshotDescription", {
              time: formatDateTime(task.created_at),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {task.price_snapshot ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {snapshotFields.map((field) =>
                Object.hasOwn(task.price_snapshot || {}, field.key) ? (
                  <div key={field.key} className="rounded-md border p-3">
                    <dt className="text-xs text-muted-foreground">
                      {t(field.labelKey)}
                    </dt>
                    <dd
                      className={cn(
                        "mt-1 text-base font-medium",
                        (field.key === "change_pct" ||
                          field.key === "change") &&
                          getChangeColorClass(task.price_snapshot?.[field.key])
                      )}
                    >
                      {field.key === "ticker"
                        ? (task.price_snapshot?.[field.key] ?? "").replace(
                            "CRYPTO:",
                            ""
                          )
                        : formatSnapshotValue(
                            task.price_snapshot?.[field.key],
                            field.type
                          )}
                    </dd>
                  </div>
                ) : null
              )}
            </dl>
          ) : (
            <div className="text-sm text-muted-foreground">
              {t("decisionDetail.noSnapshot")}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("decisionDetail.analysis")}</CardTitle>
          <CardDescription className="whitespace-pre-line">
            {t("decisionDetail.analysisDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="border-t pt-(--card-spacing)">
          {task.status === "failed" ? (
            <div className="text-sm text-destructive">
              {task.analysis_content || t("decisionDetail.failed")}
            </div>
          ) : hasAnalysis ? (
            <div
              className={cn(
                "text-sm leading-6",
                isPreview && "relative max-h-[28rem] overflow-hidden"
              )}
            >
              <Streamdown plugins={{ cjk }}>{renderedAnalysis}</Streamdown>
              {isPreview ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-card"
                />
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {task.status === "processing" ? (
                <div className="relative h-72 overflow-hidden rounded-md border bg-card">
                  <FlickeringGrid
                    className="absolute inset-0 opacity-80"
                    squareSize={4}
                    gridGap={6}
                    color="#60A5FA"
                    maxOpacity={0.5}
                    flickerChance={0.1}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-card/20">
                    <Marker
                      key={`${i18n.language}-${loadingMessageKey}`}
                      className="animate-decision-loading-message w-auto text-foreground"
                      variant="separator"
                    >
                      <MarkerIcon>
                        {decisionLoadingMessageIcons[loadingMessageIndex]}
                      </MarkerIcon>
                      <MarkerContent>
                        {t(
                          `decisionDetail.loadingMessages.${loadingMessageKey}`
                        )}
                      </MarkerContent>
                    </Marker>
                  </div>
                </div>
              ) : (
                t("decisionDetail.noAnalysis")
              )}
            </div>
          )}
          {task.status === "completed" && isPreview ? (
            <div className="mt-5 rounded-lg border border-dashed bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <LockKeyholeIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {t("decisionDetail.previewTitle", {
                      defaultValue: "This is a preview of the analysis",
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("decisionDetail.previewDescription", {
                      defaultValue:
                        "Unlock the complete report and AI decision suggestions for this stock.",
                    })}
                  </p>
                  <Button className="mt-2" onClick={() => setUnlockOpen(true)}>
                    <UnlockIcon className="size-5" data-icon="inline-start" />
                    {t("decisionDetail.unlockAction", {
                      defaultValue: "Unlock for $0.99",
                    })}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {task.status === "completed" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("decisionDetail.operationSuggestion")}</CardTitle>
            <CardDescription>
              {t("decisionDetail.operationSuggestionDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="border-t pt-(--card-spacing)">
            <div className="relative overflow-hidden rounded-md border bg-card">
              <div
                aria-hidden="true"
                className={cn(
                  isPreview &&
                    "pointer-events-none opacity-60 blur-md select-none"
                )}
              >
                <DecisionOperationTable
                  operations={
                    isPreview
                      ? previewOperationSuggestions
                      : task.operation_suggestion
                  }
                />
              </div>
              {isPreview ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/35 p-4 text-center backdrop-blur-[1px]">
                  {/*<LockKeyholeIcon className="size-9 text-muted-foreground" />*/}
                  <p className="font-medium">
                    {t("decisionDetail.previewTitle", {
                      defaultValue: "This is a preview of the analysis",
                    })}
                  </p>
                  <Button onClick={() => setUnlockOpen(true)}>
                    <UnlockIcon className="size-5" data-icon="inline-start" />
                    {t("decisionDetail.unlockAction", {
                      defaultValue: "Unlock for $0.99",
                    })}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <DecisionPaypalUnlockDialog
        taskId={task.id}
        open={unlockOpen}
        onOpenChange={setUnlockOpen}
        onUnlocked={handleUnlocked}
      />
    </section>
  )
}
