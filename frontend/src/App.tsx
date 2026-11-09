import { Navigate, Route, Routes } from "react-router"

import { AppLayout } from "@/components/layout/app-layout"
import { DecisionDetailPage } from "@/pages/decision/decision-detail-page"
import { DecisionRecordsPage } from "@/pages/decision/decision-records-page"
import { StockScreenerPage } from "@/pages/stock-screener/stock-screener-page"
import { PricingPage } from "@/pages/pricing/pricing-page"
import { ChatPage } from "@/pages/chat/chat-page"
import { AlphaResearchPage } from "@/pages/alpha/alpha-research-page"
import { FactorLibraryPage } from "@/pages/alpha/factor-library-page"

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/*<Route index element={<Navigate replace to="/stock-screener" />} />*/}
        <Route path="/" element={<StockScreenerPage />} />
        <Route path="/decision" element={<DecisionRecordsPage />} />
        <Route path="/decision/:taskId" element={<DecisionDetailPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/chat/:id?" element={<ChatPage />} />
        <Route
          path="/alpha"
          element={<Navigate replace to="/alpha/research" />}
        />
        <Route
          path="/alpha/research/:chatId?"
          element={<AlphaResearchPage />}
        />
        <Route path="/alpha/library" element={<FactorLibraryPage />} />
        <Route path="/billing" element={<Navigate replace to="/pricing" />} />
        <Route
          path="/billing/success"
          element={<Navigate replace to="/pricing" />}
        />
      </Route>
      <Route path="*" element={<Navigate replace to="/stock-screener" />} />
    </Routes>
  )
}

export default App
