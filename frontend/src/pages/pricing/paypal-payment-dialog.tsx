import { useEffect, useRef, useState } from "react"
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
import { getPayPalConfig } from "@/lib/service"
import {
  confirmPayPalPayment,
  createPayPalCheckout,
  getPayPalAttempt,
  loadPayPalAttempt,
  loadPayPalSdk,
  newPayPalAttempt,
  savePayPalAttempt,
} from "@/lib/paypal"

export function PayPalPaymentDialog({
  userId,
  interval,
  recovering = false,
  open,
  onOpenChange,
  onPaid,
}: {
  userId: string
  interval: "monthly" | "yearly"
  recovering?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaid: () => Promise<API.BillingSummary | null>
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
          <DialogTitle>{t("pricing.paypalTitle")}</DialogTitle>
          <DialogDescription>
            {t(
              recovering
                ? "pricing.paypalResumeApproved"
                : "pricing.paypalDescription",
              {
                interval: t(`pricing.billing.${interval}`),
              }
            )}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <PayPalCheckout
            key={`${userId}:${interval}`}
            userId={userId}
            interval={interval}
            onPaid={onPaid}
            onBusyChange={setBusy}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function PayPalCheckout({
  userId,
  interval,
  onPaid,
  onBusyChange,
  onClose,
}: {
  userId: string
  interval: "monthly" | "yearly"
  onPaid: () => Promise<API.BillingSummary | null>
  onBusyChange: (busy: boolean) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const buttonContainer = useRef<HTMLDivElement>(null)
  const attempt = useRef(getPayPalAttempt(userId, interval))
  const confirm = useRef<(() => Promise<void>) | null>(null)
  const [stage, setStage] = useState<
    "loading" | "creating" | "confirming" | "success" | null
  >("loading")
  const [message, setMessage] = useState<string | null>(null)
  const [approved, setApproved] = useState(
    () => !!loadPayPalAttempt(userId)?.approved
  )
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let instance: PayPalButtonsInstance | undefined
    let confirming = false
    const alive = () => !controller.signal.aborted
    const retain = () => savePayPalAttempt(userId, attempt.current)
    const updateStage = (next: typeof stage) => {
      if (!alive()) return
      setStage(next)
      onBusyChange(next === "creating" || next === "confirming")
    }
    const confirmApproval = async () => {
      if (confirming || !attempt.current.subscriptionId) return
      confirming = true
      updateStage("confirming")
      setMessage(null)
      try {
        const result = await confirmPayPalPayment(
          attempt.current.subscriptionId,
          onPaid,
          controller.signal
        )
        if (!alive()) return
        if (result === "active") {
          savePayPalAttempt(userId, null)
          updateStage("success")
        } else if (result === "inactive") {
          savePayPalAttempt(userId, null)
          attempt.current = newPayPalAttempt(interval)
          setApproved(false)
          setMessage("paypalInactive")
          updateStage(null)
        } else {
          setMessage("paypalPending")
          updateStage(null)
        }
      } catch {
        if (alive()) {
          setMessage("paypalConfirmError")
          updateStage(null)
        }
      } finally {
        confirming = false
      }
    }
    confirm.current = confirmApproval

    const initialize = async () => {
      // Keep an approved subscription recoverable across close/reload and avoid
      // opening another payment flow while the server is still confirming it.
      if (attempt.current.approved) {
        await confirmApproval()
        return
      }
      try {
        const config = await getPayPalConfig(controller.signal)
        if (!alive()) return
        const planId = config.plans?.[interval]?.plan_id
        if (
          !config.enabled ||
          !config.client_id ||
          !config.currency ||
          !planId
        ) {
          throw new Error("PayPal is unavailable")
        }
        const paypal = await loadPayPalSdk(config.client_id, config.currency)
        if (!alive() || !buttonContainer.current) return
        instance = paypal.Buttons({
          fundingSource: paypal.FUNDING.PAYPAL,
          style: {
            layout: "vertical",
            color: "gold",
            shape: "pill",
            label: "paypal",
            height: 48,
          },
          createSubscription: async () => {
            controller.signal.throwIfAborted()
            setMessage(null)
            updateStage("creating")
            try {
              return await createPayPalCheckout(
                attempt.current,
                planId,
                controller.signal,
                (next) => {
                  attempt.current = next
                  retain()
                }
              )
            } catch (error) {
              if (alive()) {
                const status = (error as { response?: { status?: number } })
                  ?.response?.status
                setMessage(status === 409 ? "paypalAlreadyPro" : "paypalError")
                updateStage(null)
                if (status === 409) void onPaid().catch(() => {})
              }
              throw error
            }
          },
          onApprove: async (data) => {
            if (!alive()) return
            if (
              !data.subscriptionID ||
              data.subscriptionID !== attempt.current.subscriptionId
            ) {
              setMessage("paypalApprovalError")
              updateStage(null)
              return
            }
            attempt.current = { ...attempt.current, approved: true }
            retain()
            setApproved(true)
            await confirmApproval()
          },
          onCancel: () => {
            if (!alive()) return
            setMessage("paypalCancelled")
            updateStage(null)
          },
          onError: () => {
            if (!alive()) return
            setMessage((current) => current ?? "paypalError")
            updateStage(null)
          },
        })
        if (!instance.isEligible()) throw new Error("PayPal is not eligible")
        await instance.render(buttonContainer.current)
        updateStage(null)
      } catch {
        if (alive()) {
          setMessage("paypalUnavailable")
          updateStage(null)
        }
      }
    }
    void initialize()
    return () => {
      controller.abort()
      confirm.current = null
      void instance?.close().catch(() => {})
    }
  }, [interval, onBusyChange, onPaid, retry, userId])

  const busy = stage === "creating" || stage === "confirming"
  return (
    <>
      <div
        ref={buttonContainer}
        className={approved || stage === "success" ? "hidden" : "min-h-12"}
        // Keep PayPal's light iframe transparent when the app uses dark mode.
        style={{ colorScheme: "light" }}
        inert={busy}
        aria-label="PayPal"
      />
      {stage || message ? (
        <div role="status" aria-live="polite" className="space-y-3 text-sm">
          {stage && stage !== "success" ? (
            <p className="flex items-center justify-center gap-2 text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" />
              {t(`pricing.paypalStages.${stage}`)}
            </p>
          ) : null}
          {stage === "success" ? (
            <p className="text-center text-emerald-600">
              {t("pricing.paymentSuccess")}
            </p>
          ) : null}
          {message ? (
            <p className="text-center text-muted-foreground">
              {t(`pricing.${message}`)}
            </p>
          ) : null}
        </div>
      ) : null}
      {!stage && approved ? (
        <Button onClick={() => void confirm.current?.()}>
          {t("pricing.paypalCheck")}
        </Button>
      ) : null}
      {!stage &&
      (message === "paypalUnavailable" || message === "paypalInactive") ? (
        <Button
          variant="outline"
          onClick={() => {
            setStage("loading")
            setMessage(null)
            setRetry((value) => value + 1)
          }}
        >
          {t("pricing.paypalRetry")}
        </Button>
      ) : null}
      {stage === "success" ? (
        <Button onClick={onClose}>{t("pricing.paymentDone")}</Button>
      ) : null}
    </>
  )
}
