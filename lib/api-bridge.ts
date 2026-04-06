/**
 * API Bridge - Connects Toolbox TypeScript to Main App JavaScript Services
 * 
 * This bridge allows the Toolbox TypeScript app to use the unified JavaScript
 * API services from the main JJC application while maintaining type safety.
 * 
 * Architecture:
 * - Toolbox (TypeScript) -> Bridge (TypeScript) -> Main Services (JavaScript)
 * - Provides TypeScript interfaces and type checking
 * - Handles module resolution between TypeScript and JavaScript
 * - Maintains compatibility with existing Toolbox code
 */

import { demoBackend } from './demo-backend'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ApiBridgeConfig {
  baseUrl: string
  isConnected: boolean
}

export interface TransactionFilters {
  username?: string
  date_from?: string
  date_to?: string
  search?: string
  limit?: number
  offset?: number
}

export interface TransactionResponse {
  data: any[]
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

export interface TransactionStats {
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

export interface TransactionLogData {
  username: string
  details: string
  purpose?: string
  id_number?: string
  id_barcode?: string
  item_no?: string
  log_date?: string
  log_time?: string
}

export interface EmployeeValidationResult {
  valid: boolean
  employee: any | null
  error?: string
  message?: string
}

export interface ConnectionStatus {
  isConnected: boolean
  lastTestTime: number | null
  lastTestDate: string | null
  timeSinceLastTest: number | null
  baseUrl: string
}

export interface DetailedConnectionResult {
  success: boolean
  baseUrl: string
  timestamp: string
  responseTime: number
  status: number | null
  statusText: string | null
  error: string | null
  details: any
}

export interface EndpointTestResults {
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

// ============================================================================
// API BRIDGE CLASS
// ============================================================================

/**
 * Main API Bridge
 * Wraps the JavaScript services with TypeScript interfaces
 */
export class ApiBridge {
  private jsService = demoBackend

  // ========================================================================
  // ITEMS OPERATIONS
  // ========================================================================

