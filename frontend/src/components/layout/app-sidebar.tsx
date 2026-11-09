import { useState } from "react"
import { Link, useLocation } from "react-router"
import {
  BrainIcon,
  MessageCircleIcon,
  PickaxeIcon,
  ChevronsUpDownIcon,
  FunnelIcon,
  LanguagesIcon,
  LogInIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  ZapIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

// import easyQuantCover from "@/assets/easyquant-cover.png"
import monadLogo from "@/assets/logo-monad.png"
import { useTheme } from "@/components/theme-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { supportedLanguages } from "@/i18n/config"
import useUser from "@/hooks/use-user.ts"
import useBilling from "@/hooks/use-billing"

const themeOptions = [
  { code: "light", icon: SunIcon, labelKey: "app.lightTheme" },
  { code: "dark", icon: MoonIcon, labelKey: "app.darkTheme" },
  { code: "system", icon: MonitorIcon, labelKey: "app.systemTheme" },
] as const

export function AppSidebar() {
  const location = useLocation()
  const { i18n, t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { isAuthenticated, user, logout, setSignInModalOpen } = useUser()
  const { billingSummary, billingLoading } = useBilling()

  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const stockScreenerActive = location.pathname === "/"
  const decisionRecordsActive = location.pathname.startsWith("/decision")
  const pricingActive = location.pathname === "/pricing"
  const chatActive = location.pathname.startsWith("/chat")
  const alphaActive = location.pathname.startsWith("/alpha")
  const walletAddress = user?.wallets
    ?.find((wallet) => wallet.address?.trim())
    ?.address.trim()
  const walletDisplayName = walletAddress
    ? walletAddress.length > 10
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : walletAddress
    : undefined
  const userDisplayName =
    walletDisplayName ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.email ||
    user?.phone ||
    t("auth.account")
  const userDescription =
    user?.email && user.email !== userDisplayName ? user.email : user?.phone
  const userInitials =
    userDisplayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"
  const subscriptionPlanLabel = billingLoading
    ? t("pricing.loading")
    : billingSummary
      ? billingSummary.is_pro
        ? t("pricing.currentPro")
        : t("pricing.currentFree")
      : t("pricing.statusUnavailable")
  const subscriptionStatusLabel = billingLoading
    ? t("pricing.loading")
    : billingSummary?.is_pro
      ? billingSummary.cancel_at_period_end
        ? t("pricing.cancelAtPeriodEnd")
        : t("pricing.active")
      : billingSummary
        ? t("pricing.freeStatus")
        : t("pricing.statusUnavailable")
  const screenRemaining = billingSummary
    ? Math.max(0, billingSummary.screen_limit - billingSummary.screen_used)
    : 0
  const chatRemaining = billingSummary
    ? Math.max(0, billingSummary.agent_limit - billingSummary.agent_used)
    : 0
  const usagePercent = (remaining: number, limit: number) =>
    limit > 0 ? Math.min(100, Math.max(0, (remaining / limit) * 100)) : 0

  const handleLogout = () => {
    setUserMenuOpen(false)
    logout()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border px-3 py-2 group-data-[collapsible=icon]:px-2">
        <div className="flex cursor-default items-center px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <img
            src="/logo2.png"
            alt={t("app.name")}
            className="my-2.5 hidden size-5 object-contain group-data-[collapsible=icon]:block"
          />
          <div
            className="flex w-full min-w-0 flex-col items-center group-data-[collapsible=icon]:hidden"
            aria-label={t("app.name")}
          >
            <div className="flex items-center justify-center gap-0 truncate py-3 text-xl leading-tight font-semibold">
              <img src="/logo2.png" alt="" className="h-5" aria-hidden="true" />
            </div>
            {/*<div className="mt-0.5 truncate text-[10px] leading-tight font-medium tracking-[0.08em] text-sidebar-foreground/60">*/}
            {/*  {t("app.tagline")}*/}
            {/*</div>*/}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {/*<SidebarGroupLabel>{t("app.navigation")}</SidebarGroupLabel>*/}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={stockScreenerActive}
                  tooltip={t("routes.stockScreener")}
                >
                  <Link to="/">
                    <FunnelIcon />
                    <span>{t("routes.stockScreener")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={decisionRecordsActive}
                  tooltip={t("routes.decisionRecords")}
                >
                  <Link to="/decision">
                    <BrainIcon />
                    <span>{t("routes.decisionRecords")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={chatActive}
                  tooltip={t("routes.chat")}
                >
                  <Link to="/chat">
                    <MessageCircleIcon />
                    <span>{t("routes.chat")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={alphaActive}
                  tooltip={t("routes.alphaMining")}
                >
                  <Link to="/alpha/research">
                    <PickaxeIcon />
                    <span>{t("routes.alphaMining")}</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={location.pathname.startsWith("/alpha/research")}
                    >
                      <Link to="/alpha/research">
                        {t("routes.factorResearch")}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={location.pathname.startsWith("/alpha/library")}
                    >
                      <Link to="/alpha/library">
                        {t("routes.factorLibrary")}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pricingActive}
                  tooltip={t("routes.pricing")}
                >
                  <Link to="/pricing">
                    <ZapIcon />
                    <span>{t("routes.pricing")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/*<div className="mt-auto p-2 pt-0 group-data-[collapsible=icon]:hidden">*/}
        {/*  <a*/}
        {/*    href={easyQuantUrl}*/}
        {/*    target="_blank"*/}
        {/*    rel="noopener noreferrer"*/}
        {/*    aria-label="Open EasyQuant AI"*/}
        {/*    className="block overflow-hidden rounded-lg border border-sidebar-border bg-sidebar-accent shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"*/}
        {/*  >*/}
        {/*    <img*/}
        {/*      src={easyQuantCover}*/}
        {/*      alt="EasyQuant AI Strategy Code Assistant"*/}
        {/*      className="aspect-video w-full object-cover"*/}
        {/*    />*/}
        {/*    <div className="space-y-0.5 px-3 py-2.5">*/}
        {/*      <div className="text-sm font-semibold text-sidebar-foreground">*/}
        {/*        EasyQuant*/}
        {/*      </div>*/}
        {/*      <div className="text-[11px] leading-snug font-semibold text-sidebar-foreground/65">*/}
        {/*        AI Quantitative Coding Assistant*/}
        {/*      </div>*/}
        {/*    </div>*/}
        {/*  </a>*/}
        {/*</div>*/}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {isAuthenticated && user ? (
          <>
            <div className="mb-0 cursor-default rounded-xl border border-sidebar-border bg-sidebar-accent/45 p-3 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-medium tracking-[0.08em] text-sidebar-foreground/55 uppercase">
                    {t("pricing.currentPlan")}
                  </div>
                  <div className="mt-0.5 truncate text-sm font-semibold text-sidebar-foreground">
                    {subscriptionPlanLabel}
                  </div>
                </div>
                {!billingSummary?.is_pro ? (
                  <Button
                    asChild
                    variant="outline"
                    size="xs"
                    className="shrink-0 rounded-full"
                  >
                    <Link to="/pricing">{t("pricing.upgrade")}</Link>
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 space-y-2.5">
                {billingLoading || !billingSummary ? (
                  <div className="space-y-2">
                    <div className="h-3 w-28 animate-pulse rounded bg-sidebar-foreground/10" />
                    <div className="h-3 w-36 animate-pulse rounded bg-sidebar-foreground/10" />
                    <div className="h-3 w-32 animate-pulse rounded bg-sidebar-foreground/10" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-sidebar-foreground/65">
                          {t("pricing.screeningShort")}
                        </span>
                        <span className="font-medium text-sidebar-foreground">
                          {t("pricing.remaining", { count: screenRemaining })}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-sidebar-foreground/10">
                        <div
                          className="h-full rounded-full bg-primary transition-[width]"
                          style={{
                            width: `${usagePercent(screenRemaining, billingSummary.screen_limit)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-sidebar-foreground/65">
                          {t("pricing.chatShort")}
                        </span>
                        <span className="font-medium text-sidebar-foreground">
                          {t("pricing.remaining", { count: chatRemaining })}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-sidebar-foreground/10">
                        <div
                          className="h-full rounded-full bg-violet-500 transition-[width]"
                          style={{
                            width: `${usagePercent(chatRemaining, billingSummary.agent_limit)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  className="h-11 w-full gap-2 px-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:px-0"
                  variant="ghost"
                >
                  <Avatar>
                    {walletAddress ? (
                      <AvatarImage src={monadLogo} alt="Monad" />
                    ) : null}
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col items-start group-data-[collapsible=icon]:hidden">
                    <span
                      className="max-w-full truncate text-sm font-medium"
                      title={walletAddress}
                    >
                      {userDisplayName}
                    </span>
                    {userDescription ? (
                      <span className="max-w-full truncate text-xs text-muted-foreground">
                        {userDescription}
                      </span>
                    ) : null}
                  </span>
                  <ChevronsUpDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top">
                <DropdownMenuLabel className="min-w-0">
                  <span
                    className="block truncate text-sm text-foreground"
                    title={walletAddress}
                  >
                    {userDisplayName}
                  </span>
                  {userDescription ? (
                    <span className="block truncate font-normal">
                      {userDescription}
                    </span>
                  ) : null}
                  <span className="mt-2 flex items-center gap-2">
                    <Badge
                      variant={billingSummary?.is_pro ? "default" : "secondary"}
                      className="rounded px-1.5 text-[10px]"
                    >
                      {subscriptionPlanLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {subscriptionStatusLabel}
                    </span>
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <LanguagesIcon />
                    <span>{t("app.language")}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={i18n.language}
                      onValueChange={(language) =>
                        void i18n.changeLanguage(language)
                      }
                    >
                      {supportedLanguages.map((language) => (
                        <DropdownMenuRadioItem
                          key={language.code}
                          value={language.code}
                        >
                          {language.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <SunIcon />
                    <span>{t("app.theme")}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={theme}
                      onValueChange={(nextTheme) =>
                        setTheme(
                          nextTheme as (typeof themeOptions)[number]["code"]
                        )
                      }
                    >
                      {themeOptions.map((option) => {
                        const ThemeIcon = option.icon

                        return (
                          <DropdownMenuRadioItem
                            key={option.code}
                            value={option.code}
                          >
                            <ThemeIcon />
                            {t(option.labelKey)}
                          </DropdownMenuRadioItem>
                        )
                      })}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                  <LogOutIcon />
                  <span>{t("auth.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button
            className="w-full justify-start group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:px-0"
            variant="ghost"
            onClick={() => setSignInModalOpen(true)}
          >
            <LogInIcon />
            <span className="truncate group-data-[collapsible=icon]:hidden">
              {t("auth.login")}
            </span>
          </Button>
        )}
        {isAuthenticated && user ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="w-full justify-start group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:px-0"
                variant="ghost"
              >
                <LanguagesIcon />
                <span className="truncate group-data-[collapsible=icon]:hidden">
                  {t("app.currentLanguage")}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuRadioGroup
                value={i18n.language}
                onValueChange={(language) => void i18n.changeLanguage(language)}
              >
                {supportedLanguages.map((language) => (
                  <DropdownMenuRadioItem
                    key={language.code}
                    value={language.code}
                  >
                    {language.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
