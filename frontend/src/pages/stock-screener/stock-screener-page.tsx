import * as React from "react"
import {
  type Column,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type SortingState,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  useCreation,
  useRequest,
  useMemoizedFn,
  useLocalStorageState,
} from "ahooks"
import {
  ArrowDownWideNarrowIcon,
  ArrowUpDownIcon,
  ArrowUpNarrowWideIcon,
  BotIcon,
  Building2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsDownIcon,
  ChevronsUpIcon,
  EqualIcon,
  FileSearchCornerIcon,
  GroupIcon,
  MicroscopeIcon,
  SearchIcon,
  Share2Icon,
  SparklesIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { RainbowButton } from "@/components/ui/rainbow-button"
import { Spinner } from "@/components/ui/spinner"
import {
  getDefaultStockScreener,
  getStockScreenerResult,
  queryStockScreener,
  getQuotaError,
} from "@/lib/service"
import { getCountryLogoUrl, stockScreenerMarketOptions } from "@/lib/markets"
import {
  cn,
  getScreenerRowCode,
  getScreenerRowCodeAndDescription,
  getScreenerRowName,
  getStockQuoteUrl,
} from "@/lib/utils"
import useUser from "@/hooks/use-user.ts"
import useBilling from "@/hooks/use-billing"
import useDecisionTasks from "@/hooks/use-decision-tasks.ts"
import { useNavigate } from "react-router"

import monadLogo from "@/assets/logo-monad.png"

const STOCK_SCREENER_QUERY_STORAGE_KEY = "stock-screener-query"
const stockExampleKeys = [
  "highBetaStocks",
  "overvaluedStocks",
  "momentumMasters",
  "earningsManipulators",
  "profitableExpansions",
  "financialFortresses",
  "near52WeekHigh",
  "techInnovators",
  "highBetaBulls",
] as const
const coinExampleKeys = [
  "cryptoMarketLeaders",
  "cryptoMomentum",
  "cryptoValueOpportunities",
] as const
const cexExampleKeys = [
  "activeCexPairs",
  "cexVolumeSurges",
  "bullishCexPairs",
] as const
const dexExampleKeys = [
  "liquidDexMarkets",
  "activeDexMarkets",
  "emergingDexTokens",
] as const
type ExampleKey =
  | (typeof stockExampleKeys)[number]
  | (typeof coinExampleKeys)[number]
  | (typeof cexExampleKeys)[number]
  | (typeof dexExampleKeys)[number]

const marketExampleKeys: Partial<
  Record<API.StockScreenerMarket, readonly ExampleKey[]>
> = {
  coin: coinExampleKeys,
  cex: cexExampleKeys,
  dex: dexExampleKeys,
}
const loadingMessageKeys = [
  "researching",
  "gathering",
  "analyzing",
  "screening",
] as const
const loadingMessageIcon = [
  <MicroscopeIcon />,
  <GroupIcon />,
  <FileSearchCornerIcon />,
  <Building2Icon />,
]

function getMarketLogoUrl(
  countryCode: string,
  market: API.StockScreenerMarket
) {
  return market === "monad" ? monadLogo : getCountryLogoUrl(countryCode)
}

function getDefaultStockScreenerMarket(): API.StockScreenerMarket {
  const subdomain = window.location.hostname.split(".")[0].toLowerCase()

  if (subdomain === "crypto") {
    return "coin"
  }

  const countryCode = subdomain.toUpperCase()

  return (
    stockScreenerMarketOptions.find(
      (option) => option.countryCode.toUpperCase() === countryCode
    )?.code ?? stockScreenerMarketOptions[0].code
  )
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 8,
  }).format(value)
}

function formatCoinPrice(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  if (value === 0) {
    return "0"
  }

  if (value <= 1e-5) {
    const [mantissa, exponent] = value.toExponential().split("e")
    const numericMantissa = Number(mantissa)

    if (Math.abs(numericMantissa) === 1) {
      return `${mantissa}e${Number(exponent)}`
    }

    return `${numericMantissa / 10}e${Number(exponent) + 1}`
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 20,
  }).format(value)
}

function formatCompactNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  const units = [
    { value: 1e12, suffix: "T" },
    { value: 1e9, suffix: "B" },
    { value: 1e6, suffix: "M" },
    { value: 1e3, suffix: "K" },
  ]
  const unit = units.find(
    ({ value: unitValue }) => Math.abs(value) >= unitValue
  )

  if (!unit) {
    return formatNumber(value)
  }

  const scaledValue = value / unit.value
  return `${new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(scaledValue)}${unit.suffix}`
}

function formatChange(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  return `${value.toFixed(2)}%`
}

function getRowName(row: API.ScreenerResultRow) {
  return getScreenerRowName(row)
}

function getRowDescription(row: API.ScreenerResultRow) {
  return row.description || row["ticker-view"]?.description || ""
}

function getRowLogoId(row: API.ScreenerResultRow) {
  return row.logoid || row["ticker-view"]?.logo?.logoid || ""
}

function getRowChange(row: API.ScreenerResultRow) {
  return row.change ?? row["24h_close_change|5"]
}

function getRowVolume(row: API.ScreenerResultRow) {
  return row.volume ?? row["24h_vol_cmc"]
}

function getRowMarketCap(row: API.ScreenerResultRow) {
  return row.market_cap_basic ?? row.market_cap_calc
}

function getCexVolume(row: API.ScreenerResultRow) {
  return row["24h_vol|5"]
}

function getCexVolumeChange(row: API.ScreenerResultRow) {
  return row["24h_vol_change|5"]
}

function getCexExchange(row: API.ScreenerResultRow) {
  return (
    row["exchange.tr"] || row["ticker-view"]?.exchange || row.exchange || "-"
  )
}

function getExchangeSource(row: API.ScreenerResultRow) {
  return row.exchange || row["ticker-view"]?.exchange || ""
}

function getBlockchain(row: API.ScreenerResultRow) {
  return row["blockchain-id"] || ""
}

function sourceIcon(source: string, type: "source" | "blockchain") {
  if (!source) {
    return null
  }

  return (
    <img
      alt=""
      className="size-6 shrink-0 rounded-full object-contain"
      loading="lazy"
      src={`https://s3-symbol-logo.tradingview.com/${type}/${source}.svg`}
    />
  )
}

function getRating(row: API.ScreenerResultRow, market: string) {
  if (["coin", "cex", "dex"].includes(market)) {
    return {
      type: row.TechRating_1D,
      label: row["TechRating_1D.tr"],
    }
  }

  return {
    type: row.AnalystRating,
    label: row["AnalystRating.tr"],
  }
}

function getRatingIcon(rating: API.ScreenerRating | undefined) {
  switch (rating) {
    case "StrongBuy":
      return <ChevronsUpIcon className="size-4 text-green-600" />
    case "Buy":
      return <ChevronUpIcon className="size-4 text-green-600" />
    case "StrongSell":
      return <ChevronsDownIcon className="size-4 text-red-600" />
    case "Sell":
      return <ChevronDownIcon className="size-4 text-red-600" />
    case "Neutral":
      return <EqualIcon className="size-4 text-muted-foreground" />
    default:
      return null
  }
}

function getRatingColorClass(rating: API.ScreenerRating | undefined) {
  if (rating === "StrongBuy" || rating === "Buy") {
    return "text-green-600"
  }

  if (rating === "StrongSell" || rating === "Sell") {
    return "text-red-600"
  }

  return "text-muted-foreground"
}

function getChangeColorClass(
  value: number | null | undefined,
  market: string | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value) ||
    value === 0
  ) {
    return "text-muted-foreground"
  }

  const isPositive = value > 0

  if (!market) {
    return isPositive ? "text-green-600" : "text-red-600"
  }

  if (["china", "hongkong", "japan", "taiwan"].includes(market)) {
    return isPositive ? "text-red-600" : "text-green-600"
  }

  if (market === "korea") {
    return isPositive ? "text-red-600" : "text-blue-600"
  }

  return isPositive ? "text-green-600" : "text-red-600"
}

function periodHeader(label: string) {
  return (
    <span className="flex flex-col items-start leading-tight">
      <span>{label}</span>
      <span className="text-xs font-normal text-muted-foreground">24h</span>
    </span>
  )
}

