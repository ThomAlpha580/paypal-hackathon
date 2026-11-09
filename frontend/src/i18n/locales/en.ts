const en = {
  translation: {
    app: {
      name: "EasyStock",
      tagline: "AI STOCK SCREENER & ANALYSIS",
      navigation: "Navigation",
      language: "Language",
      currentLanguage: "English",
      theme: "Theme",
      lightTheme: "Light",
      darkTheme: "Dark",
      systemTheme: "System",
    },
    auth: {
      account: "Account",
      login: "Log in",
      logout: "Log out",
      continueWithGoogle: "Continue with Google",
      continueWithNaver: "Continue with Naver",
      wallet: {
        hint: "Connect MetaMask and sign in on Monad. No gas fee required.",
        install: "Install MetaMask",
        connecting: "Connecting MetaMask...",
        switching: "Switching to Monad...",
        signing: "Confirm signature in MetaMask...",
        verifying: "Signing in...",
        errors: {
          notInstalled: "MetaMask is not installed in this browser.",
          rejected: "The wallet request was cancelled. Try again when ready.",
          pending:
            "A MetaMask request is already pending. Open your wallet to continue.",
          noAccount:
            "No wallet account is available. Unlock MetaMask and try again.",
          walletChanged:
            "Your wallet account or network changed. Please connect again.",
          wrongNetwork:
            "Please switch MetaMask to Monad Mainnet and try again.",
          invalidSignature:
            "The wallet returned an invalid signature. Please try again.",
          registrationDisabled:
            "Wallet registration is not available yet. Sign in with Google or Naver.",
          unsupportedChain: "Monad login is not enabled on the server yet.",
          expired:
            "Your login request expired or could not be verified. Please try again.",
          forbidden: "Wallet login is not available on this site.",
          unavailable:
            "Wallet login is temporarily unavailable. Please try again later.",
          rateLimited:
            "Too many requests. Please wait five minutes and try again.",
          failed: "Unable to sign in with MetaMask. Please try again.",
        },
      },
    },
    routes: {
      home: "Home",
      stockScreener: "Stock Screener",
      decisionRecords: "AI Decision",
      pricing: "Upgrade",
      chat: "Chat Agent",
      decisionDetail: "Decision Detail",
      alphaMining: "Alpha Mining",
      factorResearch: "Factor Research",
      factorLibrary: "Factor Library",
    },
    chat: {
      title: "Chat Agent",
      subtitle: "Ask about markets and companies",
      newConversation: "New conversation",
      conversationActions: "Conversation actions",
      rename: "Rename",
      delete: "Delete",
      renameTitle: "Rename conversation",
      renameDescription: "Choose a new name for this conversation.",
      renamePlaceholder: "Conversation name",
      renameSave: "Save",
      renameCancel: "Cancel",
      renameError: "Unable to rename this conversation. Please try again.",
      deleteTitle: "Delete conversation?",
      deleteDescription:
        "This conversation and its messages will no longer appear in your history.",
      deleteConfirm: "Delete",
      deleteCancel: "Cancel",
      deleteError: "Unable to delete this conversation. Please try again.",
      recent: "Recent conversations",
      emptyConversations: "Your conversations will appear here.",
      welcome: "How can I help with your research?",
      welcomeDescription:
        "Ask about market trends, company fundamentals, valuation, news, or financial data.",
      emptyMessages: "Start a conversation by sending a message.",
      loadingMessages: "Loading conversation...",
      placeholder: "Message the agent...",
      send: "Send message",
      stop: "Stop",
      thinking: "Thinking...",
      runFailed: "The agent could not complete this response.",
      cancelled: "Response stopped.",
      loginRequired: "Sign in to start a private conversation with the agent.",
      loadError: "Unable to load conversations. Please try again.",
      messagesError: "Unable to load this conversation. Please try again.",
      quotaReached:
        "You've reached today's AI Chat limit. Upgrade to Pro for more messages.",
      sendError: "Unable to send the message. Please try again.",
      streamError: "The response stream was interrupted. Please try again.",
      streamUnavailable: "The response stream is temporarily unavailable.",
      cancelError: "Unable to stop this response. Please try again.",
      progressTitle: "Agent progress",
      progress: {
        running: "In progress",
        completed: "Completed",
        failed: "Failed",
      },
      disclaimer:
        "AI responses can be inaccurate. Verify important information.",
    },
    agent: {
      progress: {
        search_ticker: "Searching for the stock code",
        search_web: "Searching the web",
        query_price: "Checking stock price",
        query_company_info: "Checking company information",
        query_financials: "Checking financial statements",
        query_news: "Checking related news",
        query_analyst_price_target: "Checking analyst price targets",
        query_analyst_estimates: "Checking analyst estimates",
        query_rating_changes: "Checking rating changes",
        query_holders: "Checking shareholder holdings",
        query_option_expiry: "Checking option expirations",
        query_option_chain: "Checking option chain",
        query_fund_data: "Checking fund data",
        screen_stocks: "Screening stocks",
        query_gappers: "Checking market gaps",
        query_top_stocks: "Checking top stocks",
        execute_tool: "Running tool",
      },
    },
    alpha: {
      title: "Factor Research",
      subtitle: "Explore quantitative ideas and backtest factors with AI.",
      newResearch: "New research",
      history: "Research history",
      welcome: "What factor would you like to research?",
      welcomeDescription:
        "Describe a market hypothesis and the AI will construct and backtest one factor.",
      placeholder: "Describe your factor research goal...",
      send: "Send research request",
      loading: "Loading research...",
      loadingHistory: "Loading history...",
      emptyHistory: "Your research conversations will appear here.",
      noFactors: "No factors yet.",
      loadOlder: "Load earlier research",
      retry: "Retry",
      refresh: "Refresh",
      search: "Search factors or expressions",
      sort: "Sort",
      actions: "Actions",
      createdAt: "Created",
      loginRequired: "Sign in to view your private factor library.",
      queued: "Waiting to start",
      researching: "AI is researching",
      reconnecting: "Connection interrupted. Reconnecting…",
      runFailed:
        "This run failed. Saved results are retained and you can continue the conversation.",
      runInterrupted:
        "This run was interrupted. Saved results are retained and you can continue the conversation.",
      deleteDescription:
        "This conversation will be removed from history. Saved factors remain in your library.",
      marketScope:
        "Currently supports Chinese A-share factor research. Backtest settings are managed by the server.",
      noChart: "No chart data.",
      openPrice: "Opening price",
      closePrice: "Closing price",
      factor: "Factor",
      expression: "Expression",
      details: "Details",
      copyExpression: "Copy expression",
      copied: "Expression copied",
      backtestDetails: "Backtest details",
      backtestResult: "Backtest result",
      cumulativeReturn: "Cumulative return",
      strategyReturn: "Strategy return",
      benchmarkReturn: "Benchmark return",
      icDetail: "IC detail",
      backtestParams: "Backtest parameters",
      noBacktest: "No backtest data.",
      metric: {
        annualReturn: "Annual Return",
        informationRatio: "Information Ratio",
        maxDrawdown: "Max Drawdown",
        icMean: "IC Mean",
        icir: "ICIR",
        rankIcMean: "Rank IC Mean",
        rankIcir: "Rank ICIR",
      },
      activity: {
        webSearch: "Web search",
        backtest: "Backtest",
        toolExecution: "Tool execution",
        pending: "Waiting",
        running: "Running",
        completed: "Completed",
        failed: "Failed",
        interrupted: "Interrupted",
      },
      errors: {
        send: "Unable to send the research request.",
        stream: "The research stream was interrupted. Please retry.",
        busy: "This research conversation is still running.",
        quota: "Today's Alpha Mining quota has been used up.",
        paymentRequired: "Pay for this conversation before sending messages.",
        notFound: "This research conversation no longer exists.",
        generic: "Something went wrong. Please try again.",
        auth: "Your session expired or access is unavailable. Please sign in again.",
        copy: "Unable to copy the expression.",
        backtest: "Unable to load backtest details. Data may be unavailable.",
      },
      payment: {
        title: "Start factor research",
        description: "Pay ${{amount}} USD to start factor research.",
        required: "Pay ${{amount}} USD to start factor research.",
        pay: "Pay with PayPal",
        loading: "Loading PayPal…",
        creating: "Preparing PayPal payment…",
        capturing: "Confirming PayPal payment…",
        success: "Payment complete. Alpha research is starting.",
        error: "Unable to complete the PayPal payment. Please try again.",
        approvalError: "PayPal approval could not be verified.",
        cancelled: "PayPal payment cancelled.",
        unavailable: "PayPal is currently unavailable.",
        lookupError:
          "Unable to load the Alpha payment. Please retry the conversation.",
        retry: "Try again",
        done: "Continue",
      },
      params: {
        start_time: "Start date",
        end_time: "End date",
        account: "Initial capital (CNY)",
        benchmark: "Benchmark",
        topk: "Stocks per rebalance",
        hold_days: "Holding period (days)",
        deal_price: "Execution price",
        open_cost: "Buy fee",
        close_cost: "Sell fee",
        min_cost: "Minimum fee (CNY)",
        limit_threshold: "Price limit",
      },
      metricDescriptions: {
        annualReturn:
          "Annualized excess return relative to the benchmark, before transaction costs.",
        informationRatio: "Annualized excess return divided by its volatility.",
        maxDrawdown:
          "Largest peak-to-trough decline in cumulative excess return.",
        icMean: "Mean daily correlation between the factor and future returns.",
        icir: "Mean IC divided by its standard deviation.",
        rankIcMean:
          "Mean daily rank correlation between the factor and future returns.",
        rankIcir: "Mean Rank IC divided by its standard deviation.",
      },
      exampleTitles: {
        momentum: "Momentum & reversal",
        volume: "Price & volume",
        volatility: "Volatility & risk",
      },
      examples: {
        momentum:
          "Find a momentum reversal factor based on price deviation from a short moving average.",
        volume:
          "Find a factor where price reaches a recent high while trading volume contracts.",
        volatility:
          "Find a factor that identifies overbought and oversold conditions from the recent price range.",
      },
    },
    pricing: {
      badge: "Plans for every stage",
      title: "Choose the plan that fits your workflow",
      description:
        "Start with the essentials, then upgrade when you need more screening and analysis power.",
      billingLabel: "Billing period",
      billing: { monthly: "Monthly", yearly: "Yearly" },
      save: "save",
      perMonth: "/month",
      perYear: "/year",
      mostPopular: "Most popular",
      currentFree: "Free plan",
      currentPro: "Pro plan",
      currentPlan: "Current plan",
      upgrade: "Upgrade",
      screeningShort: "Screening",
      analysisShort: "AI analysis",
      factorResearchShort: "Factor Research",
      chatShort: "AI Chat",
      remaining: "{{count}} left",
      usage:
        "{{screen}}/{{screenLimit}} screens · {{analysis}}/{{analysisLimit}} analyses · {{chat}}/{{chatLimit}} AI Chat messages today",
      active: "Active",
      cancelAtPeriodEnd: "Cancels at period end",
      freeStatus: "No active subscription",
      loading: "Loading",
      statusUnavailable: "Status unavailable",
      billingLoadError: "Unable to load your subscription status.",
      paypalPaymentHint: "Subscriptions are securely processed with PayPal.",
      paypalTitle: "Subscribe with PayPal",
      paypalDescription:
        "Choose the {{interval}} Pro plan and approve the subscription in PayPal.",
      paypalUnavailable:
        "PayPal is temporarily unavailable. Please try again later.",
      paypalApprovalError:
        "PayPal did not return a subscription. Please try again.",
      paypalConfirmError:
        "We could not confirm the PayPal subscription. Please check the subscription status again.",
      paypalPending:
        "PayPal is still processing the subscription. Your plan will update shortly.",
      paypalCancelled: "PayPal checkout was cancelled.",
      paypalError:
        "Unable to complete the PayPal subscription. Please try again.",
      paypalStages: {
        loading: "Loading PayPal…",
        creating: "Preparing your PayPal subscription…",
        confirming: "Confirming your subscription…",
      },
      paypalResumeApproved:
        "You already approved a {{interval}} PayPal subscription. Confirm its status before starting another subscription.",
      paypalCheck: "Check subscription status",
      paypalRetry: "Try again",
      paypalInactive:
        "This PayPal subscription is no longer active. You can start a new subscription.",
      paypalAlreadyPro:
        "An active Pro subscription already exists. Refreshing your plan…",
      paymentMethodMon: "Paid with MON",
      walletRequired: "Connect the wallet used for this account before paying.",
      paymentError: "Unable to complete MON payment. Please try again.",
      paymentConfirming:
        "Payment submitted. Waiting for Monad confirmations...",
      paymentSuccess: "Pro activated successfully.",
      paymentExpired: "This payment order expired. Please start again.",
      paymentTitle: "Pay with MON",
      paymentHint:
        "Send the exact amount on Monad. Your payment will be confirmed automatically.",
      paymentAmount: "Amount",
      paymentNetwork: "Network",
      paymentRecipient: "Recipient",
      paymentTransaction: "Transaction",
      paymentRecovery:
        "The wallet request may have completed. Paste the transaction hash to continue.",
      paymentDone: "Done",
      paymentCheck: "Check payment",
      payWithMon: "Send MON",
      paymentPrepare: "Prepare payment",
      priceMismatch: "The payment price has changed. Please start again.",
      validUntil: "Valid until {{date}}",
      paymentStages: {
        preparing: "Preparing payment…",
        sending: "Confirm the transfer in your wallet…",
        confirming: "Waiting for payment confirmation…",
      },
      quotaReached: "Today's limit is reached. Upgrade to Pro for more usage.",
      plans: {
        free: {
          name: "Free",
          description: "A focused toolkit for exploring crypto markets.",
          cta: "Current plan",
          features: {
            screening: "5 natural-language screens per day",
            analysis: "AI deep analysis (basic version)",
            factorResearch: "1 Factor Research per day",
            chat: "1 AI Chat message per day",
            results: "Full screening results",
            history: "Keep analysis history for the latest 7 days",
            markets: "Coin, CEX, and DEX markets",
            advice: "Basic buy, sell, and hold advice",
          },
        },
        pro: {
          name: "Pro",
          description: "More capacity and faster insight for active research.",
          cta: "Upgrade to Pro",
          manage: "Manage subscription",
          features: {
            screening: "Up to 50 natural-language screens per day",
            analysis:
              "AI deep analysis (full version, including AI decisions)",
            chat: "Up to 20 AI Chat messages per day",
            history: "Unlimited history",
            queue: "Faster AI analysis queue",
            earlyAccess: "Early access to new features",
          },
        },
      },
    },
    decisionRecords: {
      title: "Decision Records",
      description: "Review AI decision records for tracked stocks.",
      loading: "Loading decision records...",
      empty: "No decision records yet.",
      error: "Unable to load decision records. Please try again.",
      view: "View",
      noOperation: "No operation details.",
      locked: "Locked",
      newAiAnalysis: "New AI Decision",
      newAnalysis: {
        title: "New AI Decision",
        description: "Select a stock and start an AI decision task",
        market: "Market",
        keyword: "Keyword",
        keywordPlaceholder: "Stock code or name",
        keywordDescription: "Press Enter or use search to find a stock.",
        search: "Search",
        searching: "Searching...",
        noResults: "No matching stocks.",
        searchError: "Unable to search stocks. Please try again.",
        selectStockFirst: "Please select a stock from search results.",
        moreParameters: "More parameters",
        availableFunds: "Available funds",
        holdingCost: "Holding cost",
        holdingShares: "Holding shares",
        invalidParameters: "Please enter numbers greater than 0.",
        submit: "AI Analysis",
      },
      columns: {
        stock: "Stock",
        price: "Price",
        changePct: "Chg %",
        volume: "Volume",
        operation: "AI Decision",
        createdAt: "Analysis Time",
        actions: "Actions",
      },
      operationSummary: {
        buy: "Buy",
        sell: "Sell",
        trade: "T Trade",
        hold: "Hold",
        empty: "Hold",
      },
      operationColumns: {
        operation: "Operation",
        price: "Price",
        amount: "Qty",
        ev: "Expected Return Value (EV)",
        confidence: "Confidence",
      },
      operationTypes: {
        buy: "Buy",
        sell: "Sell",
        hold: "Hold",
      },
    },
    decisionDetail: {
      loading: "Loading decision...",
      notFound: "Decision task not found.",
      error: "Unable to load decision task. Please try again.",
      streamError: "Unable to stream analysis. Please try again.",
      analysis: "Analysis",
      snapshotDescription:
        "The following information is a snapshot as of {{time}}",
      analysisDescription:
        "AI output is for informational purposes only and does not constitute investment, legal, tax, financial, accounting, or other professional advice, nor any recommendation, guarantee, commitment, or forecast regarding any financial asset.",
      streaming: "Analyzing...",
      waitingForStream: "Waiting for analysis output...",
      loadingMessages: {
        queryingPrice: "Querying stock prices...",
        retrievingNews: "Retrieving related news...",
        checkingFinancials: "Checking financial data...",
        analyzingTrend: "Analyzing price trends...",
        calculatingRisk: "Calculating risk signals...",
        generatingDecision: "Generating decision advice...",
      },
      noAnalysis: "No analysis content.",
      failed: "Analysis failed.",
      previewTitle: "This is a preview of the analysis",
      previewDescription:
        "Unlock the complete report and AI decision suggestions for this stock.",
      unlockAction: "Unlock for $0.99",
      unlockTitle: "Unlock the full report",
      unlockDescription:
        "Pay once with PayPal for $0.99 to view the complete analysis and AI decision suggestions for this stock.",
      unlockLoading: "Loading PayPal…",
      unlockCreating: "Preparing your PayPal payment…",
      unlockCapturing: "Confirming your PayPal payment…",
      unlockSuccess: "The full report is now unlocked.",
      unlockRetry: "Try again",
      unlockDone: "Done",
      decisionAlreadyUnlocked: "This report is already unlocked.",
      decisionUnlockError:
        "Unable to complete the PayPal payment. Please try again.",
      decisionUnlockApprovalError:
        "PayPal did not return the expected order. Please try again.",
      decisionUnlockCancelled: "PayPal checkout was cancelled.",
      decisionUnlockUnavailable:
        "PayPal is temporarily unavailable. Please try again later.",
      noSnapshot: "No price snapshot available.",
      operationSuggestion: "AI Decision",
      operationSuggestionDescription:
        "AI suggestions are for learning and reference only and do not constitute securities investment advice in any form.",
      status: {
        pending: "Pending",
        processing: "Processing",
        completed: "Completed",
        failed: "Failed",
      },
      snapshot: {
        price: "Latest Price",
        change: "Change",
        changePct: "Change %",
        volume: "Volume",
        open: "Open",
        high: "High",
        low: "Low",
        prevClose: "Previous Close",
        marketCap: "Market Cap",
        currency: "Currency",
        ticker: "Ticker",
        market: "Market",
        high52w: "52W High",
        low52w: "52W Low",
        per: "PER",
        pbr: "PBR",
        foreignRate: "Foreign Rate",
        dividendYield: "Dividend Yield",
      },
    },
    stockScreener: {
      title: "Stock Screener",
      description: "LLM-based Stock Screener",
      placeholder:
        "Describe the companies, market signals, or filters you want to screen for",
      submit: "Query",
      loading: "Screening",
      markets: {
        monad: "Monad",
        korea: "Korea",
        america: "America",
        coin: "Cryptocurrency",
        cex: "CEX",
        china: "China",
        dex: "DEX",
        japan: "Japan",
        hongkong: "Hong Kong",
        taiwan: "Taiwan",
        india: "India",
        russia: "Russia",
      },
      loadingMessages: {
        researching: "Researching stocks...",
        gathering: "Gathering data...",
        analyzing: "Analyzing metrics...",
        screening: "Screening companies...",
      },
      examples: {
        title: "Examples",
        previous: "Previous examples",
        next: "Next examples",
        items: {
          cryptoMarketLeaders: {
            title: "Crypto Market Leaders",
            description:
              "Find large-cap crypto assets with strong liquidity and active trading.",
          },
          cryptoMomentum: {
            title: "Crypto Momentum",
            description:
              "Screen for crypto assets with positive 24-hour momentum and high volume.",
          },
          cryptoValueOpportunities: {
            title: "Crypto Value Opportunities",
            description:
              "Find established crypto assets below recent highs with improving technical ratings.",
          },
          activeCexPairs: {
            title: "Most Active CEX Pairs",
            description:
              "Find centralized-exchange pairs with the highest 24-hour USD volume.",
          },
          cexVolumeSurges: {
            title: "CEX Volume Surges",
            description:
              "Find trading pairs showing the strongest 24-hour volume growth.",
          },
          bullishCexPairs: {
            title: "Bullish CEX Pairs",
            description:
              "Find CEX pairs with positive momentum, solid volume, and bullish technical ratings.",
          },
          liquidDexMarkets: {
            title: "High-Liquidity DEX Markets",
            description:
              "Find decentralized markets with deep liquidity and meaningful trading volume.",
          },
          activeDexMarkets: {
            title: "Most Active DEX Markets",
            description:
              "Find DEX markets with high transaction counts, active traders, and strong volume.",
          },
          emergingDexTokens: {
            title: "Emerging DEX Tokens",
            description:
              "Find lower-FDV tokens with growing activity and improving liquidity.",
          },
          highBetaStocks: {
            title: "High Beta Stocks",
            description:
              "Target stocks with higher price volatility and potential for significant returns.",
          },
          overvaluedStocks: {
            title: "Overvalued Stocks",
            description:
              "Identify stocks with InvestingPro downside risk due to overvaluation.",
          },
          momentumMasters: {
            title: "Momentum Masters",
            description:
              "Track stocks with outstanding recent price performance and high trading volumes.",
          },
          earningsManipulators: {
            title: "Earnings Manipulators",
            description:
              "Spot companies potentially engaging in earnings manipulation with low-quality earnings.",
          },
          profitableExpansions: {
            title: "Profitable Expansions",
            description:
              "Identify growing companies with widening profit margins and profitability.",
          },
          financialFortresses: {
            title: "Financial Fortresses",
            description:
              "Locate defensive stocks with high Piotroski F-Scores, low risk, and strong cash flows.",
          },
          near52WeekHigh: {
            title: "Near 52-Week High",
            description:
              "Identify stocks currently trading close to their 52-week high.",
          },
          techInnovators: {
            title: "Tech Innovators",
            description:
              "Identify rapidly growing technology stocks with strong unit economics and a focused team.",
          },
          highBetaBulls: {
            title: "High Beta Bulls",
            description:
              "Locate high beta stocks demonstrating strong price momentum.",
          },
        },
      },
      summary: "AI Explanation",
      aiAnalysis: "AI Analysis",
      askAi: "Ask AI",
      aiAnalysisUnavailable:
        "AI analysis is not available for this market yet.",
      share: "Share",
      shareCopied: "Share link copied",
      empty: "No results yet. Enter a screening request to get started.",
      noMatches: "No matching stocks were returned.",
      error: "Unable to load screener results. Please try again.",
      columns: {
        ticker: "Ticker",
        name: "Symbol",
        operation: "Operation",
        description: "Description",
        change: "Chg",
        close: "Close",
        volume: "Volume",
        marketCap: "Market Cap",
        exchange: "Exchange",
        blockchain: "Blockchain",
        price: "Price",
        change24h: "Chg %",
        volume24hUsd: "Vol in USD",
        volumeChange24h: "Vol Chg%",
        transactions: "Transactions",
        tradingVolume: "Trading Vol",
        traders: "Traders",
        liquidity: "Liquidity",
        fdv: "FDV",
        techRating: "Tech Rating",
        analystRating: "Analyst Rating",
      },
    },
  },
}

type TranslationSchema<T> = {
  [Key in keyof T]: T[Key] extends string ? string : TranslationSchema<T[Key]>
}

export type LocaleResource = TranslationSchema<typeof en>

export default en
