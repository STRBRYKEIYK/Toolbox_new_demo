"use client"

import { useEffect, useRef } from 'react'
import { useToast } from '../hooks/use-toast'
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './ui/toast'
import { CheckCircle, AlertCircle, XCircle, Terminal, Loader2 } from 'lucide-react'

// Define our custom toast type
type EnhancedToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

// Heavy-duty hardware styling and LED icons
const getToastStyling = (toastType?: string) => {
  const baseClasses = "bg-zinc-950 border border-zinc-800 border-l-4 shadow-[0_15px_30px_rgba(0,0,0,0.8),inset_0_2px_10px_rgba(0,0,0,0.5)]"
  
  switch (toastType) {
    case 'success':
      return {
        icon: CheckCircle,
        className: `${baseClasses} border-l-emerald-500`,
        iconColor: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]",
        titleColor: "text-emerald-400"
      }
    case 'error':
      return {
        icon: XCircle,
        className: `${baseClasses} border-l-rose-500`,
        iconColor: "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]",
        titleColor: "text-rose-500"
      }
    case 'warning':
      return {
        icon: AlertCircle,
        className: `${baseClasses} border-l-amber-500`,
        iconColor: "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]",
        titleColor: "text-amber-400"
      }
    case 'loading':
      return {
        icon: Loader2,
        className: `${baseClasses} border-l-orange-500`,
        iconColor: "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]",
        titleColor: "text-orange-500"
      }
    default: // info
      return {
        icon: Terminal,
        className: `${baseClasses} border-l-orange-500`,
        iconColor: "text-zinc-400",
        titleColor: "text-zinc-200"
      }
  }
}

export function EnhancedToaster() {
  const { toasts } = useToast()
  const prevToastsRef = useRef<typeof toasts>([])

  useEffect(() => {
    prevToastsRef.current = toasts
  }, [toasts])

  return (
    <ToastProvider swipeDirection="right" duration={4000}>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const { toastType, ...restProps } = props as any
        const styling = getToastStyling(toastType)
        const IconComponent = styling.icon
        
        return (
          <Toast 
            key={id} 
            variant={variant}
            {...restProps}
            className={`${styling.className} transition-all duration-300 ease-out hover:scale-[1.02] animate-in slide-in-from-right-full fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[state=closed]:fade-out-0 pointer-events-auto rounded-none sm:rounded-md overflow-hidden`}
          >
            {/* Scanline overlay for that terminal feel */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />

            <div className="flex items-start gap-3 w-full pr-6 relative z-10">
              
              {/* LED Indicator */}
              <div className={`flex-shrink-0 mt-0.5 p-1 bg-black/50 rounded shadow-inner border border-zinc-800/50 ${styling.iconColor}`}>
                <IconComponent 
                  className={`h-4 w-4 ${
                    toastType === 'loading' ? 'animate-spin' : 'animate-in zoom-in-50 duration-300'
                  }`} 
                />
              </div>
              
              <div className="flex-1 space-y-1.5 min-w-0 py-0.5">
                {title && (
                  <ToastTitle className={`font-black font-mono text-[10px] tracking-widest uppercase break-words ${styling.titleColor}`}>
                    {title}
                  </ToastTitle>
                )}
                {description && (
                  <ToastDescription className="text-xs font-medium text-zinc-400 break-words leading-relaxed">
                    {description}
                  </ToastDescription>
                )}
              </div>
              
              {action && (
                <div className="flex-shrink-0 pl-2 border-l border-zinc-800 h-full flex items-center">
                  {action}
                </div>
              )}
            </div>
            
            <ToastClose className="absolute right-2 top-2 text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-sm p-0.5 transition-all duration-200" />
          </Toast>
        )
      })}
      
      <ToastViewport className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:top-20 sm:right-6 sm:max-w-[420px] md:max-w-[480px] sm:flex-col gap-3 pointer-events-none" />
    </ToastProvider>
  )
}

// Enhanced toast helper functions using custom props
export const enhancedToast = {
  success: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      toastType: 'success',
      duration: 4000,
    } as any)
  },
  
  error: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      variant: 'destructive',
      toastType: 'error',
      duration: 6000,
    } as any)
  },
  
  warning: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      toastType: 'warning',
      duration: 5000,
    } as any)
  },
  
  info: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      toastType: 'info',
      duration: 4000,
    } as any)
  },
  
  loading: (title: string, description?: string) => {
    const { toast } = useToast()
    return toast({
      title,
      description,
      toastType: 'loading',
      duration: 0, // Don't auto-dismiss loading toasts
    } as any)
  }
}

// Usage example helper
export const createActionToast = (
  title: string,
  description: string,
  actionText: string,
  onAction: () => void,
  toastType: EnhancedToastType = 'info'
) => {
  const { toast } = useToast()
  
  return toast({
    title,
    description,
    toastType,
    variant: toastType === 'error' ? 'destructive' : 'default',
    action: (
      <button
        onClick={onAction}
        className="inline-flex h-8 shrink-0 items-center justify-center rounded bg-zinc-900 px-3 text-[10px] font-black font-mono tracking-widest uppercase text-white border border-zinc-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] hover:bg-orange-600 hover:border-orange-500 transition-colors focus:outline-none focus:ring-1 focus:ring-orange-500"
      >
        {actionText}
      </button>
    ),
    duration: 8000,
  } as any)
}