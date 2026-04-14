"use client"

import { useCallback } from "react"
import { demoBackend as mainapiService } from "../lib/demo-backend"

export interface CheckoutCartItem {
  id: any
  name: string
  brand: string
  itemType: string
  quantity: number
  balance: number
}

export interface CheckoutEmployee {
  id: any
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
}

export interface JobOperation {
  id: number
  name: string
  expected_hours: number | null
  completed: boolean
  employees: Array<{ employee_id: number; employee_full_name: string }>
  shifts?: Array<{ hours_rendered: number }>
  materials?: Array<{ item_no?: string; name: string; quantity: number; unit: string; notes?: string }>
}

export interface JobOrder {
  id: number
  jo_number: string | null
  description: string
  customer: string | null
  status: string
  operations: JobOperation[]
}

export interface ValidationResult {
  valid: boolean
  errors: Array<{ item: string; type: "no_active_job" | "no_matching_op"; message: string }>
  warnings: Array<{ item: string; type: "op_nearly_done" | "op_complete" | "no_matching_op"; message: string }>
  matchedJobs: JobOrder[]
}

export interface ItemJobAssignment {
  itemId: any
  itemName: string
  quantity: number
  jobOrderId: number | null
  jobOrderLabel: string | null
}

export interface CheckoutSubmissionMeta {
  requestsSaved: boolean
  requestRefs: string[]
  inventorySaved: boolean
  transactionSaved: boolean
}

interface SubmitCheckoutParams {
  employee: CheckoutEmployee
  items: CheckoutCartItem[]
  purpose?: string
  itemAssignments: ItemJobAssignment[]
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")

async function loadOpenJobOrders(): Promise<JobOrder[]> {
  const res = await mainapiService.jobOrders.getJobOrders({ status: "open" }) as any
  const all: any[] = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []
  const detailed = await Promise.all(all.map((j) => mainapiService.jobOrders.getJobOrder(j.id).catch(() => j)))
  return detailed as JobOrder[]
}

export function useCheckoutOrchestration() {
  const getAssignedJobOrders = useCallback(async (employee: CheckoutEmployee): Promise<JobOrder[]> => {
    const detailed = await loadOpenJobOrders()
    const employeeId = String(employee.id)

    return detailed.filter((job) =>
      (job.operations || []).some((op) =>
        (op.employees || []).some((e) => String(e.employee_id) === employeeId)
      )
    )
  }, [])

  const validateCheckoutAgainstJobOrders = useCallback(
    async (employee: CheckoutEmployee, items: CheckoutCartItem[]): Promise<ValidationResult> => {
      const assignedJobs = await getAssignedJobOrders(employee)
      const employeeId = String(employee.id)

      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        matchedJobs: assignedJobs,
      }

      if (assignedJobs.length === 0) {
        result.warnings.push({
          item: "ALL",
          type: "no_matching_op",
          message: `${employee.fullName} has no open job order assignments. Demo mode will allow checkout to continue.`,
        })
      }

      const assignedOps: Array<{ job: JobOrder; op: JobOperation }> = []
      assignedJobs.forEach((job) => {
        ;(job.operations || []).forEach((op) => {
          if ((op.employees || []).some((e) => String(e.employee_id) === employeeId)) {
            assignedOps.push({ job, op })
          }
        })
      })

      items.forEach((item) => {
        const itemNorm = normalize(item.name)

        const match = assignedOps.find(({ op }) => {
          const opNorm = normalize(op.name)
          if (opNorm.includes(itemNorm) || itemNorm.includes(opNorm)) return true
          const opMaterials: any[] = (op as any).materials || []
          return opMaterials.some((mat) => {
            const matNorm = normalize(mat.name || "")
            const idMatch = mat.item_no && String(mat.item_no) === String(item.id)
            return matNorm.includes(itemNorm) || itemNorm.includes(matNorm) || idMatch
          })
        })

        if (!match) {
          result.warnings.push({
            item: item.name,
            type: "no_matching_op",
            message: `"${item.name}" doesn't match any assigned operation or material. Verify this material is for the correct job.`,
          })
          return
        }

        const { op } = match

        if (op.completed) {
          result.warnings.push({
            item: item.name,
            type: "op_complete",
            message: `Operation "${op.name}" is already marked complete. Are you sure this material is still needed?`,
          })
          return
        }

        if (op.expected_hours && op.expected_hours > 0 && op.shifts) {
          const rendered = op.shifts.reduce((sum, shift) => sum + (parseFloat(String(shift.hours_rendered)) || 0), 0)
          if (rendered >= op.expected_hours * 0.9) {
            result.warnings.push({
              item: item.name,
              type: "op_nearly_done",
              message: `Operation "${op.name}" is ${Math.round((rendered / op.expected_hours) * 100)}% through its expected hours. Confirm material is still required.`,
            })
          }
        }
      })

      return result
    },
    [getAssignedJobOrders]
  )

