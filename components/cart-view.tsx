"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Minus, 
  Plus, 
  Trash2, 
  History, 
  Package, 
  ChevronDown, 
  ChevronRight,
  Terminal,
  Cpu,
  Database,
  Zap,
  Hash,
  MapPin,
  CheckSquare,
  Square
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { CheckoutModal } from "./checkout-modal"
import { CheckoutSuccessCountdown } from "./checkout-success-countdown"
import { CartRecoveryPanel, CartStatusIndicator } from "./cart-recovery-panel"
import { apiBridge } from "../lib/api-bridge"
import { useToast } from "../hooks/use-toast"
import { useOfflineManager } from "../hooks/use-offline-manager"
import type { CartItem } from "../app/page"
import type { Employee } from "../lib/Services/employees.service"

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

/**
 * Extended CartItem type with addedAt timestamp for sorting
 * and tracking manifest injection times.
 */
interface CartItemWithTimestamp extends CartItem {
  addedAt?: number
}

interface CartViewProps {
  items: CartItemWithTimestamp[]
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemoveItem: (id: string) => void
  onReturnToBrowsing?: () => void
  onRefreshData?: (() => void) | undefined
}

// ─── HARDWARE UI SUBCOMPONENTS ────────────────────────────────────────────────

/**
 * Renders a decorative industrial screw head for corner accents.
 */
function HardwareScrew({ className = '' }: { className?: string }) {
  return (
    <div className={`w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_1px_1px_rgba(0,0,0,0.5)] flex items-center justify-center ${className}`}>
      <div className="w-1.5 h-0.5 bg-zinc-950/50 rotate-45 rounded-sm" />
    </div>
  )
}

/**
 * Tactical LED Indicator for status readouts.
 */
function LEDIndicator({ status, pulse = false }: { status: 'active' | 'warning' | 'error' | 'idle', pulse?: boolean }) {
  const colors = {
    active: 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    warning: 'bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    error: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
    idle: 'bg-zinc-700 shadow-inner'
  }
  
  return (
    <div className={`w-2 h-2 rounded-full ${colors[status]} ${pulse ? 'animate-pulse' : ''}`} />
  )
}

/**
 * Heavy-duty mechanical checkbox replacing the standard web input.
 */
function MechanicalCheckbox({ 
  checked, 
  partial = false, 
  onChange, 
  disabled = false 
}: { 
  checked: boolean; 
  partial?: boolean; 
  onChange: () => void; 
  disabled?: boolean 
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={`relative w-6 h-6 rounded flex items-center justify-center transition-all duration-200 border-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] ${
        disabled ? 'opacity-50 cursor-not-allowed border-zinc-800 bg-zinc-950' :
        checked ? 'border-orange-500 bg-orange-500/20' : 
        partial ? 'border-orange-500/50 bg-orange-500/10' : 
        'border-zinc-700 bg-zinc-950 hover:border-zinc-500'
      }`}
    >
      {checked && <CheckSquare className="w-4 h-4 text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]" />}
      {!checked && partial && <Square className="w-3 h-3 text-orange-500/50 fill-orange-500/50" />}
    </button>
  )
}

/**
 * Recessed CRT-style viewport for rendering item imagery or fallbacks.
 */
