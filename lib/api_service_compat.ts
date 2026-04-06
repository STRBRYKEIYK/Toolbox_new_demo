/**
 * API Service Compatibility Layer
 * 
 * This wrapper provides 100% backward compatibility with the existing Toolbox
 * API service interface while using the new API Bridge under the hood.
 * 
 * Usage: Simply replace the import statement in your components:
 * 
 * OLD: import { apiService } from "../lib/api_service"
 * NEW: import { apiService } from "../lib/api_service_compat"
 * 
 * No other changes needed - all methods work exactly the same!
 */

import { apiBridge } from './api-bridge'
import type { 
  TransactionFilters, 
  TransactionResponse,
  TransactionStats,
  TransactionLogData,
  EmployeeValidationResult,
  ConnectionStatus,
  DetailedConnectionResult,
  EndpointTestResults
} from './api-bridge'

// ============================================================================
// COMPATIBILITY WRAPPER
// ============================================================================

/**
 * Items Service - Matches original Toolbox interface
 */
class ItemsServiceCompat {
  async fetchItems(options: { limit?: number } = { limit: 1000 }) {
    return await apiBridge.fetchItems(options)
  }

  async updateItemQuantity(
    itemId: number, 
    updateType: 'set_balance' | 'adjust_in' | 'adjust_out' | 'manual', 
    value: number, 
    notes?: string
  ) {
    return await apiBridge.updateItemQuantity(itemId, updateType, value, notes)
  }

  async recordItemOut(itemId: number, data: {
    quantity: number
    out_by?: string
    notes?: string
    item_name?: string
  }) {
    return await apiBridge.recordItemOut(itemId, data)
  }

  async bulkCheckout(items: any[], options?: {
    checkout_by?: string
    notes?: string
  }) {
    return await apiBridge.bulkCheckout(items, options)
  }

  async getLatestItemImageBlob(itemId: number, forceRefresh = false) {
    return await apiBridge.getLatestItemImageBlob(itemId, forceRefresh)
  }

  async getItemImageBlob(itemId: number, filename: string, forceRefresh = false) {
    return await apiBridge.getItemImageBlob(itemId, filename, forceRefresh)
  }

  clearItemImageCache(itemId: number) {
    apiBridge.clearItemImageCache(itemId)
  }

  clearAllImageCache() {
    apiBridge.clearAllImageCache()
  }

  getImageCacheStats() {
    return apiBridge.getImageCacheStats()
  }

  async getItemImages(itemId: number) {
    return await apiBridge.getItemImages(itemId)
  }

  async uploadItemImage(itemId: number, imageFile: File) {
    return await apiBridge.uploadItemImage(itemId, imageFile)
  }

  async deleteItemImage(itemId: number, imageUrl: string) {
    return await apiBridge.deleteItemImage(itemId, imageUrl)
  }
}

/**
 * Employees Service - Matches original Toolbox interface
 */
class EmployeesServiceCompat {
  async fetchEmployees(options?: { includeAllStatuses?: boolean }) {
    return await apiBridge.fetchEmployees(options)
  }

  async findEmployeeByIdNumber(idNumber: string) {
    return await apiBridge.findEmployeeByIdNumber(idNumber)
  }

  async findEmployeeByBarcode(barcode: string) {
    return await apiBridge.findEmployeeByBarcode(barcode)
  }

  async getEmployee(employeeId: number) {
    return await apiBridge.getEmployee(employeeId)
  }

  async searchEmployees(query: string) {
    return await apiBridge.searchEmployees(query)
  }

  async getActiveEmployees() {
    return await apiBridge.getActiveEmployees()
  }

  async validateEmployee(identifier: string, pin?: string | null): Promise<EmployeeValidationResult> {
    return await apiBridge.validateEmployee(identifier, pin)
  }
}

/**
 * Transactions Service - Matches original Toolbox interface
 */
