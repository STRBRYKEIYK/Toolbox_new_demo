"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Plus, Minus, Package, ChevronLeft, ChevronRight, ShoppingCart, Hash, MapPin, Tag, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import type { Product } from "../lib/barcode-scanner"
import { apiBridge } from "../lib/api-bridge"

interface ItemDetailViewProps {
  product: Product
  onAddToCart: (product: Product, quantity: number) => void
  onBack: () => void
}

// ─── Status config (Consistent with EnhancedItemCard) ─────────────────────────
const STATUS_CONFIG = {
  'in-stock': {
    label: 'IN STOCK',
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500',
  },
  'low-stock': {
    label: 'LOW STOCK',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500',
  },
  'out-of-stock': {
    label: 'DEPLETED',
    icon: XCircle,
    color: 'text-rose-500',
    bg: 'bg-rose-500',
  },
} as const

// ─── Segmented LED Gauge ──────────────────────────────────────────────────────
function HardwareStockGauge({ balance, status }: { balance: number; status: Product['status'] }) {
  const cfg = STATUS_CONFIG[status || 'in-stock']
  const maxSegments = 10 // More segments for the detail view
  const fillPct = Math.min(100, Math.max(0, (balance / 100) * 100))
  const activeSegments = Math.ceil((fillPct / 100) * maxSegments)

  return (
    <div className="flex items-center gap-1 w-full bg-black/60 p-1.5 rounded border border-zinc-800">
      {Array.from({ length: maxSegments }).map((_, i) => (
        <div 
          key={i} 
          className={`h-2 flex-1 rounded-[1px] ${
            i < activeSegments ? cfg.bg : 'bg-zinc-800'
          }`}
        />
      ))}
    </div>
  )
}

