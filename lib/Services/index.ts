// Services index - Re-export all services for cleaner imports
export { ItemsService } from './items.service'
export { EmployeesService } from './employees.service'
export { TransactionsService } from './transactions.service'
export { ConnectionService } from './connection.service'
export { EmployeeInventoryService } from './employee-inventory.service'

// Re-export types
export type { ApiConfig, TransactionFilters, TransactionResponse, TransactionStats } from '../api-config'