function OpticalViewport({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  
  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
    
    const loadImage = async () => {
      if (!itemId) {
        setImageUrl(null)
        return
      }
      
      const numericItemId = typeof itemId === 'number' ? itemId : parseInt(itemId, 10)
      if (isNaN(numericItemId)) {
        setImageUrl(null)
        return
      }
      
      try {
        const result = await apiBridge.getLatestItemImageBlob(numericItemId)
        if (result.success && result.url) {
          setImageUrl(result.url)
        } else {
          setImageError(true)
        }
      } catch (error) {
        console.error('[OpticalViewport] Failed to load image:', error)
        setImageError(true)
      }
    }
    
    loadImage()
  }, [itemId])

  return (
    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black rounded-md flex items-center justify-center overflow-hidden border border-zinc-800 shadow-[inset_0_4px_10px_rgba(0,0,0,0.8)] relative shrink-0">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none z-10" />
      
      {!imageError && imageUrl && (
        <img 
          src={imageUrl} 
          alt={itemName}
          className={`w-full h-full object-cover mix-blend-screen transition-opacity duration-300 ${imageLoaded ? 'opacity-80 hover:opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      
      {(!imageUrl || !imageLoaded || imageError) && (
        <div className="flex flex-col items-center justify-center opacity-40">
          <span className="text-xl font-black tracking-widest text-zinc-500">JJC</span>
          <span className="text-[8px] font-mono font-bold tracking-widest uppercase text-zinc-600 mt-1">NO VISUAL</span>
        </div>
      )}
    </div>
  )
}

/**
 * Industrial empty state for when the manifest contains no data.
 */
function EmptyManifestTerminal() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="relative w-48 h-48 mb-8">
        <div className="absolute inset-0 border-4 border-dashed border-zinc-800 rounded-full animate-[spin_60s_linear_infinite]" />
        <div className="absolute inset-4 border-2 border-zinc-800 rounded-full flex items-center justify-center bg-zinc-950 shadow-inner">
          <Database className="w-16 h-16 text-zinc-800" />
        </div>
      </div>
      <h2 className="text-2xl font-black text-zinc-600 tracking-[0.2em] uppercase mb-2 text-center">
        Manifest Buffer Empty
      </h2>
      <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase text-center max-w-md">
        Awaiting input from dashboard terminal or optical scanner. Inject items into the buffer to proceed.
      </p>
    </div>
  )
}

/**
 * Segmented progress bar mimicking hardware LED levels.
 */
function HardwareStockGauge({ current, max }: { current: number; max: number }) {
  const maxSegments = 8
  const safeMax = max <= 0 ? 1 : max
  const fillPct = Math.min(100, Math.max(0, (current / safeMax) * 100))
  const activeSegments = Math.ceil((fillPct / 100) * maxSegments)
  
  const isDepleted = current <= 0
  const isLow = current > 0 && current <= 5
  
  const activeColor = isDepleted ? 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)]' : 
                      isLow ? 'bg-amber-500 shadow-[0_0_5px_rgba(251,191,36,0.8)]' : 
                      'bg-emerald-500 shadow-[0_0_5px_rgba(52,211,153,0.8)]'

  return (
    <div className="flex items-center gap-[2px] w-full max-w-[100px] bg-black/60 p-1 rounded border border-zinc-800 shadow-inner">
      {Array.from({ length: maxSegments }).map((_, i) => (
        <div 
          key={i} 
          className={`h-1.5 flex-1 rounded-[1px] ${
            i < activeSegments ? activeColor : 'bg-zinc-800'
          }`}
        />
      ))}
    </div>
  )
}

// ─── MAIN CART VIEW COMPONENT ─────────────────────────────────────────────────

export function CartView({ items, onUpdateQuantity, onRemoveItem, onReturnToBrowsing, onRefreshData }: CartViewProps) {
  
  // ─── STATE MANAGEMENT ───
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [checkoutItems, setCheckoutItems] = useState<CartItemWithTimestamp[]>([])
  const [checkedOutItemIds, setCheckedOutItemIds] = useState<string[]>([])
  const [quickBrandSelection, setQuickBrandSelection] = useState<string>("__all__")
  const [sortBy, setSortBy] = useState("recent")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [showSuccessCountdown, setShowSuccessCountdown] = useState(false)
  const [checkoutData, setCheckoutData] = useState<{ userId: string; totalItems: number } | null>(null)
  const [collapsedBrands, setCollapsedBrands] = useState<Set<string>>(new Set())
  
  const { toast } = useToast()
  const { queueOfflineAction, isOffline } = useOfflineManager()

  // ─── DATA PROCESSING ───
  const sortedItems = useMemo(() => {
    const itemsCopy = [...items]
    switch (sortBy) {
      case "recent":
        return itemsCopy.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
      case "name-asc":
        return itemsCopy.sort((a, b) => a.name.localeCompare(b.name))
      case "name-desc":
        return itemsCopy.sort((a, b) => b.name.localeCompare(a.name))
      case "qty-high":
        return itemsCopy.sort((a, b) => b.quantity - a.quantity)
      case "qty-low":
        return itemsCopy.sort((a, b) => a.quantity - b.quantity)
      default:
        return itemsCopy
    }
  }, [items, sortBy])

  const groupedByBrand = useMemo(() => {
    const groups: Record<string, CartItemWithTimestamp[]> = {}
    sortedItems.forEach(item => {
      const brand = item.brand || 'UNSPECIFIED ORIGIN'
      if (!groups[brand]) groups[brand] = []
      groups[brand].push(item)
    })
    const sortedBrands = Object.keys(groups).sort((a, b) => a.localeCompare(b))
    return sortedBrands.map(brand => ({ brand, items: groups[brand] }))
  }, [sortedItems])

  // ─── HANDLERS ───
  const toggleBrandCollapse = (brand: string) => {
    setCollapsedBrands(prev => {
      const newSet = new Set(prev)
      if (newSet.has(brand)) newSet.delete(brand)
      else newSet.add(brand)
      return newSet
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedItems(new Set(items.map((item) => item.id)))
    else setSelectedItems(new Set())
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) newSelected.add(id)
    else newSelected.delete(id)
    setSelectedItems(newSelected)
  }

  const handleBulkDelete = () => {
    selectedItems.forEach((id) => onRemoveItem(id))
    setSelectedItems(new Set())
  }

  const applyBrandSelection = (brandValue: string) => {
    if (!brandValue || brandValue === "__all__") return
    const normalizedBrand = String(brandValue).trim().toLowerCase()
    const matchingIds = items
      .filter((item) => String(item.brand || 'UNSPECIFIED ORIGIN').trim().toLowerCase() === normalizedBrand)
      .map((item) => item.id)
    setSelectedItems(new Set(matchingIds))
  }

  const handleSelectByBrand = () => applyBrandSelection(quickBrandSelection)
  
  const handleQuickBrandChange = (value: string) => {
    setQuickBrandSelection(value)
    applyBrandSelection(value)
  }

  const handleInvertSelection = () => {
    setSelectedItems((prev) => {
      const next = new Set<string>()
      items.forEach((item) => {
        if (!prev.has(item.id)) next.add(item.id)
      })
      return next
    })
  }

  const handleClearSelection = () => setSelectedItems(new Set())

  // ─── DERIVED STATE ───
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const selectedCartItems = useMemo(() => items.filter((item) => selectedItems.has(item.id)), [items, selectedItems])
  const selectedTotalItems = useMemo(() => selectedCartItems.reduce((sum, item) => sum + item.quantity, 0), [selectedCartItems])
  const allSelected = items.length > 0 && selectedItems.size === items.length

  // ─── CHECKOUT LOGIC (Retained exactly from original) ───
  const handleCheckout = () => {
    if (items.length === 0) {
      toast({
        title: "BUFFER EMPTY",
        description: "Cannot execute on empty manifest.",
        variant: "destructive",
        toastType: 'warning',
        duration: 3000
      } as any)
      return
    }

    if (selectedCartItems.length === 0) {
      toast({
        title: "TARGETS REQUIRED",
        description: "Select at least one unit for extraction.",
        variant: "destructive",
        toastType: 'warning',
        duration: 3000
      } as any)
      return
    }

    setCheckoutItems(selectedCartItems)
    setIsCheckoutOpen(true)
  }

  const handleConfirmCheckout = async (employee: Employee, purpose?: string, meta?: { inventorySaved?: boolean }) => {
    setIsCommitting(true)

    try {
      const itemsToCheckout = checkoutItems.length > 0 ? checkoutItems : selectedCartItems
      const checkoutTotalItems = itemsToCheckout.reduce((sum, item) => sum + item.quantity, 0)

      const apiConfig = apiBridge.getConfig()
      const enhancedItems = itemsToCheckout.map(item => ({
        id: item.id,
        name: item.name,
        brand: item.brand || 'N/A',
        itemType: item.itemType || 'N/A',
        location: item.location || 'N/A',
        quantity: item.quantity,
        originalBalance: item.balance,
        newBalance: Math.max(0, item.balance - item.quantity)
      }))

      let detailsText = `Checkout: ${checkoutTotalItems} items - `

      if (enhancedItems.length <= 2) {
        detailsText += enhancedItems.map(item => `${item.name} x${item.quantity} (${item.brand})`).join(', ')
      } else if (enhancedItems.length <= 4) {
        detailsText += enhancedItems.map(item => `${item.name} x${item.quantity}`).join(', ')
      } else {
        const itemSummary = enhancedItems.reduce((acc, item) => {
          acc[item.name] = (acc[item.name] || 0) + item.quantity
          return acc
        }, {} as Record<string, number>)

        detailsText += Object.entries(itemSummary)
          .map(([item, qty]) => `${item} x${qty}`)
          .join(', ')
      }

      if (detailsText.length > 255) {
        detailsText = detailsText.substring(0, 252) + '...'
      }

      let itemNumbers = itemsToCheckout.map(item => item.id).join(';')
      if (itemNumbers.length > 255) {
        const maxLength = 252
        const itemIds = itemsToCheckout.map(item => item.id)
        const truncatedIds: string[] = []
        let currentLength = 0

        for (const id of itemIds) {
          const separatorLength = truncatedIds.length > 0 ? 1 : 0
          if (currentLength + id.length + separatorLength <= maxLength) {
            truncatedIds.push(id)
            currentLength += id.length + separatorLength
          } else {
            break
          }
        }

        itemNumbers = truncatedIds.join(';') + (truncatedIds.length < itemIds.length ? '...' : '')
      }

      const structuredItems = enhancedItems.map(item => ({
        item_no: item.id,
        item_name: item.name,
        brand: item.brand,
        item_type: item.itemType,
        location: item.location,
        quantity: item.quantity,
        unit_of_measure: 'pcs',
        balance_before: item.originalBalance,
        balance_after: item.newBalance
      }))

      const transactionData: any = {
        username: employee.fullName,
        details: detailsText,
        id_number: employee.idNumber,
        id_barcode: employee.idBarcode,
        item_no: itemNumbers,
        items_json: JSON.stringify(structuredItems)
      }

      if (purpose && purpose.trim()) {
        transactionData.purpose = purpose.trim()
      }

      const inventoryCheckouts = itemsToCheckout.map(item => ({
        employee_uid: employee.id,
        employee_barcode: employee.idBarcode,
        employee_name: employee.fullName,
        material_name: item.name,
        quantity_checked_out: item.quantity,
        unit_of_measure: 'pcs',
        item_no: item.id,
        item_description: `${item.brand} - ${item.itemType}`,
        purpose: purpose || 'Inventory checkout',
        project_name: null
      }))

      const browserOffline = typeof navigator !== 'undefined' ? !navigator.onLine : isOffline
      const shouldQueueCheckout = browserOffline || !apiConfig.isConnected

      if (shouldQueueCheckout) {
        queueOfflineAction('checkout', {
          inventoryCheckouts,
          checkoutBy: null,
          transactionData,
          summary: {
            employeeName: employee.fullName,
            totalItems: checkoutTotalItems
          },
          inventorySynced: Boolean(meta?.inventorySaved),
          transactionSynced: false
        })

        toast({
          title: "OFFLINE INJECTION QUEUED 📦",
          description: `${checkoutTotalItems} units buffered for sync.`,
          toastType: 'info',
          duration: 4500
        } as any)
      } else {
        try {
          await apiBridge.logTransaction(transactionData)

          toast({
            title: "EXECUTION SUCCESSFUL ✅",
            description: `${checkoutTotalItems} units extracted. Ledger updated.`,
            toastType: 'success',
            duration: 4000
          } as any)
        } catch (transactionError) {
          queueOfflineAction('checkout', {
            inventoryCheckouts,
            checkoutBy: null,
            transactionData,
            summary: {
              employeeName: employee.fullName,
              totalItems: checkoutTotalItems
            },
            inventorySynced: Boolean(meta?.inventorySaved),
            transactionSynced: false
          })

          toast({
            title: "SYNC DELAYED ⚠️",
            description: `API unreachable. ${checkoutTotalItems} units queued locally.`,
            toastType: 'warning',
            duration: 4000
          } as any)
        }

        if (onRefreshData) {
          onRefreshData()
        }
      }

      setIsCheckoutOpen(false)
      setCheckedOutItemIds(itemsToCheckout.map((item) => item.id))
      setCheckoutData({ userId: employee.id.toString(), totalItems: checkoutTotalItems })
      setShowSuccessCountdown(true)
    } catch (error) {
      toast({
        title: "SYSTEM FAULT",
        description: "Execution failed. Retain current state and retry.",
        variant: "destructive",
        toastType: 'error',
        duration: 5000
      } as any)
    } finally {
      setIsCommitting(false)
    }
  }

  const finalizeCheckoutSuccess = (shouldReturnToBrowsing: boolean) => {
    setShowSuccessCountdown(false)
    setCheckoutData(null)
    setCheckoutItems([])

    // Remove only checked-out (selected) items
    checkedOutItemIds.forEach((id) => onRemoveItem(id))
    setSelectedItems(prev => {
      const next = new Set(prev)
      checkedOutItemIds.forEach((id) => next.delete(id))
      return next
    })
    setCheckedOutItemIds([])

    // Clear the scanned barcode queue
    window.dispatchEvent(new CustomEvent('clear-barcode-queue'))

    // Return to browsing/dashboard view
    if (shouldReturnToBrowsing && onReturnToBrowsing) {
      onReturnToBrowsing()
    }
  }

  const handleCountdownContinueBrowsing = () => finalizeCheckoutSuccess(true)
  const handleCountdownStayInCart = () => finalizeCheckoutSuccess(false)

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col bg-zinc-950 text-zinc-200">
      
      {/* ─── TERMINAL HEADER ─── */}
      <div className="shrink-0 border-b-2 border-zinc-800 bg-zinc-900 sticky top-0 z-20 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        
        {/* Top Warning Strip */}
        <div className="h-1.5 w-full bg-[repeating-linear-gradient(45deg,#f59e0b_0,#f59e0b_10px,#000_10px,#000_20px)] opacity-50" />
        
        <div className="p-4 lg:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-black/50 border border-zinc-700 flex items-center justify-center shadow-inner relative overflow-hidden">
                <Terminal className="w-6 h-6 text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]" />
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-500" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-500" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-2">
                  Manifest Buffer
                  <LEDIndicator status={items.length > 0 ? 'active' : 'idle'} pulse={items.length > 0} />
                </h1>
                <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  <span>{items.length} UNIQUE</span>
                  <span className="text-zinc-700">|</span>
                  <span>{totalItems} TOTAL VOL</span>
                </div>
              </div>
              <div className="hidden sm:block ml-4 border-l border-zinc-800 pl-4">
                <CartStatusIndicator />
              </div>
            </div>

            {/* Diagnostic Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <CartRecoveryPanel 
                trigger={
                  <Button variant="outline" size="sm" className="h-10 bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-900 font-black tracking-widest uppercase text-[10px] shadow-inner">
                    <History className="w-4 h-4 mr-2" />
                    Diagnostics
                  </Button>
                }
              />
              
              <div className="bg-zinc-950 border border-zinc-800 rounded-md p-1 flex items-center shadow-inner">
                <Cpu className="w-3.5 h-3.5 text-zinc-600 ml-2" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] h-8 text-[10px] font-mono font-bold tracking-widest uppercase border-0 focus:ring-0 bg-transparent text-zinc-300">
                    <SelectValue placeholder="SORT ALGORITHM" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-300">
                    <SelectItem value="recent" className="font-mono text-xs focus:bg-zinc-800">CHRONOLOGICAL</SelectItem>
                    <SelectItem value="name-asc" className="font-mono text-xs focus:bg-zinc-800">ALPHA (ASC)</SelectItem>
                    <SelectItem value="name-desc" className="font-mono text-xs focus:bg-zinc-800">ALPHA (DESC)</SelectItem>
                    <SelectItem value="qty-high" className="font-mono text-xs focus:bg-zinc-800">VOLUME (HIGH)</SelectItem>
                    <SelectItem value="qty-low" className="font-mono text-xs focus:bg-zinc-800">VOLUME (LOW)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ─── MANIFEST PAYLOAD AREA ─── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 custom-scrollbar bg-black/40 shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)]">
        {items.length === 0 ? (
          <EmptyManifestTerminal />
        ) : (
          <div className="space-y-6 max-w-[1600px] mx-auto pb-32">
            
            {groupedByBrand.map(({ brand, items: brandItems }) => {
              const isCollapsed = collapsedBrands.has(brand)
              const brandItemCount = brandItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
              const allBrandItemsSelected = brandItems?.every(item => selectedItems.has(item.id)) ?? false
              const someBrandItemsSelected = brandItems?.some(item => selectedItems.has(item.id)) ?? false
              
              return (
                <div key={brand} className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-[0_10px_20px_rgba(0,0,0,0.4)] overflow-hidden relative">
                  
                  {/* Brand Divider Plate */}
                  <div 
                    className="w-full flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-zinc-950 to-zinc-900 border-b border-zinc-800 cursor-pointer group"
                    onClick={() => toggleBrandCollapse(brand)}
                  >
                    <div className="flex items-center gap-4">
                      
                      <div className="flex items-center gap-2">
                        <HardwareScrew />
                        <MechanicalCheckbox 
                          checked={allBrandItemsSelected} 
                          partial={!allBrandItemsSelected && someBrandItemsSelected}
                          onChange={() => {
                            const isAll = brandItems?.every(item => selectedItems.has(item.id)) ?? false
                            if (isAll) {
                              setSelectedItems(prev => {
                                const newSet = new Set(prev)
                                brandItems?.forEach(item => newSet.delete(item.id))
                                return newSet
                              })
                            } else {
                              setSelectedItems(prev => {
                                const newSet = new Set(prev)
                                brandItems?.forEach(item => newSet.add(item.id))
                                return newSet
                              })
                            }
                          }}
                        />
                      </div>

                      <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

                      <div className="flex items-center gap-3">
                        <div className="p-1 rounded bg-black/50 shadow-inner group-hover:bg-black transition-colors">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-orange-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                        <span className="font-black text-sm tracking-widest uppercase text-zinc-200">{brand}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex flex-col text-right">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Total Vol</span>
                        <span className="text-xs font-black font-mono text-zinc-300">{brandItemCount} UNITS</span>
                      </div>
                      <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono text-[10px] tracking-widest rounded-sm">
                        {brandItems?.length ?? 0} BLOCKS
                      </Badge>
                      <HardwareScrew className="hidden sm:flex" />
                    </div>
                  </div>

                  {/* Manifest Item Modules */}
                  {!isCollapsed && (
                    <div className="divide-y divide-zinc-800/50 bg-zinc-900/50">
                      {brandItems?.map((item) => (
                        <div key={item.id} className="p-3 sm:p-4 hover:bg-zinc-800/50 transition-colors group">
                          
                          {/* Item Layout (Responsive) */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            
                            <div className="flex items-center gap-4 shrink-0">
                              <MechanicalCheckbox 
                                checked={selectedItems.has(item.id)} 
                                onChange={() => handleSelectItem(item.id, !selectedItems.has(item.id))} 
                              />
                              <OpticalViewport itemId={item.id} itemName={item.name} />
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <h3 className="font-black text-sm text-zinc-200 uppercase tracking-wide truncate group-hover:text-orange-400 transition-colors">
                                {item.name}
                              </h3>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                <span className="flex items-center gap-1"><Hash className="w-3 h-3 text-zinc-600"/>{item.id}</span>
                                <span className="text-zinc-700">|</span>
                                <span className="flex items-center gap-1"><Package className="w-3 h-3 text-zinc-600"/>{item.itemType}</span>
                                {item.location && (
                                  <>
                                    <span className="text-zinc-700">|</span>
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-zinc-600"/>{item.location}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Data Plate & Controls */}
                            <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 mt-3 sm:mt-0 bg-black/20 sm:bg-transparent p-2 sm:p-0 rounded border border-zinc-800 sm:border-0">
                              
                              {/* Stock Level Diagnostic */}
                              <div className="flex flex-col items-start sm:items-end gap-1 w-24">
                                 <span className="text-[9px] font-bold font-mono tracking-widest text-zinc-500 uppercase">
                                   {item.balance} IN VAULT
                                 </span>
                                 <HardwareStockGauge current={item.balance} max={item.balance + item.quantity} />
                              </div>

                              {/* Mechanical Quantity Rocker */}
                              <div className="flex items-center gap-1 bg-zinc-950 rounded border border-zinc-700 p-1 shadow-inner h-10">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-full w-8 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 disabled:opacity-30"
                                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>

                                <input
                                  aria-label={`Quantity for ${item.name}`}
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const parsed = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10)
                                    const clamped = Math.max(1, Math.min(isNaN(parsed) ? 1 : parsed, item.balance))
                                    if (clamped !== item.quantity) onUpdateQuantity(item.id, clamped)
                                  }}
                                  className="w-12 h-full text-center text-sm font-black font-mono bg-transparent border-0 text-zinc-200 focus:ring-1 focus:ring-orange-500 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-full w-8 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 disabled:opacity-30"
                                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.balance}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>

                              {/* Emergency Eject */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 shrink-0 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-900/50 rounded transition-all"
                                onClick={() => onRemoveItem(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── EXECUTION CONSOLE (Footer) ─── */}
      {items.length > 0 && (
        <div className="shrink-0 border-t-2 border-zinc-800 bg-zinc-950 p-4 lg:p-6 sticky bottom-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
          <div className="max-w-[1600px] mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            
            {/* Left/Top: Selection Controls */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
              
              <div className="flex items-center gap-3 px-2">
                <MechanicalCheckbox 
                  checked={allSelected} 
                  partial={!allSelected && selectedItems.size > 0}
                  onChange={() => handleSelectAll(!allSelected)} 
                />
                <span className="text-[10px] font-black font-mono tracking-widest text-zinc-400 uppercase">
                  Select All ({selectedItems.size}/{items.length})
                </span>
              </div>

              <div className="h-6 w-px bg-zinc-800 hidden md:block" />

              <div className="flex flex-wrap items-center gap-2">
                {selectedItems.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 font-black tracking-widest uppercase text-[10px] h-9"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Purge Selected
                  </Button>
                )}

                <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-1 shadow-inner h-9 w-full sm:w-auto">
                  <Select value={quickBrandSelection} onValueChange={handleQuickBrandChange}>
                    <SelectTrigger className="w-full sm:w-[160px] h-full text-[10px] font-mono font-bold uppercase tracking-widest border-0 bg-transparent text-zinc-300 focus:ring-0">
                      <SelectValue placeholder="TARGET ORIGIN" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-300">
                      <SelectItem value="__all__" className="font-mono text-xs">ANY ORIGIN</SelectItem>
                      {groupedByBrand.map(({ brand }) => (
                        <SelectItem key={brand} value={brand} className="font-mono text-xs">{brand.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectByBrand}
                  disabled={quickBrandSelection === "__all__" || items.length === 0}
                  className="h-9 bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-white font-black tracking-widest uppercase text-[10px]"
                >
                  Target Origin
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInvertSelection}
                  disabled={items.length === 0}
                  className="h-9 bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-white font-black tracking-widest uppercase text-[10px]"
                >
                  Invert
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                  disabled={selectedItems.size === 0}
                  className="h-9 bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-white font-black tracking-widest uppercase text-[10px]"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Right/Bottom: Totals & Execution */}
            <div className="flex items-center justify-between xl:justify-end gap-6 w-full xl:w-auto bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 shadow-inner">
              
              {/* Telemetry Readout */}
              <div className="flex items-center gap-6 px-2">
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Global Vol</span>
                  <span className="text-lg font-black font-mono text-zinc-400">{totalItems}</span>
                </div>
                <div className="h-8 w-px bg-zinc-700" />
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-mono text-orange-500 uppercase tracking-widest">Selected Target</span>
                  <span className="text-xl font-black font-mono text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]">{selectedTotalItems}</span>
                </div>
              </div>

              {/* Master Execution Switch */}
              <Button
                size="lg"
                className={`px-8 h-14 font-black tracking-widest uppercase text-sm transition-all duration-300 border-0 ${
                  isCommitting || selectedCartItems.length === 0 
                    ? 'bg-zinc-800 text-zinc-600 shadow-inner cursor-not-allowed' 
                    : 'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_5px_20px_rgba(234,88,12,0.4)] hover:shadow-[0_8px_25px_rgba(234,88,12,0.6)] hover:-translate-y-0.5 active:translate-y-1'
                }`}
                onClick={handleCheckout}
                disabled={isCommitting || selectedCartItems.length === 0}
              >
                {isCommitting ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
                    <span>Processing Injection...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 drop-shadow-md" />
                    <span>Execute Injection ({selectedCartItems.length})</span>
                  </div>
                )}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODALS ─── */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false)
          setCheckoutItems([])
        }}
        items={checkoutItems}
        onConfirmCheckout={handleConfirmCheckout}
        isCommitting={isCommitting}
      />

      <CheckoutSuccessCountdown
        isOpen={showSuccessCountdown}
        onContinueBrowsing={handleCountdownContinueBrowsing}
        onStayInCart={handleCountdownStayInCart}
        userId={checkoutData?.userId || ""}
        totalItems={checkoutData?.totalItems || 0}
        countdownSeconds={5}
      />

      {/* ─── GLOBAL HARDWARE STYLES ─── */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.5);
          border-left: 1px solid rgba(39, 39, 42, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 0;
          border: 1px solid #18181b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #f97316;
        }
      `}</style>
    </div>
  )
}