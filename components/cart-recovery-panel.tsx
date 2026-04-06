'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { useCartPersistence } from '../hooks/use-cart-persistence'
import { Clock, Download, Upload, History, HardDrive, RefreshCw, Trash2, Database, AlertTriangle } from 'lucide-react'
import { useToast } from '../hooks/use-toast'

interface CartRecoveryPanelProps {
  trigger?: React.ReactNode
}

export function CartRecoveryPanel({ trigger }: CartRecoveryPanelProps) {
  const { 
    cartState, 
    metadata, 
    history, 
    getCartSummary, 
    restoreFromHistory, 
    exportCart, 
    importCart,
    clearCart,
    refreshCart 
  } = useCartPersistence()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [importData, setImportData] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const { toast } = useToast()

  const handleExport = () => {
    try {
      const data = exportCart()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `toolbox-cart-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "DATA EXPORTED",
        description: "Manifest backup downloaded successfully",
        toastType: "success"
      } as any)
    } catch (error) {
      toast({
        title: "EXPORT FAILURE",
        description: "Unable to extract manifest data",
        variant: "destructive",
        toastType: "error"
      } as any)
    }
  }

  const handleImport = async () => {
    if (!importData.trim()) return
    
    setIsImporting(true)
    try {
      const success = await importCart(importData)
      if (success) {
        setImportData('')
        setIsDialogOpen(false)
        toast({
          title: "IMPORT SUCCESSFUL",
          description: "Manifest data restored to active memory",
          toastType: "success"
        } as any)
      }
    } finally {
      setIsImporting(false)
    }
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setImportData(content)
    }
    reader.readAsText(file)
  }

  const handleRestoreFromHistory = async (sessionId: string) => {
    const success = await restoreFromHistory(sessionId)
    if (success) {
      setIsDialogOpen(false)
      toast({
        title: "SYSTEM RESTORED",
        description: "Previous state loaded from vault",
        toastType: "success"
      } as any)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date).toUpperCase()
  }

  const summary = getCartSummary()

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-900 font-black tracking-widest uppercase text-[10px] h-8 shadow-inner">
      <History className="w-3.5 h-3.5 mr-2" />
      System Recovery
    </Button>
  )

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[85vh] p-0 bg-zinc-950 border-2 border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-xl flex flex-col overflow-hidden gap-0">
        
        {/* Hardware Header */}
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-900 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black/50 border border-zinc-700 rounded-lg flex items-center justify-center shadow-inner relative overflow-hidden">
               <Database className="w-6 h-6 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-widest uppercase text-zinc-100 drop-shadow-md">
                Data Diagnostics
              </DialogTitle>
              <p className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-500 mt-1">
                Manifest Persistence & System Recovery Utility
              </p>
            </div>
          </div>
        </DialogHeader>
        
        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-black/40 shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)] custom-scrollbar space-y-6">
          
          {/* Active Memory Status */}
          <Card className="bg-zinc-900 border-zinc-700/50 shadow-inner rounded-lg overflow-hidden">
            <CardHeader className="p-4 border-b border-zinc-800 bg-zinc-950/50">
              <CardTitle className="text-xs font-black tracking-widest uppercase text-zinc-300 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                Active Memory Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {cartState ? (
                <div className="space-y-4">
                  
                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] bg-zinc-800 border border-zinc-800 rounded">
                    <div className="bg-zinc-950 p-3">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Items In Buffer</div>
                      <div className="font-mono text-lg font-bold text-emerald-400">{summary.itemCount}</div>
                    </div>
                    <div className="bg-zinc-950 p-3">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Session Age</div>
                      <div className="font-mono text-xs font-bold text-zinc-300 mt-1.5">{summary.sessionAge.toUpperCase()}</div>
                    </div>
                    {metadata && (
                      <>
                        <div className="bg-zinc-950 p-3">
                          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Created</div>
                          <div className="font-mono text-[10px] font-bold text-zinc-400 mt-1.5">{formatDate(metadata.createdAt)}</div>
                        </div>
                        <div className="bg-zinc-950 p-3">
                          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Last Sync</div>
                          <div className="font-mono text-[10px] font-bold text-zinc-400 mt-1.5">{formatDate(metadata.lastAccessedAt)}</div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={refreshCart}
                      size="sm"
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600 font-black tracking-widest uppercase text-[10px]"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-2" />
                      Sync Buffer
                    </Button>
                    
                    <Button
                      onClick={() => clearCart()}
                      size="sm"
                      className="bg-rose-950/40 hover:bg-rose-900 text-rose-500 border border-rose-900/50 font-black tracking-widest uppercase text-[10px]"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Purge Memory
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-zinc-500 space-y-2">
                  <Database className="w-8 h-8 opacity-20" />
                  <span className="font-mono text-[10px] uppercase tracking-widest font-bold">NO ACTIVE DATA IN MEMORY</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export & Import */}
          <Card className="bg-zinc-900 border-zinc-700/50 shadow-inner rounded-lg overflow-hidden">
            <CardHeader className="p-4 border-b border-zinc-800 bg-zinc-950/50">
              <CardTitle className="text-xs font-black tracking-widest uppercase text-zinc-300 flex items-center gap-2">
                <Upload className="w-4 h-4 text-orange-500" />
                Manual Backup / Restore
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleExport}
                  disabled={!cartState || cartState.items.length === 0}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-black tracking-widest uppercase text-[10px] border-0"
                >
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Extract Payload
                </Button>
                
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                    id="cart-import-file"
                  />
                  <label htmlFor="cart-import-file">
                    <Button
                      asChild
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600 font-black tracking-widest uppercase text-[10px] cursor-pointer"
                    >
                      <span>
                        <Upload className="w-3.5 h-3.5 mr-2" />
                        Inject Payload
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              {importData && (
                <div className="space-y-3 bg-zinc-950 p-4 border border-orange-500/30 rounded shadow-inner relative">
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-mono text-orange-500 uppercase">
                    <AlertTriangle className="w-3 h-3" /> Raw Data Detected
                  </div>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="[ PASTE RAW JSON PAYLOAD HERE ]"
                    className="w-full h-32 p-3 bg-black border border-zinc-800 text-zinc-400 font-mono text-xs rounded shadow-inner focus:border-orange-500 focus:ring-1 focus:ring-orange-500 custom-scrollbar resize-none"
                  />
                  <div className="flex justify-end gap-3">
                    <Button
                      onClick={() => setImportData('')}
                      variant="ghost"
                      size="sm"
                      className="text-zinc-500 hover:text-zinc-300 font-black tracking-widest uppercase text-[10px]"
                    >
                      Clear Data
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={isImporting}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black tracking-widest uppercase text-[10px] border-0"
                    >
                      {isImporting ? 'Processing...' : 'Execute Injection'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart History (Local Vault) */}
          <Card className="bg-zinc-900 border-zinc-700/50 shadow-inner rounded-lg overflow-hidden">
            <CardHeader className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black tracking-widest uppercase text-zinc-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Local Vault History
              </CardTitle>
              <Badge className="bg-zinc-800 text-zinc-400 font-mono text-[9px] uppercase tracking-widest">
                {history.length} RECORDS
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {history.length > 0 ? (
                <div className="max-h-[30vh] overflow-y-auto custom-scrollbar divide-y divide-zinc-800/50">
                  {history.map((historyItem) => (
                    <div
                      key={historyItem.sessionId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors gap-4"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-zinc-200">
                            {historyItem.totalItems} UNITS
                          </span>
                          <span className={`text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded border ${
                            historyItem.sessionId.includes('history_') 
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {historyItem.sessionId.includes('history_') ? 'AUTO-SAVE' : 'MANUAL BACKUP'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                          {formatDate(historyItem.lastUpdated)}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handleRestoreFromHistory(historyItem.sessionId)}
                        size="sm"
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600 font-black tracking-widest uppercase text-[10px] shrink-0 w-full sm:w-auto"
                      >
                        Mount Data
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-600 font-mono text-[10px] uppercase tracking-widest font-bold flex flex-col items-center gap-2">
                  <Clock className="w-6 h-6 opacity-30" />
                  NO VAULT RECORDS FOUND
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Diagnostics */}
          {metadata && (
            <div className="bg-zinc-950 p-4 border border-zinc-800 rounded shadow-inner flex flex-wrap gap-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="text-zinc-600">CLIENT_OS:</span> 
                <span className="text-zinc-300 font-bold">{metadata.deviceInfo.platform}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-600">ENGINE:</span> 
                <span className="text-zinc-300 font-bold">
                  {
                    metadata.deviceInfo.userAgent.includes('Chrome') ? 'CHROME' :
                    metadata.deviceInfo.userAgent.includes('Firefox') ? 'FIREFOX' :
                    metadata.deviceInfo.userAgent.includes('Safari') ? 'SAFARI' :
                    metadata.deviceInfo.userAgent.includes('Edge') ? 'EDGE' :
                    'UNKNOWN_ENV'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-600">SYS_VER:</span> 
                <span className="text-zinc-300 font-bold">{metadata.version}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <style>{`
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

/**
 * Quick hardware status indicator for header
 */
export function CartStatusIndicator() {
  const { cartState, isLoading } = useCartPersistence()
  
  if (isLoading) return null
  if (!cartState || cartState.items.length === 0) return null
  
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded shadow-inner shrink-0">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)] animate-pulse" />
      <span className="text-[9px] font-mono font-black text-zinc-300 uppercase tracking-widest hidden sm:inline">
        {cartState.totalItems} UNITS BUFFERED
      </span>
      <span className="text-[9px] font-mono font-black text-zinc-300 uppercase tracking-widest sm:hidden">
        {cartState.totalItems} IN BUF
      </span>
    </div>
  )
}