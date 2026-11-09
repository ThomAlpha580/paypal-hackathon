import * as React from "react"
import { useLocalStorageState, useMemoizedFn, useRequest } from "ahooks"
import { ChevronDownIcon, SearchIcon, SparklesIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import useDecisionTasks from "@/hooks/use-decision-tasks"
import { getQuotaError, searchStock } from "@/lib/service"
import { getCountryLogoUrl, stockScreenerMarketOptions } from "@/lib/markets"
import { getScreenerRowCode, getScreenerRowName } from "@/lib/utils"

const AI_ANALYSIS_MARKETS: API.StockScreenerMarket[] = [
  "korea",
  "america",
  "hongkong",
  "coin",
]
const aiAnalysisMarketOptions = stockScreenerMarketOptions.filter((option) =>
  AI_ANALYSIS_MARKETS.includes(option.code)
)

type NewAiAnalysisDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const metadataLabels: Record<
  API.StockScreenerMarket,
  {
    availableFunds: string
    holdingCost: string
    holdingShares: string
  }
> = {
  america: {
    availableFunds: "Available funds",
    holdingCost: "Holding cost",
    holdingShares: "Holding units",
  },
  coin: {
    availableFunds: "Available funds",
    holdingCost: "Holding cost",
    holdingShares: "Holding units",
  },
  cex: {
    availableFunds: "Available funds",
    holdingCost: "Holding cost",
    holdingShares: "Holding units",
  },
  china: {
    availableFunds: "可用资金",
    holdingCost: "持仓成本",
    holdingShares: "持仓数量",
  },
  dex: {
    availableFunds: "Available funds",
    holdingCost: "Holding cost",
    holdingShares: "Holding units",
  },
  hongkong: {
    availableFunds: "可用資金",
    holdingCost: "持倉成本",
    holdingShares: "持倉數量",
  },
  india: {
    availableFunds: "Available funds",
    holdingCost: "Holding cost",
    holdingShares: "Holding units",
  },
  japan: {
    availableFunds: "利用可能資金",
    holdingCost: "保有コスト",
    holdingShares: "保有数量",
  },
  korea: {
    availableFunds: "가용 자금",
    holdingCost: "보유 비용",
    holdingShares: "보유 수량",
  },
  taiwan: {
    availableFunds: "可用資金",
    holdingCost: "持有成本",
    holdingShares: "持有數量",
  },
}

function getStockOptionLabel(stock: API.ScreenerResultRow) {
  const description =
    stock.description ||
    stock["ticker-view"]?.description ||
    getScreenerRowName(stock)
  const name = getScreenerRowName(stock)
  return description === name ? name : `${description} (${name})`
}

function isPositiveNumber(value: string) {
  const numberValue = Number(value)
  return (
    value.trim().length > 0 && Number.isFinite(numberValue) && numberValue > 0
  )
}

function getDefaultAiAnalysisMarket(): API.StockScreenerMarket {
  const countryCode = window.location.hostname.split(".")[0].toUpperCase()

  return (
    aiAnalysisMarketOptions.find(
      (option) => option.countryCode.toUpperCase() === countryCode
    )?.code ?? "america"
  )
}

export function NewAiAnalysisDrawer({
  open,
  onOpenChange,
}: NewAiAnalysisDrawerProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { createDecisionTask, createDecisionTaskLoading } = useDecisionTasks()

  const [market, setMarket] = useLocalStorageState<API.StockScreenerMarket>(
    "new-ai-analysis-market",
    {
      defaultValue: getDefaultAiAnalysisMarket(),
    }
  )
  const [keyword, setKeyword] = React.useState("")
  const [resultsOpen, setResultsOpen] = React.useState(false)
  const [moreParameters, setMoreParameters] = React.useState(false)
  const [availableFunds, setAvailableFunds] = React.useState("1000000")
  const [holdingCost, setHoldingCost] = React.useState("0")
  const [holdingShares, setHoldingShares] = React.useState("100")
  const selectedStockRef = React.useRef<API.ScreenerResultRow | null>(null)

  const selectedMarket =
    aiAnalysisMarketOptions.find((option) => option.code === market) ??
    aiAnalysisMarketOptions.find((option) => option.code === "america")!

  const {
    data: searchResults = [],
    loading: searchStockLoading,
    run: runSearchStock,
  } = useRequest(
    async (nextKeyword: string) =>
      searchStock({
        market,
        keyword: nextKeyword,
      }),
    {
      manual: true,
      onSuccess: () => {
        setResultsOpen(true)
      },
      onError: () => {
        toast.error(t("decisionRecords.newAnalysis.searchError"))
      },
    }
  )

  const resetForm = useMemoizedFn(() => {
    setKeyword("")
    setResultsOpen(false)
    setMoreParameters(false)
    setAvailableFunds("1000000")
    setHoldingCost("0")
    setHoldingShares("100")
    selectedStockRef.current = null
  })

  const handleOpenChange = useMemoizedFn((nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  })

  const handleMarketChange = useMemoizedFn((nextMarket: string) => {
    if (!aiAnalysisMarketOptions.some((option) => option.code === nextMarket)) {
      return
    }

    setMarket(nextMarket as API.StockScreenerMarket)
    setKeyword("")
    setResultsOpen(false)
    selectedStockRef.current = null
  })

  const handleKeywordChange = useMemoizedFn(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setKeyword(event.target.value)
      setResultsOpen(false)
      selectedStockRef.current = null
    }
  )

  const handleSearch = useMemoizedFn(() => {
    const nextKeyword = keyword.trim()
    if (!nextKeyword || searchStockLoading) {
      return
    }

    runSearchStock(nextKeyword)
  })

  const handleStockSelect = useMemoizedFn((stock: API.ScreenerResultRow) => {
    selectedStockRef.current = stock
    setKeyword(getStockOptionLabel(stock))
    setResultsOpen(false)
  })

  const parametersValid =
    !moreParameters ||
    (isPositiveNumber(availableFunds) && isPositiveNumber(holdingShares))
  const canCreate =
    selectedStockRef.current !== null &&
    parametersValid &&
    !createDecisionTaskLoading

  const handleCreate = useMemoizedFn(async () => {
    const selectedStock = selectedStockRef.current
    if (!selectedStock) {
      toast.error(t("decisionRecords.newAnalysis.selectStockFirst"))
      return
    }

    if (!parametersValid) {
      toast.error(t("decisionRecords.newAnalysis.invalidParameters"))
      return
    }

    const labels = metadataLabels[market]
    const metadata = moreParameters
      ? [
          {
            label: labels.availableFunds,
            value: availableFunds.trim(),
          },
          {
            label: labels.holdingCost,
            value: holdingCost.trim(),
          },
          {
            label: labels.holdingShares,
            value: holdingShares.trim(),
          },
        ]
      : undefined

    try {
      const task = await createDecisionTask(
        getScreenerRowCode(selectedStock),
        market,
        metadata
      )
      handleOpenChange(false)
      navigate(`/decision/${task.id}`)
    } catch (error) {
      toast.error(
        getQuotaError(error)
          ? t("pricing.quotaReached")
          : t("decisionRecords.error")
      )
    }
  })

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>{t("decisionRecords.newAnalysis.title")}</DrawerTitle>
          <DrawerDescription>
            {t("decisionRecords.newAnalysis.description")}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <FieldGroup>
            <Field>
              <FieldLabel>{t("decisionRecords.newAnalysis.market")}</FieldLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline">
                    <img
                      alt=""
                      className="size-4 rounded-full"
                      src={getCountryLogoUrl(selectedMarket.countryCode)}
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
                    {aiAnalysisMarketOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.code}
                        value={option.code}
                      >
                        <img
                          alt=""
                          className="size-4 rounded-full"
                          src={getCountryLogoUrl(option.countryCode)}
                        />
                        {t(option.labelKey)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </Field>

            <Field>
              <FieldLabel htmlFor="decision-stock-keyword">
                {t("decisionRecords.columns.stock")}
              </FieldLabel>
              <DropdownMenu
                modal={false}
                open={resultsOpen}
                onOpenChange={setResultsOpen}
              >
                <DropdownMenuTrigger asChild>
                  <div className="flex gap-2">
                    <Input
                      id="decision-stock-keyword"
                      autoComplete="off"
                      placeholder={t(
                        "decisionRecords.newAnalysis.keywordPlaceholder"
                      )}
                      value={keyword}
                      onChange={handleKeywordChange}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          handleSearch()
                        }
                      }}
                    />
                    <Button
                      aria-label={t("decisionRecords.newAnalysis.search")}
                      disabled={
                        keyword.trim().length === 0 || searchStockLoading
                      }
                      type="button"
                      variant="outline"
                      onClick={handleSearch}
                    >
                      {searchStockLoading ? <Spinner /> : <SearchIcon />}
                    </Button>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-72 min-w-[var(--radix-dropdown-menu-trigger-width)]"
                  onCloseAutoFocus={(event) => event.preventDefault()}
                >
                  {searchStockLoading ? (
                    <DropdownMenuItem disabled>
                      {t("decisionRecords.newAnalysis.searching")}
                    </DropdownMenuItem>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((stock) => (
                      <DropdownMenuItem
                        key={`${stock.market}-${stock.name}-${stock.exchange}`}
                        className="cursor-pointer"
                        onSelect={() => handleStockSelect(stock)}
                      >
                        <span className="truncate">
                          {getStockOptionLabel(stock)}
                        </span>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      {t("decisionRecords.newAnalysis.noResults")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <FieldDescription>
                {t("decisionRecords.newAnalysis.keywordDescription")}
              </FieldDescription>
            </Field>

            <Field orientation="horizontal">
              <Switch
                checked={moreParameters}
                id="decision-more-parameters"
                onCheckedChange={setMoreParameters}
              />
              <FieldLabel htmlFor="decision-more-parameters">
                {t("decisionRecords.newAnalysis.moreParameters")}
              </FieldLabel>
            </Field>

            {moreParameters && (
              <>
                <Field>
                  <FieldLabel htmlFor="decision-available-funds">
                    {t("decisionRecords.newAnalysis.availableFunds")}
                  </FieldLabel>
                  <Input
                    id="decision-available-funds"
                    inputMode="decimal"
                    min="0"
                    type="number"
                    value={availableFunds}
                    onChange={(event) => setAvailableFunds(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="decision-holding-cost">
                    {t("decisionRecords.newAnalysis.holdingCost")}
                  </FieldLabel>
                  <Input
                    id="decision-holding-cost"
                    inputMode="decimal"
                    // min="0"
                    type="number"
                    value={holdingCost}
                    onChange={(event) => setHoldingCost(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="decision-holding-shares">
                    {t("decisionRecords.newAnalysis.holdingShares")}
                  </FieldLabel>
                  <Input
                    id="decision-holding-shares"
                    inputMode="decimal"
                    min="0"
                    type="number"
                    value={holdingShares}
                    onChange={(event) => setHoldingShares(event.target.value)}
                  />
                </Field>
              </>
            )}
          </FieldGroup>
        </div>

        <DrawerFooter>
          <Button disabled={!canCreate} onClick={handleCreate}>
            {createDecisionTaskLoading ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SparklesIcon data-icon="inline-start" />
            )}
            {t("decisionRecords.newAnalysis.submit")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
