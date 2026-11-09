import type { LocaleResource } from "./en"

const ja = {
  translation: {
    app: {
      name: "EasyStock",
      tagline: "AI 株式スクリーニング＆分析",
      navigation: "ナビゲーション",
      language: "言語",
      currentLanguage: "日本語",
      theme: "テーマ",
      lightTheme: "ライト",
      darkTheme: "ダーク",
      systemTheme: "システム",
    },
    auth: {
      account: "アカウント",
      login: "ログイン",
      logout: "ログアウト",
      continueWithGoogle: "Googleで続行",
      continueWithNaver: "Naverで続行",
      wallet: {
        hint: "MetaMaskを接続し、Monadで署名してログイン。ガス代は不要です。",
        install: "MetaMaskをインストール",
        connecting: "MetaMaskに接続中…",
        switching: "Monadに切り替え中…",
        signing: "MetaMaskで署名を確認してください…",
        verifying: "ログイン中…",
        errors: {
          notInstalled:
            "このブラウザーにMetaMaskがインストールされていません。",
          rejected:
            "ウォレットのリクエストをキャンセルしました。再度お試しください。",
          pending:
            "MetaMaskに保留中のリクエストがあります。ウォレットを開いてください。",
          noAccount:
            "アカウントを取得できません。MetaMaskのロックを解除してください。",
          walletChanged:
            "アカウントまたはネットワークが変更されました。再接続してください。",
          wrongNetwork: "MetaMaskをMonadメインネットに切り替えてください。",
          invalidSignature: "署名が無効です。再度お試しください。",
          registrationDisabled:
            "ウォレット登録はまだ利用できません。GoogleまたはNaverでログインしてください。",
          unsupportedChain: "サーバーでMonadログインが有効になっていません。",
          expired:
            "ログインリクエストが期限切れか、検証に失敗しました。再度お試しください。",
          forbidden: "このサイトではウォレットログインを利用できません。",
          unavailable:
            "ウォレットログインは一時的に利用できません。後でお試しください。",
          rateLimited: "リクエストが多すぎます。5分後にお試しください。",
          failed: "MetaMaskでログインできませんでした。再度お試しください。",
        },
      },
    },
    routes: {
      home: "ホーム",
      stockScreener: "株式スクリーナー",
      decisionRecords: "AI投資判断",
      pricing: "Upgrade",
      chat: "Chat Agent",
      decisionDetail: "判断の詳細",
      alphaMining: "Alpha Mining",
      factorResearch: "Factor Research",
      factorLibrary: "Factor Library",
    },
    chat: {
      title: "Chat Agent",
      subtitle: "市場と企業について質問",
      newConversation: "新しい会話",
      conversationActions: "会話の操作",
      rename: "名前を変更",
      delete: "削除",
      renameTitle: "会話名を変更",
      renameDescription: "この会話の新しい名前を入力してください。",
      renamePlaceholder: "会話名",
      renameSave: "保存",
      renameCancel: "キャンセル",
      renameError: "会話名を変更できません。もう一度お試しください。",
      deleteTitle: "会話を削除しますか？",
      deleteDescription:
        "削除した会話とメッセージは履歴に表示されなくなります。",
      deleteConfirm: "削除",
      deleteCancel: "キャンセル",
      deleteError: "会話を削除できません。もう一度お試しください。",
      recent: "最近の会話",
      emptyConversations: "会話がここに表示されます。",
      welcome: "何を調べましょうか？",
      welcomeDescription:
        "市場トレンド、企業のファンダメンタルズ、評価、ニュース、財務データを質問できます。",
      emptyMessages: "メッセージを送って会話を始めましょう。",
      loadingMessages: "会話を読み込み中...",
      placeholder: "Agentにメッセージを送信...",
      send: "メッセージを送信",
      stop: "停止",
      thinking: "考え中...",
      runFailed: "Agentは回答を完了できませんでした。",
      cancelled: "回答を停止しました。",
      loginRequired: "ログインするとAgentとの非公開の会話を始められます。",
      loadError: "会話を読み込めません。もう一度お試しください。",
      messagesError: "会話を読み込めません。もう一度お試しください。",
      quotaReached:
        "You've reached today's AI Chat limit. Upgrade to Pro for more messages.",
      sendError: "メッセージを送信できません。もう一度お試しください。",
      streamError: "回答ストリームが中断されました。もう一度お試しください。",
      streamUnavailable: "回答ストリームは一時的に利用できません。",
      cancelError: "回答を停止できません。もう一度お試しください。",
      progressTitle: "Agent progress",
      progress: {
        running: "In progress",
        completed: "Completed",
        failed: "Failed",
      },
      disclaimer:
        "AIの回答には誤りが含まれる場合があります。重要な情報は確認してください。",
    },
    agent: {
      progress: {
        search_ticker: "Searching for the stock code",
        search_web: "ウェブを検索中",
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
      currentPlan: "Current plan",
      upgrade: "Upgrade",
      screeningShort: "Screening",
      analysisShort: "AI analysis",
      factorResearchShort: "Factor Research",
      chatShort: "AI Chat",
      remaining: "{{count}} left",
      currentPro: "Pro plan",
      usage:
        "{{screen}}/{{screenLimit}} screens · {{analysis}}/{{analysisLimit}} analyses · {{chat}}/{{chatLimit}} AI Chat messages today",
      active: "Active",
      cancelAtPeriodEnd: "Cancels at period end",
      freeStatus: "No active subscription",
      loading: "Loading",
      statusUnavailable: "Status unavailable",
      billingLoadError: "Unable to load your subscription status.",
      paypalPaymentHint:
        "サブスクリプションのお支払いはPayPalで安全に処理されます。",
      paypalTitle: "PayPalで登録",
      paypalDescription:
        "{{interval}}のProプランを選択し、PayPalで登録を承認してください。",
      paypalUnavailable:
        "PayPalを利用できません。しばらくしてから再試行してください。",
      paypalApprovalError:
        "PayPalの登録情報を確認できません。再試行してください。",
      paypalConfirmError:
        "PayPalの登録を確認できませんでした。状態を再確認してください。",
      paypalPending:
        "PayPalが登録を処理しています。まもなくプランが更新されます。",
      paypalCancelled: "PayPalのお支払いをキャンセルしました。",
      paypalError: "PayPalで登録できませんでした。再試行してください。",
      paypalResumeApproved:
        "{{interval}}のPayPal登録は承認済みです。新しく登録する前に、既存の登録状態を確認してください。",
      paypalCheck: "登録状態を確認",
      paypalRetry: "再試行",
      paypalInactive: "このPayPal登録は無効です。新しく登録できます。",
      paypalAlreadyPro: "有効なProプランがあります。プランを更新しています…",
      paypalStages: {
        loading: "PayPalを読み込み中…",
        creating: "PayPalの登録を準備中…",
        confirming: "登録を確認中…",
      },
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
            analysis: "AI 深層分析（基本版）",
            factorResearch: "毎日 1 回のファクター研究",
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
      title: "判断履歴",
      description: "作成済みの株式AI判断履歴を確認します。",
      loading: "判断履歴を読み込んでいます...",
      empty: "判断履歴はまだありません。",
      error: "判断履歴を読み込めませんでした。もう一度お試しください。",
      view: "表示",
      noOperation: "売買操作の詳細はありません。",
      locked: "Locked",
      newAiAnalysis: "新しいAI投資判断",
      newAnalysis: {
        title: "新しいAI分析",
        description: "銘柄を選択してAI判断タスクを作成します",
        market: "市場",
        keyword: "キーワード",
        keywordPlaceholder: "銘柄コードまたは銘柄名",
        keywordDescription: "Enterキーを押すか、検索ボタンで銘柄を検索します。",
        search: "検索",
        searching: "検索中...",
        noResults: "一致する銘柄がありません。",
        searchError: "銘柄を検索できませんでした。もう一度お試しください。",
        selectStockFirst: "検索結果から銘柄を選択してください。",
        moreParameters: "追加パラメーター",
        availableFunds: "利用可能資金",
        holdingCost: "保有コスト",
        holdingShares: "保有株数",
        invalidParameters: "0より大きい数値を入力してください。",
        submit: "AI分析",
      },
      columns: {
        stock: "銘柄",
        price: "価格",
        changePct: "騰落率",
        volume: "出来高",
        operation: "AI投資判断",
        createdAt: "分析日時",
        actions: "操作",
      },
      operationSummary: {
        buy: "買い",
        sell: "売り",
        trade: "売買",
        hold: "様子見",
        empty: "様子見",
      },
      operationColumns: {
        operation: "操作",
        price: "価格",
        amount: "数量（株）",
        ev: "期待収益値（EV）",
        confidence: "信頼度",
      },
      operationTypes: {
        buy: "買い",
        sell: "売り",
        hold: "様子見",
      },
    },
    decisionDetail: {
      loading: "判断を読み込んでいます...",
      notFound: "判断タスクが見つかりません。",
      error: "判断タスクを読み込めませんでした。もう一度お試しください。",
      streamError:
        "分析ストリームを取得できませんでした。もう一度お試しください。",
      analysis: "分析内容",
      snapshotDescription: "以下の情報は{{time}}時点のスナップショットです",
      analysisDescription:
        "AIの出力は情報提供のみを目的としており、投資、法律、税務、金融、会計、その他の専門的助言には該当しません。また、いかなる金融資産に関する推奨、保証、約束、予測を示すものでもありません。",
      streaming: "分析中...",
      waitingForStream: "分析結果を待っています...",
      loadingMessages: {
        queryingPrice: "株価を照会しています...",
        retrievingNews: "関連ニュースを検索しています...",
        checkingFinancials: "財務データを確認しています...",
        analyzingTrend: "価格トレンドを分析しています...",
        calculatingRisk: "リスクシグナルを計算しています...",
        generatingDecision: "判断案を作成しています...",
      },
      noAnalysis: "分析内容はありません。",
      failed: "分析に失敗しました。",
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
      noSnapshot: "価格スナップショットはありません。",
      operationSuggestion: "AI判断",
      operationSuggestionDescription:
        "AIによる提案は学習・参考目的のみであり、いかなる形式の証券投資助言も構成しません。",
      status: {
        pending: "待機中",
        processing: "処理中",
        completed: "完了",
        failed: "失敗",
      },
      snapshot: {
        price: "現在値",
        changePct: "騰落率",
        volume: "出来高",
        open: "始値",
        high: "高値",
        low: "安値",
        high52w: "52週高値",
        low52w: "52週安値",
        per: "PER",
        pbr: "PBR",
        foreignRate: "外国人保有比率",
        dividendYield: "配当利回り",
      },
    },
    stockScreener: {
      title: "株式スクリーナー",
      description: "大規模言語モデルを活用した株式スクリーナー",
      placeholder:
        "スクリーニングしたい企業、相場シグナル、条件を入力してください",
      submit: "検索",
      loading: "スクリーニング中",
      markets: {
        monad: "Monad",
        korea: "韓国",
        america: "米国",
        coin: "暗号資産",
        cex: "CEX",
        china: "中国",
        dex: "DEX",
        japan: "日本",
        hongkong: "香港",
        taiwan: "台湾",
        india: "インド",
        russia: "ロシア",
      },
      loadingMessages: {
        researching: "銘柄を調査しています...",
        gathering: "データを収集しています...",
        analyzing: "指標を分析しています...",
        screening: "企業をスクリーニングしています...",
      },
      examples: {
        title: "例",
        previous: "前の例",
        next: "次の例",
        items: {
          cryptoMarketLeaders: {
            title: "暗号資産の市場リーダー",
            description:
              "時価総額が大きく、流動性と取引活動が高い暗号資産を探します。",
          },
          cryptoMomentum: {
            title: "暗号資産モメンタム",
            description:
              "24時間の価格モメンタムがプラスで出来高が多い暗号資産を探します。",
          },
          cryptoValueOpportunities: {
            title: "暗号資産の割安機会",
            description:
              "直近高値を下回り、テクニカル評価が改善している主要暗号資産を探します。",
          },
          activeCexPairs: {
            title: "最も活発なCEXペア",
            description:
              "24時間USD出来高が多い中央集権型取引所のペアを探します。",
          },
          cexVolumeSurges: {
            title: "CEX出来高急増",
            description: "24時間の出来高増加率が高い取引ペアを探します。",
          },
          bullishCexPairs: {
            title: "強気のCEXペア",
            description:
              "モメンタム、出来高、テクニカル評価が強気のCEXペアを探します。",
          },
          liquidDexMarkets: {
            title: "高流動性DEX市場",
            description:
              "流動性が厚く、十分な取引量がある分散型市場を探します。",
          },
          activeDexMarkets: {
            title: "最も活発なDEX市場",
            description:
              "取引件数、トレーダー数、取引量が多いDEX市場を探します。",
          },
          emergingDexTokens: {
            title: "新興DEXトークン",
            description:
              "FDVが低く、活動と流動性が伸びているトークンを探します。",
          },
          highBetaStocks: {
            title: "高ベータ銘柄",
            description:
              "価格変動が大きく、高いリターンが期待できる銘柄を探します。",
          },
          overvaluedStocks: {
            title: "割高銘柄",
            description:
              "過大評価によりInvestingProの下落リスクがある銘柄を特定します。",
          },
          momentumMasters: {
            title: "モメンタム優良株",
            description:
              "直近の株価パフォーマンスが良好で、出来高の多い銘柄を追跡します。",
          },
          earningsManipulators: {
            title: "利益操作リスク",
            description: "利益操作の可能性や利益の質が低い企業を見つけます。",
          },
          profitableExpansions: {
            title: "収益性の拡大",
            description:
              "成長を続け、利益率と収益性が向上している企業を特定します。",
          },
          financialFortresses: {
            title: "強固な財務基盤",
            description:
              "Piotroski Fスコアが高く、低リスクでキャッシュフローの強いディフェンシブ銘柄を探します。",
          },
          near52WeekHigh: {
            title: "52週高値に接近",
            description: "現在の株価が52週高値に近い銘柄を特定します。",
          },
          techInnovators: {
            title: "テクノロジー革新企業",
            description:
              "急成長し、ユニットエコノミクスが健全で、集中力のあるチームを持つテクノロジー銘柄を特定します。",
          },
          highBetaBulls: {
            title: "高ベータ上昇株",
            description:
              "高いベータと強い価格モメンタムを併せ持つ銘柄を探します。",
          },
        },
      },
      summary: "AIによる説明",
      aiAnalysis: "AI投資判断",
      askAi: "AIに質問",
      aiAnalysisUnavailable: "この市場のAI分析にはまだ対応していません。",
      share: "共有",
      shareCopied: "共有リンクをコピーしました",
      empty:
        "結果はまだありません。スクリーニング条件を入力して開始してください。",
      noMatches: "一致する銘柄はありませんでした。",
      error:
        "スクリーナーの結果を読み込めませんでした。もう一度お試しください。",
      columns: {
        ticker: "ティッカー",
        name: "銘柄名",
        operation: "操作",
        description: "説明",
        change: "騰落率",
        close: "終値",
        volume: "出来高",
        marketCap: "時価総額",
        exchange: "取引所",
        blockchain: "ブロックチェーン",
        price: "価格",
        change24h: "騰落率",
        volume24hUsd: "USD出来高",
        volumeChange24h: "出来高変化率",
        transactions: "取引件数",
        tradingVolume: "取引量",
        traders: "トレーダー",
        liquidity: "流動性",
        fdv: "完全希薄化評価額",
        techRating: "テクニカル評価",
        analystRating: "アナリスト評価",
      },
    },
  },
} satisfies LocaleResource

export default ja
