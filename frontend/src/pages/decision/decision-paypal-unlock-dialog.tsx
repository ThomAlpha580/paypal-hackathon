import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  captureDecisionTaskPaypalUnlock,
  createDecisionTaskPaypalUnlock,
  getPayPalConfig,
} from "@/lib/service"
import { loadPayPalSdk } from "@/lib/paypal"

const orderIdPattern = /^[A-Za-z0-9_-]{5,127}$/

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `decision-paypal-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getFrontendRedirectUrls() {
  if (typeof window === "undefined") {
    return {}
  }
  return {
    returnUrl: window.location.href,
    cancelUrl: window.location.href,
  }
}

export function DecisionPaypalUnlockDialog({
  taskId,
  open,
  onOpenChange,
  onUnlocked,
}: {
  taskId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUnlocked: () => Promise<void> | void
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>
            {t("decisionDetail.unlockTitle", {
              defaultValue: "Unlock the full report",
            })}
          </DialogTitle>
          <DialogDescription>
            {t("decisionDetail.unlockDescription", {
              defaultValue:
                "Pay once with PayPal for $0.99 to view the complete analysis and AI decision suggestions for this stock.",
            })}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <DecisionPaypalCheckout
            taskId={taskId}
            onUnlocked={onUnlocked}
            onBusyChange={setBusy}
            onClose={close}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DecisionPaypalCheckout({
  taskId,
  onUnlocked,
  onBusyChange,
  onClose,
}: {
  taskId: string
  onUnlocked: () => Promise<void> | void
  onBusyChange: (busy: boolean) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const buttonContainer = useRef<HTMLDivElement>(null)
  const orderId = useRef<string | null>(null)
  const idempotencyKey = useRef(newIdempotencyKey())
  const [stage, setStage] = useState<
    "loading" | "creating" | "capturing" | "success" | null
  >("loading")
  const [message, setMessage] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let instance: PayPalButtonsInstance | undefined
    let alive = true

    const updateStage = (
      next: "loading" | "creating" | "capturing" | "success" | null
    ) => {
      if (!alive) return
      setStage(next)
      onBusyChange(next === "creating" || next === "capturing")
    }

    const initialize = async () => {
      try {
        const config = await getPayPalConfig(controller.signal)
        if (
          !config.enabled ||
          !config.client_id ||
          !config.currency ||
          !buttonContainer.current
        ) {
          throw new Error("PayPal is unavailable")
        }
        const paypal = await loadPayPalSdk(config.client_id, config.currency, {
          intent: "capture",
          vault: false,
        })
        if (!alive || !buttonContainer.current) return

        instance = paypal.Buttons({
          fundingSource: paypal.FUNDING.PAYPAL,
          style: {
            layout: "vertical",
            color: "gold",
            shape: "pill",
            label: "paypal",
            height: 48,
          },
          createOrder: async () => {
            controller.signal.throwIfAborted()
            setMessage(null)
            updateStage("creating")
            try {
              const checkout = await createDecisionTaskPaypalUnlock({
                taskId,
                idempotencyKey: idempotencyKey.current,
                ...getFrontendRedirectUrls(),
              })
              if (!orderIdPattern.test(checkout.paypal_order_id)) {
                throw new Error("PayPal checkout is missing a valid order ID")
              }
              orderId.current = checkout.paypal_order_id
              return checkout.paypal_order_id
            } catch (error) {
              if (alive) {
                const status = (error as { response?: { status?: number } })
                  ?.response?.status
                setMessage(
                  status === 409
                    ? "decisionAlreadyUnlocked"
                    : "decisionUnlockError"
                )
                updateStage(null)
                if (status === 409) {
                  await onUnlocked()
                  onClose()
                }
              }
              throw error
            }
          },
          onApprove: async (data) => {
            if (!alive) return
            if (!data.orderID || data.orderID !== orderId.current) {
              setMessage("decisionUnlockApprovalError")
              updateStage(null)
              return
            }
            updateStage("capturing")
            setMessage(null)
            try {
              const result = await captureDecisionTaskPaypalUnlock({
                taskId,
                paypalOrderId: data.orderID,
              })
              if (!result.is_full_access)
                throw new Error("Unlock was not granted")
              await onUnlocked()
              if (!alive) return
              updateStage("success")
            } catch {
              if (alive) {
                setMessage("decisionUnlockError")
                updateStage(null)
              }
            }
          },
          onCancel: () => {
            if (!alive) return
            setMessage("decisionUnlockCancelled")
            updateStage(null)
          },
          onError: () => {
            if (!alive) return
            setMessage((current) => current ?? "decisionUnlockError")
            updateStage(null)
          },
        })
        if (!instance.isEligible()) throw new Error("PayPal is not eligible")
        await instance.render(buttonContainer.current)
        updateStage(null)
      } catch {
        if (alive) {
          setMessage("decisionUnlockUnavailable")
          updateStage(null)
        }
      }
    }

    void initialize()
    return () => {
      alive = false
      controller.abort()
      void instance?.close().catch(() => {})
      onBusyChange(false)
    }
  }, [onBusyChange, onClose, onUnlocked, retry, taskId])

  const busy = stage === "creating" || stage === "capturing"
  return (
    <>
      <div
        ref={buttonContainer}
        className={stage === "success" ? "hidden" : "min-h-12"}
        style={{ colorScheme: "light" }}
        inert={busy}
        aria-label="PayPal"
      />
      {stage || message ? (
        <div role="status" aria-live="polite" className="space-y-3 text-sm">
          {stage && stage !== "success" ? (
            <p className="flex items-center justify-center gap-2 text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" />
              {t(
                stage === "loading"
                  ? "decisionDetail.unlockLoading"
                  : stage === "creating"
                    ? "decisionDetail.unlockCreating"
                    : "decisionDetail.unlockCapturing",
                { defaultValue: "Processing PayPal payment…" }
              )}
            </p>
          ) : null}
          {stage === "success" ? (
            <p className="text-center text-emerald-600">
              {t("decisionDetail.unlockSuccess", {
                defaultValue: "The full report is now unlocked.",
              })}
            </p>
          ) : null}
          {message ? (
            <p className="text-center text-muted-foreground">
              {t(`decisionDetail.${message}`, {
                defaultValue:
                  "Unable to complete the PayPal payment. Please try again.",
              })}
            </p>
          ) : null}
        </div>
      ) : null}
      {!stage && message === "decisionUnlockUnavailable" ? (
        <Button
          variant="outline"
          onClick={() => {
            setStage("loading")
            setMessage(null)
            setRetry((value) => value + 1)
          }}
        >
          {t("decisionDetail.unlockRetry", { defaultValue: "Try again" })}
        </Button>
      ) : null}
      {stage === "success" ? (
        <Button onClick={onClose}>
          {t("decisionDetail.unlockDone", { defaultValue: "Done" })}
        </Button>
      ) : null}
    </>
  )
}
