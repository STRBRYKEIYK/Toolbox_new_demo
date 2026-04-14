import type React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import { validateSearchQuery } from "../lib/validation"
import {
  processBarcodeInput,
  type Product
} from "../lib/barcode-scanner"
import {
  Filter, Grid, List, ChevronDown, RefreshCw, Settings,
  Download, FileText, FileSpreadsheet, Code, Package,
  Menu, X, Scan, Plus, Search, Zap, AlertCircle,
  CheckCircle2, Clock, TrendingDown, LayoutGrid, AlignJustify,
  SlidersHorizontal, ChevronRight, Wifi, WifiOff, Database,
  ArrowUpDown, Eye, EyeOff, ShoppingCart
} from "lucide-react"
import { useLoading } from "./loading-context"
import { SearchLoader } from "./enhanced-loaders"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Checkbox } from "./ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { useToast } from "../hooks/use-toast"
import { apiBridge } from "../lib/api-bridge"
import {
  computeCategories,
  computeDashboardStats,
  computeItemsTitle,
  filterSortAndPaginateProducts,
  type DashboardSortKey,
} from "../lib/dashboard-view-model"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { exportToCSV, exportToXLSX, exportToJSON, prepareExportData } from "../lib/export-utils"
import { EnhancedItemCard } from "./enhanced-item-card"
import { BulkOperationsBar, useBulkSelection } from "./bulk-operations"
import useGlobalBarcodeScanner from "../hooks/use-global-barcode-scanner"
import BarcodeModal, { type BulkLineItem } from "./barcode-modal"
import { useInventorySync } from "../hooks/useInventorySync"
import { useToolboxAppState } from "../hooks/use-toolbox-app-state"
import { IndustrialTooltip } from "./ui/tooltip"

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardViewProps {
  onAddToCart: (product: Product, quantity?: number, isFromBarcode?: boolean) => void
  onViewItem: (product: Product) => void
  searchQuery?: string
  onRefreshData?: (refreshFunction: () => void) => void
  apiUrl?: string
  onApiUrlChange?: (url: string) => void
  isConnected?: boolean
  products?: Product[]
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>
  isLoadingProducts?: boolean
  setIsLoadingProducts?: React.Dispatch<React.SetStateAction<boolean>>
  dataSource?: "api" | "cached"
  setDataSource?: React.Dispatch<React.SetStateAction<"api" | "cached">>
  lastFetchTime?: Date | null
  setLastFetchTime?: React.Dispatch<React.SetStateAction<Date | null>>
}

type SortKey = DashboardSortKey
type ViewMode = "grid" | "list"

const ITEMS_PER_PAGE = 50

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Pill chip for active filter summary */
function FilterChip({
  label,
  onRemove,
  variant = "filter",
}: {
  label: string
  onRemove: () => void
  variant?: "filter" | "excluded"
}) {
  const styles =
    variant === "excluded"
      ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-800"

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${styles}`}
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 transition-colors"
        aria-label={`Remove ${label}`}
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  )
}

/** Status dot with label */
function StatusIndicator({
  active,
  label,
  value,
}: {
  active: boolean
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            active ? "bg-orange-500 shadow-[0_0_4px_#f97316]" : "bg-zinc-400"
          }`}
        />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className={active ? "text-orange-600 dark:text-orange-400 font-medium" : "text-zinc-500"}>
        {value}
      </span>
    </div>
  )
}

