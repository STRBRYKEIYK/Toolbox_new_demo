# API Bridge System

TypeScript bridge connecting Toolbox to the main JJC application's unified JavaScript API services.

## 📋 Overview

The API Bridge allows the Toolbox TypeScript application to seamlessly use the main application's JavaScript services while maintaining full type safety and compatibility.

```
┌─────────────────────────────────────────────────────────────┐
│  Toolbox TypeScript App                                      │
│                                                               │
│  ┌───────────────┐      ┌──────────────────┐                │
│  │  Components   │─────▶│  API Bridge (TS) │                │
│  └───────────────┘      └──────────────────┘                │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Main JJC Application                                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Unified JavaScript Services                          │   │
│  │                                                        │   │
│  │  • ToolboxItemsService                                │   │
│  │  • ToolboxEmployeesService                            │   │
│  │  • ToolboxTransactionsService                         │   │
│  │  • ToolboxConnectionService                           │   │
│  │                                                        │   │
│  │  All extend BaseAPIService with:                      │   │
│  │  - Encryption/Decryption                              │   │
│  │  - Request deduplication                              │   │
│  │  - Error handling                                     │   │
│  │  - Data sync management                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Option 1: Direct Bridge Usage (Recommended for new code)

```typescript
import { apiBridge } from "../lib/api-bridge"

// Fetch items
const items = await apiBridge.fetchItems({ limit: 1000 })

// Find employee
const employee = await apiBridge.findEmployeeByIdNumber("EMP123")

// Create transaction log
await apiBridge.createEnhancedLog({
  userId: employee.id_number,
  items: cartItems,
  username: employee.fullName,
  totalItems: cartItems.length,
  timestamp: new Date().toISOString()
})
```

### Option 2: Compatible API Service (Easiest migration)

```typescript
// Just change the import! Everything else stays the same
import { apiService } from "../lib/api_service_compat"

// Use exactly like before
const items = await apiService.items.fetchItems()
const employee = await apiService.employees.findEmployeeByIdNumber("EMP123")
const logs = await apiService.transactions.fetchTransactions({ limit: 50 })
```

## 📁 Files

| File | Purpose |
|------|---------|
| `lib/api-bridge.ts` | Main TypeScript bridge with type-safe method wrappers |
| `lib/api_service_compat.ts` | 100% backward-compatible wrapper |
| `BRIDGE_MIGRATION_GUIDE.md` | Detailed migration instructions |
| `BRIDGE_README.md` | This file - architecture and usage guide |

## 🎯 Features

### Type Safety
Full TypeScript support with comprehensive interfaces:

```typescript
import { 
  apiBridge,
  TransactionFilters,
  EmployeeValidationResult,
  ConnectionStatus 
} from "../lib/api-bridge"

// Type-safe filters
const filters: TransactionFilters = {
  username: "John Doe",
  date_from: "2026-01-01",
  date_to: "2026-02-09",
  limit: 50
}

// Type-safe results
const result: EmployeeValidationResult = await apiBridge.validateEmployee("EMP123")
```

### Connection Management

```typescript
// Test connection
const isConnected = await apiBridge.testConnection()

// Get detailed status
const status = apiBridge.getConnectionStatus()
console.log(`Connected: ${status.isConnected}`)
console.log(`Base URL: ${status.baseUrl}`)
console.log(`Last test: ${status.lastTestDate}`)

// Run diagnostics
const diagnostics = await apiBridge.testConnectionDetailed()
console.log(`Response time: ${diagnostics.responseTime}ms`)

// Test multiple endpoints
const endpointTests = await apiBridge.testEndpoints()
console.log(`Overall: ${endpointTests.overall ? '✅' : '❌'}`)
```

### Error Handling

Errors are automatically logged by the underlying JavaScript services:

```typescript
try {
  const items = await apiBridge.fetchItems({ limit: 1000 })
  // Process items...
} catch (error) {
  // Error is already logged with full context
  // Just handle user-facing display
  showErrorToast("Failed to load items. Please try again.")
}
```

## 📚 API Reference

### Items Operations

```typescript
// Fetch all items
const items = await apiBridge.fetchItems({ limit?: number })

// Update item quantity
await apiBridge.updateItemQuantity(
  itemId: number,
  updateType: 'set_balance' | 'adjust_in' | 'adjust_out' | 'manual',
  value: number,
  notes?: string
)

