import { useCallback, useEffect, useState } from "react"
import { cjk } from "@streamdown/cjk"
import { Streamdown } from "streamdown"
import {
  CheckIcon,
  CopyIcon,
  SearchIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { useAlphaChatStream } from "@/hooks/use-alpha-chat-stream"
import { useChatAutoScroll } from "@/hooks/use-chat-auto-scroll"
import { createAlphaPaypalOrder } from "@/lib/service"
import { safeAlphaSource } from "@/lib/alpha-state"
import {
  alphaMetrics,
  alphaMetricClass,
  formatAlphaMetric,
} from "@/lib/alpha-format"
import { AlphaResearchComposer } from "./alpha-research-composer"
import { AlphaPaypalPaymentDialog } from "./alpha-paypal-payment-dialog"
import { BacktestDetailDialog } from "./backtest-detail-dialog"

export function AlphaResearchConversation({
  chatId,
  userId,
  onChanged,
}: {
  chatId: string
  userId: string
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState("")
  const [payment, setPayment] = useState<API.AlphaPayment | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(true)
  const [paymentError, setPaymentError] = useState(false)
  const [detail, setDetail] = useState<Pick<
    API.AlphaFactor,
    "id" | "name" | "expr"
  > | null>(null)
  const {
    messages,
    run,
    loading,
    isStreaming,
    error,
    send,
    retry,
    loadOlder,
    hasOlder,
    loadingOlder,
  } = useAlphaChatStream(chatId, userId, onChanged)
  const { viewportRef, contentRef } = useChatAutoScroll(chatId, messages)
  const fatal =
    error === "alpha.errors.notFound" || error === "alpha.errors.auth"
  useEffect(() => {
    let alive = true
    void createAlphaPaypalOrder({ chatId })
      .then((order) => {
        if (!alive) return
        setPayment(order)
        if (String(order.status).toLowerCase() !== "captured")
          setPaymentOpen(true)
      })
      .catch((reason) => {
        if (!alive) return
        const status = (reason as { response?: { status?: number } })?.response
          ?.status
        // A 404 means the deployment has Alpha PayPal payments disabled.
        if (status !== 404) setPaymentError(true)
      })
      .finally(() => {
        if (alive) setPaymentLoading(false)
      })
    return () => {
      alive = false
    }
  }, [chatId])
  const handlePaid = useCallback(
    (nextPayment: API.AlphaPayment) => {
      setPayment(nextPayment)
      setPaymentOpen(false)
      onChanged()
    },
    [onChanged]
  )
  const paymentRequired =
    Boolean(payment) && String(payment?.status).toLowerCase() !== "captured"
  const renderMessage = (message: API.AlphaChatMessage) => {
    if (message.type === "activity") {
      const failed =
        message.status === "failed" || message.status === "interrupted"
      const active =
        message.status === "running" || message.status === "pending"
      const label =
        message.activity_type === "web_search"
          ? "webSearch"
          : message.activity_type === "backtest"
            ? "backtest"
            : "toolExecution"
      return (
        <div
          key={message.id}
          className={`flex items-center gap-2 px-3 text-sm ${failed ? "text-destructive" : "text-muted-foreground"}`}
        >
          {active ? (
            <Spinner />
          ) : failed ? (
            <XIcon className="size-4 shrink-0" />
          ) : (
            <CheckIcon className="size-4 shrink-0" />
          )}
          {message.activity_type === "web_search" ? (
            <SearchIcon className="size-4 shrink-0" />
          ) : (
            <WrenchIcon className="size-4 shrink-0" />
          )}
          <span>
            {t(`alpha.activity.${label}`)} ·{" "}
            {t(`alpha.activity.${message.status}`)}
          </span>
        </div>
      )
    }
    if (message.type === "factor") {
      const { payload } = message
      if (!payload.expr) return null
      return (
        <Card key={message.id} className="border-border/60">
          <CardHeader className="gap-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span>
                {t("alpha.factor")} #{payload.index ?? "—"}
              </span>
              <span className="text-muted-foreground">{payload.name}</span>
            </CardTitle>
            <div className="relative rounded-xl border bg-muted/40 p-4 pr-10">
              <code className="block text-xs leading-6 break-all whitespace-pre-wrap">
                {payload.expr}
              </code>
              <button
                type="button"
                aria-label={t("alpha.copyExpression")}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(payload.expr!)
                    .then(() => toast.success(t("alpha.copied")))
                    .catch(() => toast.error(t("alpha.errors.copy")))
                }}
              >
                <CopyIcon className="size-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {alphaMetrics.map(([key, label]) => (
                <div key={key} className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t(`alpha.metric.${label}`)}
                  </div>
                  <div
                    className={`mt-2 text-lg font-semibold tabular-nums ${alphaMetricClass(key, payload.backtest_result?.[key])}`}
                  >
                    {formatAlphaMetric(key, payload.backtest_result?.[key])}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {payload.factor_id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDetail({
                      id: payload.factor_id!,
                      name: payload.name ?? t("alpha.factor"),
                      expr: payload.expr!,
                    })
                  }
                >
                  {t("alpha.backtestDetails")}
                </Button>
              )}
              <Button asChild size="sm" variant="secondary">
                <Link to="/alpha/library">{t("routes.factorLibrary")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }
    return (
      <div
        key={message.id}
        className={
          message.type === "user"
            ? "ml-auto w-fit max-w-[90%] rounded-xl bg-primary px-4 py-2 text-primary-foreground"
            : "w-full min-w-0 px-1 py-3 sm:px-3"
        }
      >
        {message.type === "user" ? (
          <p className="text-sm leading-7 break-words whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <Streamdown
            className="min-w-0 text-sm leading-7"
            parseIncompleteMarkdown
            plugins={{ cjk }}
          >
            {message.content ?? ""}
          </Streamdown>
        )}
        {message.type === "ai" &&
          Boolean(message.payload.annotations?.length) && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {message.payload.annotations?.map((source, index) => {
                const url = safeAlphaSource(source.url)
                return url ? (
                  <a
                    key={`${url}-${index}`}
                    className="break-all text-primary underline"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.title || new URL(url).hostname}
                  </a>
                ) : null
              })}
            </div>
          )}
      </div>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea
        viewportRef={viewportRef}
        className="min-h-0 flex-1 [&>div>div]:block!"
      >
        <div
          ref={contentRef}
          className="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-4 py-4"
        >
          {hasOlder && (
            <Button
              variant="ghost"
              disabled={loadingOlder}
              onClick={() => {
                const viewport = viewportRef.current
                const height = viewport?.scrollHeight ?? 0
                const top = viewport?.scrollTop ?? 0
                void loadOlder().then(() =>
                  requestAnimationFrame(() => {
                    if (viewport)
                      viewport.scrollTop = top + viewport.scrollHeight - height
                  })
                )
              }}
            >
              {loadingOlder ? t("alpha.loading") : t("alpha.loadOlder")}
            </Button>
          )}
          {loading && (
            <div
              role="status"
              className="flex items-center gap-2 px-3 text-sm text-muted-foreground"
            >
              <Spinner />
              {t("alpha.loading")}
            </div>
          )}
          {messages.map(renderMessage)}
          {isStreaming && (
            <div
              role="status"
              className="flex items-center gap-2 px-3 text-sm text-muted-foreground"
            >
              <Spinner />
              {run?.status === "queued"
                ? t("alpha.queued")
                : t("alpha.researching")}
            </div>
          )}
          {(run?.status === "failed" || run?.status === "interrupted") && (
            <p role="status" className="px-3 text-sm text-destructive">
              {t(
                run.status === "failed"
                  ? "alpha.runFailed"
                  : "alpha.runInterrupted"
              )}
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-2 px-3 text-sm text-destructive"
            >
              <span>{t(error)}</span>
              {error !== "alpha.reconnecting" && (
                <Button variant="ghost" size="sm" onClick={retry}>
                  {t("alpha.retry")}
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
      {paymentRequired ? (
        <div className="mx-auto w-full max-w-4xl shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {t("alpha.payment.required", {
                defaultValue: `Pay $${Number(payment?.amount ?? 0).toFixed(1)} USD to start factor research.`,
                amount: Number(payment?.amount ?? 0).toFixed(1),
              })}
            </span>
            <Button size="sm" onClick={() => setPaymentOpen(true)}>
              {t("alpha.payment.pay", { defaultValue: "Pay with PayPal" })}
            </Button>
          </div>
        </div>
      ) : null}
      {paymentError ? (
        <p role="alert" className="mx-auto w-full max-w-4xl text-sm text-destructive">
          {t("alpha.payment.lookupError", {
            defaultValue: "Unable to load the Alpha payment. Please retry the conversation.",
          })}
        </p>
      ) : null}
      <div className="mx-auto w-full max-w-4xl shrink-0 pt-3 pb-4">
        <AlphaResearchComposer
          value={input}
          onChange={setInput}
          disabled={Boolean(
            isStreaming || loading || fatal || paymentLoading || paymentRequired
          )}
          onSend={async () => {
            const content = input.trim()
            if (content && (await send(content))) setInput("")
          }}
        />
      </div>
      {payment ? (
        <AlphaPaypalPaymentDialog
          chatId={chatId}
          payment={payment}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onPaid={handlePaid}
        />
      ) : null}
      <BacktestDetailDialog factor={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
