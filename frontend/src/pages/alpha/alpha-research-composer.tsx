import { ArrowUpIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function AlphaResearchComposer({
  value,
  onChange,
  onSend,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  onSend: () => Promise<void>
  disabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card px-3 py-3 shadow-sm">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (
            !disabled &&
            value.trim() &&
            !event.nativeEvent.isComposing &&
            event.key === "Enter" &&
            (event.metaKey || event.ctrlKey)
          ) {
            event.preventDefault()
            void onSend()
          }
        }}
        placeholder={t("alpha.placeholder")}
        maxLength={8000}
        rows={3}
        disabled={disabled}
        className="w-full resize-none text-sm leading-6 outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter</span>
        <Button
          type="button"
          size="icon"
          aria-label={t("alpha.send")}
          onClick={() => void onSend()}
          disabled={!value.trim() || disabled}
          className="rounded-full"
        >
          {disabled ? <Spinner /> : <ArrowUpIcon className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