// Record item going out
await apiBridge.recordItemOut(itemId: number, {
  quantity: number,
  out_by?: string,
  notes?: string,
  item_name?: string
})

// Bulk checkout
await apiBridge.bulkCheckout(items: any[], {
  checkout_by?: string,
  notes?: string
})

// Image operations
const images = await apiBridge.getItemImages(itemId: number)
await apiBridge.uploadItemImage(itemId: number, file: File)
await apiBridge.deleteItemImage(itemId: number, imageUrl: string)
```

### Employees Operations

```typescript
// Fetch employees
const employees = await apiBridge.fetchEmployees({ 
  includeAllStatuses?: boolean 
})

// Find by ID or barcode
const employee = await apiBridge.findEmployeeByIdNumber(idNumber: string)
const employee = await apiBridge.findEmployeeByBarcode(barcode: string)

// Search and filter
const results = await apiBridge.searchEmployees(query: string)
const active = await apiBridge.getActiveEmployees()

// Validate credentials
const validation = await apiBridge.validateEmployee(
  identifier: string, 
  pin?: string
)

if (validation.valid) {
  console.log(`Welcome, ${validation.employee.fullName}!`)
}
```

### Transactions Operations

```typescript
// Fetch with filters
const response = await apiBridge.fetchTransactions({
  username?: string,
  date_from?: string,  // YYYY-MM-DD
  date_to?: string,    // YYYY-MM-DD
  search?: string,
  limit?: number,
  offset?: number
})

// Get statistics
const stats = await apiBridge.fetchTransactionStats(days: number = 30)
console.log(`Total logs: ${stats.total_logs}`)
console.log(`Active users: ${stats.active_users}`)

// User-specific transactions
const userLogs = await apiBridge.fetchUserTransactions(username: string, {
  date_from?: string,
  date_to?: string,
  limit?: number,
  offset?: number
})

// Create logs
await apiBridge.createTransactionLog({
  username: string,
  details: string,
  purpose?: string,
  id_number?: string,
  item_no?: string
})

// Enhanced log with item details
await apiBridge.createEnhancedLog({
  userId: string,
  items: Array<{ id, name, quantity }>,
  username: string,
  totalItems: number,
  timestamp: string
})

// Export
const blob = await apiBridge.exportTransactions(filters, 'csv' | 'excel')
```

### Connection Operations

```typescript
// Test connection
const connected = await apiBridge.testConnection({ skipCache?: boolean })

// Get status
const status = apiBridge.getConnectionStatus()

// Detailed diagnostics
const details = await apiBridge.testConnectionDetailed()

// Test multiple endpoints
const tests = await apiBridge.testEndpoints()

// Management
apiBridge.resetConnectionCache()
apiBridge.updateBaseUrl('http://new-server:3000')
```

## 🔧 Configuration

### Change Base URL

```typescript
// Update the API base URL
apiBridge.updateBaseUrl('http://192.168.1.100:3000')

// This automatically resets the connection cache
// Next request will test the new URL
```

### Custom Bridge Instance

```typescript
import { ApiBridge } from "../lib/api-bridge"

const customBridge = new ApiBridge()
customBridge.updateBaseUrl('http://custom-server:3000')

// Use customBridge instead of apiBridge
const items = await customBridge.fetchItems()
```

## 🔒 Security

The bridge inherits all security features from the main JavaScript services:

- **Encryption/Decryption**: Sensitive data is automatically encrypted
- **Request Validation**: All requests are validated before sending
- **Error Sanitization**: Error messages don't leak sensitive information
- **CORS Handling**: Proper CORS configuration for Toolbox ↔ API communication

## 🎨 TypeScript Support

### Available Types

```typescript
import type {
  // Configuration
  ApiBridgeConfig,
  
  // Transactions
  TransactionFilters,
  TransactionResponse,
  TransactionStats,
  TransactionLogData,
  
  // Employees
  EmployeeValidationResult,
  
  // Connection
  ConnectionStatus,
  DetailedConnectionResult,
  EndpointTestResults
} from "../lib/api-bridge"
```

### Type Usage Examples

```typescript
// Strongly typed filters
const filters: TransactionFilters = {
  username: "John Doe",
  date_from: "2026-01-01",
  date_to: "2026-02-09",
  limit: 50,
  offset: 0
}

// Type-safe responses
const response: TransactionResponse = await apiBridge.fetchTransactions(filters)
response.data.forEach(tx => {
  console.log(tx.username, tx.details)
})

