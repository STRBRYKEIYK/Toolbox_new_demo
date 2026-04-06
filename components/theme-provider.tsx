"use client"

import * as React from "react"

// We keep the original types intact so any components 
// consuming this context (like a ThemeToggle) won't throw TypeScript errors.
type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
}

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
  resolvedTheme: "dark",
}

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "toolbox-theme",
  ...props
}: ThemeProviderProps) {
  
  // We bypass localStorage entirely. The system is hardcoded to dark.
  const [theme, setTheme] = React.useState<Theme>("dark")

  React.useEffect(() => {
    const root = window.document.documentElement

    console.log("[SYS_INIT] Optics module initialized.")
    console.log("[SYS_WARN] Standard themes bypassed. Forcing HIGH-CONTRAST TACTICAL mode.")

    // Strip out any rogue light classes that might have been cached
    root.classList.remove("light")
    
    // Hard-lock the HTML root to dark to support any lingering Tailwind dark: variants
    root.classList.add("dark")
    
    // Failsafe: Force the base document background to zinc-950 to prevent white flashes
    root.style.backgroundColor = "#09090b" 
    root.style.color = "#e4e4e7" 

  }, []) // Empty dependency array means this only runs on mount

  // The value exposed to the rest of the app
  const value = {
    theme: "dark" as Theme,
    resolvedTheme: "dark" as const,
    setTheme: (newTheme: Theme) => {
      // Intercept the theme change command and act as a hard-wired override
      console.warn(`[SYS_OVERRIDE] Attempted to set optics to '${newTheme}'. Request denied. System locked to TACTICAL DARK.`)
      // We intentionally NO-OP here so the state never actually changes.
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}