# API Bridge Migration Guide

This guide helps you migrate Toolbox components from the local TypeScript services to the unified JavaScript services via the API Bridge.

## Overview

**Before**: Toolbox used standalone TypeScript services (`lib/Services/`)
**After**: Toolbox uses the API Bridge to access unified JavaScript services (`src/utils/api/services/`)

**Benefits**:
- ✅ Single source of truth for API operations
- ✅ Shared encryption/decryption logic
- ✅ Request deduplication
- ✅ Centralized error handling
- ✅ Better caching and data sync
- ✅ Type safety maintained through TypeScript bridge

## Quick Start

### 1. Import the Bridge

**Old way:**
```typescript
import { apiService } from "../lib/api_service"
```

**New way:**
```typescript
import { apiBridge } from "../lib/api-bridge"
```

### 2. Update API Calls

The API is nearly identical, but uses `apiBridge` instead of `apiService`:

**Old:**
```typescript
const items = await apiService.items.fetchItems({ limit: 1000 })
```

**New:**
```typescript
const items = await apiBridge.fetchItems({ limit: 1000 })
```

## Component Migration Examples

### Example 1: Dashboard View

**Before** (`app/dashboard-view.tsx`):
```typescript
import { apiService } from "../lib/api_service"

// In component
const loadData = async () => {
  const items = await apiService.items.fetchItems()
  const employees = await apiService.employees.fetchEmployees()
  const stats = await apiService.transactions.fetchTransactionStats(30)
}
```

**After**:
```typescript
import { apiBridge } from "../lib/api-bridge"

// In component
const loadData = async () => {
  const items = await apiBridge.fetchItems()
  const employees = await apiBridge.fetchEmployees()
  const stats = await apiBridge.fetchTransactionStats(30)
}
```

### Example 2: Checkout Modal

**Before** (`components/checkout-modal.tsx`):
```typescript
import { apiService } from "../lib/api_service"

const handleCheckout = async () => {
  await apiService.items.bulkCheckout(cartItems, {
    checkout_by: employee.fullName,
    notes: `Checkout - ${cartItems.length} items`
  })
  
  await apiService.transactions.createEnhancedLog({
    userId: employee.id_number,
    items: cartItems,
    username: employee.fullName,
    totalItems: cartItems.length,
    timestamp: new Date().toISOString()
  })
}
```

**After**:
```typescript
import { apiBridge } from "../lib/api-bridge"

const handleCheckout = async () => {
  await apiBridge.bulkCheckout(cartItems, {
    checkout_by: employee.fullName,
    notes: `Checkout - ${cartItems.length} items`
  })
  
  await apiBridge.createEnhancedLog({
    userId: employee.id_number,
    items: cartItems,
    username: employee.fullName,
    totalItems: cartItems.length,
    timestamp: new Date().toISOString()
  })
}
```

### Example 3: Barcode Modal

**Before** (`components/barcode-modal.tsx`):
```typescript
import { apiService } from "../lib/api_service"

const handleEmployeeScan = async (barcode: string) => {
  const employee = await apiService.employees.findEmployeeByIdNumber(barcode)
  
  if (!employee) {
    const barcodeMatch = await apiService.employees.findEmployeeByBarcode(barcode)
    return barcodeMatch
  }
  
  return employee
}
```

**After**:
```typescript
import { apiBridge } from "../lib/api-bridge"

const handleEmployeeScan = async (barcode: string) => {
  const employee = await apiBridge.findEmployeeByIdNumber(barcode)
  
  if (!employee) {
    const barcodeMatch = await apiBridge.findEmployeeByBarcode(barcode)
    return barcodeMatch
  }
  
  return employee
}
```

### Example 4: Employee Logs View

**Before** (`components/employee-logs-view.tsx`):
```typescript
import { apiService } from "../lib/api_service"

const loadLogs = async () => {
  const response = await apiService.transactions.fetchTransactions({
    username: selectedEmployee,
    date_from: startDate,
    date_to: endDate,
    limit: 50,
    offset: 0
  })
  
  setLogs(response.data)
  setTotal(response.total)
}
```

**After**:
```typescript
import { apiBridge } from "../lib/api-bridge"

const loadLogs = async () => {
  const response = await apiBridge.fetchTransactions({
    username: selectedEmployee,
    date_from: startDate,
    date_to: endDate,
    limit: 50,
    offset: 0
  })
  
  setLogs(response.data)
  setTotal(response.total)
}
```

## API Method Mapping

### Items Operations

| Old Method | New Method | Notes |
|------------|------------|-------|
| `apiService.items.fetchItems()` | `apiBridge.fetchItems()` | Same parameters |
| `apiService.items.updateItemQuantity()` | `apiBridge.updateItemQuantity()` | Same parameters |
| `apiService.items.recordItemOut()` | `apiBridge.recordItemOut()` | Same parameters |
| `apiService.items.bulkCheckout()` | `apiBridge.bulkCheckout()` | Same parameters |
| `apiService.items.getItemImages()` | `apiBridge.getItemImages()` | Same parameters |
| `apiService.items.uploadItemImage()` | `apiBridge.uploadItemImage()` | Same parameters |
| `apiService.items.deleteItemImage()` | `apiBridge.deleteItemImage()` | Same parameters |

### Employees Operations