  const submitCheckout = useCallback(
    async ({ employee, items, purpose, itemAssignments }: SubmitCheckoutParams): Promise<CheckoutSubmissionMeta> => {
      const effectivePurpose = purpose?.trim() || "Material extraction request"

      let requestsSaved = false
      let requestRefs: string[] = []
      let inventorySaved = false
      let transactionSaved = false

      try {
        const requests = items.map((item, idx) => {
          const assignment = itemAssignments[idx]
          return {
            employee_uid: employee.id,
            employee_barcode: employee.idBarcode,
            employee_name: employee.fullName,
            material_name: item.name,
            quantity_requested: item.quantity,
            unit_of_measure: "pcs",
            item_no: item.id,
            item_description: `${item.brand} - ${item.itemType}`,
            purpose: effectivePurpose,
            project_name: assignment?.jobOrderLabel ?? null,
            job_order_id: assignment?.jobOrderId ?? null,
            request_notes: `Requested via Toolbox. Balance at request time: ${item.balance}`,
          }
        })

        const response = await mainapiService.checkoutRequests.bulkCreateRequests(requests)
        requestsSaved = !!response?.success
        requestRefs = response?.request_refs ?? []
        if (!requestsSaved) {
          console.warn("[CheckoutOrchestration] Request failed:", response?.error)
        }
      } catch (error) {
        console.warn("[CheckoutOrchestration] Request failed:", (error as Error).message)
      }

      try {
        const checkouts = items.map((item, idx) => {
          const assignment = itemAssignments[idx]
          return {
            employee_uid: employee.id,
            employee_barcode: employee.idBarcode,
            employee_name: employee.fullName,
            material_name: item.name,
            quantity_checked_out: item.quantity,
            unit_of_measure: "pcs",
            item_no: item.id,
            item_description: `${item.brand} - ${item.itemType}`,
            purpose: effectivePurpose,
            project_name: assignment?.jobOrderLabel ?? null,
          }
        })

        const inventoryResult = await mainapiService.employeeInventory.bulkCheckout(checkouts, null)
        inventorySaved = !!inventoryResult?.success
        if (!inventorySaved) {
          console.warn("[CheckoutOrchestration] Inventory tracking failed:", inventoryResult?.error)
        }
      } catch (error) {
        console.warn("[CheckoutOrchestration] Inventory tracking failed:", (error as Error).message)
      }

      try {
        const itemSummary = items.map((item) => `${item.name} x${item.quantity}`).join(", ")
        const itemNumbers = [...new Set(items.map((item) => String(item.id)))].join(";")
        const assignmentSummary = itemAssignments
          .filter((assignment) => assignment.jobOrderLabel)
          .map((assignment) => `${assignment.itemName} -> ${assignment.jobOrderLabel}`)
          .join("; ")

        const logResult = await mainapiService.logTransaction({
          username: employee.fullName,
          id_number: employee.idNumber,
          id_barcode: employee.idBarcode,
          details: `Checkout: ${items.length} items - ${itemSummary}${assignmentSummary ? ` | Assignments: ${assignmentSummary}` : ""}`.slice(0, 500),
          purpose: effectivePurpose,
          item_no: itemNumbers,
          items_json: JSON.stringify(
            items.map((item, idx) => ({
              id: item.id,
              name: item.name,
              qty: item.quantity,
              job_order_id: itemAssignments[idx]?.jobOrderId ?? null,
            }))
          ),
          status: "ACTIVE",
        })

        transactionSaved = !!logResult?.success
        if (!transactionSaved) {
          console.warn("[CheckoutOrchestration] Transaction log write failed")
        }
      } catch (error) {
        console.warn("[CheckoutOrchestration] Transaction log write failed:", (error as Error).message)
      }

      return {
        requestsSaved,
        requestRefs,
        inventorySaved,
        transactionSaved,
      }
    },
    []
  )

  return {
    getAssignedJobOrders,
    validateCheckoutAgainstJobOrders,
    submitCheckout,
  }
}
