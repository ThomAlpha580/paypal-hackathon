import type { LocaleResource } from "./en"

const hi = {
  translation: {
    app: {
      name: "EasyStock",
      tagline: "AI स्टॉक स्क्रीनर और विश्लेषण",
      navigation: "नेविगेशन",
      language: "भाषा",
      currentLanguage: "हिन्दी",
      theme: "थीम",
      lightTheme: "लाइट",
      darkTheme: "डार्क",
      systemTheme: "सिस्टम",
    },
    auth: {
      account: "खाता",
      login: "लॉग इन करें",
      logout: "लॉग आउट करें",
      continueWithGoogle: "Google से जारी रखें",
      continueWithNaver: "Naver से जारी रखें",
      wallet: {
        hint: "MetaMask कनेक्ट करें और Monad पर हस्ताक्षर करके लॉग इन करें। गैस शुल्क नहीं लगता।",
        install: "MetaMask इंस्टॉल करें",
        connecting: "MetaMask कनेक्ट हो रहा है…",
        switching: "Monad पर स्विच हो रहा है…",
        signing: "MetaMask में हस्ताक्षर की पुष्टि करें…",
        verifying: "लॉग इन हो रहा है…",
        errors: {
          notInstalled: "इस ब्राउज़र में MetaMask इंस्टॉल नहीं है।",
          rejected: "वॉलेट अनुरोध रद्द हो गया। तैयार होने पर फिर प्रयास करें।",
          pending:
            "MetaMask में एक अनुरोध लंबित है। आगे बढ़ने के लिए वॉलेट खोलें।",
          noAccount:
            "वॉलेट खाता उपलब्ध नहीं है। MetaMask अनलॉक करें और फिर प्रयास करें।",
          walletChanged:
            "वॉलेट खाता या नेटवर्क बदल गया। कृपया फिर कनेक्ट करें।",
          wrongNetwork:
            "MetaMask को Monad मेननेट पर स्विच करें और फिर प्रयास करें।",
          invalidSignature:
            "वॉलेट ने अमान्य हस्ताक्षर लौटाया। कृपया फिर प्रयास करें।",
          registrationDisabled:
            "वॉलेट पंजीकरण अभी उपलब्ध नहीं है। Google या Naver से लॉग इन करें।",
          unsupportedChain: "सर्वर पर Monad लॉगिन अभी सक्षम नहीं है।",
          expired:
            "लॉगिन अनुरोध समाप्त हो गया या सत्यापन विफल हुआ। फिर प्रयास करें।",
          forbidden: "इस साइट पर वॉलेट लॉगिन उपलब्ध नहीं है।",
          unavailable:
            "वॉलेट लॉगिन अस्थायी रूप से उपलब्ध नहीं है। बाद में फिर प्रयास करें।",
          rateLimited: "बहुत अधिक अनुरोध। पाँच मिनट बाद फिर प्रयास करें।",
          failed: "MetaMask से लॉग इन नहीं हो सका। कृपया फिर प्रयास करें।",
        },
      },
    },
    routes: {
      home: "होम",
      stockScreener: "स्टॉक स्क्रीनर",
      decisionRecords: "AI निर्णय",
      pricing: "Upgrade",
      chat: "Chat Agent",
      decisionDetail: "निर्णय विवरण",
      alphaMining: "Alpha Mining",
      factorResearch: "Factor Research",
      factorLibrary: "Factor Library",
    },
    chat: {
      title: "Chat Agent",
      subtitle: "बाज़ार और कंपनियों के बारे में पूछें",
      newConversation: "नई बातचीत",
      conversationActions: "बातचीत के विकल्प",
      rename: "नाम बदलें",
      delete: "हटाएं",
      renameTitle: "बातचीत का नाम बदलें",
      renameDescription: "इस बातचीत के लिए नया नाम चुनें।",
      renamePlaceholder: "बातचीत का नाम",
      renameSave: "सहेजें",
      renameCancel: "रद्द करें",
      renameError: "बातचीत का नाम नहीं बदला जा सका। फिर कोशिश करें।",
      deleteTitle: "बातचीत हटाएं?",
      deleteDescription:
        "हटाई गई बातचीत और उसके संदेश इतिहास में दिखाई नहीं देंगे।",
      deleteConfirm: "हटाएं",
      deleteCancel: "रद्द करें",
      deleteError: "बातचीत हटाई नहीं जा सकी। फिर कोशिश करें।",
      recent: "हाल की बातचीत",
      emptyConversations: "आपकी बातचीत यहां दिखाई देंगी।",
      welcome: "आज आप क्या शोध करना चाहते हैं?",
      welcomeDescription:
        "बाज़ार रुझान, कंपनी फंडामेंटल, वैल्यूएशन, समाचार या वित्तीय डेटा पूछें।",
      emptyMessages: "संदेश भेजकर बातचीत शुरू करें।",
      loadingMessages: "बातचीत लोड हो रही है...",
      placeholder: "Agent को संदेश भेजें...",
      send: "संदेश भेजें",
      stop: "रोकें",
      thinking: "सोच रहा है...",
      runFailed: "Agent इस उत्तर को पूरा नहीं कर सका।",
      cancelled: "उत्तर रोक दिया गया।",
      loginRequired: "Agent के साथ निजी बातचीत शुरू करने के लिए साइन इन करें।",
      loadError: "बातचीत लोड नहीं हो सकी। फिर से कोशिश करें।",
      messagesError: "यह बातचीत लोड नहीं हो सकी। फिर से कोशिश करें।",
      quotaReached:
        "You've reached today's AI Chat limit. Upgrade to Pro for more messages.",
      sendError: "संदेश नहीं भेजा जा सका। फिर से कोशिश करें।",
      streamError: "उत्तर स्ट्रीम बाधित हुई। फिर से कोशिश करें।",
      streamUnavailable: "उत्तर स्ट्रीम अस्थायी रूप से उपलब्ध नहीं है।",
      cancelError: "उत्तर रोका नहीं जा सका। फिर से कोशिश करें।",
      progressTitle: "Agent progress",
      progress: {
        running: "In progress",
        completed: "Completed",
        failed: "Failed",
      },
      disclaimer:
        "AI के उत्तर गलत हो सकते हैं। महत्वपूर्ण जानकारी की पुष्टि करें।",
    },
    agent: {
      progress: {
        search_ticker: "Searching for the stock code",
        search_web: "वेब पर खोज जारी है",
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
        "सदस्यता का भुगतान PayPal द्वारा सुरक्षित रूप से किया जाता है।",
      paypalTitle: "PayPal से सदस्यता लें",
      paypalDescription:
        "{{interval}} Pro योजना चुनें और PayPal में सदस्यता स्वीकृत करें।",
      paypalUnavailable: "PayPal अभी उपलब्ध नहीं है। बाद में फिर कोशिश करें।",
      paypalApprovalError:
        "PayPal से सदस्यता की जानकारी नहीं मिली। फिर कोशिश करें।",
      paypalConfirmError:
        "PayPal सदस्यता की पुष्टि नहीं हो सकी। स्थिति फिर से जाँचें।",
      paypalPending:
        "PayPal सदस्यता संसाधित कर रहा है। आपकी योजना जल्द अपडेट होगी।",
      paypalCancelled: "PayPal भुगतान रद्द कर दिया गया।",
      paypalError: "PayPal सदस्यता पूरी नहीं हो सकी। फिर कोशिश करें।",
      paypalResumeApproved:
        "आप पहले ही {{interval}} PayPal सदस्यता स्वीकृत कर चुके हैं। नई सदस्यता शुरू करने से पहले उसकी स्थिति की पुष्टि करें।",
      paypalCheck: "सदस्यता की स्थिति जाँचें",
      paypalRetry: "फिर कोशिश करें",
      paypalInactive:
        "यह PayPal सदस्यता अब सक्रिय नहीं है। आप नई सदस्यता शुरू कर सकते हैं।",
      paypalAlreadyPro:
        "आपकी Pro सदस्यता पहले से सक्रिय है। योजना अपडेट हो रही है…",
      paypalStages: {
        loading: "PayPal लोड हो रहा है…",
        creating: "PayPal सदस्यता तैयार हो रही है…",
        confirming: "सदस्यता की पुष्टि हो रही है…",
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
            analysis: "AI deep analysis (basic version)",
            factorResearch: "प्रतिदिन 1 फ़ैक्टर शोध",
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
      title: "निर्णय रिकॉर्ड",
      description: "ट्रैक किए गए स्टॉक्स के AI निर्णय रिकॉर्ड देखें।",
      loading: "निर्णय रिकॉर्ड लोड हो रहे हैं...",
      empty: "अभी कोई निर्णय रिकॉर्ड नहीं है।",
      error: "निर्णय रिकॉर्ड लोड नहीं हो सके। कृपया फिर प्रयास करें।",
      view: "देखें",
      noOperation: "कोई लेनदेन विवरण नहीं है।",
      locked: "Locked",
      newAiAnalysis: "नया AI निर्णय",
      newAnalysis: {
        title: "नया AI निर्णय",
        description: "स्टॉक चुनें और AI निर्णय कार्य शुरू करें",
        market: "बाज़ार",
        keyword: "कीवर्ड",
        keywordPlaceholder: "स्टॉक कोड या नाम",
        keywordDescription:
          "स्टॉक खोजने के लिए Enter दबाएँ या खोज का उपयोग करें।",
        search: "खोजें",
        searching: "खोज जारी है...",
        noResults: "कोई मेल खाता स्टॉक नहीं मिला।",
        searchError: "स्टॉक खोजे नहीं जा सके। कृपया फिर प्रयास करें।",
        selectStockFirst: "कृपया खोज परिणामों से एक स्टॉक चुनें।",
        moreParameters: "अधिक पैरामीटर",
        availableFunds: "उपलब्ध धनराशि",
        holdingCost: "होल्डिंग लागत",
        holdingShares: "होल्ड किए गए शेयर",
        invalidParameters: "कृपया 0 से बड़ी संख्याएँ दर्ज करें।",
        submit: "AI विश्लेषण",
      },
      columns: {
        stock: "स्टॉक",
        price: "मूल्य",
        changePct: "बदलाव %",
        volume: "वॉल्यूम",
        operation: "AI निर्णय",
        createdAt: "विश्लेषण का समय",
        actions: "कार्रवाइयाँ",
      },
      operationSummary: {
        buy: "खरीदें",
        sell: "बेचें",
        trade: "T ट्रेड",
        hold: "होल्ड करें",
        empty: "होल्ड करें",
      },
      operationColumns: {
        operation: "कार्रवाई",
        price: "मूल्य",
        amount: "मात्रा",
        ev: "अपेक्षित रिटर्न मूल्य (EV)",
        confidence: "विश्वास स्तर",
      },
      operationTypes: {
        buy: "खरीदें",
        sell: "बेचें",
        hold: "होल्ड करें",
      },
    },
    decisionDetail: {
      loading: "निर्णय लोड हो रहा है...",
      notFound: "निर्णय कार्य नहीं मिला।",
      error: "निर्णय कार्य लोड नहीं हो सका। कृपया फिर प्रयास करें।",
      streamError: "विश्लेषण स्ट्रीम नहीं हो सका। कृपया फिर प्रयास करें।",
      analysis: "विश्लेषण",
      snapshotDescription: "निम्न जानकारी {{time}} तक का स्नैपशॉट है",
      analysisDescription:
        "AI आउटपुट केवल जानकारी के लिए है और यह निवेश, कानूनी, कर, वित्तीय, लेखांकन या अन्य पेशेवर सलाह नहीं है। यह किसी वित्तीय परिसंपत्ति के संबंध में सिफारिश, गारंटी, प्रतिबद्धता या पूर्वानुमान भी नहीं है।",
      streaming: "विश्लेषण जारी है...",
      waitingForStream: "विश्लेषण आउटपुट की प्रतीक्षा हो रही है...",
      loadingMessages: {
        queryingPrice: "स्टॉक मूल्य खोजे जा रहे हैं...",
        retrievingNews: "संबंधित समाचार प्राप्त किए जा रहे हैं...",
        checkingFinancials: "वित्तीय डेटा जाँचा जा रहा है...",
        analyzingTrend: "मूल्य रुझानों का विश्लेषण हो रहा है...",
        calculatingRisk: "जोखिम संकेतों की गणना हो रही है...",
        generatingDecision: "निर्णय संबंधी सुझाव तैयार हो रहा है...",
      },
      noAnalysis: "कोई विश्लेषण सामग्री नहीं है।",
      failed: "विश्लेषण विफल रहा।",
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
      noSnapshot: "कोई मूल्य स्नैपशॉट उपलब्ध नहीं है।",
      operationSuggestion: "AI निर्णय",
      operationSuggestionDescription:
        "AI सुझाव केवल सीखने और संदर्भ के लिए हैं तथा किसी भी रूप में प्रतिभूति निवेश सलाह नहीं हैं।",
      status: {
        pending: "लंबित",
        processing: "प्रक्रिया जारी है",
        completed: "पूर्ण",
        failed: "विफल",
      },
      snapshot: {
        price: "नवीनतम मूल्य",
        changePct: "बदलाव %",
        volume: "वॉल्यूम",
        open: "ओपन",
        high: "उच्चतम",
        low: "न्यूनतम",
        high52w: "52-सप्ताह का उच्चतम",
        low52w: "52-सप्ताह का न्यूनतम",
        per: "P/E अनुपात",
        pbr: "P/B अनुपात",
        foreignRate: "विदेशी हिस्सेदारी",
        dividendYield: "लाभांश प्रतिफल",
      },
    },
    stockScreener: {
      title: "स्टॉक स्क्रीनर",
      description: "LLM-आधारित स्टॉक स्क्रीनर",
      placeholder:
        "उन कंपनियों, बाज़ार संकेतों या फ़िल्टर का वर्णन करें जिन्हें आप खोजना चाहते हैं",
      submit: "खोजें",
      loading: "स्क्रीनिंग जारी है",
      markets: {
        monad: "Monad",
        korea: "दक्षिण कोरिया",
        america: "अमेरिका",
        coin: "क्रिप्टोकरेंसी",
        cex: "CEX",
        china: "चीन",
        dex: "DEX",
        japan: "जापान",
        hongkong: "हांगकांग",
        taiwan: "ताइवान",
        india: "भारत",
        russia: "रूस",
      },
      loadingMessages: {
        researching: "स्टॉक्स पर शोध हो रहा है...",
        gathering: "डेटा एकत्र किया जा रहा है...",
        analyzing: "मापदंडों का विश्लेषण हो रहा है...",
        screening: "कंपनियों की स्क्रीनिंग हो रही है...",
      },
      examples: {
        title: "उदाहरण",
        previous: "पिछले उदाहरण",
        next: "अगले उदाहरण",
        items: {
          cryptoMarketLeaders: {
            title: "क्रिप्टो मार्केट लीडर्स",
            description:
              "मजबूत लिक्विडिटी और सक्रिय ट्रेडिंग वाली बड़ी क्रिप्टो परिसंपत्तियाँ खोजें।",
          },
          cryptoMomentum: {
            title: "क्रिप्टो मोमेंटम",
            description:
              "सकारात्मक 24 घंटे के मोमेंटम और अधिक वॉल्यूम वाली क्रिप्टो परिसंपत्तियाँ खोजें।",
          },
          cryptoValueOpportunities: {
            title: "क्रिप्टो वैल्यू अवसर",
            description:
              "हाल के उच्च स्तर से नीचे और बेहतर तकनीकी रेटिंग वाली स्थापित परिसंपत्तियाँ खोजें।",
          },
          activeCexPairs: {
            title: "सबसे सक्रिय CEX पेयर्स",
            description:
              "सबसे अधिक 24 घंटे के USD वॉल्यूम वाले केंद्रीकृत एक्सचेंज पेयर्स खोजें।",
          },
          cexVolumeSurges: {
            title: "CEX वॉल्यूम उछाल",
            description:
              "24 घंटे में सबसे अधिक वॉल्यूम वृद्धि वाले ट्रेडिंग पेयर्स खोजें।",
          },
          bullishCexPairs: {
            title: "तेज़ी वाले CEX पेयर्स",
            description:
              "सकारात्मक मोमेंटम, मजबूत वॉल्यूम और तेज़ी की तकनीकी रेटिंग वाले पेयर्स खोजें।",
          },
          liquidDexMarkets: {
            title: "उच्च लिक्विडिटी DEX मार्केट",
            description:
              "गहरी लिक्विडिटी और सार्थक ट्रेडिंग वॉल्यूम वाले विकेंद्रीकृत मार्केट खोजें।",
          },
          activeDexMarkets: {
            title: "सबसे सक्रिय DEX मार्केट",
            description:
              "अधिक लेन-देन, सक्रिय ट्रेडर्स और मजबूत वॉल्यूम वाले DEX मार्केट खोजें।",
          },
          emergingDexTokens: {
            title: "उभरते DEX टोकन",
            description:
              "कम FDV, बढ़ती गतिविधि और बेहतर लिक्विडिटी वाले टोकन खोजें।",
          },
          highBetaStocks: {
            title: "उच्च बीटा स्टॉक्स",
            description:
              "अधिक मूल्य अस्थिरता और उल्लेखनीय रिटर्न की संभावना वाले स्टॉक्स खोजें।",
          },
          overvaluedStocks: {
            title: "अधिक मूल्यांकित स्टॉक्स",
            description:
              "अधिक मूल्यांकन के कारण InvestingPro गिरावट जोखिम वाले स्टॉक्स पहचानें।",
          },
          momentumMasters: {
            title: "मज़बूत मोमेंटम वाले स्टॉक्स",
            description:
              "हाल के उत्कृष्ट मूल्य प्रदर्शन और अधिक ट्रेडिंग वॉल्यूम वाले स्टॉक्स ट्रैक करें।",
          },
          earningsManipulators: {
            title: "आय में हेरफेर का जोखिम",
            description:
              "कम गुणवत्ता वाली आय और संभावित आय हेरफेर वाली कंपनियाँ खोजें।",
          },
          profitableExpansions: {
            title: "लाभदायक विस्तार",
            description:
              "बढ़ते लाभ मार्जिन और बेहतर लाभप्रदता वाली विकासशील कंपनियाँ पहचानें।",
          },
          financialFortresses: {
            title: "वित्तीय रूप से मज़बूत कंपनियाँ",
            description:
              "उच्च Piotroski F-Score, कम जोखिम और मज़बूत नकदी प्रवाह वाले रक्षात्मक स्टॉक्स खोजें।",
          },
          near52WeekHigh: {
            title: "52-सप्ताह के उच्चतम के पास",
            description:
              "अपने 52-सप्ताह के उच्चतम मूल्य के पास ट्रेड कर रहे स्टॉक्स पहचानें।",
          },
          techInnovators: {
            title: "तकनीकी नवप्रवर्तक",
            description:
              "मज़बूत यूनिट इकॉनॉमिक्स और केंद्रित टीम वाले तेज़ी से बढ़ते टेक स्टॉक्स पहचानें।",
          },
          highBetaBulls: {
            title: "उच्च बीटा बुल्स",
            description:
              "मज़बूत मूल्य मोमेंटम दिखाने वाले उच्च बीटा स्टॉक्स खोजें।",
          },
        },
      },
      summary: "AI विवरण",
      aiAnalysis: "AI विश्लेषण",
      askAi: "AI से पूछें",
      aiAnalysisUnavailable: "इस बाज़ार के लिए AI विश्लेषण अभी उपलब्ध नहीं है।",
      share: "साझा करें",
      shareCopied: "शेयर लिंक कॉपी हो गया",
      empty:
        "अभी कोई परिणाम नहीं है। शुरू करने के लिए स्क्रीनिंग अनुरोध दर्ज करें।",
      noMatches: "कोई मेल खाता स्टॉक नहीं मिला।",
      error: "स्क्रीनर परिणाम लोड नहीं हो सके। कृपया फिर प्रयास करें।",
      columns: {
        ticker: "टिकर",
        name: "प्रतीक",
        operation: "कार्रवाई",
        description: "विवरण",
        change: "बदलाव",
        close: "बंद भाव",
        volume: "वॉल्यूम",
        marketCap: "बाज़ार पूँजीकरण",
        exchange: "एक्सचेंज",
        blockchain: "ब्लॉकचेन",
        price: "मूल्य",
        change24h: "बदलाव",
        volume24hUsd: "USD वॉल्यूम",
        volumeChange24h: "वॉल्यूम बदलाव",
        transactions: "लेन-देन",
        tradingVolume: "ट्रेडिंग वॉल्यूम",
        traders: "ट्रेडर्स",
        liquidity: "लिक्विडिटी",
        fdv: "FDV",
        techRating: "तकनीकी रेटिंग",
        analystRating: "विश्लेषक रेटिंग",
      },
    },
  },
} satisfies LocaleResource

export default hi
