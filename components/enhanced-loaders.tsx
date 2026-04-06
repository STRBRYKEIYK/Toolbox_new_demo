import { Card, CardContent } from './ui/card'
import { Skeleton } from './ui/skeleton'
import { Loader2, Wifi, WifiOff, Cpu, ScanLine, Terminal } from 'lucide-react'

// ─── PAGE LOADER (System Boot Sequence) ───────────────────────────────────────
export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 industrial-gradient">
      <div className="w-full max-w-sm p-8 text-center space-y-8">
        {/* Hardware Status Module */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-center justify-center shadow-inner overflow-hidden">
            {/* Animated scanning line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500/50 blur-[2px] animate-[scan_1.5s_linear_infinite]" />
            <Cpu className="w-10 h-10 text-zinc-600 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-zinc-950 border border-zinc-800 p-1.5 rounded-md">
            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
          </div>
        </div>

        {/* Boot Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-black text-zinc-200 tracking-[0.2em] uppercase">
            Booting System
          </h2>
          <p className="text-[10px] font-mono font-bold text-zinc-500 tracking-widest uppercase">
            Initializing Hardware Modules...
          </p>
        </div>

        {/* Segmented Loading Bar */}
        <div className="w-64 mx-auto p-1 bg-black/60 border border-zinc-800 rounded shadow-inner flex gap-0.5 h-3">
          <div className="w-full h-full bg-orange-600 rounded-[1px] animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(10000%); }
        }
      `}</style>
    </div>
  )
}

// ─── SEARCH LOADER (Blank Hardware Modules) ───────────────────────────────────
export function SearchLoader({ query }: { query?: string }) {
  return (
    <div className="space-y-4 p-4">
      {/* Search Telemetry */}
      <div className="flex items-center gap-3 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg max-w-fit">
        <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
        <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
          {query ? `SCANNING VAULT FOR: [ ${query} ]` : 'SCANNING MANIFEST...'}
        </span>
      </div>

      {/* Grid of Blank Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="bg-zinc-900 border border-zinc-800 overflow-hidden opacity-50">
            <CardContent className="p-0">
              <div className="p-2 pb-0">
                <div className="aspect-square bg-zinc-950 border border-zinc-800 rounded-t-lg animate-pulse" />
              </div>
              <div className="p-3 bg-zinc-950 border-t border-zinc-800">
                <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2 animate-pulse" />
                <div className="h-3 bg-zinc-800 rounded w-1/2 mb-4 animate-pulse" />
                <div className="h-6 bg-zinc-800 rounded w-full animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── CONNECTION STATUS (Tactile LED Readout) ──────────────────────────────────
export function ConnectionStatus({ isOnline }: { isOnline: boolean }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 shadow-inner">
      <div className={`p-1 rounded bg-black/50 shadow-inner`}>
        {isOnline ? (
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-zinc-600" />
        )}
      </div>
      <span className={`text-[10px] font-black tracking-widest uppercase ${
        isOnline ? 'text-emerald-400' : 'text-zinc-500'
      }`}>
        {isOnline ? 'Uplink Secure' : 'Local Only'}
      </span>
    </div>
  )
}

// ─── CART LOADER (Manifest Syncing) ───────────────────────────────────────────
export function CartLoader() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
        <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
        <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
          Syncing Manifest...
        </span>
      </div>
      
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="bg-zinc-900 border border-zinc-800 p-0 overflow-hidden">
          <div className="flex items-center gap-4 p-3 opacity-60">
            <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-zinc-800 rounded w-2/3 animate-pulse" />
              <div className="h-3 bg-zinc-800 rounded w-1/3 animate-pulse" />
            </div>
            <div className="w-12 h-10 bg-zinc-950 border border-zinc-800 rounded animate-pulse" />
          </div>
        </Card>
      ))}
    </div>
  )
}

// ─── BARCODE SCAN LOADER (Optical Targeting Reticle) ──────────────────────────
export function BarcodeScanLoader({ isScanning }: { isScanning: boolean }) {
  if (!isScanning) return null
  
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        
        {/* Optical Scanner Reticle */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 opacity-80 rounded-tl-sm"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 opacity-80 rounded-tr-sm"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 opacity-80 rounded-bl-sm"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 opacity-80 rounded-br-sm"></div>
          
          <ScanLine className="w-12 h-12 text-orange-500 animate-pulse" />
          
          {/* Laser Sweep */}
          <div className="absolute left-0 right-0 h-0.5 bg-orange-400 shadow-[0_0_15px_rgba(249,115,22,1)] animate-[laser_2s_ease-in-out_infinite]" />
        </div>

        {/* Telemetry Text */}
        <div className="text-center bg-zinc-950 px-6 py-3 border border-zinc-800 rounded-lg shadow-inner">
          <h3 className="font-black text-zinc-200 tracking-widest uppercase text-sm">Optical Scanner Active</h3>
          <p className="text-[10px] font-mono text-zinc-500 uppercase mt-1">Awaiting Barcode Input...</p>
        </div>
      </div>

      <style>{`
        @keyframes laser {
          0%, 100% { top: 10%; opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { top: 90%; }
        }
      `}</style>
    </div>
  )
}

// ─── OPERATION LOADER (Terminal Data Transfer) ────────────────────────────────
export function OperationLoader({ 
  operation, 
  progress, 
  message 
}: { 
  operation: string
  progress?: number
  message?: string 
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border-2 border-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        
        {/* Terminal Header */}
        <div className="flex items-center gap-2 pb-4 border-b border-zinc-800 mb-6">
          <Terminal className="w-4 h-4 text-orange-500" />
          <span className="text-[10px] font-mono font-bold text-zinc-500 tracking-widest uppercase">System Operation</span>
        </div>

        <div className="text-center space-y-2 mb-6">
          <Loader2 className="w-8 h-8 mx-auto text-orange-500 animate-spin mb-4" />
          <h3 className="text-lg font-black text-white uppercase tracking-wider">{operation}</h3>
          {message && (
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">{message}</p>
          )}
        </div>
        
        {progress !== undefined && (
          <div className="space-y-3 bg-zinc-900 p-3 rounded border border-zinc-800">
            <div className="flex justify-between text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
              <span>Transfer Rate</span>
              <span className="text-orange-400">{Math.round(progress)}%</span>
            </div>
            
            {/* Segmented Hardware Progress */}
            <div className="w-full bg-black/60 p-1 rounded shadow-inner border border-zinc-800">
              <div 
                className="bg-orange-600 h-2 rounded-[1px] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── INLINE LOADER ────────────────────────────────────────────────────────────
export function InlineLoader({ size = 'sm', className = '' }: { size?: 'xs' | 'sm' | 'md', className?: string }) {
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4', 
    md: 'w-5 h-5'
  }
  
  return (
    <Loader2 className={`animate-spin text-orange-500 ${sizeMap[size]} ${className}`} />
  )
}