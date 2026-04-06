import type { Product } from './barcode-scanner'

export interface DemoConnectionStatus {
  isConnected: boolean
  lastTestTime: number | null
  lastTestDate: string | null
  timeSinceLastTest: number | null
  baseUrl: string
}

export interface DemoTransactionFilters {
  username?: string
  date_from?: string
  date_to?: string
  search?: string
  limit?: number
  offset?: number
}

export interface DemoTransactionResponse {
  data: DemoLogRecord[]
  total: number
  limit: number
  offset: number
  filters: {
    username?: string
    date_from?: string
    date_to?: string
    search?: string
  }
}

export interface DemoTransactionStats {
  period_days: number
  total_logs: number
  recent_logs: number
  active_users: number
  logs_by_day: Array<{
    log_date: string
    log_count: number
    unique_users: number
  }>
  top_users: Array<{
    username: string
    log_count: number
    last_activity: string
  }>
}

export interface DemoEmployeeValidationResult {
  valid: boolean
  employee: DemoEmployeeRecord | null
  error?: string
  message?: string
}

export interface DemoDetailedConnectionResult {
  success: boolean
  baseUrl: string
  timestamp: string
  responseTime: number
  status: number | null
  statusText: string | null
  error: string | null
  details: any
}

export interface DemoEndpointTestResults {
  overall: boolean
  timestamp: string
  endpoints: Array<{
    name: string
    path: string
    success: boolean
    status?: number
    responseTime: number
    error?: string
  }>
}

export interface DemoLogRecord {
  id: number
  username: string
  id_number?: string
  id_barcode?: string
  details?: string
  log_date: string
  log_time: string
  purpose?: string
  item_no?: string
  created_at?: string
  items_json?: string
  status?: string
}

export interface DemoEmployeeRecord {
  id: number
  firstName: string
  lastName: string
  middleName?: string
  fullName: string
  idNumber: string
  idBarcode: string
  position: string
  department: string
  status: string
  profilePicture?: string
  pin?: string
}

interface DemoInventoryRecord extends Product {
  item_no: string
  item_name: string
  item_type: string
  item_status: string
  min_stock: number
  created_at: string
  updated_at: string
  images: string[]
}

interface DemoJobOrderOperation {
  id: number
  name: string
  expected_hours: number | null
  completed: boolean
  employees: Array<{ employee_id: number; employee_full_name: string }>
  shifts?: Array<{ hours_rendered: number }>
  materials?: Array<{ item_no?: string; name: string; quantity: number; unit: string; notes?: string }>
}

interface DemoJobOrder {
  id: number
  jo_number: string | null
  description: string
  customer: string | null
  status: string
  operations: DemoJobOrderOperation[]
}

interface DemoState {
  baseUrl: string
  lastTestTime: number | null
  items: DemoInventoryRecord[]
  employees: DemoEmployeeRecord[]
  logs: DemoLogRecord[]
  jobOrders: DemoJobOrder[]
  requestCounter: number
  imageCache: Map<number, string[]>
}

type DemoListener = (data: any) => void