/** Compact section header for sidebar */
function SidebarSection({
  title,
  children,
  collapsible = false,
  collapsed = false,
  onToggle,
  badge,
}: {
  title: string
  children: React.ReactNode
  collapsible?: boolean
  collapsed?: boolean
  onToggle?: () => void
  badge?: React.ReactNode
}) {
  const header = (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {title}
        </span>
        {badge}
      </div>
      {collapsible && (
        <ChevronDown
          className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${
            collapsed ? "-rotate-90" : ""
          }`}
        />
      )}
    </div>
  )

  return (
    <div className="space-y-1">
      {collapsible ? (
        <button
          onClick={onToggle}
          className="w-full text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 rounded"
        >
          {header}
        </button>
      ) : (
        header
      )}
      {(!collapsible || !collapsed) && children}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardView({
  onAddToCart,
  onViewItem,
  searchQuery = "",
  onRefreshData,
  apiUrl = "",
  onApiUrlChange,
  isConnected = false,
  products: parentProducts,
  setProducts: parentSetProducts,
  isLoadingProducts: parentIsLoadingData,
  setIsLoadingProducts: parentSetIsLoadingData,
  dataSource: parentDataSource,
  setDataSource: parentSetDataSource,
  lastFetchTime: parentLastFetchTime,
  setLastFetchTime: parentSetLastFetchTime,
}: DashboardViewProps) {
  // ── State: prefer parent-provided state, fall back to local ──────────────
  const [localProducts, setLocalProducts] = useState<Product[]>([])
  const [localIsLoadingData, setLocalIsLoadingData] = useState(true)
  const [localDataSource, setLocalDataSource] = useState<"api" | "cached">("cached")
  const [localLastFetchTime, setLocalLastFetchTime] = useState<Date | null>(null)

  const products = parentProducts ?? localProducts
  const setProducts = parentSetProducts ?? setLocalProducts
  const isLoadingData = parentIsLoadingData ?? localIsLoadingData
  const setIsLoadingData = parentSetIsLoadingData ?? setLocalIsLoadingData
  const dataSource = parentDataSource ?? localDataSource
  const setDataSource = parentSetDataSource ?? setLocalDataSource
  const lastFetchTime = parentLastFetchTime ?? localLastFetchTime
  const setLastFetchTime = parentSetLastFetchTime ?? setLocalLastFetchTime

  // ── UI State ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set())
  const [showAvailable, setShowAvailable] = useState(true)
  const [showUnavailable, setShowUnavailable] = useState(true)
  const [localSearchQuery, setLocalSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey>("name-asc")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl)
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true)
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false)
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null)
  const [detectedProduct, setDetectedProduct] = useState<Product | null>(null)
  const [appendQueueItem, setAppendQueueItem] = useState<BulkLineItem | null>(null)
  const [hasInitializedDataLoad, setHasInitializedDataLoad] = useState(false)
  const [useEnhancedCards] = useState(true)

  const { toast } = useToast()
  const { setSearchLoading } = useLoading()
  const { selectedItems, selectAll, clearSelection } = useBulkSelection()
  const { navigateTo, checkoutModalOpen, barcodeQueueResetToken } = useToolboxAppState()
  const isScannerActive = !checkoutModalOpen

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isLocalStorageAvailable = () => {
    if (typeof window === "undefined") return false
    try {
      const k = "__test__"
      localStorage.setItem(k, k)
      localStorage.removeItem(k)
      return true
    } catch {
      return false
    }
  }

  const saveProductsToLocalStorage = (products: Product[]) => {
    if (!isLocalStorageAvailable()) return
    try {
      localStorage.setItem("cached-products", JSON.stringify(products))
      localStorage.setItem("cached-products-timestamp", new Date().toISOString())
    } catch {}
  }

  const loadProductsFromLocalStorage = (): { products: Product[] | null; timestamp: Date | null } => {
    if (!isLocalStorageAvailable()) return { products: null, timestamp: null }
    try {
      const json = localStorage.getItem("cached-products")
      const ts = localStorage.getItem("cached-products-timestamp")
      if (!json) return { products: null, timestamp: null }
      return {
        products: JSON.parse(json) as Product[],
        timestamp: ts ? new Date(ts) : null,
      }
    } catch {
      return { products: null, timestamp: null }
    }
  }

  const isAvailable = (p: Product | null | undefined, qty = 1) => {
    if (!p) return false
    if ((p.status || "").toLowerCase().includes("out")) return false
    if (typeof p.balance === "number") {
      if (p.balance <= 0) return false
      if (qty && p.balance < qty) return false
    }
    return true
  }

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const fetchProductsFromAPI = async (showSuccessToast = true) => {
    try {
      setIsLoadingData(true)
      const apiItems = await apiBridge.fetchItems()
      if (!Array.isArray(apiItems)) throw new Error("API did not return an array of items")

      const transformedProducts: Product[] = apiItems.map((item: any, index: number) => ({
        id: item.item_no?.toString() || item.id?.toString() || (index + 1).toString(),
        name: item.item_name || item.name || item.title || `Item ${index + 1}`,
        brand: item.brand || item.manufacturer || "Unknown Brand",
        itemType: item.item_type || item.itemType || item.category || item.type || "General",
        location: item.location || item.warehouse || "Unknown Location",
        balance: item.balance ?? 0,
        status: (() => {
          const s = (item.item_status || "").toLowerCase()
          if (s.includes("out of stock")) return "out-of-stock"
          if (s.includes("low")) return "low-stock"
          return "in-stock"
        })(),
      }))

      const hasNewData = JSON.stringify(transformedProducts) !== JSON.stringify(products)
      if (hasNewData) {
        setProducts(transformedProducts)
        setDataSource("api")
        setLastFetchTime(new Date())
        saveProductsToLocalStorage(transformedProducts)
        if (showSuccessToast) {
          toast({
            title: "Data Loaded",
            description: `Loaded ${transformedProducts.length} items from API`,
            toastType: "success",
            duration: 4000,
          } as any)
        }
      } else if (showSuccessToast) {
        toast({
          title: "Already Up to Date",
          description: `${transformedProducts.length} items are current`,
          toastType: "info",
          duration: 3000,
        } as any)
      }
    } catch {
      if (products.length === 0) {
        const { products: cached, timestamp } = loadProductsFromLocalStorage()
        if (cached?.length) {
          setProducts(cached)
          setDataSource("cached")
          setLastFetchTime(timestamp)
          const hrs = timestamp
            ? Math.round((Date.now() - timestamp.getTime()) / 3_600_000)
            : null
          toast({
            title: "Using Cached Data",
            description: `API unavailable — showing data from ${hrs != null ? `${hrs}h ago` : "a previous session"}`,
            variant: "default",
          })
        } else {
          setProducts([])
          setDataSource("cached")
          toast({
            title: "No Data Available",
            description: "API is unreachable and no cached data found.",
            variant: "destructive",
          })
        }
      }
    } finally {
      setIsLoadingData(false)
    }
  }

  // ── Inventory Sync ────────────────────────────────────────────────────────
  useInventorySync({
    onInventoryChange: () => fetchProductsFromAPI(false),
    onCheckout: () => fetchProductsFromAPI(false),
    onPOChange: () => fetchProductsFromAPI(false),
    enabled: true,
  })

  // ── Barcode ───────────────────────────────────────────────────────────────
  const processBarcodeSubmit = useCallback(
    (value: string) => {
      if (!value.trim()) return
      const result = processBarcodeInput(value, products)
      if (result.success && result.product) {
        if (!isAvailable(result.product, 1)) {
          toast({
            title: "Out of Stock",
            description: `${result.product.name} cannot be added`,
            variant: "destructive",
          })
          setBarcodeInput("")
          return
        }
        onAddToCart(result.product, 1, true)
        toast({ title: "Item Added", description: `${result.product.name} added to cart` })
        setBarcodeInput("")
      } else {
        toast({
          title: "Not Found",
          description: result.error || `Barcode ${value} not found`,
          variant: "destructive",
        })
      }
    },
    [products, onAddToCart, toast]
  )

  const handleModalAdd = useCallback(
    (product: Product, quantity: number) => {
      if (!product || !isAvailable(product, quantity)) {
        toast({
          title: "Cannot Add",
          description: `${product?.name} is unavailable`,
          variant: "destructive",
        })
        return
      }
      onAddToCart(product, quantity, true)
      toast({ title: "Item Added", description: `${product.name} ×${quantity} added` })
    },
    [onAddToCart, toast]
  )

  const onGlobalBarcodeDetected = useCallback(
    (barcode: string) => {
      const result = processBarcodeInput(barcode, products)
      setDetectedBarcode(barcode)
      setDetectedProduct(result.product ?? null)
      if (isBarcodeModalOpen) {
        if (result.success && result.product && isAvailable(result.product, 1)) {
          setAppendQueueItem({ product: result.product, quantity: 1 })
          toast({ title: "Item Queued", description: result.product.name })
        } else {
          toast({ title: "Not Found", description: `Barcode ${barcode} not found`, variant: "destructive" })
        }
        return
      }
      setIsBarcodeModalOpen(true)
    },
    [products, isBarcodeModalOpen, toast]
  )

  useGlobalBarcodeScanner(onGlobalBarcodeDetected, {
    minLength: 3,
    interKeyMs: 80,
    enabled: !checkoutModalOpen,
  })

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setIsSearching(false)
      setSearchLoading(false)
    }, 300)
    if (localSearchQuery.length > 0) {
      setIsSearching(true)
      setSearchLoading(true)
    }
    return () => clearTimeout(t)
  }, [localSearchQuery, setSearchLoading])

  useEffect(() => {
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener("online", online)
    window.addEventListener("offline", offline)
    return () => {
      window.removeEventListener("online", online)
      window.removeEventListener("offline", offline)
    }
  }, [])

  useEffect(() => {
    if (isConnected) setIsOnline(true)
  }, [isConnected])

  useEffect(() => {
    setTempApiUrl(apiUrl)
  }, [apiUrl])

  useEffect(() => {
    if (products.length > 0) return;
    const { products: cached, timestamp } = loadProductsFromLocalStorage();
    if (cached?.length) {
      setProducts(cached);
      setDataSource("cached");
      setLastFetchTime(timestamp);
      setIsLoadingData(false);
      setHasInitializedDataLoad(true);
      const age = timestamp ? (Date.now() - timestamp.getTime()) / 60_000 : Infinity;
      if (age > 5) fetchProductsFromAPI(false);
    } else {
      // Silent auto-retry logic
      const tryFetch = async (attempt = 1) => {
        try {
          await fetchProductsFromAPI(true);
        } catch (e) {
          if (attempt < 3) {
            setTimeout(() => tryFetch(attempt + 1), 1000 * attempt); // Exponential backoff
          }
        } finally {
          if (attempt === 1) {
            setHasInitializedDataLoad(true)
          }
        }
      };
      tryFetch();
    }
  }, [parentProducts, products.length]);

  useEffect(() => {
    if (products.length > 0) {
      setHasInitializedDataLoad(true)
    }
  }, [products.length])

  useEffect(() => {
    if (onRefreshData) onRefreshData(handleRefreshData)
  }, [onRefreshData])

  useEffect(() => {
    if (searchQuery) {
      const v = validateSearchQuery(searchQuery)
      setLocalSearchQuery(v.isValid ? v.value! : "")
    } else {
      setLocalSearchQuery("")
    }
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [excludedCategories, showAvailable, showUnavailable, searchQuery, localSearchQuery, sortBy])

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleRefreshData = useCallback(() => fetchProductsFromAPI(true), [])
  const handleSaveSettings = useCallback(() => {
    if (onApiUrlChange) onApiUrlChange(tempApiUrl)
    setIsSettingsOpen(false)
    setTimeout(() => fetchProductsFromAPI(true), 500)
  }, [tempApiUrl, onApiUrlChange])

  const handleBarcodeSubmit = useCallback(() => processBarcodeSubmit(barcodeInput), [barcodeInput, processBarcodeSubmit])
  const handleBarcodeKeyPress = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); handleBarcodeSubmit() } },
    [handleBarcodeSubmit]
  )

  // ── Derived data ──────────────────────────────────────────────────────────
  const categories = useMemo(() => computeCategories(products), [products])

  const { paginatedProducts, totalFilteredCount, hasMorePages } = useMemo(() => {
    return filterSortAndPaginateProducts({
      products,
      excludedCategories,
      showAvailable,
      showUnavailable,
      searchQuery,
      localSearchQuery,
      sortBy,
      currentPage,
      itemsPerPage: ITEMS_PER_PAGE,
    })
  }, [products, excludedCategories, showAvailable, showUnavailable, searchQuery, localSearchQuery, sortBy, currentPage])

  const itemsTitle = useMemo(() => computeItemsTitle(categories, excludedCategories), [categories, excludedCategories])

  // Excluded chips = categories the user hid (zinc/neutral tone, shown under "Excluded:")
  const excludedChips = useMemo(
    () =>
      [...excludedCategories].map((cat) => ({
        key: `excluded-${cat}`,
        label: cat,
        remove: () =>
          setExcludedCategories((prev) => {
            const n = new Set(prev)
            n.delete(cat)
            return n
          }),
      })),
    [excludedCategories]
  )

  // Availability filter chips = what the user is restricting by stock status (orange, shown under "Filter:")
  const availabilityFilterChips = useMemo(() => {
    const chips: { key: string; label: string; remove: () => void }[] = []
    if (!showAvailable)
      chips.push({ key: "filter-available", label: "In Stock", remove: () => setShowAvailable(true) })
    if (!showUnavailable)
      chips.push({ key: "filter-unavailable", label: "Out of Stock", remove: () => setShowUnavailable(true) })
    return chips
  }, [showAvailable, showUnavailable])

  const hasActiveChips = excludedChips.length > 0 || availabilityFilterChips.length > 0

  const handleLoadMore = () => {
    setIsLoadingMore(true)
    setTimeout(() => { setCurrentPage((p) => p + 1); setIsLoadingMore(false) }, 500)
  }

  // ── Export helpers ────────────────────────────────────────────────────────
  const runExport = async (format: "csv" | "xlsx" | "json") => {
    setIsExporting(true)
    try {
      const data = prepareExportData(products, apiUrl, isConnected, lastFetchTime?.toISOString() || null)
      const filename = `toolbox-inventory-${new Date().toISOString().split("T")[0]}`
      if (format === "csv") exportToCSV(data, { filename, includeMetadata: true })
      else if (format === "xlsx") exportToXLSX(data, { filename, includeMetadata: true })
      else exportToJSON(data, { filename, includeMetadata: true })
      toast({ title: "Export Successful", description: `Saved as ${filename}.${format}`, toastType: "success", duration: 4000 } as any)
    } catch {
      toast({ title: "Export Failed", description: "Try again.", variant: "destructive" } as any)
    } finally {
      setIsExporting(false)
    }
  }

  // ── Stat summary for sidebar ──────────────────────────────────────────────
  const stats = useMemo(() => computeDashboardStats(products), [products])

  // ── Sidebar content (shared mobile + desktop) ─────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col gap-5 p-4">
      {/* ── View & Sort ── */}
      <SidebarSection title="Display">
        <div className="space-y-2">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border bg-muted/40 p-0.5 gap-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "list"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-full h-8 text-xs bg-muted/40 border-border">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc" className="text-xs">Name A → Z</SelectItem>
              <SelectItem value="name-desc" className="text-xs">Name Z → A</SelectItem>
              <SelectItem value="stock-high" className="text-xs">Stock: High → Low</SelectItem>
              <SelectItem value="stock-low" className="text-xs">Stock: Low → High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SidebarSection>

      {/* ── Inventory Summary ── */}
      <SidebarSection title="Inventory">
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "Total", value: stats.total, color: "text-foreground", bg: "bg-muted/50" },
            { label: "In Stock", value: stats.inStock, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
            { label: "Low Stock", value: stats.lowStock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "Out of Stock", value: stats.outOfStock, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-lg px-2.5 py-2 ${bg}`}>
              <div className={`text-base font-bold ${color}`}>{value}</div>
              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </SidebarSection>

      {/* ── Availability filter ── */}
      <SidebarSection title="Availability">
        <div className="space-y-1.5">
          {[
            { id: "show-available", label: "In Stock", checked: showAvailable, onChange: setShowAvailable,
              dot: "bg-orange-500" },
            { id: "show-unavailable", label: "Out of Stock", checked: showUnavailable, onChange: setShowUnavailable,
              dot: "bg-red-500" },
          ].map(({ id, label, checked, onChange, dot }) => (
            <label
              key={id}
              htmlFor={id}
              className="flex items-center gap-2 cursor-pointer group py-0.5"
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(v) => onChange(v === true)}
                className="rounded"
              />
              <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <span className="text-xs text-foreground group-hover:text-foreground/80 transition-colors">{label}</span>
            </label>
          ))}
        </div>
      </SidebarSection>

      {/* ── Categories ── */}
      <SidebarSection
        title="Categories"
        collapsible
        collapsed={isCategoriesCollapsed}
        onToggle={() => setIsCategoriesCollapsed(!isCategoriesCollapsed)}
        badge={
          excludedCategories.size > 0 ? (
            <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
              {excludedCategories.size} excluded
            </span>
          ) : undefined
        }
      >
        <div className="space-y-1 mt-1">
          <div className="flex gap-1.5 mb-2">
            <button
              onClick={() => setExcludedCategories(new Set())}
              className="flex-1 text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors font-medium"
            >
              Show All
            </button>
            <button
              onClick={() => {
                setExcludedCategories(new Set(categories.filter((c) => c !== "all")))
              }}
              className="flex-1 text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors font-medium"
            >
              Hide All
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
            {categories
              .filter((c) => c !== "all")
              .map((cat) => {
                const excluded = excludedCategories.has(cat)
                const count = products.filter((p) => p.itemType === cat).length
                return (
                  <button
                    key={cat}
                    onClick={() =>
                      setExcludedCategories((prev) => {
                        const n = new Set(prev)
                        n.has(cat) ? n.delete(cat) : n.add(cat)
                        return n
                      })
                    }
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ${
                      excluded
                        ? "text-muted-foreground/50 line-through"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                        excluded
                          ? "border-muted-foreground/40 bg-transparent"
                          : "border-orange-500 bg-orange-500"
                      }`}
                    >
                      {!excluded && (
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="truncate flex-1 text-left">{cat}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
                  </button>
                )
              })}
          </div>
        </div>
      </SidebarSection>

      {/* ── System Status ── */}
      <SidebarSection title="System">
        <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-2">
          <StatusIndicator active={isConnected} label="API" value={isConnected ? "Connected" : "Offline"} />
          <StatusIndicator active={isOnline} label="Network" value={isOnline ? "Online" : "Offline"} />
          {dataSource === "cached" && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 pt-1 border-t border-border">
              <Database className="w-3 h-3 shrink-0" />
              <span>Cached mode</span>
            </div>
          )}
          {lastFetchTime && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-0.5">
              <Clock className="w-3 h-3 shrink-0" />
              <span>Updated {lastFetchTime.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </SidebarSection>
    </div>
  )

  // ── Empty state ───────────────────────────────────────────────────────────
  if (hasInitializedDataLoad && !isLoadingData && (!products || products.length === 0)) {
    return (
      <div className="flex min-h-[400px] bg-card rounded-xl border items-center justify-center">
        <div className="text-center space-y-4 max-w-sm p-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">No inventory data</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Check your API connection and try refreshing.
            </p>
          </div>
          <Button onClick={handleRefreshData} size="sm" className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Connection
          </Button>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-background">
      {/* ── Barcode Modal ── */}
      <BarcodeModal
        open={isBarcodeModalOpen}
        initialValue={detectedBarcode ?? ""}
        products={detectedProduct ? [detectedProduct] : []}
        appendItem={appendQueueItem}
        onAppendItemHandled={() => setAppendQueueItem(null)}
        queueResetToken={barcodeQueueResetToken}
        onClose={() => {
          setIsBarcodeModalOpen(false)
          setDetectedProduct(null)
          setDetectedBarcode("")
          setAppendQueueItem(null)
        }}
        onConfirm={(payload: any) => {
          if (payload?.items && Array.isArray(payload.items)) {
            const skipped: string[] = []
            let added = 0
            payload.items.forEach((li: any) => {
              if (!li?.product) return
              const qty = Number(li.quantity || 0)
              if (qty <= 0) return
              if (!isAvailable(li.product, qty)) { skipped.push(li.product.name); return }
              onAddToCart(li.product, qty, true); added++
            })
            if (skipped.length) toast({ title: "Items Skipped", description: skipped.join(", "), variant: "destructive" })
            if (added > 0) {
              setIsBarcodeModalOpen(false); setDetectedProduct(null); setDetectedBarcode("")
              setAppendQueueItem(null)
              navigateTo("cart")
            }
            return
          }
          const barcode = String(payload?.barcode || "").trim()
          const qty = Number(payload?.quantity || 1)
          if (barcode) {
            if (detectedProduct) {
              handleModalAdd(detectedProduct, qty)
              setIsBarcodeModalOpen(false); setDetectedProduct(null); setDetectedBarcode("")
              setAppendQueueItem(null)
              navigateTo("cart")
            } else {
              processBarcodeSubmit(barcode)
            }
          }
        }}
      />

      {/* ── Settings Dialog ── */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4" />
              Settings & Export
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Status */}
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">System Status</p>
              <StatusIndicator active={isConnected} label="API" value={isConnected ? "Connected" : "Offline"} />
              <StatusIndicator active={isOnline} label="Network" value={isOnline ? "Online" : "Offline"} />
              {lastFetchTime && (
                <p className="text-[10px] text-muted-foreground pt-1.5 border-t border-border">
                  Last synced: {lastFetchTime.toLocaleString()}
                </p>
              )}
            </div>

            {/* Export */}
            <div className="rounded-xl border p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Export Data</p>
                <span className="text-xs text-muted-foreground">{products.length} items</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["csv", "xlsx", "json"] as const).map((fmt) => {
                  const Icon = fmt === "csv" ? FileText : fmt === "xlsx" ? FileSpreadsheet : Code
                  return (
                    <Button
                      key={fmt}
                      onClick={() => runExport(fmt)}
                      disabled={isExporting || products.length === 0}
                      size="sm"
                      variant="outline"
                      className="flex flex-col gap-1 h-auto py-2.5"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] uppercase font-semibold">{fmt}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleRefreshData} disabled={isLoadingData} className="flex-1 gap-2">
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? "animate-spin" : ""}`} />
                Refresh Data
              </Button>
              <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Mobile Sidebar Overlay ── */}
      {isMobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[82vw] max-w-72 bg-card border-r shadow-2xl z-50 lg:hidden overflow-y-auto">
            <div className="sticky top-0 bg-card/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Filters</span>
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex lg:flex-col w-60 xl:w-64 bg-card border-r shrink-0">
        <div className="sticky top-0 h-[calc(100vh-5rem)] overflow-y-auto">
          {/* Sidebar header */}
          <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">Filters</span>
            </div>
            <div className="flex items-center gap-0.5">
              <IndustrialTooltip content="Settings & export">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </IndustrialTooltip>
              <IndustrialTooltip content="Refresh data">
                <button
                  onClick={handleRefreshData}
                  disabled={isLoadingData}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? "animate-spin" : ""}`} />
                </button>
              </IndustrialTooltip>
            </div>
          </div>
          <SidebarContent />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {/* ── Top Bar ── */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 sm:px-5 lg:px-6 py-3">
            <div className="flex items-center gap-3">
              {/* Mobile: hamburger */}
              <button
                className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors shrink-0"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open filters"
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Title + count */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm font-semibold truncate">{itemsTitle}</h1>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">
                    {paginatedProducts.length} / {totalFilteredCount}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 px-1.5 gap-1 ${
                      isScannerActive
                        ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                        : "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                    }`}
                  >
                    <Scan className={`w-2.5 h-2.5 ${isScannerActive ? "animate-pulse" : ""}`} />
                    {isScannerActive ? "Scanner Active" : "Scanner Paused"}
                  </Badge>
                  {searchQuery && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1">
                      <Search className="w-2.5 h-2.5" />
                      {searchQuery}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Desktop: view toggle + sort */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-border bg-muted/40 p-0.5 gap-0.5">
                  {(["grid", "list"] as const).map((mode) => {
                    const Icon = mode === "grid" ? LayoutGrid : AlignJustify
                    return (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                          viewMode === mode
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        aria-label={`${mode} view`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    )
                  })}
                </div>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                  <SelectTrigger className="h-8 w-36 text-xs border-border">
                    <div className="flex items-center gap-1.5 truncate">
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground shrink-0" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc" className="text-xs">Name A → Z</SelectItem>
                    <SelectItem value="name-desc" className="text-xs">Name Z → A</SelectItem>
                    <SelectItem value="stock-high" className="text-xs">Stock: High → Low</SelectItem>
                    <SelectItem value="stock-low" className="text-xs">Stock: Low → High</SelectItem>
                  </SelectContent>
                </Select>

                <IndustrialTooltip content="Settings & export">
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </IndustrialTooltip>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-5 lg:px-6 py-4 space-y-3">
            {/* ── Offline banner ── */}
            {dataSource === "cached" && (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">
                  Cached browse mode
                  {lastFetchTime ? ` · Last synced ${lastFetchTime.toLocaleString()}` : ""}
                </span>
                <button
                  onClick={handleRefreshData}
                  className="font-medium hover:underline underline-offset-2 shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ── Excluded / Filter chips ── */}
            {hasActiveChips && (
              <div className="flex flex-col gap-1.5">
                {/* Excluded categories — what the user is hiding */}
                {excludedChips.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                      Excluded:
                    </span>
                    {excludedChips.map((c) => (
                      <FilterChip key={c.key} label={c.label} onRemove={c.remove} variant="excluded" />
                    ))}
                  </div>
                )}

                {/* Availability filters — what the user is specifically filtering for */}
                {availabilityFilterChips.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                      Filter:
                    </span>
                    {availabilityFilterChips.map((c) => (
                      <FilterChip key={c.key} label={c.label} onRemove={c.remove} variant="filter" />
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setExcludedCategories(new Set())
                    setShowAvailable(true)
                    setShowUnavailable(true)
                  }}
                  className="self-start text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* ── Bulk operations ── */}
            <BulkOperationsBar
              selectedItems={selectedItems}
              products={products}
              onSelectAll={(all) => selectAll(products.map((p) => p.id), all)}
              onClearSelection={clearSelection}
              onBulkAddToCart={(bulkProducts) => {
                const skipped: string[] = []
                let added = 0
                bulkProducts.forEach((p) => {
                  if (!isAvailable(p)) { skipped.push(p.name); return }
                  onAddToCart(p); added++
                })
                if (skipped.length) toast({ title: "Skipped", description: skipped.join(", "), variant: "destructive" })
                if (added) toast({ title: `${added} items added`, description: "Cart updated" })
              }}
              onBulkExport={async (selected, format) => {
                try {
                  const data = prepareExportData(selected)
                  const filename = `selected_${new Date().toISOString().split("T")[0]}`
                  if (format === "csv") exportToCSV(data, { filename })
                  else if (format === "xlsx") exportToXLSX(data, { filename })
                  else exportToJSON(data, { filename })
                  toast({ title: "Export Successful", description: `${selected.length} items exported` })
                } catch {
                  toast({ title: "Export Failed", variant: "destructive" })
                }
              }}
            />

            {/* ── Products ── */}
            {isLoadingData || isSearching ? (
              <SearchLoader query={searchQuery || localSearchQuery} />
            ) : paginatedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No items found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery || localSearchQuery
                    ? "Try a different search term or clear filters"
                    : "Adjust your filters to see more items"}
                </p>
                {hasActiveChips && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5 text-xs"
                    onClick={() => { setExcludedCategories(new Set()); setShowAvailable(true); setShowUnavailable(true) }}
                  >
                    <X className="w-3 h-3" />
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pb-6">
                    {paginatedProducts.map((product) =>
                      useEnhancedCards ? (
                        <EnhancedItemCard
                          key={product.id}
                          product={product}
                          onAddToCart={onAddToCart}
                          onViewItem={onViewItem}
                          viewMode="grid"
                        />
                      ) : (
                        <Card
                          key={product.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => onViewItem(product)}
                        >
                          <CardContent className="p-3">
                            <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center text-muted-foreground text-xs">
                              <Package className="w-6 h-6" />
                            </div>
                            <h3 className="font-medium text-xs mb-1 line-clamp-2 leading-tight">{product.name}</h3>
                            <p className="text-[10px] text-muted-foreground mb-0.5">{product.brand}</p>
                            <p className="text-[10px] text-muted-foreground mb-2">Bal: {product.balance}</p>
                            <div className="flex items-center justify-between gap-1">
                              <Badge
                                className={`text-white text-[10px] py-0 px-1.5 h-4 shrink-0 ${
                                  product.status === "out-of-stock" ? "bg-red-500" : "bg-orange-500"
                                }`}
                              >
                                {product.status === "out-of-stock" ? "Out" : product.status === "low-stock" ? "Low" : "In"}
                              </Badge>
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onAddToCart(product) }}
                                disabled={product.status === "out-of-stock"}
                                className="h-6 text-xs px-2"
                              >
                                Add
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 pb-6">
                    {paginatedProducts.map((product) =>
                      useEnhancedCards ? (
                        <EnhancedItemCard
                          key={product.id}
                          product={product}
                          onAddToCart={onAddToCart}
                          onViewItem={onViewItem}
                          viewMode="list"
                        />
                      ) : (
                        <Card
                          key={product.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => onViewItem(product)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm truncate">{product.name}</h3>
                                <p className="text-xs text-muted-foreground">{product.brand} · {product.itemType}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-base font-bold tabular-nums">{product.balance}</div>
                                <div className={`text-[10px] font-medium ${
                                  product.status === "out-of-stock" ? "text-red-500" : "text-orange-600"
                                }`}>
                                  {product.status === "out-of-stock" ? "Out" : product.status === "low-stock" ? "Low" : "In Stock"}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onAddToCart(product) }}
                                disabled={product.status === "out-of-stock"}
                                className="h-8 px-3 shrink-0"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    )}
                  </div>
                )}

                {/* Load more */}
                {hasMorePages && (
                  <div className="flex flex-col items-center gap-2 pb-8">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="gap-2 min-w-40"
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Loading…
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          Load {totalFilteredCount - paginatedProducts.length} more
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">
                      Showing {paginatedProducts.length} of {totalFilteredCount}
                      {currentPage > 1 && ` · Page ${currentPage} of ${Math.ceil(totalFilteredCount / ITEMS_PER_PAGE)}`}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}