import { useEffect, useRef, useState } from "react"
import { LoaderCircleIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  captureAlphaPaypalOrder,
  createAlphaPaypalOrder,
  getPayPalConfig,
} from "@/lib/service"
import { loadPayPalSdk } from "@/lib/paypal"

const orderIdPattern = /^[A-Za-z0-9_-]{5,127}$/

function getFrontendRedirectUrls() {
  if (typeof window === "undefined") return {}
  return { returnUrl: window.location.href, cancelUrl: window.location.href }
}

export function AlphaPaypalPaymentDialog({
  chatId,
  payment,
  open,
  onOpenChange,
  onPaid,
}: {
  chatId: string
  payment: API.AlphaPayment
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaid: (payment: API.AlphaPayment) => void
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

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
            {t("alpha.payment.title", { defaultValue: "Start factor research" })}
          </DialogTitle>
          <DialogDescription>
            {t("alpha.payment.description", {
              defaultValue: `Pay $${Number(payment.amount).toFixed(1)} USD to start factor research. Messages after payment are unlimited.`,
              amount: Number(payment.amount).toFixed(1),
            })}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <AlphaPaypalCheckout
            chatId={chatId}
            payment={payment}
            onPaid={onPaid}
            onBusyChange={setBusy}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function AlphaPaypalCheckout({
  chatId,
  payment,
  onPaid,
  onBusyChange,
  onClose,
}: {
  chatId: string
  payment: API.AlphaPayment
  onPaid: (payment: API.AlphaPayment) => void
  onBusyChange: (busy: boolean) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const buttonContainer = useRef<HTMLDivElement>(null)
  const orderId = useRef<string | null>(null)
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
              const checkout = await createAlphaPaypalOrder({
                chatId,
                ...getFrontendRedirectUrls(),
              })
              if (
                !orderIdPattern.test(checkout.paypal_order_id) ||
                checkout.chat_id !== chatId ||
                String(checkout.currency).toUpperCase() !==
                  String(payment.currency).toUpperCase() ||
                Number(checkout.amount).toFixed(1) !==
                  Number(payment.amount).toFixed(1)
              ) {
                throw new Error("PayPal checkout does not match this Alpha payment")
              }
              orderId.current = checkout.paypal_order_id
              return checkout.paypal_order_id
            } catch (error) {
              if (alive) {
                setMessage("error")
                updateStage(null)
              }
              throw error
            }
          },
          onApprove: async (data) => {
            if (!alive) return
            if (!data.orderID || data.orderID !== orderId.current) {
              setMessage("approvalError")
              updateStage(null)
              return
            }
            updateStage("capturing")
            setMessage(null)
            try {
              const result = await captureAlphaPaypalOrder({
                chatId,
                paypalOrderId: data.orderID,
              })
              if (result.status !== "active") throw new Error("Payment not activated")
              onPaid(result.order)
              if (!alive) return
              updateStage("success")
            } catch {
              if (alive) {
                setMessage("error")
                updateStage(null)
              }
            }
          },
          onCancel: () => {
            if (!alive) return
            setMessage("cancelled")
            updateStage(null)
          },
          onError: () => {
            if (!alive) return
            setMessage((current) => current ?? "error")
            updateStage(null)
          },
        })
        if (!instance.isEligible()) throw new Error("PayPal is not eligible")
        await instance.render(buttonContainer.current)
        updateStage(null)
      } catch {
        if (alive) {
          setMessage("unavailable")
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
  }, [chatId, onBusyChange, onPaid, payment, retry])

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
                  ? "alpha.payment.loading"
                  : stage === "creating"
                    ? "alpha.payment.creating"
                    : "alpha.payment.capturing",
                { defaultValue: "Processing PayPal payment…" }
              )}
            </p>
          ) : null}
          {stage === "success" ? (
            <p className="text-center text-emerald-600">
              {t("alpha.payment.success", {
                defaultValue: "Payment complete. Alpha research is starting.",
              })}
            </p>
          ) : null}
          {message ? (
            <p className="text-center text-muted-foreground">
              {t(`alpha.payment.${message}`, {
                defaultValue: "Unable to complete the PayPal payment. Please try again.",
              })}
            </p>
          ) : null}
        </div>
      ) : null}
      {!stage && message === "unavailable" ? (
        <Button
          variant="outline"
          onClick={() => {
            setStage("loading")
            setMessage(null)
            setRetry((value) => value + 1)
          }}
        >
          {t("alpha.payment.retry", { defaultValue: "Try again" })}
        </Button>
      ) : null}
      {stage === "success" ? (
        <Button onClick={onClose}>
          {t("alpha.payment.done", { defaultValue: "Continue" })}
        </Button>
      ) : null}
    </>
  )
}
