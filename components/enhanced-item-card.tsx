import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Plus, Eye, ShoppingCart, AlertTriangle, CheckCircle, XCircle, Hash, MapPin } from 'lucide-react'
import type { Product } from '../lib/barcode-scanner'
import { apiBridge } from '../lib/api-bridge'
import { IndustrialTooltip } from './ui/tooltip'

// ─── Global image cache ───────────────────────────────────────────────────────
const imageCache = new Map<string, string | null>()

type ImageState = 'idle' | 'loading' | 'loaded' | 'error'

interface EnhancedItemCardProps {
  product: Product
  onAddToCart: (product: Product, quantity?: number) => void
  onViewItem: (product: Product) => void
  viewMode?: 'grid' | 'list'
}

// ─── Status config (High Performance - No Drop Shadows) ───────────────────────
const STATUS_CONFIG = {
  'in-stock': {
    label: 'IN STOCK',
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500',
    fill: 'bg-emerald-500/20'
  },
  'low-stock': {
    label: 'LOW STOCK',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500',
    fill: 'bg-amber-500/20'
  },
  'out-of-stock': {
    label: 'DEPLETED',
    icon: XCircle,
    color: 'text-rose-500',
    bg: 'bg-rose-500',
    fill: 'bg-rose-500/10'
  },
} as const

// ─── Optimized Skeleton (Hardware Accelerated) ────────────────────────────────
function ImageSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-full h-full bg-zinc-950 overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-zinc-800 animate-pulse opacity-20"></div>
    </div>
  )
}