  /**
   * Fetch all items from the API
   */
  async fetchItems(options: { limit?: number } = { limit: 1000 }): Promise<any[]> {
    return await this.jsService.fetchItems(options)
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(
    itemId: number, 
    updateType: 'set_balance' | 'adjust_in' | 'adjust_out' | 'manual', 
    value: number, 
    notes?: string
  ): Promise<any> {
    return await this.jsService.updateItemQuantity(itemId, updateType, value, notes)
  }

  /**
   * Record item going out (stock decrease)
   */
  async recordItemOut(itemId: number, data: {
    quantity: number
    out_by?: string
    notes?: string
    item_name?: string
  }): Promise<any> {
    return await this.jsService.recordItemOut(itemId, data)
  }

  /**
   * Bulk checkout multiple items
   */
  async bulkCheckout(items: any[], options?: {
    checkout_by?: string
    notes?: string
  }): Promise<any> {
    return await this.jsService.bulkCheckout(items, options)
  }

  /**
   * Get item images
   */
  async getItemImages(itemId: number): Promise<string[]> {
    const images = await this.jsService.getItemImages(itemId)
    return Array.isArray(images) ? images.map((image: any) => image.filename || image.url || String(image)) : []
  }

  /**
   * Upload item image
   */
  async uploadItemImage(itemId: number, imageFile: File): Promise<any> {
    return await this.jsService.uploadItemImage(itemId, imageFile)
  }

  /**
   * Delete item image
   */
  async deleteItemImage(itemId: number, imageUrl: string): Promise<any> {
    return await this.jsService.deleteItemImage(itemId, imageUrl)
  }

  /**
   * Get URL for latest item image (for <img src>)
   * Note: Use getLatestItemImageBlob() if images are encrypted
   */
  getItemLatestImageUrl(itemId: number): string {
    const baseUrl = this.getBaseUrl()
    return `${baseUrl}/api/items/${itemId}/images/latest`
  }

  /**
   * Get URL for specific item image by filename
   * Note: Use getItemImageBlob() if images are encrypted
   */
  getItemImageUrl(itemId: number, filename: string): string {
    const baseUrl = this.getBaseUrl()
    return `${baseUrl}/api/items/${itemId}/images/${encodeURIComponent(filename)}`
  }

  /**
   * Get latest item image as blob (supports encrypted images)
   * Returns blob URL that can be used in <img src>
   * @param forceRefresh - Force refresh from server (bypass cache)
   * @returns Promise<{ success: boolean, blob?: Blob, url?: string, error?: string }>
   */
  async getLatestItemImageBlob(itemId: number, forceRefresh = false): Promise<any> {
    return await this.jsService.getLatestItemImageBlob(itemId, forceRefresh)
  }

  /**
   * Get specific item image as blob by filename (supports encrypted images)
   * Returns blob URL that can be used in <img src>
   * @param forceRefresh - Force refresh from server (bypass cache)
   * @returns Promise<{ success: boolean, blob?: Blob, url?: string, filename?: string, error?: string }>
   */
  async getItemImageBlob(itemId: number, filename: string, forceRefresh = false): Promise<any> {
    return await this.jsService.getItemImageBlob(itemId, filename, forceRefresh)
  }

  /**
   * Clear cached images for a specific item
   */
  clearItemImageCache(itemId: number): void {
    this.jsService.clearItemImageCache(itemId)
  }

  /**
   * Clear all cached images
   */
  clearAllImageCache(): void {
    this.jsService.clearAllImageCache()
  }

  /**
   * Get image cache statistics
   */
  getImageCacheStats(): any {
    return this.jsService.getImageCacheStats()
  }

  // ========================================================================
  // EMPLOYEES OPERATIONS
  // ========================================================================

  /**
   * Fetch all employees
   */
  async fetchEmployees(options?: { includeAllStatuses?: boolean }): Promise<any[]> {
    return await this.jsService.fetchEmployees(options)
  }

  /**
   * Find employee by ID number
   */
  async findEmployeeByIdNumber(idNumber: string): Promise<any | null> {
    return await this.jsService.findEmployeeByIdNumber(idNumber)
  }

  /**
   * Find employee by barcode
   */
  async findEmployeeByBarcode(barcode: string): Promise<any | null> {
    return await this.jsService.findEmployeeByBarcode(barcode)
  }

  /**
   * Get employee by ID
   */
  async getEmployee(employeeId: number): Promise<any> {
    return await this.jsService.getEmployee(employeeId)
  }

  /**
   * Search employees by name or ID
   */
  async searchEmployees(query: string): Promise<any[]> {
    return await this.jsService.searchEmployees(query)
  }

  /**
   * Get active employees only
   */
  async getActiveEmployees(): Promise<any[]> {
    return await this.jsService.getActiveEmployees()
  }

  /**
   * Validate employee credentials
   */
  async validateEmployee(identifier: string, pin?: string | null): Promise<EmployeeValidationResult> {
    return await this.jsService.validateEmployee(identifier, pin)
  }

  // ========================================================================
  // TRANSACTIONS OPERATIONS
  // ========================================================================

  /**
   * Fetch transactions with filters
   */
  async fetchTransactions(filters?: TransactionFilters): Promise<TransactionResponse> {
    return await this.jsService.fetchTransactions(filters)
  }

  /**
   * Fetch transaction statistics
   */
  async fetchTransactionStats(days: number = 30): Promise<TransactionStats> {
    return await this.jsService.fetchTransactionStats(days)
  }

  /**
   * Fetch transactions for a specific user
   */
  async fetchUserTransactions(username: string, filters?: Omit<TransactionFilters, 'username'>): Promise<any> {
    return await this.jsService.fetchUserTransactions(username, filters)
  }

  /**
   * Create a new transaction log
   */
  async createTransactionLog(logData: TransactionLogData): Promise<any> {
    return await this.jsService.createTransactionLog(logData)
  }

  /**
   * Create enhanced transaction log with full item details
   */
  async createEnhancedLog(data: {
    userId: string
    items: Array<{
      id: string
      name: string
      brand?: string
      itemType?: string
      location?: string
      quantity: number
    }>
    username: string
    totalItems: number
    timestamp: string
    purpose?: string
    idBarcode?: string
  }): Promise<any> {
    return await this.jsService.createEnhancedLog(data)
  }

  /**
   * Delete a transaction log
   */
  async deleteTransactionLog(logId: number): Promise<any> {
    return await this.jsService.deleteTransactionLog(logId)
  }

  /**
   * Export transactions to CSV/Excel
   */
  async exportTransactions(filters?: TransactionFilters, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    return await this.jsService.exportTransactions(filters, format)
  }

  /**
   * Log a transaction (alias for createTransactionLog)
   */
  async logTransaction(transactionData: TransactionLogData): Promise<any> {
    return await this.createTransactionLog(transactionData)
  }

  // ========================================================================
  // CONNECTION OPERATIONS
  // ========================================================================

  /**
   * Test connection to the API server
   */
  async testConnection(options?: { skipCache?: boolean }): Promise<boolean> {
    return await this.jsService.testConnection(options)
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.jsService.getConnectionStatus()
  }

  /**
   * Test connection with detailed diagnostics
   */
  async testConnectionDetailed(): Promise<DetailedConnectionResult> {
    return await this.jsService.testConnectionDetailed()
  }

  /**
   * Test multiple endpoints
   */
  async testEndpoints(): Promise<EndpointTestResults> {
    return await this.jsService.testEndpoints()
  }

  /**
   * Reset connection cache
   */
  resetConnectionCache(): void {
    this.jsService.resetCache()
  }

  /**
   * Update base URL
   */
  updateBaseUrl(newBaseUrl: string): void {
    this.jsService.updateBaseUrl(newBaseUrl)
  }

  /**
   * Update configuration (compatibility method)
   */
  updateConfig(config: { baseUrl?: string }): void {
    if (config.baseUrl) {
      this.updateBaseUrl(config.baseUrl)
    }
  }

  // ========================================================================
  // CONFIGURATION & UTILITIES
  // ========================================================================

  /**
   * Get current API configuration
   */
  getConfig(): any {
    return {
      baseUrl: this.getBaseUrl(),
      isConnected: this.isConnected(),
      ...this.jsService.getConnectionStatus()
    }
  }

  /**
   * Get the underlying JavaScript service (for advanced use)
   */
  getJsService(): any {
    return this.jsService
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.jsService.getConnectionStatus().isConnected
  }

  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return this.jsService.getConnectionStatus().baseUrl
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

/**
 * Default bridge instance
 * Use this for most operations
 */
export const apiBridge = new ApiBridge()

/**
 * Export the class for custom instances if needed
 */
export default apiBridge