const initialItems: DemoInventoryRecord[] = [
  { id: '1', item_no: '1', item_name: 'Hex Bolt M8', name: 'Hex Bolt M8', brand: 'EverFix', item_type: 'Fasteners', location: 'Aisle 1 / Bin 4', balance: 148, quantity: 1, status: 'in-stock', item_status: 'In Stock', min_stock: 25, created_at: '2026-03-12T08:00:00.000Z', updated_at: '2026-04-05T11:10:00.000Z', images: ['hex-bolt-m8.svg'] },
  { id: '2', item_no: '2', item_name: 'Cordless Drill 18V', name: 'Cordless Drill 18V', brand: 'ForgeLine', item_type: 'Power Tools', location: 'Tool Cage / Rack B', balance: 12, quantity: 1, status: 'in-stock', item_status: 'In Stock', min_stock: 5, created_at: '2026-02-01T08:00:00.000Z', updated_at: '2026-04-05T11:00:00.000Z', images: ['cordless-drill-18v.svg'] },
  { id: '3', item_no: '3', item_name: 'Cutting Disc 4.5in', name: 'Cutting Disc 4.5in', brand: 'ApexPro', item_type: 'Consumables', location: 'Store Room / Shelf 2', balance: 4, quantity: 1, status: 'low-stock', item_status: 'Low Stock', min_stock: 10, created_at: '2026-03-18T08:00:00.000Z', updated_at: '2026-04-05T10:45:00.000Z', images: ['cutting-disc-4-5.svg'] },
  { id: '4', item_no: '4', item_name: 'Safety Gloves XL', name: 'Safety Gloves XL', brand: 'SafeGrip', item_type: 'PPE', location: 'PPE Cabinet', balance: 54, quantity: 1, status: 'in-stock', item_status: 'In Stock', min_stock: 20, created_at: '2026-01-20T08:00:00.000Z', updated_at: '2026-04-04T15:30:00.000Z', images: ['safety-gloves-xl.svg'] },
  { id: '5', item_no: '5', item_name: 'Welding Rod 3.2mm', name: 'Welding Rod 3.2mm', brand: 'ArcCore', item_type: 'Welding Supplies', location: 'Welding Bay / Shelf 1', balance: 0, quantity: 1, status: 'out-of-stock', item_status: 'Out of Stock', min_stock: 15, created_at: '2025-12-10T08:00:00.000Z', updated_at: '2026-04-03T13:25:00.000Z', images: ['welding-rod-3-2.svg'] },
  { id: '6', item_no: '6', item_name: 'Measuring Tape 8m', name: 'Measuring Tape 8m', brand: 'MetricPro', item_type: 'Hand Tools', location: 'Aisle 2 / Bin 1', balance: 31, quantity: 1, status: 'in-stock', item_status: 'In Stock', min_stock: 10, created_at: '2026-03-05T08:00:00.000Z', updated_at: '2026-04-05T08:40:00.000Z', images: ['measuring-tape-8m.svg'] },
  { id: '7', item_no: '7', item_name: 'Machine Oil 1L', name: 'Machine Oil 1L', brand: 'HydraLube', item_type: 'Lubricants', location: 'Chemical Store', balance: 19, quantity: 1, status: 'in-stock', item_status: 'In Stock', min_stock: 8, created_at: '2026-02-13T08:00:00.000Z', updated_at: '2026-04-01T09:10:00.000Z', images: ['machine-oil-1l.svg'] },
  { id: '8', item_no: '8', item_name: 'Allen Key Set', name: 'Allen Key Set', brand: 'HexaCraft', item_type: 'Hand Tools', location: 'Tool Wall / Hook 7', balance: 7, quantity: 1, status: 'low-stock', item_status: 'Low Stock', min_stock: 10, created_at: '2026-02-21T08:00:00.000Z', updated_at: '2026-04-05T09:55:00.000Z', images: ['allen-key-set.svg'] },
  { id: '9', item_no: '9', item_name: 'Electrical Tape Black', name: 'Electrical Tape Black', brand: 'VoltSafe', item_type: 'Electrical', location: 'Electrical Cabinet', balance: 76, quantity: 1, status: 'in-stock', item_status: 'In Stock', min_stock: 20, created_at: '2026-03-01T08:00:00.000Z', updated_at: '2026-04-05T12:05:00.000Z', images: ['electrical-tape-black.svg'] },
  { id: '10', item_no: '10', item_name: 'Nitrile Gloves Large', name: 'Nitrile Gloves Large', brand: 'SafeGrip', item_type: 'PPE', location: 'PPE Cabinet', balance: 21, quantity: 1, status: 'in-stock', item_status: 'In Stock', min_stock: 12, created_at: '2026-03-28T08:00:00.000Z', updated_at: '2026-04-05T10:30:00.000Z', images: ['nitrile-gloves-large.svg'] },
]

