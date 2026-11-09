/// <reference types="vite/client" />

declare const posthog: {
  init: (apiKey: string, options?: Record<string, unknown>) => void
  capture: (event: string, properties?: Record<string, unknown>) => void
  identify: (id: string, properties?: Record<string, unknown>) => void
  reset: () => void
}

type PayPalButtonData = {
  subscriptionID?: string
  orderID?: string
}

type PayPalButtonOptions = {
  fundingSource: string
  style?: {
    layout?: "vertical" | "horizontal"
    color?: "gold" | "blue" | "silver" | "white" | "black"
    shape?: "rect" | "pill"
    label?: "paypal" | "checkout" | "buynow" | "pay" | "installment"
    height?: number
  }
  createSubscription?: () => Promise<string>
  createOrder?: () => Promise<string>
  onApprove: (data: PayPalButtonData) => Promise<void> | void
  onCancel?: () => void
  onError?: (error: unknown) => void
}

type PayPalButtonsInstance = {
  isEligible: () => boolean
  render: (container: HTMLElement) => Promise<void>
  close: () => Promise<void>
}

type PayPalNamespace = {
  FUNDING: { PAYPAL: string }
  Buttons: (options: PayPalButtonOptions) => PayPalButtonsInstance
}

interface Window {
  paypal?: PayPalNamespace
}

declare namespace API {
  type AuthResponse = {
    access_token: string
    user: User
  }

  type WalletAuthResponse = AuthResponse & { is_new_user: boolean }

  type WalletChallenge = {
    challenge_id: string
    message: string
    expires_at: string
  }

  type ScreenerRating =
    "StrongBuy" | "Buy" | "StrongSell" | "Sell" | "Neutral" | "NoRating"

  type User = {
    id: string
    phone: string
    invite_code: string
    free_credits: number
    reward_credits: number
    email: string
    first_name: string
    last_name: string
    user_type?: string
    wallets?: {
      namespace: string
      identity_scope: string
      address: string
    }[]
  }

  type BillingSummary = {
    plan: "free" | "pro"
    is_pro: boolean
    screen_used: number
    screen_limit: number
    analysis_used: number
    analysis_limit: number
    agent_used: number
    agent_limit: number
    alpha_used: number
    alpha_limit: number
    usage_date: string
    reset_at: string
    subscription_status: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean
    paypal_subscription_status?: string | null
    paypal_current_period_end?: string | null
    paypal_cancel_at_period_end?: boolean
  }

  type PayPalConfig = {
    enabled: boolean
    client_id?: string
    currency?: string
    plans?: {
      monthly?: { plan_id: string }
      yearly?: { plan_id: string }
    }
  }

  type DecisionTaskAccess = {
    is_full_access: boolean
    source: "pro" | "paypal_one_time" | "free" | string
    preview?: boolean
  }

  type DecisionTaskUnlockStatus = Pick<
    DecisionTaskAccess,
    "is_full_access" | "source"
  > & {
    status: "active" | "locked"
  }

  type DecisionPaypalUnlockOrder = {
    id: string
    user_id: string
    task_id: string
    paypal_order_id: string
    status: string
    amount: string | number
    currency: string
    approval_url?: string | null
  }

  type PayPalCheckout = {
    id: string
    user_id: string
    interval: "monthly" | "yearly"
    plan: "pro"
    paypal_plan_id: string
    paypal_subscription_id?: string | null
    status: string
    approval_url?: string | null
  }

  type PayPalSubscription = {
    id: string
    user_id: string
    checkout_id?: string | null
    paypal_subscription_id: string
    paypal_plan_id: string
    plan: "pro"
    interval: "monthly" | "yearly"
    status: string
    current_period_start?: string | null
    current_period_end?: string | null
    cancel_at_period_end?: boolean
  }

  type PaymentOrderStatus = "created" | "confirming" | "paid" | "expired"

