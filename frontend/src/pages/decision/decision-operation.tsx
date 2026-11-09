import { ActivityIcon, DownloadIcon, EyeIcon, UploadIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DecisionOperation = NonNullable<
  API.DecisionTask["operation_suggestion"]
>[number]
type DecisionOperationType = "buy" | "sell" | "hold"
type DecisionOperationSummary = "buy" | "sell" | "trade" | "hold" | "empty"

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null
  }

  const numberValue = typeof value === "number" ? value : Number(value)

  return Number.isNaN(numberValue) ? null : numberValue
}

function formatNumber(value: number | string | null | undefined) {
  const numberValue = toNumber(value)

  if (numberValue === null) {
    return "-"
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(numberValue)
}

function formatPercent(value: number | string | null | undefined) {
  const numberValue = toNumber(value)

  if (numberValue === null) {
    return "-"
  }

  return `${numberValue.toFixed(2)}%`
}

function getOperationSummary(
  operations: API.DecisionTask["operation_suggestion"]
): DecisionOperationSummary {
  if (!operations || operations.length === 0) {
    return "empty"
  }

  const types = new Set(
    operations.map((operation) => operation.type.toLowerCase())
  )

  if (types.has("buy") && types.has("sell")) {
    return "trade"
  }

  if (types.size === 1 && types.has("buy")) {
    return "buy"
  }

  if (types.size === 1 && types.has("sell")) {
    return "sell"
  }

  return "hold"
}

function getOperationType(type: string): DecisionOperationType {
  const nextType = type.toLowerCase()

  if (nextType === "buy" || nextType === "sell") {
    return nextType
  }

  return "hold"
}

function formatConfidence(value: number | string | null | undefined) {
  const numberValue = toNumber(value)

  if (numberValue === null) {
    return "-"
  }

  return formatPercent(numberValue > 1 ? numberValue : numberValue * 100)
}

function getSummaryIcon(summary: DecisionOperationSummary) {
  if (summary === "buy") {
    return <DownloadIcon data-icon="inline-start" />
  }

  if (summary === "sell") {
    return <UploadIcon data-icon="inline-start" />
  }

  if (summary === "trade") {
    return <ActivityIcon data-icon="inline-start" />
  }

  return <EyeIcon data-icon="inline-start" />
}

function getSummaryClassName(summary: DecisionOperationSummary) {
  if (summary === "buy") {
    return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
  }

  if (summary === "sell") {
    return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
  }

  if (summary === "trade") {
    return "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
  }

  return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
}

function DecisionOperationTable({
  operations,
}: {
  operations: API.DecisionTask["operation_suggestion"]
}) {
  const { t } = useTranslation()
  const rows = operations ?? []

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("decisionRecords.operationColumns.operation")}</TableHead>
          <TableHead>{t("decisionRecords.operationColumns.price")}</TableHead>
          <TableHead>{t("decisionRecords.operationColumns.amount")}</TableHead>
          <TableHead>{t("decisionRecords.operationColumns.ev")}</TableHead>
          <TableHead>
            {t("decisionRecords.operationColumns.confidence")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length > 0 ? (
          rows.map((operation: DecisionOperation, index) => {
            const operationType = getOperationType(operation.type)
            const shouldShowNumbers = operationType !== "hold"

            return (
              <TableRow key={`${operation.type}-${index}`}>
                <TableCell>
                  {t(`decisionRecords.operationTypes.${operationType}`)}
                </TableCell>
                <TableCell>
                  {shouldShowNumbers ? formatNumber(operation.price) : "-"}
                </TableCell>
                <TableCell>
                  {shouldShowNumbers ? formatNumber(operation.amount) : "-"}
                </TableCell>
                <TableCell>
                  {shouldShowNumbers ? formatNumber(operation.EV) : "-"}
                </TableCell>
                <TableCell>{formatConfidence(operation.confidence)}</TableCell>
              </TableRow>
            )
          })
        ) : (
          <TableRow>
            <TableCell
              className="h-16 text-center text-muted-foreground"
              colSpan={5}
            >
              {t("decisionRecords.noOperation")}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

function DecisionOperationBadge({
  operations,
}: {
  operations: API.DecisionTask["operation_suggestion"]
}) {
  const { t } = useTranslation()
  const summary = getOperationSummary(operations)

  return (
    <HoverCard openDelay={120}>
      <HoverCardTrigger asChild>
        <Badge className={cn("cursor-default", getSummaryClassName(summary))}>
          {getSummaryIcon(summary)}
          {t(`decisionRecords.operationSummary.${summary}`)}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-[520px] p-0" side="top">
        <DecisionOperationTable operations={operations} />
      </HoverCardContent>
    </HoverCard>
  )
}

export { DecisionOperationBadge, DecisionOperationTable }
