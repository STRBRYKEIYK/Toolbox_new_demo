"use client"

import { useState, useEffect } from "react"
import { Lightbulb, ChevronLeft, ChevronRight, Zap, Info, ShieldAlert, Cpu } from "lucide-react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Badge } from "./ui/badge"

interface Tip {
  id: string
  title: string
  content: string
  category: 'basic' | 'advanced' | 'productivity' | 'troubleshooting'
}

const tipsAndTricks: Tip[] = [
  {
    id: 'barcode-scanning',
    title: 'Optical Scanning',
    content: 'Initiate hardware or keyboard scanner to inject items into manifest. System automatically cross-references database for visual matches.',
    category: 'basic'
  },
  {
    id: 'bulk-operations',
    title: 'Mass Extraction',
    content: 'Utilize mechanical toggles to select target units. Execute mass extraction via the master console to process all targets simultaneously.',
    category: 'productivity'
  },
  {
    id: 'offline-mode',
    title: 'Vault Isolation',
    content: 'System remains operational during uplink failure. Buffer data is encrypted locally and injected into main ledger upon connection restore.',
    category: 'advanced'
  },
  {
    id: 'search-shortcuts',
    title: 'Rapid Telemetry',
    content: 'Tap [/] to override active focus and engage the manifest search terminal. Query by unit designation, origin, or class.',
    category: 'productivity'
  },
  {
    id: 'cart-persistence',
    title: 'Buffer Recovery',
    content: 'Active memory is shielded against power faults. System automatically writes buffer state to local storage for emergency recovery.',
    category: 'basic'
  },
  {
    id: 'employee-logs',
    title: 'Ledger Audit',
    content: 'Access raw system logs to audit personnel extraction events. Apply Boolean filters to isolate specific transaction anomalies.',
    category: 'advanced'
  },
  {
    id: 'theme-toggle',
    title: 'Terminal Optics',
    content: 'Override default UI optics via the terminal config switch. Preferences are written to local machine memory.',
    category: 'basic'
  },
  {
    id: 'keyboard-navigation',
    title: 'Manual Override',
    content: 'Bypass GUI interactions: [/] engages search override, [ESC] flushes active focus, [CTRL+K] initializes master command prompt.',
    category: 'productivity'
  }
]

interface TipsAndTricksProps {
  className?: string
  variant?: 'floating' | 'inline' | 'banner'
}