const initialEmployees: DemoEmployeeRecord[] = [
  { id: 101, firstName: 'Mara', lastName: 'Santos', fullName: 'Mara Santos', idNumber: 'EMP-101', idBarcode: 'E101', position: 'Warehouse Lead', department: 'Operations', status: 'Active', pin: '1010' },
  { id: 102, firstName: 'Rico', lastName: 'Dela Cruz', fullName: 'Rico Dela Cruz', idNumber: 'EMP-102', idBarcode: 'E102', position: 'Fabricator', department: 'Production', status: 'Active', pin: '1020' },
  { id: 103, firstName: 'Lia', lastName: 'Reyes', fullName: 'Lia Reyes', idNumber: 'EMP-103', idBarcode: 'E103', position: 'Inventory Clerk', department: 'Logistics', status: 'Active', pin: '1030' },
  { id: 104, firstName: 'Noel', lastName: 'Garcia', fullName: 'Noel Garcia', idNumber: 'EMP-104', idBarcode: 'E104', position: 'Maintenance Technician', department: 'Maintenance', status: 'Active', pin: '1040' },
  { id: 105, firstName: 'Ivy', lastName: 'Mendoza', fullName: 'Ivy Mendoza', idNumber: 'EMP-105', idBarcode: 'E105', position: 'Safety Officer', department: 'Safety', status: 'Active', pin: '1050' },
]

const initialLogs: DemoLogRecord[] = [
  { id: 2001, username: 'Mara Santos', id_number: 'EMP-101', id_barcode: 'E101', details: 'Checkout: 2 items - Cordless Drill 18V x1, Measuring Tape 8m x1', log_date: '2026-04-06', log_time: '08:05:00', purpose: 'Site inspection', item_no: '2;6', created_at: '2026-04-06T08:05:00.000Z', items_json: '[]', status: 'ACTIVE' },
  { id: 2002, username: 'Rico Dela Cruz', id_number: 'EMP-102', id_barcode: 'E102', details: 'Stock update: Welding Rod 3.2mm adjusted to zero during demo sync', log_date: '2026-04-05', log_time: '16:20:00', purpose: 'Inventory adjustment', item_no: '5', created_at: '2026-04-05T16:20:00.000Z', items_json: '[]', status: 'ACTIVE' },
  { id: 2003, username: 'Lia Reyes', id_number: 'EMP-103', id_barcode: 'E103', details: 'Material request: Safety Gloves XL x3 for production shift', log_date: '2026-04-05', log_time: '10:14:00', purpose: 'Production shift', item_no: '4', created_at: '2026-04-05T10:14:00.000Z', items_json: '[]', status: 'ACTIVE' },
  { id: 2004, username: 'Noel Garcia', id_number: 'EMP-104', id_barcode: 'E104', details: 'Checkout: 1 items - Allen Key Set x1', log_date: '2026-04-04', log_time: '13:45:00', purpose: 'Machine maintenance', item_no: '8', created_at: '2026-04-04T13:45:00.000Z', items_json: '[]', status: 'ACTIVE' },
]

const initialJobOrders: DemoJobOrder[] = [
  {
    id: 501,
    jo_number: 'JO-2504-01',
    description: 'Assembly line retrofit',
    customer: 'North Harbor Fabrication',
    status: 'open',
    operations: [
      { id: 9001, name: 'Drill fixture prep', expected_hours: 12, completed: false, employees: [{ employee_id: 101, employee_full_name: 'Mara Santos' }], shifts: [{ hours_rendered: 7.5 }], materials: [{ item_no: '2', name: 'Cordless Drill 18V', quantity: 1, unit: 'unit' }] },
      { id: 9002, name: 'Fastener install', expected_hours: 18, completed: false, employees: [{ employee_id: 102, employee_full_name: 'Rico Dela Cruz' }], shifts: [{ hours_rendered: 8 }], materials: [{ item_no: '1', name: 'Hex Bolt M8', quantity: 120, unit: 'pcs' }] },
    ],
  },
  {
    id: 502,
    jo_number: 'JO-2504-02',
    description: 'PPE replenishment',
    customer: 'Internal Safety Batch',
    status: 'open',
    operations: [
      { id: 9003, name: 'Safety issue and log', expected_hours: 6, completed: false, employees: [{ employee_id: 105, employee_full_name: 'Ivy Mendoza' }], shifts: [{ hours_rendered: 4.5 }], materials: [{ item_no: '4', name: 'Safety Gloves XL', quantity: 6, unit: 'pairs' }] },
    ],
  },
]

const state: DemoState = {
  baseUrl: 'demo://toolbox',
  lastTestTime: Date.now(),
  items: initialItems,
  employees: initialEmployees,
  logs: initialLogs,
  jobOrders: initialJobOrders,
  requestCounter: 3000,
  imageCache: new Map<number, string[]>(),
}

