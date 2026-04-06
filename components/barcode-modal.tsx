"use client"

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { ScanLine, ShoppingCart, Trash2, Plus, Minus, Terminal, Hash, AlertTriangle } from 'lucide-react'
import type { Product } from '../lib/barcode-scanner'
import { apiBridge } from '../lib/api-bridge'

interface BulkLineItem {
  product: Product
  quantity: number
}

interface BarcodeModalProps {
  open: boolean
  initialValue?: string
  products?: Product[]
  onClose: () => void
  onConfirm: (payload: { barcode?: string; quantity?: number } | { items: BulkLineItem[] }) => void
}

export default function BarcodeModal({ open, initialValue = '', products = [], onClose, onConfirm }: BarcodeModalProps) {
  const [barcode, setBarcode] = useState(initialValue)
  const [quantity, setQuantity] = useState<number>(1)
  const hiddenInputRef = useRef<HTMLInputElement | null>(null)
  const [lineItems, setLineItems] = useState<BulkLineItem[]>([])

  const isAvailable = (p?: Product | null, additionalQty = 1) => {
    if (!p) return false
    const status = (p.status || '').toString().toLowerCase()
    if (status.includes('out')) return false
    if (typeof p.balance === 'number') {
      if (p.balance <= 0) return false
      const existingInQueue = lineItems.find(li => String(li.product.id) === String(p.id))
      const currentQtyInQueue = existingInQueue ? existingInQueue.quantity : 0
      const totalRequested = currentQtyInQueue + additionalQty
      if (totalRequested > p.balance) return false
    }
    return true
  }

  useEffect(() => {
    setBarcode(initialValue)
    if (open) {
      setTimeout(() => hiddenInputRef.current?.focus(), 50)
    }
  }, [open, initialValue])

  useEffect(() => {
    setLineItems(prev => {
      if (prev && prev.length > 0) {
        if (!products || products.length === 0) return prev
        const next = [...prev]
        products.forEach(p => {
          if (!isAvailable(p)) return
          const exists = next.find(x => String(x.product.id) === String(p.id))
          if (!exists) next.push({ product: p, quantity: 1 })
        })
        return next
      }

      if (products && products.length > 0) {
        return products.filter(p => isAvailable(p)).map(p => ({ product: p, quantity: 1 }))
      }

      return []
    })
  }, [products])

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail || {}
        const li = detail.item
        if (!li || !li.product) return

        const p = li.product as Product
        if (p.status === 'out-of-stock' || (typeof p.balance === 'number' && p.balance <= 0)) {
          console.warn(`[barcode-modal] Skipped queuing out-of-stock item: ${p.name}`)
          return
        }

        setLineItems(prev => {
          const idx = prev.findIndex(x => String(x.product.id) === String(p.id))
          if (idx !== -1) {
            const next = [...prev]
            const existing = next[idx]
            if (!existing) return prev
            next[idx] = { product: existing.product, quantity: Math.max(0, existing.quantity + (li.quantity || 1)) }
            return next
          }
          return [...prev, { product: p, quantity: li.quantity || 1 }]
        })
      } catch (err) {
        console.error('barcode-modal append handler error', err)
      }
    }

    window.addEventListener('scanned-barcode-append', handler as EventListener)
    return () => window.removeEventListener('scanned-barcode-append', handler as EventListener)
  }, [])

  useEffect(() => {
    const handler = () => {
      setLineItems([])
    }

    window.addEventListener('clear-barcode-queue', handler as EventListener)
    return () => window.removeEventListener('clear-barcode-queue', handler as EventListener)
  }, [])

  const handleConfirmSingle = () => {
    onConfirm({ barcode: barcode.trim(), quantity })
    onClose()
  }

  const handleConfirmBulk = () => {
    const items = lineItems.filter(li => {
      if (li.quantity <= 0) return false
      const status = (li.product.status || '').toString().toLowerCase()
      if (status.includes('out')) return false
      if (typeof li.product.balance === 'number' && li.product.balance <= 0) return false
      return true
    })
    if (items.length === 0) {
      onClose()
      return
    }
    onConfirm({ items })
    onClose()
  }

  const handleClearQueue = () => {
    setLineItems([])
  }

  const updateLineQuantity = (index: number, qty: number) => {
    setLineItems(prev => {
      const next = [...prev]
      const existing = next[index]
      if (!existing) return prev
      const maxQty = typeof existing.product.balance === 'number' ? existing.product.balance : Infinity
      const clampedQty = Math.max(0, Math.min(qty, maxQty))
      next[index] = { product: existing.product, quantity: clampedQty }
      return next
    })
  }

  // Heavy-duty image subcomponent
  function ItemImage({ item }: { item: Product }) {
    const [url, setUrl] = useState<string | null>(null)
    const [loaded, setLoaded] = useState(false)
    const [err, setErr] = useState(false)

    useEffect(() => {
      const loadImage = async () => {
        setErr(false)
        setLoaded(false)
        if (!item || !item.id) {
          setUrl(null)
          return
        }
        const numericId = parseInt(String(item.id), 10)
        if (isNaN(numericId)) {
          setUrl(null)
          return
        }
        
        try {
          const result = await apiBridge.getLatestItemImageBlob(numericId)
          if (result.success && result.url) {
            setUrl(result.url)
          } else {
            setErr(true)
          }
        } catch (error) {
          console.error('[BarcodeModal] Failed to load image:', error)
          setErr(true)
        }
      }
      
      loadImage()
    }, [item])

    return (
      <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 rounded flex items-center justify-center overflow-hidden shadow-inner relative">
        {!err && url && (
          <img 
            src={url} 
            alt={item.name} 
            className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-90' : 'opacity-0'}`} 
            onLoad={() => setLoaded(true)} 
            onError={() => setErr(true)} 
          />
        )}
        {(!url || err) && (
          <div className="flex flex-col items-center justify-center opacity-50">
            <span className="text-xl font-black tracking-widest text-zinc-700">JJC</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-hidden bg-zinc-950 border-2 border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-xl flex flex-col p-0 gap-0">
        
        {/* Hardware Header */}
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-900">
          <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-4 min-w-0">
              
              {/* Sensor Icon Box */}
              <div className="w-12 h-12 bg-black/50 border border-zinc-700 rounded-lg flex items-center justify-center shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-orange-500/50 blur-[2px] animate-[scan_2s_linear_infinite]" />
                <ScanLine className="w-6 h-6 text-orange-500" />
              </div>
              
              <div>
                <DialogTitle className="text-xl font-black tracking-widest uppercase text-zinc-100 drop-shadow-md">
                  Optical Scanner
                </DialogTitle>
                <DialogDescription className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-500 mt-1">
                  {lineItems && lineItems.length > 0
                    ? "Verify Queue Before Manifest Injection"
                    : "Awaiting Barcode Input..."
                  }
                </DialogDescription>
              </div>
            </div>
            
            {/* LED Status Pill */}
            {lineItems && lineItems.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded shadow-inner">
                <div className="w-2 h-2 rounded-full bg-emerald-500 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)] animate-pulse" />
                <span className="font-mono text-xs font-black text-zinc-300">
                  {lineItems.length} {lineItems.length === 1 ? 'ITEM' : 'ITEMS'}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Main Body */}
        <div className="p-3 sm:p-6 flex-1 overflow-hidden bg-black/40 shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)]">
          {lineItems && lineItems.length > 0 ? (
            
            /* BULK QUEUE LIST */
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
              {lineItems.map((li, idx) => {
                const maxQty = typeof li.product.balance === 'number' ? li.product.balance : 9999;
                const isOutOfStock = li.product.status === 'out-of-stock' || maxQty <= 0;
                
                return (
                  <div key={`${li.product.id}-${idx}`} className={`p-3 rounded-lg border transition-all duration-200 ${
                    isOutOfStock
                      ? 'bg-rose-950/20 border-rose-900/50 opacity-60'
                      : 'bg-zinc-900 border-zinc-700/50 hover:border-zinc-500'
                  }`}>
                    <div className="flex items-center gap-4">
                      
                      <ItemImage item={li.product} />
                      
                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-4 items-center">
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-zinc-200 uppercase tracking-wide truncate">
                            {li.product.name}
                          </h4>
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                            <span className="truncate">{li.product.brand || 'UNSPECIFIED'}</span>
                            <span className="text-zinc-700">|</span>
                            <span className="flex items-center gap-0.5"><Hash className="w-3 h-3"/>{li.product.id}</span>
                          </div>
                        </div>
                        
                        {/* Mechanical Quantity Rocker */}
                        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded p-1 shadow-inner">
                          <button
                            onClick={() => updateLineQuantity(idx, Math.max(0, li.quantity - 1))}
                            disabled={isOutOfStock}
                            className="w-8 h-8 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center disabled:opacity-30 transition-colors border border-zinc-800"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          <Input
                            type="number"
                            min={0}
                            max={maxQty}
                            value={li.quantity}
                            onChange={(e: any) => updateLineQuantity(idx, Number(e.target.value || 0))}
                            disabled={isOutOfStock}
                            className="w-14 h-8 text-center bg-transparent border-0 text-zinc-200 font-mono font-bold text-sm focus-visible:ring-1 focus-visible:ring-orange-500 p-0"
                          />
                          
                          <button
                            onClick={() => updateLineQuantity(idx, Math.min(maxQty, li.quantity + 1))}
                            disabled={isOutOfStock}
                            className="w-8 h-8 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center disabled:opacity-30 transition-colors border border-zinc-800"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        
                        {/* Status Readout */}
                        <div className="text-left sm:text-right min-w-[60px]">
                          <div className={`text-[9px] font-mono font-black tracking-widest uppercase px-2 py-1 rounded border inline-block ${
                            li.product.status === 'in-stock' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            li.product.status === 'low-stock' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                            'bg-rose-500/10 text-rose-500 border-rose-500/30'
                          }`}>
                            {isOutOfStock ? 'DEPLETED' : `${maxQty} MAX`}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            
            /* MANUAL TERMINAL INPUT */
            <div className="bg-zinc-900 rounded-lg p-5 sm:p-8 border border-zinc-800 shadow-inner">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6 items-end">
                
                <div className="space-y-3">
                  <label className="text-[10px] font-black font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5" />
                    Data Input
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 font-mono font-bold">&gt;</div>
                    <Input
                      ref={hiddenInputRef as any}
                      value={barcode}
                      onChange={(e: any) => setBarcode(e.target.value)}
                      className="pl-8 text-sm font-mono tracking-widest uppercase bg-zinc-950 border-2 border-zinc-800 text-zinc-200 rounded-lg focus-visible:border-orange-500 focus-visible:ring-1 focus-visible:ring-orange-500 h-12 shadow-inner"
                      placeholder="[ AWAITING INPUT ]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5" />
                    Quantity
                  </label>
                  <div className="flex items-center gap-2 bg-zinc-950 border-2 border-zinc-800 rounded-lg p-1 shadow-inner h-12">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-full rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e: any) => setQuantity(Number(e.target.value || 1))}
                      className="text-center bg-transparent border-0 text-zinc-200 font-mono font-bold text-lg h-full flex-1 focus-visible:ring-0 p-0"
                      min={1}
                    />

                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-full rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* System Advisory */}
              <div className="mt-8 bg-zinc-950 rounded border border-zinc-800 p-3 flex items-start gap-3 shadow-inner">
                <div className="mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h5 className="text-[10px] font-black font-mono text-zinc-400 uppercase tracking-widest">System Advisory</h5>
                  <p className="text-xs text-zinc-500 mt-1">
                    Continuous optical scanning is enabled. Additional scans will automatically append to the bulk queue.
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Action Footer */}
        <DialogFooter className="border-t border-zinc-800 px-4 sm:px-6 py-4 bg-zinc-900">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-4">
            
            <Button
              variant="ghost"
              onClick={handleClearQueue}
              disabled={!lineItems || lineItems.length === 0}
              className="w-full sm:w-auto text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 font-black tracking-widest uppercase text-xs"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Purge Queue
            </Button>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto bg-zinc-950 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 font-black tracking-widest uppercase text-xs"
              >
                Abort
              </Button>

              <Button
                onClick={lineItems && lineItems.length > 0 ? handleConfirmBulk : handleConfirmSingle}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white font-black tracking-widest uppercase text-xs shadow-[0_4px_15px_rgba(234,88,12,0.3)] hover:shadow-[0_6px_20px_rgba(234,88,12,0.4)] transition-all border-0"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {lineItems && lineItems.length > 0 ? `Process ${lineItems.length} Units` : 'Execute Entry'}
              </Button>
            </div>
          </div>
        </DialogFooter>

      </DialogContent>
      
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(400%); opacity: 0; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(82, 82, 91, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(113, 113, 122, 0.8);
        }
      `}</style>
    </Dialog>
  )
}