// ─── Segmented LED Gauge (Optimized DOM) ──────────────────────────────────────
function HardwareStockGauge({ balance, status }: { balance: number; status: Product['status'] }) {
  const cfg = STATUS_CONFIG[status || 'in-stock']
  const maxSegments = 5
  const fillPct = Math.min(100, Math.max(0, (balance / 100) * 100))
  const activeSegments = Math.ceil((fillPct / 100) * maxSegments)

  return (
    <div className="flex items-center gap-0.5 w-full bg-black/60 p-1 rounded border border-zinc-800">
      {Array.from({ length: maxSegments }).map((_, i) => (
        <div 
          key={i} 
          className={`h-1.5 flex-1 rounded-[1px] ${
            i < activeSegments ? cfg.bg : 'bg-zinc-800'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Image loader hook (Unchanged) ────────────────────────────────────────────
function useProductImage(productId: string | number | undefined) {
  const [url, setUrl] = useState<string | null>(null)
  const [state, setState] = useState<ImageState>('idle')
  const abortRef = useRef<boolean>(false)

  useEffect(() => {
    abortRef.current = false
    setUrl(null)
    setState('idle')

    if (!productId) return

    const itemId = typeof productId === 'number' ? productId : parseInt(String(productId), 10)
    if (isNaN(itemId)) return

    const cacheKey = `item_${itemId}`

    if (imageCache.has(cacheKey)) {
      const cached = imageCache.get(cacheKey)!
      if (cached === null) { setState('error'); return }
      setUrl(cached)
      setState('loaded')
      return
    }

    setState('loading')

    const load = async (attempt = 0) => {
      try {
        const rawImageList = await apiBridge.getItemImages(itemId)
        if (abortRef.current) return

        const imageList = Array.isArray(rawImageList)
          ? rawImageList
              .map((img: any) => (typeof img === 'string' ? { filename: img } : img))
              .filter((img: any) => typeof img?.filename === 'string')
          : []

        if (imageList.length > 0) {
          const blob = await apiBridge.getItemImageBlob(itemId, imageList[0].filename)
          if (abortRef.current) return
          if (blob.success && blob.url) {
            imageCache.set(cacheKey, blob.url)
            setUrl(blob.url)
            setState('loaded')
            return
          }
        }

        const latest = await apiBridge.getLatestItemImageBlob(itemId)
        if (abortRef.current) return

        if (latest.success && latest.url) {
          imageCache.set(cacheKey, latest.url)
          setUrl(latest.url)
          setState('loaded')
          return
        }

        const noImage = latest.error === 'No image found' || latest.error?.includes('404') || latest.error?.includes('Image not found')
        if (noImage) {
          imageCache.set(cacheKey, null)
          setState('error')
          return
        }
        throw new Error(latest.error || 'Unknown error')
      } catch (err: any) {
        if (abortRef.current) return
        const is404 = err?.message?.includes('404') || err?.message?.includes('No image found')
        const isCancelled = err?.message?.includes('cancelled') || err?.message?.includes('aborted')

        if (is404) { imageCache.set(cacheKey, null); setState('error'); return }
        if (isCancelled) return

        if (attempt < 2) {
          setTimeout(() => { if (!abortRef.current) load(attempt + 1) }, 1000 * (attempt + 1))
        } else {
          setState('error')
        }
      }
    }

    load()
    return () => { abortRef.current = true }
  }, [productId])

  return { url, state }
}

// ─── Main component ───────────────────────────────────────────────────────────
export const EnhancedItemCard = React.memo<EnhancedItemCardProps>(({
  product,
  onAddToCart,
  onViewItem,
  viewMode = 'grid',
}) => {
  const { url: imageUrl, state: imageState } = useProductImage(product?.id)
  const [imgRendered, setImgRendered] = useState(false)

  useEffect(() => { setImgRendered(false) }, [imageUrl])

  const status = product.status ?? 'in-stock'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['in-stock']
  const balance = typeof product.balance === 'number' ? product.balance : 0
  const isDisabled = status === 'out-of-stock' || balance <= 0

  const handleAdd = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onAddToCart(product) },
    [product, onAddToCart]
  )
  const handleView = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onViewItem(product) },
    [product, onViewItem]
  )

  // ── Image slot (Optimized) ──────────────────────────────────────────────────
  const ImageSlot = ({ className = '' }: { className?: string }) => (
    <div className={`relative overflow-hidden bg-zinc-950 border border-zinc-800 ${className}`}>
      {imageState === 'loading' && <ImageSkeleton />}

      {imageState === 'loaded' && imageUrl && (
        <img
          src={imageUrl}
          alt={product.name}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            imgRendered ? 'opacity-90 hover:opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImgRendered(true)}
          onError={() => setImgRendered(false)}
        />
      )}

      {/* NEW JJC PLACEHOLDER */}
      {(imageState === 'error' || (imageState === 'loaded' && !imageUrl)) && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 shadow-inner">
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 border-2 border-dashed border-zinc-800/80 rounded-lg">
            <span className="text-3xl sm:text-4xl font-black tracking-[0.2em] text-zinc-800">JJC</span>
            <span className="text-[8px] sm:text-[10px] uppercase tracking-widest font-mono font-bold text-zinc-600 mt-1">NO VISUAL</span>
          </div>
        </div>
      )}
    </div>
  )

  // ── LIST VIEW ───────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <Card
        className={`group bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors ${
          isDisabled ? 'opacity-70 grayscale-[30%]' : ''
        }`}
      >
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Status Indicator Strip */}
            <div className={`w-1.5 shrink-0 ${cfg.bg}`}></div>

            {/* Left: image strip */}
            <button onClick={handleView} className="shrink-0 w-20 p-2 focus-visible:outline-none">
              <ImageSlot className="w-full h-full min-h-[4rem] rounded border-zinc-700/50" />
            </button>

            {/* Center: info */}
            <button
              onClick={handleView}
              className="flex-1 min-w-0 py-2.5 px-2 text-left focus-visible:outline-none flex flex-col justify-center"
            >
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-black tracking-wide text-zinc-200 uppercase line-clamp-1 group-hover:text-orange-400 transition-colors">
                  {product.name}
                </h3>
                {product.brand && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700">{product.brand}</span>}
              </div>
              
              <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                {product.itemType && (
                  <span className="flex items-center gap-1"><Hash className="w-3 h-3 text-zinc-600"/>{product.itemType}</span>
                )}
                {product.location && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-zinc-600"/>{product.location}</span>
                )}
              </div>
            </button>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 px-4 shrink-0 bg-black/20 border-l border-zinc-800/50">
              
              <div className="flex flex-col items-end gap-1 w-24">
                 <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold tracking-widest ${cfg.color}`}>{cfg.label}</span>
                 </div>
                 <HardwareStockGauge balance={balance} status={status} />
              </div>

              <div className="flex flex-col items-center justify-center w-12 h-10 rounded border border-zinc-700 bg-zinc-950">
                <span className="text-sm font-black font-mono tabular-nums leading-none text-zinc-300">{balance}</span>
                <span className="text-[8px] uppercase tracking-widest text-zinc-600 mt-1">QTY</span>
              </div>

              <IndustrialTooltip content={isDisabled ? 'System Locked' : 'Add to Manifest'}>
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={isDisabled}
                  className={`h-10 w-10 p-0 shrink-0 transition-transform active:translate-y-0.5 border-0 ${
                    isDisabled ? 'bg-zinc-800 text-zinc-600' : 'bg-orange-600 hover:bg-orange-500 text-white'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </IndustrialTooltip>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── GRID VIEW ───────────────────────────────────────────────────────────────
  return (
    <Card
      className={`group relative overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors ${
        isDisabled ? 'opacity-70 grayscale-[20%]' : ''
      }`}
    >
      <CardContent className="p-0">
        
        {/* Top Viewport */}
        <div className="relative aspect-square cursor-pointer p-2 pb-0" onClick={handleView}>
          <ImageSlot className="w-full h-full rounded-t-lg border-b-0" />

          {/* Bolted-on Quantity Tag */}
          <div className="absolute top-4 left-4 flex items-center bg-zinc-950 border border-zinc-700 rounded">
            <div className={`px-1.5 py-1 border-r border-zinc-700 flex items-center justify-center ${cfg.fill}`}>
              <div className={`w-2 h-2 rounded-full ${cfg.bg}`} />
            </div>
            <span className="px-2 py-1 text-xs font-black font-mono tracking-wider text-zinc-200">
              {balance}
            </span>
          </div>

          {/* Mechanical Control Panel (Hardware-accelerated slide) */}
          <div className="absolute bottom-0 left-2 right-2 flex items-center gap-2 p-2 bg-zinc-900/95 border border-zinc-700 border-b-0 rounded-t-lg transform-gpu translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <Button
              size="sm"
              variant="outline"
              onClick={handleView}
              className="flex-1 h-8 text-[10px] font-black tracking-widest uppercase bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
            >
              <Eye className="w-3.5 h-3.5 mr-1" /> View
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={isDisabled}
              className="flex-1 h-8 text-[10px] font-black tracking-widest uppercase bg-orange-600 hover:bg-orange-500 text-white border-0"
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Details Panel */}
        <div className="relative p-3 bg-zinc-950 border-t border-zinc-800 z-10" onClick={handleView}>
          <div className="space-y-2">
            
            <div className="flex justify-between items-start gap-2">
              <h3 className="text-sm font-black tracking-wide text-zinc-200 uppercase leading-tight line-clamp-2">
                {product.name}
              </h3>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
               <span>{product.brand || product.itemType || 'UNKNOWN'}</span>
               {product.location && (
                 <span className="flex items-center gap-0.5 max-w-[50%] truncate">
                   <MapPin className="w-2.5 h-2.5 shrink-0" />
                   <span className="truncate">{product.location}</span>
                 </span>
               )}
            </div>

            {/* Hardware Gauge and Status Text */}
            <div className="pt-2 border-t border-zinc-800/50 flex flex-col gap-1.5">
               <div className="flex justify-between items-center">
                 <span className={`text-[9px] font-black tracking-widest uppercase ${cfg.color}`}>
                   {cfg.label}
                 </span>
                 {isDisabled && <AlertTriangle className="w-3 h-3 text-rose-500" />}
               </div>
               <HardwareStockGauge balance={balance} status={status} />
            </div>

          </div>
        </div>

      </CardContent>
    </Card>
  )
})

EnhancedItemCard.displayName = 'EnhancedItemCard'