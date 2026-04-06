import React from "react"
import ReactDOM from "react-dom/client"
import App from "./app/page"
import { ThemeProvider } from "./components/theme-provider"
import { ErrorBoundary } from "./components/error-boundary"
import { LoadingProvider } from "./components/loading-context"
import { TooltipProvider } from "./components/ui/tooltip"
import "./app/globals.css"

// Initialize secure logger to prevent data exposure in production
import "./lib/logger"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="toolbox-theme">
        <TooltipProvider>
          <LoadingProvider>
            <App />
          </LoadingProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
