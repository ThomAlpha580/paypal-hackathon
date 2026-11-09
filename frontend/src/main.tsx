import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@/components/ui/tooltip.tsx"
import { BrowserRouter } from "react-router"
import { Toaster } from "@/components/ui/sonner.tsx"
import "@/i18n/config.ts"
import { SingletonHooksContainer } from "react-singleton-hook"

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ThemeProvider>
      <TooltipProvider>
        <SingletonHooksContainer />
        <App />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  </BrowserRouter>
)