class TransactionsServiceCompat {
  async fetchTransactions(filters?: TransactionFilters): Promise<TransactionResponse> {
    return await apiBridge.fetchTransactions(filters)
  }

  async fetchTransactionStats(days: number = 30): Promise<TransactionStats> {
    return await apiBridge.fetchTransactionStats(days)
  }

  async fetchUserTransactions(username: string, filters?: Omit<TransactionFilters, 'username'>) {
    return await apiBridge.fetchUserTransactions(username, filters)
  }

  async createTransactionLog(logData: TransactionLogData) {
    return await apiBridge.createTransactionLog(logData)
  }

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
  }) {
    return await apiBridge.createEnhancedLog(data)
  }

  async deleteTransactionLog(logId: number) {
    return await apiBridge.deleteTransactionLog(logId)
  }

  async exportTransactions(filters?: TransactionFilters, format: 'csv' | 'excel' = 'csv') {
    return await apiBridge.exportTransactions(filters, format)
  }

  async logTransaction(transactionData: TransactionLogData) {
    return await apiBridge.logTransaction(transactionData)
  }
}

/**
 * Connection Service - Matches original Toolbox interface
 */
class ConnectionServiceCompat {
  async testConnection(options?: { skipCache?: boolean }): Promise<boolean> {
    return await apiBridge.testConnection(options)
  }

  getConnectionStatus(): ConnectionStatus {
    return apiBridge.getConnectionStatus()
  }

  async testConnectionDetailed(): Promise<DetailedConnectionResult> {
    return await apiBridge.testConnectionDetailed()
  }

  async testEndpoints(): Promise<EndpointTestResults> {
    return await apiBridge.testEndpoints()
  }

  resetCache(): void {
    apiBridge.resetConnectionCache()
  }

  updateBaseUrl(newBaseUrl: string): void {
    apiBridge.updateBaseUrl(newBaseUrl)
  }

  updateConfig(config: { baseUrl?: string }): void {
    if (config.baseUrl) {
      this.updateBaseUrl(config.baseUrl)
    }
  }
}

/**
 * Main API Service - Matches original Toolbox interface exactly
 */
class ApiServiceCompat {
  public items: ItemsServiceCompat
  public employees: EmployeesServiceCompat
  public transactions: TransactionsServiceCompat
  public connection: ConnectionServiceCompat

  constructor() {
    this.items = new ItemsServiceCompat()
    this.employees = new EmployeesServiceCompat()
    this.transactions = new TransactionsServiceCompat()
    this.connection = new ConnectionServiceCompat()
  }

  /**
   * Helper method to check connection status
   */
  isConnected(): boolean {
    return apiBridge.isConnected()
  }

  /**
   * Helper method to get base URL
   */
  getBaseUrl(): string {
    return apiBridge.getBaseUrl()
  }

  /**
   * Access the underlying bridge for advanced operations
   */
  getBridge() {
    return apiBridge
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

/**
 * Compatible API Service instance
 * 
 * Use this as a drop-in replacement for the original apiService
 * 
 * Example:
 * ```ts
 * // Change only the import:
 * // OLD: import { apiService } from "../lib/api_service"
 * // NEW: import { apiService } from "../lib/api_service_compat"
 * 
 * // Everything else stays the same:
 * const items = await apiService.items.fetchItems()
 * const employee = await apiService.employees.findEmployeeByIdNumber(id)
 * const logs = await apiService.transactions.fetchTransactions()
 * const connected = await apiService.connection.testConnection()
 * ```
 */
export const apiService = new ApiServiceCompat()

// Also export the class for custom instances
export { ApiServiceCompat }

// Re-export types for convenience
export type {
  TransactionFilters,
  TransactionResponse,
  TransactionStats,
  TransactionLogData,
  EmployeeValidationResult,
  ConnectionStatus,
  DetailedConnectionResult,
  EndpointTestResults
}

export default apiService