const listeners = new Map<string, Set<DemoListener>>()

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function createStatus(balance: number): Product['status'] {
  if (balance <= 0) return 'out-of-stock'
  if (balance <= 5) return 'low-stock'
  return 'in-stock'
}

function normalizeDateInput(value?: string): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function emit(event: string, data?: any) {
  const callbacks = listeners.get(event)
  if (!callbacks) return
  callbacks.forEach((callback) => {
    try {
      callback(clone(data))
    } catch (error) {
      console.error(`[DemoBackend] listener failed for ${event}:`, error)
    }
  })
}

function emitInventoryChange(type: string, payload?: any) {
  emit(type, payload)
  emit('inventory:refresh', { type, ...clone(payload) })
}

function emitTransactionChange(type: string, payload?: any) {
  emit(type, payload)
  emit('transaction_created', payload)
  emit('inventory:logs:refresh', payload)
}

function buildItemImageDataUrl(item: DemoInventoryRecord, suffix = 'latest'): string {
  const label = `${item.name} ${suffix}`.replace(/&/g, '&amp;')
  const fill = item.status === 'out-of-stock' ? '#ef4444' : item.status === 'low-stock' ? '#f59e0b' : '#f97316'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>
      <rect width="640" height="640" rx="36" fill="url(#bg)" />
      <rect x="48" y="48" width="544" height="544" rx="28" fill="none" stroke="${fill}" stroke-width="8" stroke-dasharray="18 14" opacity="0.7" />
      <text x="320" y="235" fill="#f8fafc" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">${item.brand}</text>
      <text x="320" y="320" fill="#cbd5e1" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30">${label}</text>
      <text x="320" y="395" fill="${fill}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="120" font-weight="900">${item.item_no}</text>
      <text x="320" y="475" fill="#94a3b8" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22">DEMO IMAGE</text>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function getDemoImageList(itemId: number): string[] {
  if (!state.imageCache.has(itemId)) {
    const item = state.items.find((entry) => Number(entry.item_no) === itemId || Number(entry.id) === itemId)
    if (!item) {
      state.imageCache.set(itemId, [])
    } else {
      state.imageCache.set(itemId, item.images.map((image) => buildItemImageDataUrl(item, image)))
    }
  }

  return state.imageCache.get(itemId) || []
}

function updateItemRecord(itemId: number, quantityDelta: number) {
  const item = state.items.find((entry) => Number(entry.item_no) === itemId || Number(entry.id) === itemId)
  if (!item) throw new Error(`Item ${itemId} not found`)

  item.balance = Math.max(0, item.balance + quantityDelta)
  item.status = createStatus(item.balance)
  item.item_status = item.status.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase())
  item.updated_at = new Date().toISOString()
  emitInventoryChange('item_updated', { itemId: item.item_no, balance: item.balance })
  return item
}

