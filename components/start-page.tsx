"use client"

import { useState } from "react"
import { 
  Settings, 
  Wifi, 
  WifiOff, 
  Package,
  Database,
  Check,
  AlertCircle,
  Loader2
} from "lucide-react"

import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { TipsAndTricks } from "./tips-and-tricks"

interface StartPageProps {
  onStart: () => void
  apiUrl: string
  onApiUrlChange: (url: string) => void
  isConnected: boolean
  apiError?: string | null
  isTestingConnection?: boolean
  hasCachedData?: boolean
  isDataLoading?: boolean
}

export function StartPage({
  onStart,
  apiUrl,
  onApiUrlChange,
  isConnected,
  apiError,
  isTestingConnection,
  hasCachedData = false,
  isDataLoading = false,
}: StartPageProps) {
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const logoSrc = `${import.meta.env.BASE_URL}ToolBoxlogo.png`

  const handleSaveSettings = () => {
    onApiUrlChange(tempApiUrl)
    setIsSettingsOpen(false)
  }

  const canStart = (isConnected || hasCachedData) && !isDataLoading

  // Status indicator with "LED" glow effects
  const getStatusInfo = () => {
    if (isTestingConnection || isDataLoading) {
      return { icon: Loader2, label: "CONNECTING...", color: "text-amber-400", glow: "shadow-[0_0_15px_rgba(251,191,36,0.3)]", spin: true }
    }
    if (isConnected) {
      return { icon: Check, label: "SYSTEM READY", color: "text-emerald-400", glow: "shadow-[0_0_15px_rgba(52,211,153,0.3)]", spin: false }
    }
    if (hasCachedData) {
      return { icon: Database, label: "OFFLINE MODE", color: "text-orange-400", glow: "shadow-[0_0_15px_rgba(251,146,60,0.3)]", spin: false }
    }
    return { icon: AlertCircle, label: "UNAVAILABLE", color: "text-rose-500", glow: "shadow-[0_0_15px_rgba(244,63,94,0.3)]", spin: false }
  }

  const status = getStatusInfo()
  const StatusIcon = status.icon

  return (
    <div className="min-h-screen industrial-gradient flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto bg-zinc-950">
      {/* Background decoration - WARM AMBER/ORANGE */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Restored physical card with heavier shadows */}
      <Card className="relative w-full max-w-sm my-4 industrial-card metallic-texture backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] border-t border-zinc-600/50 border-b-black/80">
        <CardContent className="pt-8 pb-6 px-6 space-y-6">
          
          {/* Logo & Title */}
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-24 h-24">
              {/* WARM GLOW */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-zinc-600/20 rounded-2xl blur-lg opacity-60"></div>
              {/* Beveled logo container */}
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-950 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.5)] industrial-border overflow-hidden ring-1 ring-black">
                <img 
                  src={logoSrc} 
                  alt="Toolbox Logo" 
                  className="w-16 h-16 object-contain drop-shadow-xl"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <Package className="w-10 h-10 text-zinc-500 hidden drop-shadow-xl" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-widest uppercase drop-shadow-md">Toolbox</h1>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Inventory System</p>
            </div>
          </div>

          {/* Main Status Display (Looks like a recessed LCD screen) */}
          <div className="flex flex-col items-center justify-center py-3 px-4 rounded-xl bg-black/60 shadow-[inset_0_4px_15px_rgba(0,0,0,0.8)] border border-zinc-800/80">
             <div className="flex items-center gap-2">
              <StatusIcon className={`w-4 h-4 ${status.color} ${status.spin ? 'animate-spin' : ''} drop-shadow-[0_0_5px_currentColor]`} />
              <span className={`text-sm font-black tracking-widest ${status.color} drop-shadow-[0_0_5px_currentColor]`}>{status.label}</span>
            </div>
          </div>

          {/* Connection Info (Physical Module slots) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_6px_rgba(0,0,0,0.4)] border border-zinc-700/30">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-md bg-black/50 shadow-inner ${isConnected ? 'ring-1 ring-orange-500/30' : ''}`}>
                  {isConnected ? (
                    <Wifi className="w-4 h-4 text-orange-400 drop-shadow-[0_0_3px_currentColor]" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-zinc-600" />
                  )}
                </div>
                <span className="text-sm font-bold text-zinc-300 tracking-wide uppercase">Server Uplink</span>
              </div>
              <span className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-sm border ${isConnected ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'bg-zinc-900/80 text-zinc-600 border-zinc-800'}`}>
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-gradient-to-b from-zinc-800/40 to-zinc-900/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_6px_rgba(0,0,0,0.4)] border border-zinc-700/30">
              <div className="flex items-center gap-3">
                 <div className={`p-1.5 rounded-md bg-black/50 shadow-inner ${hasCachedData ? 'ring-1 ring-orange-500/30' : ''}`}>
                  <Database className={`w-4 h-4 ${hasCachedData ? 'text-orange-400 drop-shadow-[0_0_3px_currentColor]' : 'text-zinc-600'}`} />
                </div>
                <span className="text-sm font-bold text-zinc-300 tracking-wide uppercase">Local Vault</span>
              </div>
              <span className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-sm border ${hasCachedData ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'bg-zinc-900/80 text-zinc-600 border-zinc-800'}`}>
                {hasCachedData ? 'READY' : 'EMPTY'}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {apiError && !isConnected && (
            <div className="p-3 rounded-lg bg-red-950/40 border-l-4 border-red-500 shadow-inner">
              <p className="text-xs font-semibold text-red-400">{apiError}</p>
            </div>
          )}

          {/* Tips and Tricks Component */}
          <div className="border-t border-zinc-700/50 pt-4 shadow-[0_-1px_0_rgba(0,0,0,0.5)]">
            <TipsAndTricks variant="inline" />
          </div>

          {/* Actions */}
          <div className="space-y-4 pt-2">
            <Button
              onClick={onStart}
              disabled={!canStart}
              className={`w-full h-14 font-black tracking-widest uppercase text-sm transition-all duration-200 
                ${canStart 
                  ? 'fabrication-gradient retro-button text-white shadow-[0_8px_20px_rgba(0,0,0,0.4),inset_0_2px_1px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_12px_25px_rgba(0,0,0,0.5),inset_0_2px_1px_rgba(255,255,255,0.2)] active:translate-y-1 active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.5)]' 
                  : 'bg-zinc-800 text-zinc-500 border-t border-zinc-700/30 shadow-[inset_0_4px_10px_rgba(0,0,0,0.4)]'
                }`}
            >
              {isDataLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin drop-shadow-md" />
                  Initializing...
                </>
              ) : canStart ? (
                'Open Toolbox'
              ) : (
                'System Locked'
              )}
            </Button>

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="w-full h-10 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-bold tracking-wide shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-transparent hover:border-zinc-700/50">
                  <Settings className="w-4 h-4 mr-2" />
                  Terminal Config
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm bg-zinc-900 border-2 border-zinc-700 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white font-black tracking-widest uppercase text-center border-b border-zinc-800 pb-4">API Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2 bg-black/40 p-4 rounded-xl shadow-inner border border-zinc-800">
                    <Label htmlFor="api-url" className="text-zinc-400 font-bold uppercase tracking-wider text-xs">Server Endpoint URL</Label>
                    <Input
                      id="api-url"
                      placeholder="https://api.example.com"
                      value={tempApiUrl}
                      onChange={(e) => setTempApiUrl(e.target.value)}
                      className="font-mono text-sm bg-zinc-950 border-zinc-700 text-white shadow-inner focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleSaveSettings} className="flex-1 fabrication-gradient retro-button text-white font-bold tracking-widest uppercase">
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="flex-1 border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 hover:text-white font-bold tracking-widest uppercase shadow-inner">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Footer */}
          <div className="flex justify-center items-center pt-2">
            <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-widest px-4 py-1 rounded-full bg-black/30 border border-zinc-800/50 shadow-inner">
              © {new Date().getFullYear()} JJC Eng • v2.4
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}