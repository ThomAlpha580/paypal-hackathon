import { useState } from "react"
import { useTranslation } from "react-i18next"
import { CheckIcon, SparklesIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import useUser from "@/hooks/use-user"
import useBilling from "@/hooks/use-billing"
import { getPayPalAttempt, savePayPalAttempt } from "@/lib/paypal"
import { PayPalPaymentDialog } from "./paypal-payment-dialog"

type BillingPeriod = "monthly" | "yearly"

export function PricingPage() {
  const { t } = useTranslation()
  const { user, isAuthenticated, setSignInModalOpen } = useUser()
  const {
    billingSummary: billing,
    billingLoading,
    refreshBilling,
  } = useBilling()
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly")
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentInterval, setPaymentInterval] =
    useState<BillingPeriod>("monthly")
  const [recovering, setRecovering] = useState(false)

  const handleProAction = () => {
    if (!isAuthenticated || !user) {
      setSignInModalOpen(true)
      return
    }
    const attempt = getPayPalAttempt(user.id, billingPeriod)
    savePayPalAttempt(user.id, attempt)
    setPaymentInterval(attempt.interval)
    setRecovering(!!attempt.approved)
    setPaymentOpen(true)
  }

  const plans = [
    {
      name: t("pricing.plans.free.name"),
      description: t("pricing.plans.free.description"),
      price: "$0",
      period: t("pricing.perMonth"),
      features: [
        t("pricing.plans.free.features.screening"),
        t("pricing.plans.free.features.analysis"),
        t("pricing.plans.free.features.chat"),
        t("pricing.plans.free.features.results"),
        t("pricing.plans.free.features.history"),
        t("pricing.plans.free.features.markets"),
        t("pricing.plans.free.features.advice"),
      ],
      cta: billing?.is_pro
        ? t("pricing.plans.free.name")
        : t("pricing.plans.free.cta"),
    },
    {
      name: t("pricing.plans.pro.name"),
      description: t("pricing.plans.pro.description"),
      price: billingPeriod === "monthly" ? "$9.99" : "$79",
      period:
        billingPeriod === "monthly"
          ? t("pricing.perMonth")
          : t("pricing.perYear"),
      features: [
        t("pricing.plans.pro.features.screening"),
        t("pricing.plans.pro.features.analysis"),
        t("pricing.plans.pro.features.chat"),
        t("pricing.plans.pro.features.history"),
        t("pricing.plans.pro.features.queue"),
        t("pricing.plans.pro.features.earlyAccess"),
      ],
      cta: billing?.is_pro
        ? t("pricing.currentPlan")
        : t("pricing.plans.pro.cta"),
      highlighted: true,
    },
  ]

  return (
    <main className="mx-auto w-full max-w-5xl pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/[0.08] via-background to-emerald-500/[0.08] px-5 py-8 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -top-20 -right-16 size-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative">
          <div className="max-w-xl space-y-2">
            <Badge
              variant="secondary"
              className="gap-1.5 rounded-full px-3 py-1"
            >
              <SparklesIcon className="size-3.5" />
              {t("pricing.badge")}
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("pricing.title")}
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              {t("pricing.description")}
            </p>
          </div>
        </div>
      </section>

      {isAuthenticated && billing ? (
        <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
          <div>
            <span className="font-medium">
              {billing.is_pro
                ? t("pricing.currentPro")
                : t("pricing.currentFree")}
            </span>
            <span className="ml-2 text-muted-foreground">
              {t("pricing.usage", {
                screen: billing.screen_used,
                screenLimit: billing.screen_limit,
                analysis: billing.analysis_used,
                analysisLimit: billing.analysis_limit,
                chat: billing.agent_used,
                chatLimit: billing.agent_limit,
              })}
            </span>
          </div>
          {billing.current_period_end ? (
            <span className="text-xs text-muted-foreground">
              {t("pricing.validUntil", {
                date: new Date(billing.current_period_end).toLocaleDateString(),
              })}
            </span>
          ) : null}
        </section>
      ) : null}

      <div className="mt-8 flex justify-center">
        <div
          className="inline-flex rounded-xl border border-border bg-background/80 p-1 shadow-sm backdrop-blur"
          role="group"
          aria-label={t("pricing.billingLabel")}
        >
          {(["monthly", "yearly"] as const).map((period) => (
            <Button
              key={period}
              type="button"
              variant={billingPeriod === period ? "default" : "ghost"}
              size="sm"
              className="rounded-lg px-4"
              aria-pressed={billingPeriod === period}
              disabled={paymentOpen}
              onClick={() => setBillingPeriod(period)}
            >
              {t(`pricing.billing.${period}`)}
              {period === "yearly" ? (
                <span className="ml-1 text-[11px] opacity-80">
                  {t("pricing.save")}
                </span>
              ) : null}
            </Button>
          ))}
        </div>
      </div>

      <section className="mt-5 grid items-stretch gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "relative h-full border-border/80 bg-card/95 shadow-sm transition-shadow hover:shadow-md",
              plan.highlighted &&
                "border-primary/60 shadow-lg ring-1 shadow-primary/10 ring-primary/20"
            )}
          >
            {plan.highlighted ? (
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-emerald-400" />
            ) : null}
            <CardHeader className="gap-3 py-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-3xl font-semibold">
                    {plan.name}
                  </CardTitle>
                  {plan.highlighted ? (
                    <Badge className="shrink-0 rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                      {t("pricing.mostPopular")}
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="text-sm leading-6">
                  {plan.description}
                </CardDescription>
              </div>
              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-4xl font-semibold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plan.period}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
              <div className="mb-4 h-px bg-border/70" />
              <ul className="space-y-3.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm leading-6">
                    <CheckIcon className="mt-1 size-4 shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="border-t-0 bg-transparent pt-0">
              <Button
                className="h-10 w-full"
                variant={plan.highlighted ? "default" : "outline"}
                disabled={
                  !plan.highlighted ||
                  paymentOpen ||
                  !!billing?.is_pro ||
                  (isAuthenticated && (billingLoading || !billing))
                }
                onClick={plan.highlighted ? handleProAction : undefined}
              >
                {plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        {t("pricing.paypalPaymentHint")}
      </p>
      {user && isAuthenticated ? (
        <PayPalPaymentDialog
          key={user.id}
          userId={user.id}
          interval={paymentInterval}
          recovering={recovering}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onPaid={refreshBilling}
        />
      ) : null}
    </main>
  )
}
