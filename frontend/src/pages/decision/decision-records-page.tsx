import { Link } from "react-router"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useCreation } from "ahooks"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, getStockQuoteUrl2 } from "@/lib/utils"
import NaverLogo from "@/assets/logo-naver.png"
import YahooLogo from "@/assets/logo-yahoo-finance.png"
import { DecisionOperationBadge } from "@/pages/decision/decision-operation"
import useDecisionTasks from "@/hooks/use-decision-tasks.ts"
import { useEffect } from "react"
import useUser from "@/hooks/use-user.ts"
import { LogInIcon, SparklesIcon, UnlockIcon } from "lucide-react"
import { RainbowButton } from "@/components/ui/rainbow-button.tsx"
import * as React from "react"
import { NewAiAnalysisDrawer } from "@/pages/decision/new-ai-analysis-drawer"
import { DecisionPaypalUnlockDialog } from "@/pages/decision/decision-paypal-unlock-dialog"

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

export function DecisionRecordsPage() {
  const { t } = useTranslation()

  const { isAuthenticated, setSignInModalOpen } = useUser()
  const { decisionTasks, decisionTasksLoading, refreshDecisionTasks } =
    useDecisionTasks()
  const [newAnalysisOpen, setNewAnalysisOpen] = React.useState(false)
  const [unlockTaskId, setUnlockTaskId] = React.useState<string | null>(null)

  useEffect(() => {
    refreshDecisionTasks()
  }, [refreshDecisionTasks])

  const columns = useCreation<ColumnDef<API.DecisionTask>[]>(
    () => [
      {
        accessorKey: "stock_name",
        header: t("decisionRecords.columns.stock"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Link
              className="hover:underline"
              to={`/decision/${row.original.id}`}
            >
              {row.original.stock_name || row.original.stock_code || "-"}
            </Link>
            {row.original.market === "korea" && (
              <a
                className="cursor-pointer"
                rel="noreferrer"
                target="_blank"
                href={getStockQuoteUrl2(row.original.stock_code, "korea")}
              >
                <img className="h-4 w-4 rounded" src={NaverLogo} />
              </a>
            )}
            {row.original.market === "america" && (
              <a
                className="cursor-pointer"
                rel="noreferrer"
                target="_blank"
                href={getStockQuoteUrl2(
                  row.original.stock_code,
                  row.original.market
                )}
              >
                <img className="h-4 w-4 rounded" src={YahooLogo} />
              </a>
            )}
          </div>
        ),
      },
      {
        accessorFn: (row) => row.price_snapshot?.price,
        id: "price",
        header: t("decisionRecords.columns.price"),
        cell: ({ row }) => formatNumber(row.original.price_snapshot?.price),
      },
      {
        accessorFn: (row) => row.price_snapshot?.change_pct,
        id: "change_pct",
        header: t("decisionRecords.columns.changePct"),
        cell: ({ row }) => {
          const value = toNumber(row.original.price_snapshot?.change_pct)

          return (
            <span
              className={cn(
                "font-medium",
                value === null || value === 0
                  ? "text-muted-foreground"
                  : value > 0
                    ? "text-red-600"
                    : "text-green-600"
              )}
            >
              {formatPercent(value)}
            </span>
          )
        },
      },
      {
        accessorFn: (row) => row.price_snapshot?.volume,
        id: "volume",
        header: t("decisionRecords.columns.volume"),
        cell: ({ row }) => formatNumber(row.original.price_snapshot?.volume),
      },
      {
        accessorKey: "operation_suggestion",
        header: t("decisionRecords.columns.operation"),
        cell: ({ row }) =>
          row.original.access?.is_full_access === false ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUnlockTaskId(row.original.id)}
            >
              <UnlockIcon data-icon="inline-start" />
              {t("decisionRecords.unlock", { defaultValue: "Unlock" })}
            </Button>
          ) : (row.original.operation_suggestion?.length ?? 0) > 0 ? (
            <DecisionOperationBadge
              operations={row.original.operation_suggestion}
            />
          ) : (
            "-"
          ),
      },
      {
        accessorKey: "created_at",
        header: t("decisionRecords.columns.createdAt"),
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        id: "actions",
        header: t("decisionRecords.columns.actions"),
        cell: ({ row }) => (
          <Button asChild size="sm" variant="outline">
            <Link to={`/decision/${row.original.id}`}>
              {t("decisionRecords.view")}
            </Link>
          </Button>
        ),
      },
    ],
    [t]
  )

  const table = useReactTable({
    data: decisionTasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <section className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("decisionRecords.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("decisionRecords.description")}
        </p>
      </div>

      <RainbowButton
        className="mb-3"
        onClick={async () => {
          if (!isAuthenticated) {
            setSignInModalOpen(true)
            return
          }
          setNewAnalysisOpen(true)
        }}
      >
        <SparklesIcon data-icon="inline-start" />
        {t("decisionRecords.newAiAnalysis")}
      </RainbowButton>

      <NewAiAnalysisDrawer
        open={newAnalysisOpen}
        onOpenChange={setNewAnalysisOpen}
      />

      {unlockTaskId ? (
        <DecisionPaypalUnlockDialog
          taskId={unlockTaskId}
          open
          onOpenChange={(open) => {
            if (!open) setUnlockTaskId(null)
          }}
          onUnlocked={async () => {
            await refreshDecisionTasks()
          }}
        />
      ) : null}

      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {decisionTasks.length === 0 && decisionTasksLoading ? (
              <TableRow>
                <TableCell
                  className="h-28 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  {t("decisionRecords.loading")}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="h-28 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  {isAuthenticated ? (
                    t("decisionRecords.empty")
                  ) : (
                    <Button onClick={() => setSignInModalOpen(true)}>
                      <LogInIcon />
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        {t("auth.login")}
                      </span>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