function createDemoLogEntry(data: Partial<DemoLogRecord> & { username: string; details: string }): DemoLogRecord {
  const now = new Date()
  const entry: DemoLogRecord = {
    id: ++state.requestCounter,
    username: data.username,
    id_number: data.id_number,
    id_barcode: data.id_barcode,
    details: data.details,
    log_date: data.log_date || now.toISOString().split('T')[0] || '',
    log_time: data.log_time || `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    purpose: data.purpose,
    item_no: data.item_no,
    created_at: now.toISOString(),
    items_json: data.items_json,
    status: data.status || 'ACTIVE',
  }

  state.logs.unshift(entry)
  emitTransactionChange('log_created', entry)
  return entry
}

function filterLogs(filters: DemoTransactionFilters = {}): DemoLogRecord[] {
  const search = filters.search?.trim().toLowerCase()
  const username = filters.username?.trim().toLowerCase()
  const fromDate = normalizeDateInput(filters.date_from)
  const toDate = normalizeDateInput(filters.date_to)

  return state.logs.filter((log) => {
    if (username && !(log.username || '').toLowerCase().includes(username)) return false
    if (search) {
      const haystack = [log.username, log.details, log.purpose, log.item_no, log.id_number, log.id_barcode].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(search)) return false
    }

    if (fromDate || toDate) {
      const logDate = normalizeDateInput(log.log_date)
      if (!logDate) return false
      const time = logDate.getTime()
      if (fromDate && time < fromDate.getTime()) return false
      if (toDate) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        if (time > end.getTime()) return false
      }
    }

    return true
  })
}

function sortLogs(logs: DemoLogRecord[]): DemoLogRecord[] {
  return [...logs].sort((left, right) => {
    const leftTime = new Date(left.created_at || `${left.log_date}T${left.log_time}`).getTime()
    const rightTime = new Date(right.created_at || `${right.log_date}T${right.log_time}`).getTime()
    return rightTime - leftTime
  })
}

function getJobOrderSummaryText(items: Array<{ name: string; quantity: number }>): string {
  return items.map((item) => `${item.name} x${item.quantity}`).join(', ')
}

export const SOCKET_ROOMS = {
  INVENTORY: 'inventory',
  PROCUREMENT: 'procurement',
} as const

export const SOCKET_EVENTS = {
  INVENTORY: {
    UPDATED: 'inventory:item_updated',
    INSERTED: 'inventory:item_inserted',
    REMOVED: 'inventory:item_removed',
    ITEM_CREATED: 'item_created',
    ITEM_UPDATED: 'item_updated',
    ITEM_DELETED: 'item_deleted',
    CHECKOUT_COMPLETED: 'inventory:checkout_completed',
    LOG_CREATED: 'inventory:log_created',
  },
  PROCUREMENT: {
    PO_CREATED: 'procurement:po_created',
    PO_UPDATED: 'procurement:po_updated',
    PO_DELETED: 'procurement:po_deleted',
    PO_STATUS_CHANGED: 'procurement:po_status_changed',
    PO_APPROVED: 'procurement:po_approved',
    PO_REJECTED: 'procurement:po_rejected',
    PO_RECEIVED: 'procurement:po_received',
  },
} as const

export const pollingManager = {
  isConnected: true,
  joinRoom(_room: string) {
    return true
  },
  subscribeToUpdates(event: string, callback: DemoListener) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set())
    }
    const eventListeners = listeners.get(event)!
    eventListeners.add(callback)

    return () => {
      eventListeners.delete(callback)
      if (eventListeners.size === 0) {
        listeners.delete(event)
      }
    }
  },
  ping() {
    emit('inventory:refresh', { source: 'ping' })
    emit('procurement:refresh', { source: 'ping' })
    return true
  },
}

export const demoBackend = {
  async fetchItems(options: { limit?: number } = { limit: 1000 }) {
    const limit = options.limit ?? 1000
    return clone(state.items.slice(0, limit).map((item) => clone(item)))
  },

  async updateItemQuantity(itemId: number, updateType: 'set_balance' | 'adjust_in' | 'adjust_out' | 'manual', value: number) {
    const current = state.items.find((entry) => Number(entry.item_no) === itemId || Number(entry.id) === itemId)
    if (!current) throw new Error(`Item ${itemId} not found`)

    switch (updateType) {
      case 'set_balance':
      case 'manual':
        current.balance = Math.max(0, value)
        break
      case 'adjust_in':
        current.balance = Math.max(0, current.balance + Math.max(0, value))
        break
      case 'adjust_out':
        current.balance = Math.max(0, current.balance - Math.max(0, value))
        break
    }

    current.status = createStatus(current.balance)
    current.item_status = current.status.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase())
    current.updated_at = new Date().toISOString()
    emitInventoryChange('item_updated', { itemId: current.item_no, updateType, balance: current.balance })
    return clone(current)
  },

  async recordItemOut(itemId: number, data: { quantity: number; out_by?: string; notes?: string; item_name?: string }) {
    const item = updateItemRecord(itemId, -Math.max(0, data.quantity || 0))
    const log = createDemoLogEntry({
      username: data.out_by || 'Demo User',
      details: `Stock update: ${item.item_name} reduced by ${data.quantity}${data.notes ? ` (${data.notes})` : ''}`,
      purpose: data.notes || 'Inventory adjustment',
      item_no: item.item_no,
      items_json: JSON.stringify([{ id: item.item_no, name: item.item_name, qty: data.quantity }]),
    })
    emitInventoryChange('stock_removed', { itemId: item.item_no, quantity: data.quantity })
    return { success: true, item: clone(item), log }
  },

  async bulkCheckout(items: any[], options?: { checkout_by?: string; notes?: string }) {
    const checkoutBy = options?.checkout_by || 'Demo User'
    const checkoutItems = items.map((entry) => {
      const itemId = Number(entry.id ?? entry.itemId ?? entry.item_no)
      const quantity = Math.max(0, Number(entry.quantity ?? 1))
      const item = updateItemRecord(itemId, -quantity)
      return { itemId: item.item_no, name: item.item_name, quantity, balance: item.balance }
    })

    createDemoLogEntry({
      username: checkoutBy,
      details: `Checkout: ${checkoutItems.length} items - ${getJobOrderSummaryText(checkoutItems)}`,
      purpose: options?.notes || 'Bulk checkout',
      item_no: checkoutItems.map((entry) => entry.itemId).join(';'),
      items_json: JSON.stringify(checkoutItems),
    })

    emitInventoryChange('inventory:checkout_completed', { items: checkoutItems, checkoutBy })
    return { success: true, items: checkoutItems }
  },

  async getItemImages(itemId: number) {
    return getDemoImageList(itemId).map((url, index) => ({ filename: `demo-${itemId}-${index + 1}.svg`, url }))
  },

  async uploadItemImage(itemId: number, imageFile: File) {
    const item = state.items.find((entry) => Number(entry.item_no) === itemId || Number(entry.id) === itemId)
    if (!item) throw new Error(`Item ${itemId} not found`)
    const url = buildItemImageDataUrl(item, imageFile.name || 'uploaded')
    item.images = [imageFile.name || 'uploaded']
    state.imageCache.set(itemId, [url])
    emitInventoryChange('item_updated', { itemId: item.item_no, imageUploaded: true })
    return { success: true, url }
  },

  async deleteItemImage(itemId: number) {
    state.imageCache.set(itemId, [])
    emitInventoryChange('item_updated', { itemId, imageDeleted: true })
    return { success: true }
  },

  getItemLatestImageUrl(itemId: number) {
    return getDemoImageList(itemId)[0] || ''
  },

  getItemImageUrl(itemId: number, filename: string) {
    return getDemoImageList(itemId)[0] || buildItemImageDataUrl(state.items[0], filename)
  },

  async getLatestItemImageBlob(itemId: number) {
    const url = getDemoImageList(itemId)[0]
    if (!url) return { success: false, error: 'No image found' }
    return { success: true, url, blob: null }
  },

  async getItemImageBlob(itemId: number, filename: string) {
    const url = getDemoImageList(itemId)[0]
    if (!url) return { success: false, error: 'No image found', filename }
    return { success: true, url, blob: null, filename }
  },

  clearItemImageCache(itemId: number) {
    state.imageCache.delete(itemId)
  },

  clearAllImageCache() {
    state.imageCache.clear()
  },

  getImageCacheStats() {
    return { total: state.imageCache.size, keys: [...state.imageCache.keys()] }
  },

  async fetchEmployees(options?: { includeAllStatuses?: boolean }) {
    const includeAllStatuses = options?.includeAllStatuses ?? true
    return clone(includeAllStatuses ? state.employees : state.employees.filter((employee) => employee.status.toLowerCase() === 'active'))
  },

  async findEmployeeByIdNumber(idNumber: string) {
    return clone(state.employees.find((employee) => employee.idNumber === idNumber) || null)
  },

  async findEmployeeByBarcode(barcode: string) {
    return clone(state.employees.find((employee) => employee.idBarcode === barcode) || null)
  },

  async getEmployee(employeeId: number) {
    const employee = state.employees.find((entry) => entry.id === employeeId)
    if (!employee) throw new Error(`Employee ${employeeId} not found`)
    return clone(employee)
  },

  async searchEmployees(query: string) {
    const normalized = query.trim().toLowerCase()
    return clone(state.employees.filter((employee) => [employee.fullName, employee.idNumber, employee.position, employee.department].join(' ').toLowerCase().includes(normalized)))
  },

  async getActiveEmployees() {
    return clone(state.employees.filter((employee) => employee.status.toLowerCase() === 'active'))
  },

  async validateEmployee(identifier: string, pin?: string | null): Promise<DemoEmployeeValidationResult> {
    const employee = state.employees.find((entry) => entry.idNumber === identifier || entry.idBarcode === identifier || entry.fullName.toLowerCase() === identifier.toLowerCase() || String(entry.id) === String(identifier))
    if (!employee) return { valid: false, employee: null, error: 'Employee not found' }
    if (pin && employee.pin && employee.pin !== pin) return { valid: false, employee: clone(employee), error: 'Invalid PIN' }
    if (employee.status.toLowerCase() !== 'active') return { valid: false, employee: clone(employee), error: `Employee is ${employee.status.toLowerCase()}` }
    return { valid: true, employee: clone(employee), message: 'Employee validated successfully' }
  },

  async fetchTransactions(filters: DemoTransactionFilters = {}): Promise<DemoTransactionResponse> {
    const filtered = sortLogs(filterLogs(filters))
    const offset = Math.max(0, filters.offset ?? 0)
    const limit = Math.max(1, filters.limit ?? 100)
    const page = filtered.slice(offset, offset + limit)

    return {
      data: clone(page),
      total: filtered.length,
      limit,
      offset,
      filters: {
        username: filters.username,
        date_from: filters.date_from,
        date_to: filters.date_to,
        search: filters.search,
      },
    }
  },

  async fetchTransactionStats(days: number = 30): Promise<DemoTransactionStats> {
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000
    const recent = state.logs.filter((log) => new Date(log.created_at || `${log.log_date}T${log.log_time}`).getTime() >= threshold)
    const logsByDay = new Map<string, { log_count: number; users: Set<string> }>()
    const topUsers = new Map<string, { username: string; log_count: number; last_activity: string }>()

    recent.forEach((log) => {
      const dayEntry = logsByDay.get(log.log_date) || { log_count: 0, users: new Set<string>() }
      dayEntry.log_count += 1
      dayEntry.users.add(log.username)
      logsByDay.set(log.log_date, dayEntry)

      const timestamp = log.created_at || `${log.log_date}T${log.log_time}`
      const userEntry = topUsers.get(log.username) || { username: log.username, log_count: 0, last_activity: timestamp }
      userEntry.log_count += 1
      if (timestamp > userEntry.last_activity) userEntry.last_activity = timestamp
      topUsers.set(log.username, userEntry)
    })

    return {
      period_days: days,
      total_logs: state.logs.length,
      recent_logs: recent.length,
      active_users: new Set(state.logs.map((log) => log.username)).size,
      logs_by_day: [...logsByDay.entries()].sort((left, right) => left[0].localeCompare(right[0])).map(([log_date, value]) => ({ log_date, log_count: value.log_count, unique_users: value.users.size })),
      top_users: [...topUsers.values()].sort((left, right) => right.log_count - left.log_count).slice(0, 5),
    }
  },

  async fetchUserTransactions(username: string, filters: Omit<DemoTransactionFilters, 'username'> = {}) {
    return this.fetchTransactions({ ...filters, username })
  },

  async createTransactionLog(logData: Partial<DemoLogRecord> & { username: string; details: string }) {
    const entry = createDemoLogEntry(logData)
    return { success: true, log: clone(entry) }
  },

  async createEnhancedLog(data: { userId: string; items: Array<{ id: string; name: string; brand?: string; itemType?: string; location?: string; quantity: number }>; username: string; totalItems: number; timestamp: string; purpose?: string; idBarcode?: string }) {
    const details = `Checkout: ${data.totalItems} items - ${data.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}`
    const entry = createDemoLogEntry({
      username: data.username,
      id_number: data.userId,
      id_barcode: data.idBarcode,
      details,
      purpose: data.purpose || 'Checkout',
      item_no: data.items.map((item) => item.id).join(';'),
      items_json: JSON.stringify(data.items),
      log_date: data.timestamp.split('T')[0],
      log_time: data.timestamp.split('T')[1]?.replace('Z', '') || undefined,
    })
    return { success: true, log: clone(entry) }
  },

  async deleteTransactionLog(logId: number) {
    const before = state.logs.length
    state.logs = state.logs.filter((log) => log.id !== logId)
    return { success: state.logs.length !== before }
  },

  async exportTransactions(filters?: DemoTransactionFilters, format: 'csv' | 'excel' = 'csv') {
    const response = await this.fetchTransactions(filters)
    const header = ['id', 'username', 'id_number', 'details', 'log_date', 'log_time', 'purpose']
    const rows = response.data.map((log) => [log.id, log.username, log.id_number || '', log.details || '', log.log_date, log.log_time, log.purpose || ''])
    const csv = [header.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n')
    return new Blob([csv], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  },

  async testConnection() {
    state.lastTestTime = Date.now()
    return true
  },

  getConnectionStatus(): DemoConnectionStatus {
    return { isConnected: true, lastTestTime: state.lastTestTime, lastTestDate: state.lastTestTime ? new Date(state.lastTestTime).toISOString() : null, timeSinceLastTest: state.lastTestTime ? Date.now() - state.lastTestTime : null, baseUrl: state.baseUrl }
  },

  async testConnectionDetailed(): Promise<DemoDetailedConnectionResult> {
    const now = new Date().toISOString()
    return { success: true, baseUrl: state.baseUrl, timestamp: now, responseTime: 12, status: 200, statusText: 'OK', error: null, details: { items: state.items.length, employees: state.employees.length, logs: state.logs.length } }
  },

  async testEndpoints(): Promise<DemoEndpointTestResults> {
    return { overall: true, timestamp: new Date().toISOString(), endpoints: [
      { name: 'items', path: '/api/items', success: true, status: 200, responseTime: 4 },
      { name: 'employees', path: '/api/employees', success: true, status: 200, responseTime: 4 },
      { name: 'transactions', path: '/api/employee-logs', success: true, status: 200, responseTime: 4 },
    ] }
  },

  resetCache() {
    state.lastTestTime = Date.now()
  },

  updateBaseUrl(newBaseUrl: string) {
    state.baseUrl = newBaseUrl || 'demo://toolbox'
  },

  async bulkCheckoutEmployeeInventory(checkouts: any[], checkoutBy: string | null = null) {
    const normalized = checkouts.map((entry) => {
      const itemId = Number(entry.item_no ?? entry.itemId ?? entry.id)
      const quantity = Math.max(0, Number(entry.quantity_checked_out ?? entry.quantity ?? 1))
      const item = updateItemRecord(itemId, -quantity)
      return { ...entry, item_no: item.item_no, item_name: item.item_name, quantity_checked_out: quantity, balance: item.balance }
    })

    emitInventoryChange(SOCKET_EVENTS.INVENTORY.CHECKOUT_COMPLETED, { checkouts: normalized, checkoutBy })
    return { success: true, checkedOut: normalized }
  },

  async logTransaction(transactionData: Partial<DemoLogRecord> & { username: string; details: string }) {
    const entry = createDemoLogEntry(transactionData)
    return { success: true, log: clone(entry) }
  },

  jobOrders: {
    async getJobOrders(filters?: { status?: string }) {
      const status = filters?.status?.toLowerCase()
      const items = status ? state.jobOrders.filter((jobOrder) => jobOrder.status.toLowerCase() === status) : state.jobOrders
      return { success: true, items: clone(items) }
    },
    async getJobOrder(id: number) {
      const jobOrder = state.jobOrders.find((entry) => entry.id === id)
      if (!jobOrder) throw new Error(`Job order ${id} not found`)
      return clone(jobOrder)
    },
  },

  checkoutRequests: {
    async bulkCreateRequests(requests: any[]) {
      const requestRefs = requests.map((_, index) => `REQ-${state.requestCounter + index + 1}`)
      state.requestCounter += requests.length
      emitTransactionChange('checkout_request_created', { requests, requestRefs })
      return { success: true, request_refs: requestRefs }
    },
  },

  employeeInventory: {
    async bulkCheckout(checkouts: any[], checkoutBy: string | null = null) {
      return demoBackend.bulkCheckoutEmployeeInventory(checkouts, checkoutBy)
    },
  },

  employeeLogs: {
    async createEmployeeLog(logData: Partial<DemoLogRecord> & { username: string; details: string }) {
      const entry = createDemoLogEntry(logData)
      return { success: true, log: clone(entry) }
    },
  },
}

export type DemoBackend = typeof demoBackend
