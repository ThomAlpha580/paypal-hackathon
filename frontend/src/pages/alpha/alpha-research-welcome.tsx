import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlphaResearchComposer } from "./alpha-research-composer"

export function AlphaResearchWelcome({
  onSend,
  disabled = false,
}: {
  onSend: (content: string) => Promise<boolean>
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState("")
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center gap-8 py-6">
          <div className="space-y-3 text-center">
            <div
              aria-hidden="true"
              className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl"
            >
              α
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("alpha.welcome")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("alpha.welcomeDescription")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("alpha.marketScope")}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {["momentum", "volume", "volatility"].map((key) => (
              <Card
                key={key}
                role="button"
                size="sm"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled}
                data-disabled={disabled || undefined}
                className="cursor-pointer text-left transition hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
                onClick={() => {
                  if (!disabled) setInput(t(`alpha.examples.${key}`))
                }}
                onKeyDown={(event) => {
                  if (
                    !disabled &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault()
                    setInput(t(`alpha.examples.${key}`))
                  }
                }}
              >
                <CardHeader>
                  <CardTitle>{t(`alpha.exampleTitles.${key}`)}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  {t(`alpha.examples.${key}`)}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-4xl shrink-0 pt-4 pb-4">
        <AlphaResearchComposer
          value={input}
          onChange={setInput}
          disabled={disabled}
          onSend={async () => {
            if (input.trim() && (await onSend(input.trim()))) setInput("")
          }}
        />
      </div>
    </div>
  )
}