  type PaymentOrder = {
    id: string
    user_id?: string
    provider: "crypto"
    method?: "evm_native"
    chain_namespace?: "eip155"
    chain_id: number
    asset_type?: "native"
    asset_symbol: "MON"
    amount_atomic: string
    amount_decimals: number
    recipient_address: string
    expected_payer_address: string
    plan: "pro"
    interval: "monthly" | "yearly"
    period_days?: number
    status: PaymentOrderStatus
    expires_at: string
    paid_at?: string | null
    last_tx_hash?: string | null
    last_confirmations?: number | null
  }

  type ScreenerResultRow = {
    ticker?: string
    logoid?: string
    exchange?: string
    name?: string
    description?: string
    market?: string
    change?: number
    close?: number
    volume?: number
    market_cap_basic?: number
    currency?: string
    "ticker-view"?: {
      description?: string
      exchange?: string
      logo?: {
        logoid?: string
      } | null
      name?: string
    }
    crypto_total_rank?: number
    pricescale?: number
    minmov?: number
    fractional?: string
    minmove2?: number
    fundamental_currency_code?: string
    "24h_vol_to_market_cap"?: number
    circulating_supply?: number
    socialdominance?: number
    "crypto_common_categories.tr"?: string[]
    "24h_close_change|5"?: number
    market_cap_calc?: number
    "24h_vol_cmc"?: number
    "exchange.tr"?: string
    "24h_vol|5"?: number
    "24h_vol_change|5"?: number
    "blockchain-id"?: string
    "blockchain-id.tr"?: string
    dex_txs_count_24h?: number
    dex_trading_volume_24h?: number
    dex_txs_count_uniq_24h?: number
    dex_total_liquidity?: number
    fully_diluted_value?: number
    TechRating_1D?: ScreenerRating
    "TechRating_1D.tr"?: string
    AnalystRating?: ScreenerRating
    "AnalystRating.tr"?: string
  }

  type ScreenerResult = {
    id: string
    market: string
    metadata: {
      summary: string
      results: ScreenerResultRow[]
    }
    query: string
  }

  type DefaultScreenerResult = ScreenerResultRow[]

  type PriceSnapshotKorea = {
    bps?: string | number
    eps?: string | number
    low?: string | number
    pbr?: string | number
    per?: string | number
    high?: string | number
    name?: string
    open?: string | number
    price?: string | number
    change?: string | number
    market?: string
    currency?: string
    prev_close?: string | number
    market_cap?: string | number
    change_pct?: string | number
    ticker?: string
    volume?: string | number
    low_52w?: string | number
    dividend?: string | number
    high_52w?: string | number
    direction?: string
    foreign_rate?: string | number
    market_status?: string
    dividend_yield?: string | number
  }

  type DecisionTaskStatus = "pending" | "processing" | "completed" | "failed"

  interface DecisionTask {
    id: string
    user_id?: string
    stock_code: string
    stock_name?: string
    status: DecisionTaskStatus
    price_snapshot?: PriceSnapshotKorea
    analysis_content?: string
    operation_suggestion?: {
      type: "buy" | "sell" | "hold"
      price: number | string
      amount: number | string
      EV: number | string
      confidence: number | string
    }[]
    created_at: string
    updated_at?: string
    market: string
    access?: DecisionTaskAccess
  }

  type StockScreenerMarket =
    | "america"
    | "cex"
    | "coin"
    | "china"
    | "dex"
    | "hongkong"
    | "india"
    | "japan"
    | "korea"
    | "monad"
    | "russia"
    | "taiwan"

  type AgentRunStatus =
    "queued" | "running" | "completed" | "failed" | "cancelled"

  type AgentStepStatus = "running" | "completed" | "failed"

  type AgentProgressStep = {
    id: string
    tool: string
    label: string
    status: AgentStepStatus
    started_at?: string | null
    completed_at?: string | null
  }

