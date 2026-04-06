"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, ArrowRight, ShoppingCart, Terminal, Database, Activity } from "lucide-react"
import { Button } from "./ui/button"

interface CheckoutSuccessCountdownProps {
  isOpen: boolean
  onContinueBrowsing: () => void
  onStayInCart: () => void
  userId: string
  totalItems: number
  countdownSeconds?: number
}

// ─── Hardware Segmented LED Bar ──────────────────────────────────────────────
function SegmentedCountdown({ current, total }: { current: number; total: number }) {
  const segments = 10
  const filled = Math.ceil((current / total) * segments)
  
  return (
    <div className="flex gap-1 w-full h-2">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={`h-full flex-1 rounded-[1px] transition-all duration-300 ${
            i < filled 
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]' 
              : 'bg-zinc-800'
          }`}
        />
      ))}
    </div>
  )
}

export function CheckoutSuccessCountdown({
  isOpen,
  onContinueBrowsing,
  onStayInCart,
  userId,
  totalItems,
  countdownSeconds = 5,
}: CheckoutSuccessCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds)
  const [isSkipped, setIsSkipped] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(countdownSeconds)
      setIsSkipped(false)
      return
    }

    if (isSkipped) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onStayInCart()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, onStayInCart, countdownSeconds, isSkipped])

  const handleContinueBrowsing = () => {
    setIsSkipped(true)
    onContinueBrowsing()
  }

  const handleStayInCart = () => {
    setIsSkipped(true)
    onStayInCart()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6">
      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-10"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)' }} />

      <div className="w-full max-w-md bg-zinc-950 border-2 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,1)] rounded-sm overflow-hidden flex flex-col relative">
        
        {/* Hardware Top Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-100">Operation Log</h2>
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest leading-none">Manifest_Commit_Finalized</p>
          </div>
        </div>

        <div className="p-6 sm:p-8 text-center space-y-6 bg-black/20">
          {/* Success Icon Module */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
              <div className="relative w-16 h-16 bg-zinc-900 border-2 border-emerald-900/50 rounded-sm flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              </div>
            </div>
          </div>

          {/* Success Message Readout */}
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white uppercase tracking-widest">Execution Complete</h2>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tight">Payload successfully injected into master ledger</p>
          </div>

          {/* Recessed Data Plate */}
          <div className="bg-black/60 border border-zinc-800 rounded-sm p-4 space-y-3 shadow-inner">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Operator_ID
              </span>
              <span className="text-xs font-mono font-bold text-zinc-200">{userId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-2">
                <Database className="w-3 h-3" /> Units_Extracted
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.4)]">
                {totalItems} PCS
              </span>
            </div>
          </div>

          {/* Hardware Auto-Reset Sequence */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-end px-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                Auto-Reset Sequence
              </p>
              <p className="text-[10px] font-mono font-bold text-emerald-500 animate-pulse uppercase">
                T-Minus 0{timeLeft}s
              </p>
            </div>
            <div className="bg-zinc-900/50 p-1 border border-zinc-800 rounded-sm shadow-inner">
              <SegmentedCountdown current={timeLeft} total={countdownSeconds} />
            </div>
          </div>

          {/* Action Toggle Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <Button
              onClick={handleStayInCart}
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 text-zinc-400 font-black text-[10px] tracking-widest uppercase rounded-sm transition-all active:translate-y-px"
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-2" />
              Hold Manifest
            </Button>

            <Button
              onClick={handleContinueBrowsing}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 border-0 text-white font-black text-[10px] tracking-widest uppercase rounded-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:translate-y-px"
            >
              New Extraction
              <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </Button>
          </div>
        </div>

        {/* Footer Hardware Branding */}
        <div className="bg-zinc-950 px-6 py-3 border-t border-zinc-900 flex justify-center">
          <span className="text-[8px] font-mono text-zinc-700 tracking-[0.4em] uppercase">System_State: Standby</span>
        </div>
      </div>
    </div>
  )
}