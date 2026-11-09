import { useMemo, useState } from "react"
import { CopyIcon, InfoIcon, RefreshCwIcon, SearchIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { toast } from "sonner"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Skeleton } from "@/components/ui/skeleton"
import useUser from "@/hooks/use-user"
import { useAlphaFactors } from "@/hooks/use-alpha-factors"
import {
  alphaMetrics,
  alphaMetricClass,
  formatAlphaDate,
  formatAlphaMetric,
} from "@/lib/alpha-format"
import { BacktestDetailDialog } from "./backtest-detail-dialog"

function FactorLibrary({ userId }: { userId: string | undefined }) {
  const { t, i18n } = useTranslation()
  const { setSignInModalOpen } = useUser()
  const { factors, loading, error, refresh } = useAlphaFactors(userId)
  const [selected, setSelected] = useState<API.AlphaFactor | null>(null)
  const [filter, setFilter] = useState("")
  const columns = useMemo<ColumnDef<API.AlphaFactor>[]>(
    () => [
      { accessorKey: "index", header: "#" },
      { accessorKey: "name", header: t("alpha.factor") },
      {
        accessorKey: "expr",
        header: t("alpha.expression"),
        cell: ({ row }) => (
          <HoverCard>
            <HoverCardTrigger asChild>
              <button
                type="button"
                title={t("alpha.copyExpression")}
                className="flex max-w-64 items-center gap-2 rounded bg-muted px-2 py-1 text-left text-xs"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(row.original.expr)
                    .then(() => toast.success(t("alpha.copied")))
                    .catch(() => toast.error(t("alpha.errors.copy")))
                }}
              >
                <code className="truncate">{row.original.expr}</code>
                <CopyIcon className="size-3 shrink-0" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="max-w-[90vw] text-xs leading-6 break-all">
              {row.original.expr}
            </HoverCardContent>
          </HoverCard>
        ),
      },
      ...alphaMetrics.map(([key, label]): ColumnDef<API.AlphaFactor> => ({
        id: key,
        accessorFn: (factor) => {
          const value = factor.backtest_result?.[key]
          return value == null ||
            value === "" ||
            !Number.isFinite(Number(value))
            ? undefined
            : Number(value)
        },
        sortUndefined: "last",
        header: () => (
          <div className="flex items-center justify-end gap-1">
            <span>{t(`alpha.metric.${label}`)}</span>
            <HoverCard>
              <HoverCardTrigger asChild>
                <button type="button" aria-label={t(`alpha.metric.${label}`)}>
                  <InfoIcon className="size-3.5 text-muted-foreground" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent className="text-xs leading-6">
                {t(`alpha.metricDescriptions.${label}`)}
              </HoverCardContent>
            </HoverCard>
          </div>
        ),
        cell: ({ row }) => (
          <div
            className={`text-right font-medium tabular-nums ${alphaMetricClass(key, row.original.backtest_result?.[key])}`}
          >
            {formatAlphaMetric(key, row.original.backtest_result?.[key])}
          </div>
        ),
      })),
      {
        accessorKey: "created_at",
        header: t("alpha.createdAt"),
        cell: ({ row }) =>
          formatAlphaDate(row.original.created_at, i18n.language),
      },
      {
        id: "actions",
        header: t("alpha.actions"),
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSelected(row.original)}
          >
            {t("alpha.details")}
          </Button>
        ),
      },
    ],
    [i18n.language, t]
  )
  // TanStack Table owns an imperative table instance; React Compiler cannot memoize it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: factors,
    columns,
    state: { globalFilter: filter },
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, value: string) =>
      `${row.original.name} ${row.original.expr}`
        .toLowerCase()
        .includes(value.toLowerCase()),
  })
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t("routes.factorLibrary")}</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              aria-label={t("alpha.search")}
              placeholder={t("alpha.search")}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="w-52 pl-9 sm:w-72"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            disabled={loading || !userId}
            aria-label={t("alpha.refresh")}
            onClick={refresh}
          >
            <RefreshCwIcon
              className={`size-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>
      {!userId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border text-sm text-muted-foreground">
          <p>{t("alpha.loginRequired")}</p>
          <Button onClick={() => setSignInModalOpen(true)}>
            {t("auth.login")}
          </Button>
        </div>
      ) : error ? (
        <div role="alert" className="py-12 text-center">
          <p className="text-sm text-destructive">
            {t("alpha.errors.generic")}
          </p>
          <Button variant="outline" onClick={refresh} className="mt-3">
            {t("alpha.retry")}
          </Button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-2xl border bg-card [&_[data-slot=table-container]]:overflow-visible">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="px-4 whitespace-nowrap"
                    >
                      {header.column.getCanSort() ? (
                        <div className="flex items-center gap-1">
                          <div>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                          <button
                            type="button"
                            aria-label={`${t("alpha.sort")}: ${header.column.id}`}
                            onClick={header.column.getToggleSortingHandler()}
                            className="px-1 text-muted-foreground"
                          >
                            {header.column.getIsSorted() === "asc"
                              ? "↑"
                              : header.column.getIsSorted() === "desc"
                                ? "↓"
                                : "↕"}
                          </button>
                        </div>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }, (_, index) => (
                  <TableRow key={index}>
                    {columns.map((_, column) => (
                      <TableCell key={column}>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.original.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="px-4 py-3 whitespace-nowrap"
                      >
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
                    colSpan={columns.length}
                    className="h-48 text-center text-muted-foreground"
                  >
                    <p>{t("alpha.noFactors")}</p>
                    <Button asChild variant="link">
                      <Link to="/alpha/research">{t("alpha.newResearch")}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <BacktestDetailDialog
        factor={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

export function FactorLibraryPage() {
  const { isAuthenticated, user } = useUser()
  const userId = isAuthenticated ? user?.id : undefined
  return <FactorLibrary key={userId ?? "guest"} userId={userId} />
}
