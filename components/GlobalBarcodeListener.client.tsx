"use client"

import { useCallback, useState, useEffect } from 'react'
import useGlobalBarcodeScanner from '../hooks/use-global-barcode-scanner'
import BarcodeModal, { type BulkLineItem } from './barcode-modal'

interface GlobalBarcodeListenerProps {
  enabled?: boolean
  isCheckoutOpen?: boolean
  onScanned: (payload: { barcode?: string; quantity?: number } | { items: BulkLineItem[] }) => void
}

export default function GlobalBarcodeListener({
  enabled = true,
  isCheckoutOpen = false,
  onScanned,
}: GlobalBarcodeListenerProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingValue, setPendingValue] = useState('')

  const handleDetected = useCallback((value: string) => {
    // Show modal with scanned value
    setPendingValue(value)
    setModalOpen(true)
  }, [])

  // Disable global barcode scanner when checkout modal is open
  useGlobalBarcodeScanner(handleDetected, { 
    minLength: 3, 
    interKeyMs: 80, 
    maxScanDurationMs: 1200,
    enabled: enabled && !isCheckoutOpen 
  })

  const handleConfirm = (payload: any) => {
    onScanned(payload)
  }

  useEffect(() => {
    if (isCheckoutOpen) {
      setModalOpen(false)
    }
  }, [isCheckoutOpen])

  return (
    <BarcodeModal open={modalOpen} initialValue={pendingValue} onClose={() => setModalOpen(false)} onConfirm={handleConfirm} />
  )
}