function getStoredStockScreenerQuery() {
  try {
    return localStorage.getItem(STOCK_SCREENER_QUERY_STORAGE_KEY) ?? ""
  } catch (error) {
    console.error(
      "Failed to load stock screener query from localStorage:",
      error
    )
    return ""
  }
}

function saveStockScreenerQuery(query: string) {
  try {
    localStorage.setItem(STOCK_SCREENER_QUERY_STORAGE_KEY, query)
  } catch (error) {
    console.error("Failed to save stock screener query to localStorage:", error)
  }
}

export function StockScreenerPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, setSignInModalOpen } = useUser()
  const { refreshBilling } = useBilling()
  const { createDecisionTask, createDecisionTaskLoading, creatingStockCode } =
    useDecisionTasks()

  const [market, setMarket] = useLocalStorageState<API.StockScreenerMarket>(
    "stock-screener-market",
    {
      defaultValue: getDefaultStockScreenerMarket(),
    }
  )
  const [query, setQuery] = React.useState(getStoredStockScreenerQuery)
  const [loadingMessageIndex, setLoadingMessageIndex] = React.useState(0)
  const [summary, setSummary] = React.useState<string>("")
  const [rows, setRows] = React.useState<API.ScreenerResultRow[]>([])
  const hasSubmittedQueryRef = React.useRef(false)
  const selectedMarket =
    stockScreenerMarketOptions.find((option) => option.code === market) ??
    stockScreenerMarketOptions[0]
  const exampleKeys = marketExampleKeys[market] ?? stockExampleKeys

  const sortableHeader = useMemoizedFn(
    (
      title: React.ReactNode,
      column: Column<API.ScreenerResultRow, unknown>
    ) => {
      const isSorted = column.getIsSorted()
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {title}
          {isSorted === "asc" ? (
            <ArrowUpNarrowWideIcon />
          ) : isSorted === "desc" ? (
            <ArrowDownWideNarrowIcon />
          ) : (
            <ArrowUpDownIcon className="opacity-40" />
          )}
        </Button>
      )
    }
  )

  const columns = useCreation<ColumnDef<API.ScreenerResultRow>[]>(() => {
    const companyColumn: ColumnDef<API.ScreenerResultRow> = {
      id: "company",
      header: t("stockScreener.columns.name"),
      cell: ({ row }) => (
        <a
          className="group flex w-fit cursor-pointer items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={getStockQuoteUrl(row.original)}
          rel="noreferrer"
          target="_blank"
        >
          {getRowLogoId(row.original) && (
            <img
              alt=""
              className="size-6 shrink-0 rounded-full bg-background object-contain"
              loading="lazy"
              src={`https://s3-symbol-logo.tradingview.com/${getRowLogoId(row.original)}.svg`}
            />
          )}
          <span className="rounded-md bg-border px-2 py-0.5 text-sm font-medium text-accent-foreground">
            <span className="truncate">{getRowName(row.original).trim()}</span>
          </span>
          <span className="text-sm group-hover:underline">
            {getRowDescription(row.original).trim()}
          </span>
        </a>
      ),
    }

    if (market === "dex") {
      return [
        companyColumn,
        {
          accessorFn: getBlockchain,
          id: "blockchain",
          header: ({ column }) =>
            sortableHeader(t("stockScreener.columns.blockchain"), column),
          cell: ({ row }) => (
            <span className="inline-flex items-center gap-1">
              {sourceIcon(getBlockchain(row.original), "blockchain")}
              {row.original["blockchain-id.tr"] ||
                getBlockchain(row.original) ||
                "-"}
            </span>
          ),
        },
        {
          accessorFn: getExchangeSource,
          id: "exchange",
          header: ({ column }) =>
            sortableHeader(t("stockScreener.columns.exchange"), column),
          cell: ({ row }) => (
            <span className="inline-flex items-center gap-1">
              {sourceIcon(getExchangeSource(row.original), "source")}
              {getCexExchange(row.original)}
            </span>
          ),
        },
        {
          accessorKey: "close",
          header: ({ column }) =>
            sortableHeader(t("stockScreener.columns.price"), column),
          cell: ({ row }) => (
            <span className="inline-flex items-end">
              {formatPrice(row.original.close)}
              <span className="ml-1 text-[10px] text-muted-foreground">
                {row.original.currency}
              </span>
            </span>
          ),
        },
        {
          accessorFn: getRowChange,
          id: "change",
          header: ({ column }) =>
            sortableHeader(
              periodHeader(t("stockScreener.columns.change24h")),
              column
            ),
          cell: ({ row }) => {
            const change = getRowChange(row.original)

            return (
              <span
                className={cn(
                  "font-medium",
                  getChangeColorClass(change, market)
                )}
              >
                {formatChange(change)}
              </span>
            )
          },
        },
        {
          accessorKey: "dex_txs_count_24h",
          header: ({ column }) =>
            sortableHeader(
              periodHeader(t("stockScreener.columns.transactions")),
              column
            ),
          cell: ({ row }) =>
            formatCompactNumber(row.original.dex_txs_count_24h),
        },
        {
          accessorKey: "dex_trading_volume_24h",
          header: ({ column }) =>
            sortableHeader(
              periodHeader(t("stockScreener.columns.tradingVolume")),
              column
            ),
          cell: ({ row }) => (
            <span className="inline-flex items-end">
              {formatCompactNumber(row.original.dex_trading_volume_24h)}
              <span className="ml-1 text-[10px] text-muted-foreground">
                USD
              </span>
            </span>
          ),
        },
        {
          accessorKey: "dex_txs_count_uniq_24h",
          header: ({ column }) =>
            sortableHeader(
              periodHeader(t("stockScreener.columns.traders")),
              column
            ),
          cell: ({ row }) =>
            formatCompactNumber(row.original.dex_txs_count_uniq_24h),
        },
        {
          accessorKey: "dex_total_liquidity",
          header: t("stockScreener.columns.liquidity"),
          cell: ({ row }) => (
            <span className="inline-flex items-end">
              {formatCompactNumber(row.original.dex_total_liquidity)}
              <span className="ml-1 text-[10px] text-muted-foreground">
                USD
              </span>
            </span>
          ),
        },
        {
          accessorKey: "fully_diluted_value",
          header: t("stockScreener.columns.fdv"),
          cell: ({ row }) => (
            <span className="inline-flex items-end">
              {formatCompactNumber(row.original.fully_diluted_value)}
              <span className="ml-1 text-[10px] text-muted-foreground">
                USD
              </span>
            </span>
          ),
        },
        {
          id: "rating",
          header: t("stockScreener.columns.techRating"),
          cell: ({ row }) => {
            const rating = getRating(row.original, market)

            return (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  getRatingColorClass(rating.type)
                )}
              >
                {getRatingIcon(rating.type)}
                {rating.label || "-"}
              </span>
            )
          },
        },
      ]
    }

    if (market === "cex") {
      return [
        companyColumn,
        {
          accessorFn: getCexExchange,
          id: "exchange",
          header: ({ column }) =>
            sortableHeader(t("stockScreener.columns.exchange"), column),
          cell: ({ row }) => (
            <span className="inline-flex items-center gap-1">
              {sourceIcon(getExchangeSource(row.original), "source")}
              {getCexExchange(row.original)}
            </span>
          ),
        },
        {
          accessorKey: "close",
          header: ({ column }) =>
            sortableHeader(t("stockScreener.columns.price"), column),
          cell: ({ row }) => (
            <span className="inline-flex items-end">
              {formatPrice(row.original.close)}
              <span className="ml-1 text-[10px] text-muted-foreground">
                {row.original.currency}
              </span>
            </span>
          ),
        },
        {
          accessorFn: getRowChange,
          id: "change",
          header: ({ column }) =>
            sortableHeader(
              periodHeader(t("stockScreener.columns.change24h")),
              column
            ),
          cell: ({ row }) => {
            const change = getRowChange(row.original)

            return (
              <span
                className={cn(
                  "font-medium",
                  getChangeColorClass(change, market)
                )}
              >
                {formatChange(change)}
              </span>
            )
          },
        },
        {
          accessorFn: getCexVolume,
          id: "volume",
          header: ({ column }) =>
            sortableHeader(
              periodHeader(t("stockScreener.columns.volume24hUsd")),
              column
            ),
          cell: ({ row }) => formatCompactNumber(getCexVolume(row.original)),
        },
        {
          accessorFn: getCexVolumeChange,
          id: "volumeChange",
          header: ({ column }) =>
            sortableHeader(
              periodHeader(t("stockScreener.columns.volumeChange24h")),
              column
            ),
          cell: ({ row }) => {
            const change = getCexVolumeChange(row.original)

            return (
              <span
                className={cn(
                  "font-medium",
                  getChangeColorClass(change, market)
                )}
              >
                {formatChange(change)}
              </span>
            )
          },
        },
        {
          id: "rating",
          header: t("stockScreener.columns.techRating"),
          cell: ({ row }) => {
            const rating = getRating(row.original, market)

            return (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  getRatingColorClass(rating.type)
                )}
              >
                {getRatingIcon(rating.type)}
                {rating.label || "-"}
              </span>
            )
          },
        },
      ]
    }

    return [
      companyColumn,
      {
        id: "operation",
        header: t("stockScreener.columns.operation"),
        cell: ({ row }) => {
          const rowMarket = row.original.market || market

          return (
            <div className="flex items-center gap-2">
              <RainbowButton
                disabled={createDecisionTaskLoading}
                size="xs"
                onClick={async () => {
                  if (
                    !["korea", "america", "hongkong", "coin", "monad"].includes(
                      rowMarket
                    )
                  ) {
                    toast(t("stockScreener.aiAnalysisUnavailable"))
                    return
                  }

                  if (!isAuthenticated) {
                    setSignInModalOpen(true)
                    return
                  }

                  try {
                    const task = await createDecisionTask(
                      getScreenerRowCode(row.original),
                      rowMarket
                    )
                    navigate(`/decision/${task.id}`)
                  } catch (error) {
                    toast.error(
                      getQuotaError(error)
                        ? t("pricing.quotaReached")
                        : t("stockScreener.error")
                    )
                  }
                }}
              >
                {creatingStockCode === getScreenerRowCode(row.original) ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <SparklesIcon data-icon="inline-start" />
                )}
                {t("stockScreener.aiAnalysis")}
              </RainbowButton>
              {["coin", "monad", "cex", "dex"].includes(rowMarket) ? null : (
                <RainbowButton
                  size="xs"
                  type="button"
                  onClick={() => {
                    const symbol = getScreenerRowCodeAndDescription(
                      row.original
                    )
                    navigate(`/chat?symbol=${encodeURIComponent(symbol)}`)
                  }}
                >
                  <BotIcon data-icon="inline-start" />
                  {t("stockScreener.askAi")}
                </RainbowButton>
              )}
            </div>
          )
        },
      },
      {
        accessorFn: getRowChange,
        id: "change",
        header: ({ column }) =>
          sortableHeader(t("stockScreener.columns.change"), column),
        cell: ({ row }) => (
          <span
            className={cn(
              "font-medium",
              getChangeColorClass(
                getRowChange(row.original),
                row.original.market
              )
            )}
          >
            {formatChange(getRowChange(row.original))}
          </span>
        ),
      },
      {
        accessorKey: "close",
        header: ({ column }) =>
          sortableHeader(t("stockScreener.columns.close"), column),
        cell: ({ row }) => (
          <span className="inline-flex items-end">
            {market === "coin"
              ? formatCoinPrice(row.original.close)
              : formatNumber(row.original.close)}
            <span className="ml-1 text-[10px] text-muted-foreground">
              {row.original.currency}
            </span>
          </span>
        ),
      },
      {
        accessorFn: getRowVolume,
        id: "volume",
        header: ({ column }) =>
          sortableHeader(t("stockScreener.columns.volume"), column),
        cell: ({ row }) => formatCompactNumber(getRowVolume(row.original)),
      },
      {
        accessorFn: getRowMarketCap,
        id: "market_cap_basic",
        header: ({ column }) =>
          sortableHeader(t("stockScreener.columns.marketCap"), column),
        cell: ({ row }) => formatCompactNumber(getRowMarketCap(row.original)),
      },
      {
        id: "rating",
        header:
          market === "coin"
            ? t("stockScreener.columns.techRating")
            : t("stockScreener.columns.analystRating"),
        cell: ({ row }) => {
          const rating = getRating(row.original, market)

          return (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                getRatingColorClass(rating.type)
              )}
            >
              {getRatingIcon(rating.type)}
              {rating.label || "-"}
            </span>
          )
        },
      },
    ]
  }, [
    createDecisionTask,
    createDecisionTaskLoading,
    creatingStockCode,
    isAuthenticated,
    market,
    navigate,
    setSignInModalOpen,
    t,
  ])

  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
  })

  const { loading, run } = useRequest(
    async (nextQuery: string) =>
      queryStockScreener({
        market,
        query: nextQuery,
      }),
    {
      manual: true,
      onSuccess: ({ metadata, id }) => {
        const url = new URL(window.location.href)
        url.searchParams.set("screen_id", id)
        window.history.replaceState({}, "", url)

        setSummary(metadata.summary)
        setRows(metadata.results)
        void refreshBilling().catch(() => undefined)
      },
      onError: (error) => {
        toast.error(
          getQuotaError(error)
            ? t("pricing.quotaReached")
            : t("stockScreener.error")
        )
      },
    }
  )

  useRequest(
    async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const screenId = urlParams.get("screen_id")
      if (screenId) {
        const {
          metadata,
          market: resultMarket,
          query,
        } = await getStockScreenerResult({
          screenId: screenId,
        })
        if (!hasSubmittedQueryRef.current) {
          setQuery(query)
          if (
            stockScreenerMarketOptions.some(
              (option) => option.code === resultMarket
            )
          ) {
            setMarket(resultMarket as API.StockScreenerMarket)
          }
          setSummary(metadata.summary)
          setRows(metadata.results)
        }
      } else {
        const result = await getDefaultStockScreener({
          market,
        })
        if (!hasSubmittedQueryRef.current) {
          setRows(result)
        }
      }
    },
    {
      refreshDeps: [market],
      onError: () => {
        toast.error(t("stockScreener.error"))
      },
    }
  )

  React.useEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0)
      return
    }

    const intervalId = window.setInterval(() => {
      setLoadingMessageIndex((index) => (index + 1) % loadingMessageKeys.length)
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [loading])

  const canSubmit = query.trim().length > 0 && !loading
  const loadingMessageKey = loadingMessageKeys[loadingMessageIndex]

  const handleExampleSelect = useMemoizedFn((example: ExampleKey) => {
    setQuery(t(`stockScreener.examples.items.${example}.description`))
  })

  const handleMarketChange = useMemoizedFn((nextMarket: string) => {
    if (
      !stockScreenerMarketOptions.some((option) => option.code === nextMarket)
    ) {
      return
    }

    const url = new URL(window.location.href)
    url.searchParams.delete("screen_id")
    window.history.replaceState(window.history.state, "", url)

    setSummary("")
    setRows([])
    setMarket(nextMarket as API.StockScreenerMarket)
    hasSubmittedQueryRef.current = false
  })

  const handleSubmit = useMemoizedFn(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!canSubmit) {
        return
      }

      const nextQuery = query.trim()

      saveStockScreenerQuery(nextQuery)

      if (!isAuthenticated) {
        setSignInModalOpen(true)
        return
      }

      hasSubmittedQueryRef.current = true

      run(nextQuery)
    }
  )

  const handleShareClick = useMemoizedFn(async () => {
    await navigator.clipboard.writeText(window.location.href)
    toast.success(t("stockScreener.shareCopied"))
  })

  return (
    <section className="w-full max-w-full min-w-0">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("stockScreener.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("stockScreener.description")}
        </p>
      </div>

      <form className="mb-3 space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Carousel
            opts={{
              align: "start",
              slidesToScroll: 2,
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-medium">
                {t("stockScreener.examples.title")}
              </div>
              <div className="flex items-center gap-1">
                <CarouselPrevious
                  aria-label={t("stockScreener.examples.previous")}
                  className="static inset-auto my-0"
                  type="button"
                />
                <CarouselNext
                  aria-label={t("stockScreener.examples.next")}
                  className="static inset-auto my-0"
                  type="button"
                />
              </div>
            </div>
            <CarouselContent className="-ml-3">
              {exampleKeys.map((example) => (
                <CarouselItem
                  key={example}
                  className="basis-1/2 pl-3 sm:basis-1/3 md:basis-1/3 lg:basis-1/3 xl:basis-1/4 2xl:basis-1/5"
                >
                  <div className="p-0.5">
                    <Card
                      aria-label={t(
                        `stockScreener.examples.items.${example}.title`
                      )}
                      className="h-full cursor-pointer transition-colors hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      onClick={() => handleExampleSelect(example)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          handleExampleSelect(example)
                        }
                      }}
                      role="button"
                      size="sm"
                      tabIndex={0}
                    >
                      <CardHeader>
                        <CardTitle>
                          {t(`stockScreener.examples.items.${example}.title`)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="line-clamp-2 min-h-10 text-muted-foreground">
                        {t(
                          `stockScreener.examples.items.${example}.description`
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
        <Textarea
          className="min-h-32 resize-y bg-background"
          placeholder={t("stockScreener.placeholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="flex items-center justify-between gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline">
                <img
                  alt=""
                  className="size-4 rounded-full"
                  src={getMarketLogoUrl(
                    selectedMarket.countryCode,
                    selectedMarket.code
                  )}
                />
                {t(selectedMarket.labelKey)}
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup
                value={market}
                onValueChange={handleMarketChange}
              >
                {stockScreenerMarketOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.code} value={option.code}>
                    <img
                      alt=""
                      className="size-4 rounded-full"
                      src={getMarketLogoUrl(option.countryCode, option.code)}
                    />
                    {t(option.labelKey)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button disabled={!canSubmit} type="submit">
            <SearchIcon />
            {loading ? t("stockScreener.loading") : t("stockScreener.submit")}
          </Button>
        </div>
      </form>

      {summary && (
        <>
          <div className="mb-2 rounded-md border bg-card p-4 text-sm text-card-foreground">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Marker>
                <MarkerIcon>
                  <BotIcon />
                </MarkerIcon>
                <MarkerContent>{t("stockScreener.summary")}</MarkerContent>
              </Marker>
            </div>
            <div className="mt-2">{summary}</div>
          </div>
          <div className="mb-2">
            <Button
              aria-label={t("stockScreener.share")}
              size="sm"
              type="button"
              variant="outline"
              onClick={handleShareClick}
            >
              <Share2Icon />
              {t("stockScreener.share")}
            </Button>
          </div>
        </>
      )}

      {loading ? (
        <div className="relative h-72 overflow-hidden rounded-md border bg-card">
          <FlickeringGrid
            className="absolute inset-0 opacity-80"
            squareSize={4}
            gridGap={6}
            color="#60A5FA"
            maxOpacity={0.5}
            flickerChance={0.1}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-card/20">
            <Marker
              key={`${i18n.language}-${loadingMessageKey}`}
              className="animate-screener-loading-message w-auto text-foreground"
              variant="separator"
            >
              <MarkerIcon>{loadingMessageIcon[loadingMessageIndex]}</MarkerIcon>
              <MarkerContent>
                {t(`stockScreener.loadingMessages.${loadingMessageKey}`)}
              </MarkerContent>
            </Marker>
          </div>
        </div>
      ) : (
        <div className="max-w-full min-w-0 overflow-hidden rounded-md border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      className={cn(
                        header.column.id === "company" &&
                          "sticky left-0 z-10 bg-card shadow-[4px_0_4px_-4px] shadow-border"
                      )}
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ cursor: "pointer" }}
                    >
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
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        className={cn(
                          cell.column.id === "company" &&
                            "sticky left-0 z-[1] bg-card shadow-[4px_0_4px_-4px] shadow-border"
                        )}
                        key={cell.id}
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
                    className="h-28 text-center text-muted-foreground"
                    colSpan={columns.length}
                  >
                    {query.trim().length > 0
                      ? t("stockScreener.noMatches")
                      : t("stockScreener.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