// Employee validation
const result: EmployeeValidationResult = await apiBridge.validateEmployee("EMP123")

if (result.valid && result.employee) {
  // TypeScript knows employee exists here
  console.log(result.employee.fullName)
}
```

## 🔍 Debugging

### Enable Detailed Logging

The bridge uses the underlying JavaScript services which log extensively:

```typescript
// Check browser console for detailed logs like:
// [ToolboxItemsService] Fetching items...
// [ToolboxItemsService] Successfully fetched 150 items
// [ToolboxEmployeesService] Looking up employee by ID: EMP123
// [ToolboxEmployeesService] Found employee: John Doe
```

### Connection Diagnostics

```typescript
// Run full diagnostics
const diagnostics = await apiBridge.testConnectionDetailed()

console.log('Diagnostics:', {
  success: diagnostics.success,
  baseUrl: diagnostics.baseUrl,
  responseTime: diagnostics.responseTime,
  status: diagnostics.status,
  error: diagnostics.error,
  details: diagnostics.details
})

// Test all endpoints
const tests = await apiBridge.testEndpoints()

tests.endpoints.forEach(endpoint => {
  console.log(`${endpoint.name}: ${endpoint.success ? '✅' : '❌'}`)
  console.log(`  Response time: ${endpoint.responseTime}ms`)
})
```

### Access Underlying Service

For advanced debugging:

```typescript
const jsService = apiBridge.getJsService()

// Access internal service state
console.log('Base URL:', jsService.toolboxConnection.baseURL)
console.log('Connected:', jsService.toolboxConnection.isConnected)

// Call any service method directly
const result = await jsService.toolboxItems.fetchItems({ limit: 10 })
```

## 🚨 Troubleshooting

### "Cannot find module" Error

**Problem**: TypeScript can't resolve the JavaScript service imports

**Solution**: The bridge uses `// @ts-ignore` to allow JavaScript imports. Make sure:
- Path to main services is correct: `../../../src/utils/api/api-service.js`
- TypeScript config allows `.js` imports

### Connection Fails

**Problem**: `testConnection()` returns `false`

**Solutions**:
1. Check if the main API server is running
2. Verify the base URL is correct: `apiBridge.getBaseUrl()`
3. Run detailed diagnostics: `await apiBridge.testConnectionDetailed()`
4. Check browser console for CORS errors
5. Test individual endpoints: `await apiBridge.testEndpoints()`

### Type Errors

**Problem**: TypeScript shows type errors on results

**Solution**: Import and use the provided types:
```typescript
import type { TransactionResponse } from "../lib/api-bridge"

const response: TransactionResponse = await apiBridge.fetchTransactions()
```

## 📖 Migration Guide

See [BRIDGE_MIGRATION_GUIDE.md](./BRIDGE_MIGRATION_GUIDE.md) for:
- Step-by-step migration instructions
- Before/after code examples for each component
- Complete API method mapping
- Migration checklist
- Advanced usage patterns

## ✨ Benefits Over Old Approach

| Feature | Old (Toolbox Services) | New (Bridge + Main Services) |
|---------|----------------------|------------------------------|
| Code duplication | ❌ Separate implementations | ✅ Single source of truth |
| Encryption | ⚠️ Manual implementation | ✅ Automatic via BaseAPIService |
| Request deduplication | ❌ Not available | ✅ Built-in |
| Error handling | ⚠️ Inconsistent | ✅ Centralized |
| Data sync | ❌ Manual tracking | ✅ Automatic timestamps |
| Type safety | ✅ TypeScript | ✅ TypeScript (via bridge) |
| Caching | ⚠️ Basic | ✅ Advanced with TTL |
| Debugging | ⚠️ Limited logging | ✅ Comprehensive logging |

## 🤝 Contributing

When adding new API methods:

1. Add to main JavaScript service (`src/utils/api/services/toolbox-*.js`)
2. Add wrapper method to bridge (`lib/api-bridge.ts`)
3. Add to compat layer (`lib/api_service_compat.ts`)
4. Update type definitions
5. Document in this README

## 📄 License

Part of the JJC Local Website project.

---

**Need help?** Check:
1. This README for architecture and API reference
2. [BRIDGE_MIGRATION_GUIDE.md](./BRIDGE_MIGRATION_GUIDE.md) for migration steps
3. Bridge source: `lib/api-bridge.ts`
4. Main services: `../src/utils/api/services/toolbox-*.js`