| Old Method | New Method | Notes |
|------------|------------|-------|
| `apiService.employees.fetchEmployees()` | `apiBridge.fetchEmployees()` | Same parameters |
| `apiService.employees.findEmployeeByIdNumber()` | `apiBridge.findEmployeeByIdNumber()` | Same parameters |
| `apiService.employees.findEmployeeByBarcode()` | `apiBridge.findEmployeeByBarcode()` | Same parameters |
| `apiService.employees.getEmployee()` | `apiBridge.getEmployee()` | Same parameters |
| `apiService.employees.searchEmployees()` | `apiBridge.searchEmployees()` | Same parameters |
| `apiService.employees.getActiveEmployees()` | `apiBridge.getActiveEmployees()` | Same parameters |
| `apiService.employees.validateEmployee()` | `apiBridge.validateEmployee()` | Same parameters |

### Transactions Operations

| Old Method | New Method | Notes |
|------------|------------|-------|
| `apiService.transactions.fetchTransactions()` | `apiBridge.fetchTransactions()` | Same parameters |
| `apiService.transactions.fetchTransactionStats()` | `apiBridge.fetchTransactionStats()` | Same parameters |
| `apiService.transactions.fetchUserTransactions()` | `apiBridge.fetchUserTransactions()` | Same parameters |
| `apiService.transactions.createTransactionLog()` | `apiBridge.createTransactionLog()` | Same parameters |
| `apiService.transactions.createEnhancedLog()` | `apiBridge.createEnhancedLog()` | Same parameters |
| `apiService.transactions.deleteTransactionLog()` | `apiBridge.deleteTransactionLog()` | Same parameters |
| `apiService.transactions.exportTransactions()` | `apiBridge.exportTransactions()` | Same parameters |

### Connection Operations

| Old Method | New Method | Notes |
|------------|------------|-------|
| `apiService.connection.testConnection()` | `apiBridge.testConnection()` | Same parameters |
| `apiService.connection.getConnectionStatus()` | `apiBridge.getConnectionStatus()` | Same parameters |
| `apiService.connection.testConnectionDetailed()` | `apiBridge.testConnectionDetailed()` | Same parameters |
| `apiService.connection.testEndpoints()` | `apiBridge.testEndpoints()` | Same parameters |
| `apiService.connection.resetCache()` | `apiBridge.resetConnectionCache()` | Renamed for clarity |
| `apiService.connection.updateBaseUrl()` | `apiBridge.updateBaseUrl()` | Same parameters |

## Type Safety

The bridge provides full TypeScript support:

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
  limit: 50
}

const response = await apiBridge.fetchTransactions(filters)

// Type-safe validation result
const result: EmployeeValidationResult = await apiBridge.validateEmployee("EMP123")

if (result.valid) {
  console.log(result.employee.fullName)
} else {
  console.error(result.error)
}

// Type-safe connection status
const status: ConnectionStatus = apiBridge.getConnectionStatus()
console.log(`Connected: ${status.isConnected}`)
```

## Migration Checklist

### Phase 1: Preparation
- [ ] Review this migration guide
- [ ] Understand the API Bridge architecture
- [ ] Test the bridge in a development environment

### Phase 2: Component Updates
- [ ] Update `app/page.tsx` imports
- [ ] Update `components/checkout-modal.tsx`
- [ ] Update `components/barcode-modal.tsx`
- [ ] Update `components/employee-logs-view.tsx`
- [ ] Update `components/dashboard-view.tsx`
- [ ] Update `components/cart-view.tsx`
- [ ] Update `components/item-detail-view.tsx`
- [ ] Update `components/enhanced-item-card.tsx`

### Phase 3: Testing
- [ ] Test item fetching and display
- [ ] Test employee lookup by ID and barcode
- [ ] Test checkout flow (cart → checkout → transaction log)
- [ ] Test transaction logs viewing and filtering
- [ ] Test connection status checking
- [ ] Test error handling and edge cases

### Phase 4: Cleanup (Optional)
- [ ] Remove old TypeScript services from `lib/Services/`
- [ ] Remove old `lib/api_service.ts`
- [ ] Update documentation

## Advanced Usage

### Custom Bridge Instance

If you need a custom configuration:

```typescript
import { ApiBridge } from "../lib/api-bridge"

const customBridge = new ApiBridge()
customBridge.updateBaseUrl('http://custom-server:3000')
```

### Accessing Underlying JavaScript Service

For advanced operations not yet exposed by the bridge:

```typescript
const jsService = apiBridge.getJsService()

// Access any service method directly
const result = await jsService.someOtherService.someMethod()
```

### Error Handling

The bridge inherits error handling from the JavaScript services:

```typescript
try {
  const items = await apiBridge.fetchItems({ limit: 1000 })
} catch (error) {
  console.error('Failed to fetch items:', error)
  // Error is already logged by the JavaScript service
  // Handle user-facing error display here
}
```

## Troubleshooting

### Module Resolution Issues

If you see errors like `Cannot find module '../../../src/utils/api/api-service.js'`:

1. Check that the path is correct relative to `Toolbox_new/lib/api-bridge.ts`
2. Ensure the main app services are built/available
3. Check your TypeScript configuration allows `.js` imports

### Type Errors

If TypeScript complains about missing types:

1. Add `// @ts-ignore` above the JavaScript import (already done in bridge)
2. Use the provided TypeScript interfaces
3. Extend the bridge with additional type definitions if needed

### Runtime Errors

If you get runtime errors:

1. Check that the main app API server is running
2. Test connection with `await apiBridge.testConnection()`
3. Check browser console for detailed error messages
4. Verify CORS settings allow Toolbox to access the API

## Support

For issues or questions:
1. Check the API Bridge source code: `Toolbox_new/lib/api-bridge.ts`
2. Review the JavaScript services: `src/utils/api/services/toolbox-*.js`
3. Test connection: `apiBridge.testConnectionDetailed()`

## Next Steps

1. Start with a single component migration (e.g., dashboard-view)
2. Test thoroughly before proceeding
3. Migrate remaining components one by one
4. Remove old services once migration is complete