export function TipsAndTricks({ className = "", variant = 'floating' }: TipsAndTricksProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [viewedTips, setViewedTips] = useState<Set<string>>(new Set())
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)

  // Auto-rotate tips for both variants when not paused
  useEffect(() => {
    if ((variant === 'inline' && !isPaused) || (variant === 'banner' && !isPaused) || (variant === 'floating' && isOpen && !isPaused)) {
      const interval = setInterval(() => {
        setCurrentTipIndex(prev => (prev + 1) % tipsAndTricks.length)
      }, variant === 'inline' ? 8000 : variant === 'banner' ? 6000 : 10000)

      return () => clearInterval(interval)
    }
    return () => {}
  }, [variant, isOpen, isPaused])

  // Progress bar animation (Hardware segmented style)
  useEffect(() => {
    if ((variant === 'inline' && !isPaused) || (variant === 'banner' && !isPaused) || (variant === 'floating' && isOpen && !isPaused)) {
      const duration = variant === 'inline' ? 8000 : variant === 'banner' ? 6000 : 10000
      const interval = 100 
      const steps = duration / interval
      let currentStep = 0

      const progressInterval = setInterval(() => {
        currentStep++
        setProgress((currentStep / steps) * 100)
        
        if (currentStep >= steps) {
          currentStep = 0
          setProgress(0)
        }
      }, interval)

      return () => clearInterval(progressInterval)
    } else {
      setProgress(0)
    }
    return () => {}
  }, [variant, isOpen, isPaused, currentTipIndex])

  const markTipAsViewed = (tipId: string) => {
    const newViewedTips = new Set(viewedTips)
    newViewedTips.add(tipId)
    setViewedTips(newViewedTips)
    localStorage.setItem('toolbox-viewed-tips', JSON.stringify([...newViewedTips]))
  }

  const currentTip = tipsAndTricks[currentTipIndex]
  const isLastTip = currentTipIndex === tipsAndTricks.length - 1
  const isFirstTip = currentTipIndex === 0

  const nextTip = () => {
    if (!isLastTip) {
      setCurrentTipIndex(prev => prev + 1)
      setProgress(0)
    }
  }

  const prevTip = () => {
    if (!isFirstTip) {
      setCurrentTipIndex(prev => prev - 1)
      setProgress(0)
    }
  }

  // Hardware category styling
  const getCategoryConfig = (category: Tip['category']) => {
    switch (category) {
      case 'basic': return { color: 'text-blue-400', icon: Info, label: 'SYS_INFO' }
      case 'advanced': return { color: 'text-purple-400', icon: Cpu, label: 'CORE_LOGIC' }
      case 'productivity': return { color: 'text-emerald-400', icon: Zap, label: 'OPTIMIZATION' }
      case 'troubleshooting': return { color: 'text-amber-400', icon: ShieldAlert, label: 'DIAGNOSTICS' }
      default: return { color: 'text-zinc-400', icon: Info, label: 'GENERAL' }
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && currentTip) {
      markTipAsViewed(currentTip.id)
    }
  }

  // ─── FLOATING VARIANT (Hardware Terminal Modal) ───
  if (variant === 'floating') {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-9 px-3 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 font-black tracking-widest uppercase text-[10px] shadow-inner transition-all ${className}`}
          >
            <Lightbulb className="w-3.5 h-3.5 mr-2" />
            <span className="hidden sm:inline">System Broadcasts</span>
          </Button>
        </DialogTrigger>
        <DialogContent 
          className="sm:max-w-md bg-zinc-950 border-2 border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-0 overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <DialogHeader className="bg-zinc-900 border-b border-zinc-800 p-4">
            <DialogTitle className="flex items-center justify-between text-zinc-100 font-black tracking-widest uppercase text-sm">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-black/50 rounded shadow-inner border border-zinc-700">
                  <Zap className="w-4 h-4 text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.8)] animate-pulse" />
                </div>
                System Advisories
              </div>
              <Badge className="bg-zinc-950 text-zinc-400 border border-zinc-700 font-mono text-[10px]">
                {currentTipIndex + 1} / {tipsAndTricks.length}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 bg-black/40 shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)]">
            {currentTip && (
              <div className="space-y-4">
                
                {/* Meta Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const cfg = getCategoryConfig(currentTip.category);
                      const Icon = cfg.icon;
                      return (
                        <Badge className={`bg-zinc-900 border border-zinc-700 font-mono text-[9px] uppercase tracking-widest flex items-center gap-1.5 px-2 py-0.5 ${cfg.color}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </Badge>
                      )
                    })()}
                  </div>
                  
                  {/* Segmented Progress LED */}
                  <div className="w-24 bg-black/60 p-1 rounded border border-zinc-800 flex shadow-inner h-2">
                    <div 
                      className="bg-orange-600 rounded-[1px] transition-all duration-100 ease-linear shadow-[0_0_5px_rgba(234,88,12,0.5)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Readout */}
                <div className="bg-zinc-900 border border-zinc-700/50 rounded-lg p-4 shadow-inner">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2 border-b border-zinc-800 pb-2">
                    {currentTip.title}
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 leading-relaxed uppercase tracking-wide">
                    {currentTip.content}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-900 border-t border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevTip}
              disabled={isFirstTip}
              className="text-zinc-500 hover:text-white font-black tracking-widest uppercase text-[10px] disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>

            {/* LED array */}
            <div className="flex gap-1.5 p-1.5 bg-black/50 rounded border border-zinc-800 shadow-inner">
              {tipsAndTricks.map((_, index) => (
                <div
                  key={index}
                  className={`w-2.5 h-1.5 rounded-[1px] transition-colors ${
                    index === currentTipIndex ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)]' : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={nextTip}
              disabled={isLastTip}
              className="text-zinc-500 hover:text-white font-black tracking-widest uppercase text-[10px] disabled:opacity-30"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ─── BANNER VARIANT (Ticker Tape) ───
  if (variant === 'banner') {
    return (
      <div 
        className={`flex items-center gap-3 text-xs font-mono tracking-widest uppercase ${className}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
        {currentTip && (
          <span className="text-zinc-400">
            <strong className="text-orange-400 font-black">SYS_MSG:</strong> {currentTip.content}
          </span>
        )}
      </div>
    )
  }

  // ─── INLINE VARIANT (Recessed Data Plate) ───
  return (
    <div 
      className={`space-y-3 w-full ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header Area */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]" />
          <span className="text-sm font-black text-zinc-200 tracking-widest uppercase">System Broadcast</span>
        </div>
        
        {/* Mechanical Pagination Controls */}
        <div className="flex items-center gap-1 text-[10px] font-black font-mono text-zinc-500 bg-zinc-950 p-1 rounded border border-zinc-800 shadow-inner">
          <button 
            onClick={() => { prevTip(); if (currentTip) markTipAsViewed(currentTip.id); }}
            disabled={isFirstTip}
            className="p-1 rounded-sm hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="min-w-[4ch] text-center tracking-widest">
            {currentTipIndex + 1}<span className="text-zinc-700 mx-1">/</span>{tipsAndTricks.length}
          </span>
          <button 
            onClick={() => { nextTip(); if (currentTip) markTipAsViewed(currentTip.id); }}
            disabled={isLastTip}
            className="p-1 rounded-sm hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* The Data Plate */}
      {currentTip && (
        <div className="relative p-4 rounded-xl bg-black/40 border border-zinc-800 shadow-[inset_0_4px_15px_rgba(0,0,0,0.6)]">
          <div className="flex items-start gap-4">
            
            {/* Inner Icon Container */}
            <div className="mt-0.5 p-2 rounded-lg bg-zinc-900 border border-zinc-700 shadow-inner shrink-0">
              {(() => {
                const cfg = getCategoryConfig(currentTip.category);
                const Icon = cfg.icon;
                return <Icon className={`w-4 h-4 ${cfg.color}`} />
              })()}
            </div>
            
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-3">
                <h4 className="text-xs font-black text-zinc-200 tracking-widest uppercase">{currentTip.title}</h4>
                <div className="h-px flex-1 bg-gradient-to-r from-zinc-700 to-transparent"></div>
              </div>
              
              <p className="text-[10px] leading-relaxed text-zinc-400 font-mono uppercase tracking-wide">
                {currentTip.content}
              </p>

              {/* Recessed Progress Bar */}
              <div className="w-full bg-zinc-950 rounded p-0.5 border border-zinc-800 h-2 mt-3 shadow-inner">
                <div 
                  className="bg-zinc-600 h-full rounded-[1px] transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function useRandomTip() {
  const getRandomTip = () => {
    const randomIndex = Math.floor(Math.random() * tipsAndTricks.length)
    return tipsAndTricks[randomIndex]
  }

  return { getRandomTip, tipsAndTricks }
}