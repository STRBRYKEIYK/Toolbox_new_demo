'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from './use-toast'
import { apiService } from '../lib/api_service'

interface OfflineData {
  products: any[]
  employees: any[]
  lastSync: number
  version: string
}

interface SyncStatus {
  isOnline: boolean
  isServiceWorkerReady: boolean
  hasOfflineData: boolean
  lastSync: Date | null
  syncInProgress: boolean
  cacheStatus: {
    api: number
    static: number
    main: number
    total: number
  } | null
}

interface OfflineQueue {
  id: string
  type: 'cart_add' | 'cart_update' | 'cart_remove' | 'checkout'
  data: any
  timestamp: number
  retries: number
}

interface CheckoutQueueData {
  inventoryCheckouts: any[]
  checkoutBy?: string | null
  transactionData?: any
  summary?: {
    employeeName?: string
    totalItems?: number
  }
  inventorySynced?: boolean
  transactionSynced?: boolean
}

const OFFLINE_STORAGE_KEY = 'toolbox-offline-data'
const OFFLINE_QUEUE_KEY = 'toolbox-offline-queue'
const MAX_RETRIES = 3

export function useOfflineManager() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isServiceWorkerReady: false,
    hasOfflineData: false,
    lastSync: null,
    syncInProgress: false,
    cacheStatus: null
  })
  
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueue[]>([])
  const { toast } = useToast()

  const persistQueue = useCallback((queue: OfflineQueue[]) => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('toolbox-offline-queue-updated'))
      }
    } catch (error) {
      console.error('[Offline] Failed to save queue:', error)
    }
  }, [])

  // Check if we're online/offline
  const updateOnlineStatus = useCallback(() => {
    const isOnline = navigator.onLine
    
    setSyncStatus(prev => {
      const wasOffline = prev.isOnline === false
      
      if (isOnline && wasOffline) {
        console.log('[Offline] Back online - connection restored')
        // Process offline queue when coming back online  
        setTimeout(() => {
          // Will be handled by useEffect when isOnline changes
        }, 100)
      } else if (!isOnline && prev.isOnline === true) {
        console.log('[Offline] Going offline - will cache data')
      }
      
      return { ...prev, isOnline }
    })
  }, [toast])

  // Initialize service worker and offline detection
  useEffect(() => {
    // Check initial online status
    updateOnlineStatus()

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Register service worker - DISABLED due to API connection issues
    // if ('serviceWorker' in navigator) {
    //   registerServiceWorker()
    // }
    console.log('[Offline] Service worker disabled to fix API connection issues')
    setSyncStatus(prev => ({ ...prev, isServiceWorkerReady: true }))

    // Load offline queue from localStorage
    loadOfflineQueue()

    // Check for existing offline data
    checkOfflineDataStatus()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [updateOnlineStatus])

  // Service worker disabled to fix API connection issues

  // Store data for offline use
  const storeOfflineData = useCallback((type: 'products' | 'employees', data: any[]) => {
    try {
      const existingData = getOfflineData()
      const updatedData: OfflineData = {
        ...existingData,
        [type]: data,
        lastSync: Date.now(),
        version: '1.2.0'
      }

      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedData))
      
      setSyncStatus(prev => ({
        ...prev,
        hasOfflineData: true,
        lastSync: new Date()
      }))

      console.log(`[Offline] Stored ${data.length} ${type} for offline use`)
    } catch (error) {
      console.error('[Offline] Failed to store offline data:', error)
    }
  }, [])

  // Retrieve offline data
  const getOfflineData = useCallback((): OfflineData => {
    try {
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('[Offline] Failed to retrieve offline data:', error)
    }

    return {
      products: [],
      employees: [],
      lastSync: 0,
      version: '1.2.0'
    }
  }, [])

  // Add action to offline queue
  const queueOfflineAction = useCallback((
    type: OfflineQueue['type'],
    data: any
  ) => {
    const queueItem: OfflineQueue = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    }

    setOfflineQueue(prevQueue => {
      const newQueue = [...prevQueue, queueItem]
      persistQueue(newQueue)
      return newQueue
    })

    console.log('[Offline] Queued action:', type, queueItem.id)
  }, [persistQueue])

  // Process offline queue when connection returns
  const processOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0 || syncStatus.syncInProgress) {
      return
    }

    let networkOnline = syncStatus.isOnline || (typeof navigator !== 'undefined' ? navigator.onLine : false)
    if (!networkOnline) {
      const recovered = await apiService.testConnection()
      if (recovered) {
        networkOnline = true
        setSyncStatus(prev => ({ ...prev, isOnline: true }))
      }
    }

    if (!networkOnline) {
      return
    }

    const apiIsConnected = await apiService.testConnection()
    if (!apiIsConnected) {
      console.log('[Offline] Network is online but API is still unavailable. Queue processing deferred.')
      return
    }

    setSyncStatus(prev => ({ ...prev, syncInProgress: true }))

    try {
      const nextQueue: OfflineQueue[] = []
      let processedCount = 0

      for (const item of offlineQueue) {
        try {
          const { completed, updatedItem } = await processQueueItem(item)

          if (completed) {
            processedCount++
            console.log('[Offline] Processed queue item:', item.id, item.type)
          } else {
            nextQueue.push(updatedItem)
          }
        } catch (error) {
          console.error('[Offline] Failed to process queue item:', item.id, error)

          const statefulError = error as any
          const retryCount = item.retries + 1
          const updatedData = statefulError?.updatedData ?? item.data

          if (retryCount >= MAX_RETRIES) {
            processedCount++
            console.log('[Offline] Max retries reached for:', item.id)
          } else {
            nextQueue.push({
              ...item,
              retries: retryCount,
              data: updatedData
            })
          }
        }
      }

      setOfflineQueue(nextQueue)
      persistQueue(nextQueue)

      if (processedCount > 0) {
        toast({
          title: "✅ Sync Complete",
          description: `Processed ${processedCount} offline actions.${nextQueue.length > 0 ? ` ${nextQueue.length} still pending.` : ''}`,
        })
      }

    } finally {
      setSyncStatus(prev => ({ ...prev, syncInProgress: false }))
    }
  }, [syncStatus.isOnline, syncStatus.syncInProgress, offlineQueue, toast, persistQueue])

  // Process individual queue item
  const processQueueItem = async (item: OfflineQueue): Promise<{ completed: boolean; updatedItem: OfflineQueue }> => {
    switch (item.type) {
      case 'cart_add':
        // Process cart addition - would integrate with your cart system
        console.log('[Offline] Processing cart add:', item.data)
        return { completed: true, updatedItem: item }
        
      case 'cart_update':
        // Process cart update
        console.log('[Offline] Processing cart update:', item.data)
        return { completed: true, updatedItem: item }
        
      case 'cart_remove':
        // Process cart removal
        console.log('[Offline] Processing cart remove:', item.data)
        return { completed: true, updatedItem: item }
        
      case 'checkout': {
        const checkoutData: CheckoutQueueData = {
          inventoryCheckouts: Array.isArray(item.data?.inventoryCheckouts) ? item.data.inventoryCheckouts : [],
          checkoutBy: item.data?.checkoutBy ?? null,
          transactionData: item.data?.transactionData,
          summary: item.data?.summary,
          inventorySynced: Boolean(item.data?.inventorySynced),
          transactionSynced: Boolean(item.data?.transactionSynced)
        }

        if (!Array.isArray(checkoutData.inventoryCheckouts) || checkoutData.inventoryCheckouts.length === 0) {
          throw new Error('Invalid checkout queue payload: missing inventory checkouts')
        }

        try {
          if (!checkoutData.inventorySynced) {
            const inventoryResponse = await apiService.bulkCheckoutEmployeeInventory(
              checkoutData.inventoryCheckouts,
              checkoutData.checkoutBy ?? null
            )

            if (!inventoryResponse?.success) {
              throw new Error(inventoryResponse?.error || 'Employee inventory bulk checkout failed')
            }

            checkoutData.inventorySynced = true
          }

          if (checkoutData.transactionData && !checkoutData.transactionSynced) {
            const transactionSynced = await apiService.logTransaction(checkoutData.transactionData)
            if (!transactionSynced) {
              throw new Error('Transaction log sync failed')
            }
            checkoutData.transactionSynced = true
          }

          return {
            completed: true,
            updatedItem: {
              ...item,
              data: checkoutData
            }
          }
        } catch (error) {
          const statefulError = error as any
          statefulError.updatedData = checkoutData
          throw statefulError
        }
      }

      default:
        return { completed: true, updatedItem: item }
    }
  }

  // Load offline queue from storage
  const loadOfflineQueue = () => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
      if (stored) {
        const queue = JSON.parse(stored)
        const safeQueue = Array.isArray(queue) ? queue : []
        setOfflineQueue(safeQueue)
        console.log(`[Offline] Loaded ${safeQueue.length} queued actions`)
      }
    } catch (error) {
      console.error('[Offline] Failed to load offline queue:', error)
    }
  }

  useEffect(() => {
    const handleStorageQueueUpdate = (event: StorageEvent) => {
      if (event.key === OFFLINE_QUEUE_KEY) {
        loadOfflineQueue()
      }
    }

    const handleQueueUpdated = () => {
      loadOfflineQueue()
    }

    if (offlineQueue.length === 0 || syncStatus.syncInProgress) {
      window.addEventListener('storage', handleStorageQueueUpdate)
      window.addEventListener('toolbox-offline-queue-updated', handleQueueUpdated as EventListener)
      return () => {
        window.removeEventListener('storage', handleStorageQueueUpdate)
        window.removeEventListener('toolbox-offline-queue-updated', handleQueueUpdated as EventListener)
      }
    }

    const timeout = setTimeout(() => {
      processOfflineQueue().catch((error) => {
        console.error('[Offline] Auto-sync queue processing failed:', error)
      })
    }, 1000)

    window.addEventListener('storage', handleStorageQueueUpdate)
    window.addEventListener('toolbox-offline-queue-updated', handleQueueUpdated as EventListener)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('storage', handleStorageQueueUpdate)
      window.removeEventListener('toolbox-offline-queue-updated', handleQueueUpdated as EventListener)
    }
  }, [syncStatus.isOnline, syncStatus.syncInProgress, offlineQueue.length, processOfflineQueue])

  // Check if offline data exists
  const checkOfflineDataStatus = () => {
    const data = getOfflineData()
    const hasData = data.products.length > 0 || data.employees.length > 0
    
    setSyncStatus(prev => ({
      ...prev,
      hasOfflineData: hasData,
      lastSync: data.lastSync ? new Date(data.lastSync) : null
    }))
  }

  // Get cache status from service worker
  const getCacheStatus = async () => {
    if (!navigator.serviceWorker.controller) return

    try {
      const messageChannel = new MessageChannel()
      
      const statusPromise = new Promise<any>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data)
        }
      })

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      )

      const status = await statusPromise
      
      setSyncStatus(prev => ({
        ...prev,
        cacheStatus: status.error ? null : status
      }))

    } catch (error) {
      console.error('[Offline] Failed to get cache status:', error)
    }
  }

  // Clear all offline data and cache
  const clearOfflineData = async () => {
    try {
      // Clear localStorage
      localStorage.removeItem(OFFLINE_STORAGE_KEY)
      localStorage.removeItem(OFFLINE_QUEUE_KEY)
      
      // Clear service worker caches
      if (navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel()
        
        const clearPromise = new Promise<any>((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data)
          }
        })

        navigator.serviceWorker.controller.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        )

        await clearPromise
      }

      // Reset state
      setOfflineQueue([])
      setSyncStatus(prev => ({
        ...prev,
        hasOfflineData: false,
        lastSync: null,
        cacheStatus: null
      }))

      toast({
        title: "🗑️ Data Cleared",
        description: "All offline data and caches have been cleared.",
      })

    } catch (error) {
      console.error('[Offline] Failed to clear offline data:', error)
      toast({
        title: "❌ Clear Failed",
        description: "Failed to clear offline data. Please try again.",
      })
    }
  }

  // Prefetch critical data for offline use
  const prefetchData = async () => {
    if (!navigator.serviceWorker.controller) return

    try {
      const messageChannel = new MessageChannel()
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'PREFETCH_DATA' },
        [messageChannel.port2]
      )

      toast({
        title: "📥 Prefetching Data",
        description: "Downloading data for offline use...",
      })

    } catch (error) {
      console.error('[Offline] Failed to prefetch data:', error)
    }
  }

  return {
    // Status
    syncStatus,
    offlineQueue: offlineQueue.length,
    
    // Data management
    storeOfflineData,
    getOfflineData,
    
    // Queue management  
    queueOfflineAction,
    processOfflineQueue,
    
    // Cache management
    getCacheStatus,
    clearOfflineData,
    prefetchData,
    
    // Utilities
    isOffline: !syncStatus.isOnline,
    isReady: syncStatus.isServiceWorkerReady
  }
}