  type AgentConversation = {
    id: string
    user_id: string
    title: string
    status: "active" | "deleted"
    active_run_id: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
  }

  type AgentMessage = {
    id: string
    conversation_id: string
    run_id: string | null
    user_id: string
    role: "user" | "assistant"
    content: string
    status: "completed" | "failed"
    client_message_id: string | null
    metadata: Record<string, unknown> & {
      steps?: AgentProgressStep[]
    }
    created_at: string
  }

  type AgentRunResponse = {
    run_id: string
    conversation_id: string
    user_message_id: string
    status: AgentRunStatus
  }

  type AgentRunDetail = {
    id: string
    conversation_id: string
    user_message_id: string
    assistant_message_id: string | null
    status: AgentRunStatus
    error_code: string | null
    error_message: string | null
    input_tokens: number
    output_tokens: number
    created_at: string
    updated_at: string
    started_at: string | null
    completed_at: string | null
    steps?: AgentProgressStep[]
  }

  type AgentConversationPage = {
    items: AgentConversation[]
    next_cursor: string | null
  }

  type DeleteAgentConversationResponse = {
    conversation_id: string
    status: "deleted"
  }

  type AgentMessagePage = {
    items: AgentMessage[]
    next_cursor: string | null
  }

  type AlphaRunStatus =
    "queued" | "running" | "completed" | "failed" | "interrupted"

  type AlphaChat = {
    id: string
    user_id: string
    title: string
    created_at: string
    updated_at: string
    active_run_id: string | null
    last_run_status: AlphaRunStatus | null
  }

  type AlphaChatRun = {
    id: string
    chat_id: string
    request_id: string
    turn_no: number
    status: AlphaRunStatus
    error_code: string | null
    input_tokens: number
    output_tokens: number
    revision: number
    created_at: string
    updated_at: string
    started_at: string | null
    finished_at: string | null
    heartbeat_at: string | null
    charged_at: string | null
  }

  type AlphaMessageType = "user" | "ai" | "activity" | "factor"
  type AlphaMessageStatus =
    "pending" | "running" | "completed" | "failed" | "interrupted"

  type AlphaChatMessage = {
    id: string
    run_id: string
    seq: number
    type: AlphaMessageType
    content: string | null
    activity_type: string | null
    status: AlphaMessageStatus
    source_item_id: string | null
    payload: {
      factor_id?: string
      backtest_id?: string
      index?: number
      name?: string
      expr?: string
      backtest_result?: Record<string, number | string> | null
      annotations?: { url?: string; title?: string }[]
      [key: string]: unknown
    }
    revision: number
    created_at: string
    updated_at: string
    finished_at: string | null
  }

  type AlphaChatHistory = {
    messages: AlphaChatMessage[]
    active_run_id: string | null
    latest_run: AlphaChatRun | null
    next_before_turn: number | null
  }

  type AlphaChatAccepted = {
    chat: AlphaChat
    run: AlphaChatRun
    user_message: AlphaChatMessage
    payment?: AlphaPayment | null
  }

  type AlphaPayment = {
    id: string
    user_id: string
    chat_id: string
    paypal_order_id: string
    status: string
    amount: string | number
    currency: string
    idempotency_key: string | null
    approval_url: string | null
    captured_at: string | null
    created_at: string
    updated_at: string
  }

  type AlphaPaymentCapture = {
    status: "active"
    order: AlphaPayment
  }

  type AlphaFactor = {
    id: string
    user_id: string
    index: number
    name: string
    expr: string
    created_at: string
    is_deleted: boolean
    backtest_result: Record<string, number | string> | null
  }

  type AlphaBacktest = {
    id: string
    factor_id: string
    params: Record<string, string | number | boolean | null> | null
    results: Record<string, number | string> | null
    ic_detail: { datetime: string; ic: number; rank_ic: number }[] | null
    report_normal: { datetime: string; return: number; bench: number }[] | null
    created_at: string
  }
}
