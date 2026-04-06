import { demoBackend } from './demo-backend'
import { DEFAULT_API_CONFIG, type ApiConfig, type TransactionFilters, type TransactionResponse, type TransactionStats } from './api-config'
import type { TransactionLogData } from './api-bridge'
import type { EmployeeInventoryCheckout } from './Services/employee-inventory.service'

/**
 * API Services
 * 
 * This is the main middleman service that orchestrates all API operations.
 * It provides a unified interface to interact with different API service modules.
 * 
 * Usage:
 * - Use this service instead of directly accessing individual service classes
 * - This provides a centralized point for API operations
 * - Handles service initialization and configuration management
 */
export class ApiServices {
  private config: ApiConfig

  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    demoBackend.updateBaseUrl(config.baseUrl)
  }

  /**
   * Update configuration for all services
   */
  updateConfig(newConfig: Partial<ApiConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
      isConnected: true,
    }

    if (newConfig.baseUrl) {
      demoBackend.updateBaseUrl(newConfig.baseUrl)
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ApiConfig {
    return {
      baseUrl: demoBackend.getConnectionStatus().baseUrl,
      isConnected: true,
    }
  }

  // ========================================
  // CONNECTION OPERATIONS
  // ========================================

  /**
   * Test connection to the API server
   */
  async testConnection(): Promise<boolean> {
    return demoBackend.testConnection()
  }

  // ========================================
  // ITEMS OPERATIONS
  // ========================================

  /**
   * Fetch all items from the API
   */
  async fetchItems(): Promise<any[]> {
    return demoBackend.fetchItems()
  }

  /**
   * Commit item changes to the API
   */
  async commitItemChanges(items: any[]): Promise<boolean> {
    void items
    return true
  }

  /**
   * Update item quantity using the PUT /api/items/:id/quantity endpoint
   */
  async updateItemQuantity(
    itemId: number, 
    updateType: 'set_balance' | 'adjust_in' | 'adjust_out' | 'manual', 
    value: number, 
    notes?: string
  ): Promise<any> {
    return demoBackend.updateItemQuantity(itemId, updateType, value)
  }

  /**
   * Get list of images for an item
   */
  async getItemImages(itemId: number): Promise<any> {
    return demoBackend.getItemImages(itemId)
  }

  /**
   * Build URL for latest image (direct <img src>)
   */
  getItemLatestImageUrl(itemId: number): string {
    return demoBackend.getItemLatestImageUrl(itemId)
  }

  /**
   * Build URL for a specific image filename
   */
  getItemImageUrl(itemId: number, filename: string): string {
    return demoBackend.getItemImageUrl(itemId, filename)
  }

  // ========================================
  // EMPLOYEES OPERATIONS
  // ========================================

  /**
   * Fetch all employees from the API
   */
  async fetchEmployees(): Promise<any[]> {
    return demoBackend.fetchEmployees({ includeAllStatuses: true })
  }

  // ========================================
  // EMPLOYEE INVENTORY OPERATIONS
  // ========================================

  async bulkCheckoutEmployeeInventory(
    checkouts: EmployeeInventoryCheckout[],
    checkoutBy: string | null = null
  ): Promise<any> {
    return demoBackend.bulkCheckoutEmployeeInventory(checkouts, checkoutBy)
  }

  // ========================================
  // TRANSACTIONS OPERATIONS
  // ========================================

  /**
   * Fetch transactions with optional filters
   */
  async fetchTransactions(filters: TransactionFilters = {}): Promise<TransactionResponse> {
    return demoBackend.fetchTransactions(filters) as Promise<TransactionResponse>
  }

  /**
   * Fetch transaction statistics
   */
  async fetchTransactionStats(days: number = 30): Promise<TransactionStats> {
    return demoBackend.fetchTransactionStats(days) as Promise<TransactionStats>
  }

  /**
   * Fetch transactions for a specific user
   */
  async fetchUserTransactions(username: string, filters: Omit<TransactionFilters, 'username'> = {}): Promise<any> {
    return demoBackend.fetchUserTransactions(username, filters)
  }

  /**
   * Log a transaction to the API
   */
  async logTransaction(transactionData: TransactionLogData): Promise<boolean> {
    const result = await demoBackend.logTransaction(transactionData as any)
    return Boolean(result?.success)
  }

  // ========================================
  // CONVENIENCE METHODS
  // ========================================

  /**
   * Check if the API is currently connected
   */
  isConnected(): boolean {
    return true
  }

  /**
   * Get the current API base URL
   */
  getBaseUrl(): string {
    return demoBackend.getConnectionStatus().baseUrl
  }

  /**
   * Perform a full health check of all API services
   */
  async healthCheck(): Promise<{
    connection: boolean;
    items: boolean;
    employees: boolean;
    transactions: boolean;
  }> {
    const results = {
      connection: false,
      items: false,
      employees: false,
      transactions: false
    }

    try {
      // Test basic connection
      results.connection = await this.testConnection()

      if (results.connection) {
        // Test items endpoint
        try {
          await this.fetchItems()
          results.items = true
        } catch (error) {
          console.warn("[ApiServices] Items endpoint health check failed:", error)
        }

        // Test employees endpoint
        try {
          await this.fetchEmployees()
          results.employees = true
        } catch (error) {
          console.warn("[ApiServices] Employees endpoint health check failed:", error)
        }

        // Test transactions endpoint
        try {
          await this.fetchTransactions({ limit: 1 })
          results.transactions = true
        } catch (error) {
          console.warn("[ApiServices] Transactions endpoint health check failed:", error)
        }
      }
    } catch (error) {
      console.error("[ApiServices] Health check failed:", error)
    }

    return results
  }
}

// Export the default instance
export const apiService = new ApiServices()

// Also export individual service classes for direct access if needed
export { ItemsService } from './Services/items.service'
export { EmployeesService } from './Services/employees.service'
export { TransactionsService } from './Services/transactions.service'
export { ConnectionService } from './Services/connection.service'
export { EmployeeInventoryService } from './Services/employee-inventory.service'

// Export types
export type { ApiConfig, TransactionFilters, TransactionResponse, TransactionStats } from './api-config'
