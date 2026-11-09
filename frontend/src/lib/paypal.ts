import { confirmPayPalSubscription, createPayPalSubscription } from "./service"

export type PayPalAttempt = {
  interval: "monthly" | "yearly"
  idempotencyKey: string
  subscriptionId?: string
  approved?: boolean
}

const storageKey = (userId: string) => `easystock.paypal.${userId}`
const subscriptionIdPattern = /^[A-Za-z0-9_-]{5,127}$/

export async function createPayPalCheckout(
  attempt: PayPalAttempt,
  expectedPlanId: string,
  signal: AbortSignal,
  onAttempt: (attempt: PayPalAttempt) => void
) {
  let current = attempt
  for (let count = 0; count < 2; count++) {
    signal.throwIfAborted()
    onAttempt(current)
    const checkout = await createPayPalSubscription(
      current.interval,
      current.idempotencyKey,
      signal
    )
    signal.throwIfAborted()
    // The backend may replay a failed checkout as HTTP 200 for an old key.
    // Retry only this explicit failure, never an unknown/in-flight response.
    if (checkout.status === "failed" && !checkout.paypal_subscription_id) {
      if (count === 0) {
        current = newPayPalAttempt(current.interval)
        continue
      }
      throw new Error("PayPal subscription creation returned a failed checkout")
    }
    if (
      !checkout.paypal_subscription_id ||
      !subscriptionIdPattern.test(checkout.paypal_subscription_id)
    ) {
      throw new Error("PayPal checkout is missing a valid subscription ID")
    }
    if (checkout.interval !== current.interval) {
      throw new Error("PayPal checkout billing interval does not match")
    }
    if (checkout.paypal_plan_id !== expectedPlanId) {
      throw new Error(
        "PayPal checkout plan ID does not match the configuration"
      )
    }
    onAttempt({ ...current, subscriptionId: checkout.paypal_subscription_id })
    return checkout.paypal_subscription_id
  }
  throw new Error("PayPal subscription creation failed")
}

export function loadPayPalAttempt(userId: string): PayPalAttempt | null {
  try {
    const attempt = JSON.parse(
      localStorage.getItem(storageKey(userId)) ?? "null"
    )
    if (
      !attempt ||
      !["monthly", "yearly"].includes(attempt.interval) ||
      typeof attempt.idempotencyKey !== "string" ||
      !attempt.idempotencyKey ||
      attempt.idempotencyKey.length > 128 ||
      (attempt.subscriptionId &&
        !subscriptionIdPattern.test(attempt.subscriptionId)) ||
      (attempt.approved && !attempt.subscriptionId)
    )
      return null
    return attempt
  } catch {
    return null
  }
}

export function savePayPalAttempt(
  userId: string,
  attempt: PayPalAttempt | null
) {
  try {
    if (attempt)
      localStorage.setItem(storageKey(userId), JSON.stringify(attempt))
    else localStorage.removeItem(storageKey(userId))
  } catch {
    // Server-side ownership and idempotency checks still apply without storage.
  }
}

export function newPayPalAttempt(
  interval: PayPalAttempt["interval"]
): PayPalAttempt {
  return {
    interval,
    idempotencyKey:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `paypal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }
}

export function getPayPalAttempt(
  userId: string,
  interval: PayPalAttempt["interval"]
): PayPalAttempt {
  const pending = loadPayPalAttempt(userId)
  // An unapproved checkout must not override the buyer's current selection.
  // Approved subscriptions still need confirmation before another purchase.
  return pending && (pending.approved || pending.interval === interval)
    ? pending
    : newPayPalAttempt(interval)
}

const SCRIPT_ID = "easystock-paypal-sdk"
let sdk: { key: string; promise: Promise<PayPalNamespace> } | null = null

export function loadPayPalSdk(
  clientId: string,
  currency: string,
  options: { intent?: "subscription" | "capture"; vault?: boolean } = {}
) {
  const intent = options.intent ?? "subscription"
  const vault = options.vault ?? intent === "subscription"
  const key = `${clientId}:${currency}:${intent}:${vault}`
  if (sdk?.key === key) return sdk.promise
  if (sdk) {
    // PayPal's SDK query parameters are global. Replace the previous variant
    // when switching between subscription and one-time checkout flows.
    document.getElementById(SCRIPT_ID)?.remove()
    sdk = null
    window.paypal = undefined
  }

  const promise = new Promise<PayPalNamespace>((resolve, reject) => {
    const script = document.createElement("script")
    script.id = SCRIPT_ID
    const params: Record<string, string> = {
      "client-id": clientId,
      currency,
      components: "buttons",
      intent,
    }
    if (vault) params.vault = "true"
    script.src = `https://www.paypal.com/sdk/js?${new URLSearchParams(params)}`
    script.async = true
    const timeout = setTimeout(() => fail(), 20000)
    const fail = () => {
      clearTimeout(timeout)
      script.onload = null
      script.onerror = null
      script.remove()
      sdk = null
      reject(new Error("PayPal SDK failed to load"))
    }
    script.onload = () => {
      if (!window.paypal?.Buttons || !window.paypal.FUNDING?.PAYPAL) {
        fail()
        return
      }
      clearTimeout(timeout)
      resolve(window.paypal)
    }
    script.onerror = fail
    document.head.appendChild(script)
  })
  sdk = { key, promise }
  return promise
}

function delay(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted()
    const abort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolve()
    }, 2000)
    signal.addEventListener("abort", abort, { once: true })
  })
}

// Both the subscription and Pro entitlement must be verified by the server.
// An approval callback (or an ACTIVE row without its billing period) isn't enough.
export async function confirmPayPalPayment(
  subscriptionId: string,
  refreshBilling: () => Promise<API.BillingSummary | null>,
  signal: AbortSignal
) {
  for (let count = 0; count < 5; count++) {
    signal.throwIfAborted()
    const subscription = await confirmPayPalSubscription(subscriptionId, signal)
    signal.throwIfAborted()
    const billing = await refreshBilling()
    signal.throwIfAborted()
    if (subscription.status === "active" && billing?.is_pro) return "active"
    if (
      ["cancelled", "expired", "suspended", "payment_failed"].includes(
        subscription.status
      )
    ) {
      return "inactive"
    }
    if (count < 4) await delay(signal)
  }
  return "pending"
}
