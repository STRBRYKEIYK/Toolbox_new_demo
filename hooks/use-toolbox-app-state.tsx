"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from "react"

export type AppView = "dashboard" | "cart" | "item-detail" | "logs"

interface ToolboxAppStateContextValue {
  currentView: AppView
  navigateTo: (view: AppView) => void
  checkoutModalOpen: boolean
  setCheckoutModalOpen: (isOpen: boolean) => void
  checkoutSuccessCount: number
  markCheckoutSuccess: () => void
  barcodeQueueResetToken: number
  resetBarcodeQueue: () => void
}

interface ToolboxAppStateProviderProps {
  currentView: AppView
  onNavigate: (view: AppView) => void
  children: React.ReactNode
}

const ToolboxAppStateContext = createContext<ToolboxAppStateContextValue | null>(null)

export function ToolboxAppStateProvider({
  currentView,
  onNavigate,
  children,
}: ToolboxAppStateProviderProps) {
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [checkoutSuccessCount, setCheckoutSuccessCount] = useState(0)
  const [barcodeQueueResetToken, setBarcodeQueueResetToken] = useState(0)

  const navigateTo = useCallback(
    (view: AppView) => {
      onNavigate(view)
    },
    [onNavigate]
  )

  const markCheckoutSuccess = useCallback(() => {
    setCheckoutSuccessCount((count) => count + 1)
  }, [])

  const resetBarcodeQueue = useCallback(() => {
    setBarcodeQueueResetToken((token) => token + 1)
  }, [])

  const value = useMemo(
    () => ({
      currentView,
      navigateTo,
      checkoutModalOpen,
      setCheckoutModalOpen,
      checkoutSuccessCount,
      markCheckoutSuccess,
      barcodeQueueResetToken,
      resetBarcodeQueue,
    }),
    [
      currentView,
      navigateTo,
      checkoutModalOpen,
      setCheckoutModalOpen,
      checkoutSuccessCount,
      markCheckoutSuccess,
      barcodeQueueResetToken,
      resetBarcodeQueue,
    ]
  )

  return <ToolboxAppStateContext.Provider value={value}>{children}</ToolboxAppStateContext.Provider>
}

export function useToolboxAppState() {
  const ctx = useContext(ToolboxAppStateContext)
  if (!ctx) {
    throw new Error("useToolboxAppState must be used within a ToolboxAppStateProvider")
  }
  return ctx
}