export function ItemDetailView({ product, onAddToCart, onBack }: ItemDetailViewProps) {
  const [quantity, setQuantity] = useState(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [images, setImages] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const rotationTimer = useRef<number | null>(null)

  const status = product.status ?? 'in-stock'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['in-stock']
  const balance = typeof product.balance === 'number' ? product.balance : 0
  const isDisabled = status === "out-of-stock" || balance <= 0

  // Load images individually
  const loadImagesIndividually = async () => {
    if (!product?.id) return

    const itemId = typeof product.id === 'number' ? product.id : parseInt(product.id, 10)
    if (isNaN(itemId)) return

    try {
      const rawImageList = await apiBridge.getItemImages(itemId)
      const imageList = Array.isArray(rawImageList)
        ? rawImageList
            .map((img: any) => (typeof img === 'string' ? { filename: img } : img))
            .filter((img: any) => typeof img?.filename === 'string')
        : []
      if (imageList.length === 0) throw new Error('No images in list')

      const firstImageResult = await apiBridge.getItemImageBlob(itemId, imageList[0].filename)
      if (firstImageResult.success && firstImageResult.url) {
        const imagesWithUrls = imageList.map((img: any) => ({
          ...img,
          url: null
        }))
        imagesWithUrls[0].url = firstImageResult.url

        setImages(imagesWithUrls)
        setCurrentIndex(0)
        setImageUrl(firstImageResult.url)
      } else {
        throw new Error('Failed to load first image')
      }

    } catch (e) {
      console.error('[Toolbox ItemDetailView] Failed to load images list:', e)
      try {
        const latestResult = await apiBridge.getLatestItemImageBlob(itemId)
        if (latestResult.success && latestResult.url) {
          setImages([{ filename: 'latest', url: latestResult.url }])
          setImageUrl(latestResult.url)
        }
      } catch (fallbackErr) {
        console.log('[Toolbox ItemDetailView] No images available')
      }
    }
  }

  const handleAddToCart = () => {
    onAddToCart(product, quantity)
    setQuantity(1)
  }

  const incrementQuantity = () => {
    if (quantity < balance) setQuantity((prev) => prev + 1)
  }

  const decrementQuantity = () => {
    if (quantity > 1) setQuantity((prev) => prev - 1)
  }

  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
    if (!product?.id) {
      setImageUrl(null)
      return
    }

    const itemId = typeof product.id === 'number' ? product.id : parseInt(product.id, 10)
    if (isNaN(itemId)) {
      setImageUrl(null)
      return
    }

    loadImagesIndividually()
  }, [product?.id])

  useEffect(() => {
    if (rotationTimer.current) {
      clearInterval(rotationTimer.current)
      rotationTimer.current = null
    }
    
    if (images.length > 1) {
      rotationTimer.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % images.length
          const nextImage = images[next]
          if (nextImage) setImageUrl(nextImage.url)
          return next
        })
      }, 5000)
    }
    
    return () => {
      if (rotationTimer.current) {
        clearInterval(rotationTimer.current)
        rotationTimer.current = null
      }
    }
  }, [images])

  const StatusIcon = cfg.icon

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-zinc-950 p-3 sm:p-4 lg:p-6 text-zinc-200">
      
      {/* Hardware Header / Back Button */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white font-mono font-bold tracking-widest uppercase text-xs rounded-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Abort / Return
        </Button>
        <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-sm shadow-inner hidden sm:flex items-center gap-2">
           <Hash className="w-3.5 h-3.5 text-zinc-500" />
           <span className="font-mono text-xs font-bold text-zinc-400 tracking-widest">{product.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 max-w-5xl mx-auto items-start">
        
        {/* ─── OPTICAL VIEWPORT (Left Column) ────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-zinc-900 border border-zinc-700/50 shadow-[0_10px_20px_rgba(0,0,0,0.5)] overflow-hidden">
            <CardContent className="p-2">
              <div className="aspect-square bg-zinc-950 border border-zinc-800 rounded flex items-center justify-center overflow-hidden relative shadow-inner">
                
                {/* Image Render */}
                {!imageError && imageUrl && (
                  <img 
                    src={imageUrl} 
                    alt={product.name}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-90 hover:opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                  />
                )}
                
                {/* JJC No Visual Placeholder */}
                {(!imageUrl || !imageLoaded || imageError) && (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800/80 rounded-lg">
                    <span className="text-5xl font-black tracking-[0.2em] text-zinc-800">JJC</span>
                    <span className="text-xs uppercase tracking-widest font-mono font-bold text-zinc-600 mt-2">NO VISUAL DATA</span>
                  </div>
                )}
                
                {/* Image Navigation (Mechanical Interface) */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        const prev = (currentIndex - 1 + images.length) % images.length
                        setCurrentIndex(prev)
                        setImageUrl(images[prev].url)
                      }}
                      className="absolute left-2 p-2 rounded bg-black/80 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-black transition-all shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        const next = (currentIndex + 1) % images.length
                        setCurrentIndex(next)
                        setImageUrl(images[next].url)
                      }}
                      className="absolute right-2 p-2 rounded bg-black/80 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-black transition-all shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    {/* LED Dot Indicators */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 p-1.5 rounded bg-black/60 border border-zinc-800">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCurrentIndex(idx)
                            setImageUrl(images[idx].url)
                          }}
                          className={`w-2.5 h-1.5 rounded-[1px] transition-colors ${idx === currentIndex ? 'bg-orange-500' : 'bg-zinc-700 hover:bg-zinc-500'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── DATA PLATE & CONTROLS (Right Column) ──────────────────────────── */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Header Area */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide leading-tight">
                {product.name}
              </h1>
            </div>
            {/* Status Strip */}
            <div className={`flex items-center gap-2 px-3 py-1.5 w-fit rounded border bg-zinc-950 shadow-inner ${cfg.color} border-zinc-800`}>
              <StatusIcon className="w-4 h-4" />
              <span className="font-mono text-xs font-black tracking-widest uppercase">{cfg.label}</span>
            </div>
          </div>

          {/* Telemetry Grid (Stamped Metal Look) */}
          <Card className="bg-zinc-900 border border-zinc-700/50 shadow-inner overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[1px] bg-zinc-800">
              
              <div className="bg-zinc-900 p-4 space-y-1">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <Tag className="w-3 h-3" /> Brand / Manufacturer
                </span>
                <p className="font-mono text-sm text-zinc-200 font-semibold">{product.brand || 'UNSPECIFIED'}</p>
              </div>
              
              <div className="bg-zinc-900 p-4 space-y-1">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <Package className="w-3 h-3" /> Item Classification
                </span>
                <p className="font-mono text-sm text-zinc-200 font-semibold">{product.itemType || 'UNSPECIFIED'}</p>
              </div>
              
              <div className="bg-zinc-900 p-4 space-y-1">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <MapPin className="w-3 h-3" /> Facility Location
                </span>
                <p className="font-mono text-sm text-zinc-200 font-semibold">{product.location || 'UNASSIGNED'}</p>
              </div>
              
              <div className="bg-zinc-900 p-4 space-y-1">
                <span className="flex items-center justify-between gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <span>Current Inventory</span>
                  <span className={cfg.color}>{balance} UNITS</span>
                </span>
                <HardwareStockGauge balance={balance} status={status} />
              </div>

            </div>
          </Card>

          {/* Action Module (Quantity & Cart) */}
          <div className={`p-4 rounded-lg border border-zinc-700/50 space-y-4 ${isDisabled ? 'bg-zinc-900/50' : 'bg-zinc-900 shadow-lg'}`}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Mechanical Quantity Rocker */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-zinc-950 border border-zinc-700 rounded-md p-1 shadow-inner">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-12 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1 || isDisabled}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  
                  <div className="w-16 flex flex-col items-center justify-center">
                    <span className={`text-xl font-black font-mono tabular-nums leading-none ${isDisabled ? 'text-zinc-600' : 'text-zinc-200'}`}>
                      {quantity}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-12 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
                    onClick={incrementQuantity}
                    disabled={quantity >= balance || isDisabled}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {!isDisabled && (
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:block">
                    Max: {balance}
                  </span>
                )}
              </div>

              {/* Deployment Button */}
              <div className="flex-1">
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={isDisabled}
                  className={`w-full h-14 font-black tracking-widest uppercase transition-all duration-200 border-0 ${
                    isDisabled 
                      ? 'bg-zinc-800 text-zinc-600 shadow-inner' 
                      : 'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_8px_20px_rgba(234,88,12,0.3)] hover:shadow-[0_12px_25px_rgba(234,88,12,0.4)] hover:-translate-y-0.5 active:translate-y-1'
                  }`}
                >
                  {isDisabled ? (
                    <span className="flex items-center gap-2"><XCircle className="w-5 h-5"/> SYSTEM LOCKED</span>
                  ) : (
                    <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 drop-shadow-md"/> Add to Manifest</span>
                  )}
                </Button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}