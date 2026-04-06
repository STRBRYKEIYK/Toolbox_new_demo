import type { ApiConfig } from '../api-config'
import { API_ENDPOINTS } from '../api-config'

export interface EmployeeInventoryCheckout {
  employee_uid: number | string
  employee_barcode: string
  employee_name: string
  material_name: string
  quantity_checked_out: number
  unit_of_measure?: string
  item_no?: string | number
  item_description?: string
  purpose?: string
  project_name?: string | null
}

export class EmployeeInventoryService {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  updateConfig(config: ApiConfig) {
    this.config = config
  }

  async bulkCheckout(checkouts: EmployeeInventoryCheckout[], checkoutBy: string | null = null): Promise<any> {
    if (!Array.isArray(checkouts) || checkouts.length === 0) {
      throw new Error('Checkouts array is required and must not be empty')
    }

    const url = `${this.config.baseUrl}${API_ENDPOINTS.employeeInventory}/bulk-checkout`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify({
        checkouts,
        checkout_by: checkoutBy,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed employee inventory bulk checkout: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    if (!result?.success) {
      throw new Error(result?.error || 'Employee inventory bulk checkout failed')
    }

    return result
  }
}
