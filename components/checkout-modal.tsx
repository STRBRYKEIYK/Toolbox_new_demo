"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X, Wifi, WifiOff, Scan, CreditCard, UserCheck,
  ShoppingCart, FileText, CheckCircle2, ChevronRight, ChevronLeft,
  Package, AlertCircle, Check, Zap, Radio, Terminal, Activity,
} from "lucide-react"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { apiBridge } from "../lib/api-bridge"
import { demoBackend as mainapiService } from "../lib/demo-backend"
import Swal from 'sweetalert2'


// ─── Types ───────────────────────────────────────────────────────────────────
interface CartItem {
  id: any; name: string; brand: string; itemType: string; quantity: number; balance: number
}
interface Employee {
  id: any; firstName: string; lastName: string; middleName?: string; fullName: string
  idNumber: string; idBarcode: string; position: string; department: string
  status: string; profilePicture?: string
}
interface JobOperation {
  id: number; name: string; expected_hours: number | null; completed: boolean
  employees: Array<{ employee_id: number; employee_full_name: string }>
  shifts?: Array<{ hours_rendered: number }>
  materials?: Array<{ item_no?: string; name: string; quantity: number; unit: string; notes?: string }>
}
interface JobOrder {
  id: number; jo_number: string | null; description: string
  customer: string | null; status: string; operations: JobOperation[]
}
interface ValidationResult {
  valid: boolean
  errors: Array<{ item: string; type: 'no_active_job' | 'no_matching_op'; message: string }>
  warnings: Array<{ item: string; type: 'op_nearly_done' | 'op_complete' | 'no_matching_op'; message: string }>
  matchedJobs: JobOrder[]
}
interface ItemJobAssignment {
  itemId: any
  itemName: string
  quantity: number
  jobOrderId: number | null
  jobOrderLabel: string | null
}
interface CheckoutModalProps {
  isOpen: boolean; onClose: () => void; items: CartItem[]
  onConfirmCheckout: (employee: Employee, purpose?: string, meta?: { requestsSaved?: boolean; requestRefs?: string[] }) => void
  isCommitting?: boolean
}

type WizardStep = 1 | 2 | 3
type LoadingStage = 'detecting-jobs' | 'validating' | 'submitting-request' | null

const WIZARD_STEPS = [
  { step: 1, title: "MANIFEST", icon: ShoppingCart, description: "Verify buffer contents" },
  { step: 2, title: "PURPOSE", icon: FileText, description: "Log extraction reason" },
  { step: 3, title: "EXECUTE", icon: CheckCircle2, description: "Authorize & validate" },
] as const

const OFFLINE_KEY = 'toolbox-offline-data'

// ─── Visual helpers ───────────────────────────────────────────────────────────
function LedBar({ segments = 12, filled = 0, color = 'bg-orange-500' }: { segments?: number; filled?: number; color?: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: segments }).map((_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-[1px] transition-colors duration-150 ${i < filled ? `${color} shadow-[0_0_4px_currentColor]` : 'bg-zinc-800'}`} />
      ))}
    </div>
  )
}
function TelemetryLabel({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-zinc-800 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      <span className={`text-xs font-mono font-bold ${accent ? 'text-orange-400 drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]' : 'text-zinc-200'}`}>{value}</span>
    </div>
  )
}
function LedDot({ status }: { status: 'ok' | 'warn' | 'error' | 'idle' }) {
  const c = { ok: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]', warn: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]', error: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]', idle: 'bg-zinc-600' }
  return <span className={`inline-block w-2 h-2 rounded-full ${c[status]} animate-pulse`} />
}
function Panel({ children, className = '', inset = false }: { children: React.ReactNode; className?: string; inset?: boolean }) {
  return (
    <div className={`rounded-sm border border-zinc-800 ${inset ? 'bg-black/60 shadow-[inset_0_4px_10px_rgba(0,0,0,0.8)]' : 'bg-zinc-900 shadow-[0_4px_16px_rgba(0,0,0,0.6)]'} ${className}`}>
      {children}
    </div>
  )
}
function SectionHeader({ label, icon: Icon, status }: { label: string; icon?: any; status?: 'ok' | 'warn' | 'error' | 'idle' }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {status && <LedDot status={status} />}
      {Icon && <Icon className="w-3.5 h-3.5 text-orange-500" />}
      <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">{label}</span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  )
}

// ─── Core validation against job order operations ────────────────────────────
async function validateCheckoutAgainstJobOrders(
  employee: Employee,
  items: CartItem[]
): Promise<ValidationResult> {
  const res = await mainapiService.jobOrders.getJobOrders({ status: 'open' }) as any
  const all: any[] = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []

  const detailed: JobOrder[] = await Promise.all(
    all.map(j => mainapiService.jobOrders.getJobOrder(j.id).catch(() => j))
  ) as JobOrder[]

  const empId = String(employee.id)

  const assignedJobs = detailed.filter(job =>
    (job.operations || []).some(op =>
      (op.employees || []).some(e => String(e.employee_id) === empId)
    )
  )

  const result: ValidationResult = { valid: true, errors: [], warnings: [], matchedJobs: assignedJobs }

  if (assignedJobs.length === 0) {
    result.warnings.push({
      item: 'ALL',
      type: 'no_active_job',
      message: `${employee.fullName} has no open job order assignments. Demo mode will allow checkout to continue.`,
    })
  }

  const assignedOps: Array<{ job: JobOrder; op: JobOperation }> = []
  assignedJobs.forEach(job => {
    ;(job.operations || []).forEach(op => {
      if ((op.employees || []).some(e => String(e.employee_id) === empId)) {
        assignedOps.push({ job, op })
      }
    })
  })

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

  items.forEach(item => {
    const iNorm = norm(item.name)

    const match = assignedOps.find(({ op }) => {
      const oNorm = norm(op.name)
      if (oNorm.includes(iNorm) || iNorm.includes(oNorm)) return true
      const opMaterials: any[] = (op as any).materials || []
      return opMaterials.some(mat => {
        const mNorm = norm(mat.name || '')
        const idMatch = mat.item_no && String(mat.item_no) === String(item.id)
        return mNorm.includes(iNorm) || iNorm.includes(mNorm) || idMatch
      })
    })

    if (!match) {
      result.warnings.push({
        item: item.name,
        type: 'no_matching_op',
        message: `"${item.name}" doesn't match any assigned operation or material. Verify this material is for the correct job.`,
      })
      return
    }

    const { op } = match

    if (op.completed) {
      result.warnings.push({
        item: item.name,
        type: 'op_complete',
        message: `Operation "${op.name}" is already marked complete. Are you sure this material is still needed?`,
      })
      return
    }

    if (op.expected_hours && op.expected_hours > 0 && op.shifts) {
      const rendered = op.shifts.reduce((s, sh) => s + (parseFloat(String(sh.hours_rendered)) || 0), 0)
      if (rendered >= op.expected_hours * 0.9) {
        result.warnings.push({
          item: item.name,
          type: 'op_nearly_done',
          message: `Operation "${op.name}" is ${Math.round((rendered / op.expected_hours) * 100)}% through its expected hours. Confirm material is still required.`,
        })
      }
    }
  })

  return result
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function CheckoutModal({ isOpen, onClose, items, onConfirmCheckout, isCommitting = false }: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [inputMethod, setInputMethod] = useState<'barcode' | 'manual'>('barcode')
  const [userInput, setUserInput] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [purpose, setPurpose] = useState("")
  const [saving, setSaving] = useState(false)
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(null)
  const [detectedJobs, setDetectedJobs] = useState<JobOrder[]>([])

  const getCachedEmployees = useCallback((): Employee[] => {
    try { const p = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '{}'); return Array.isArray(p?.employees) ? p.employees : [] } catch { return [] }
  }, [])
  const cacheEmployees = useCallback((data: Employee[]) => {
    try { const p = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '{}'); localStorage.setItem(OFFLINE_KEY, JSON.stringify({ ...p, employees: data, lastSync: Date.now() })) } catch { }
  }, [])

  const createDemoOperator = useCallback((identifier: string, source: 'barcode' | 'manual'): Employee => {
    const trimmed = identifier.trim()
    return {
      id: `demo-${source}-${trimmed || 'operator'}`,
      firstName: 'Demo',
      lastName: 'Operator',
      fullName: `Demo Operator (${trimmed || 'unassigned'})`,
      idNumber: trimmed || 'DEMO-OPERATOR',
      idBarcode: trimmed || 'DEMO-OPERATOR',
      position: 'Demo Mode User',
      department: 'Portfolio Demo',
      status: 'Active',
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1); setSelectedEmployee(null); setUserInput(""); setError(null)
      setIsScanning(false); setPurpose(""); setSaving(false); setLoadingStage(null)
      setDetectedJobs([])
    }
  }, [isOpen])

  useEffect(() => { if (isOpen && employees.length === 0) loadEmployees() }, [isOpen])

  useEffect(() => {
    if (!isOpen || inputMethod !== 'barcode' || currentStep !== 3) return
    let buf = ""; let last = Date.now()
    const onKey = (e: KeyboardEvent) => {
      const now = Date.now(); if (now - last > 100) buf = ""; last = now
      if (e.key === 'Enter') { e.preventDefault(); if (buf.length > 3) { handleBarcodeScanned(buf); buf = "" }; return }
      if (/^[a-zA-Z0-9]$/.test(e.key)) { buf += e.key; if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') e.preventDefault() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, inputMethod, employees, currentStep])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('checkout-modal-state', { detail: { isOpen } }))
  }, [isOpen])

  useEffect(() => {
    if (!selectedEmployee || currentStep < 3) return
    setDetectedJobs([])
    ;(async () => {
      try {
        const res = await mainapiService.jobOrders.getJobOrders({ status: 'open' }) as any
        const all: any[] = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []
        const detailed = await Promise.all(all.map(j => mainapiService.jobOrders.getJobOrder(j.id).catch(() => j))) as JobOrder[]
        const empId = String(selectedEmployee.id)
        const assigned = detailed.filter(j =>
          (j.operations || []).some(op => (op.employees || []).some(e => String(e.employee_id) === empId))
        )
        setDetectedJobs(assigned)
      } catch { /* silent */ }
    })()
  }, [selectedEmployee, currentStep])

  const loadEmployees = async () => {
    setLoadingEmployees(true); setError(null)
    try { const data = await apiBridge.fetchEmployees(); setEmployees(data); cacheEmployees(data as Employee[]) }
    catch {
      const cached = getCachedEmployees()
      if (cached.length > 0) { setEmployees(cached); setError('OFFLINE — using cached operator registry.') }
      else setError("DATABASE UNREACHABLE — No cached operator data.")
    } finally { setLoadingEmployees(false) }
  }

  const handleBarcodeScanned = (barcode: string) => {
    setIsScanning(true)
    const emp = employees.find(e => e.idBarcode === barcode)
    if (emp) {
      if (emp.status !== 'Active') { setError(`ID DEACTIVATED — ${emp.firstName} ${emp.lastName}.`); setUserInput(barcode); setSelectedEmployee(null) }
      else { setSelectedEmployee(emp); setUserInput(barcode); setError(null) }
    } else { setSelectedEmployee(createDemoOperator(barcode, 'barcode')); setUserInput(barcode); setError(null) }
    setIsScanning(false)
  }

  const handleManualInput = (value: string) => {
    setUserInput(value); setError(null)
    if (value.trim().length < 3) { setSelectedEmployee(null); return }
    const emp = employees.find(e => e.idNumber === value.trim()) || employees.find(e => e.idNumber?.toLowerCase() === value.trim().toLowerCase()) || employees.find(e => e.idBarcode === value.trim())
    if (emp) {
      if (emp.status !== 'Active') { setError(`ID DEACTIVATED — ${emp.firstName} ${emp.lastName}.`); setSelectedEmployee(null) }
      else { setSelectedEmployee(emp); setError(null) }
    } else { setSelectedEmployee(createDemoOperator(value, 'manual')); setError(null) }
  }

  // ── Confirm ────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedEmployee) { setError("OPERATOR NOT IDENTIFIED — Scan or enter ID to proceed."); return }
    try {
      setSaving(true); setLoadingStage('detecting-jobs')

      setLoadingStage('validating')
      let validation: ValidationResult
      try {
        validation = await validateCheckoutAgainstJobOrders(selectedEmployee, items)
      } catch {
        validation = {
          valid: true, errors: [],
          warnings: [{ item: 'ALL', type: 'no_matching_op', message: 'Job order validation unavailable. Request will proceed unvalidated.' }],
          matchedJobs: [],
        }
      }

      // ── Step B: Hard error Swal ────────────────────────────────────────────
      let wasOverride = false

      if (!validation.valid && validation.errors.length > 0) {
        const errorRows = validation.errors.map((e) => `
          <div style="background:#18181b;border:1px solid #3f3f46;border-left:3px solid #f43f5e;border-radius:4px;padding:14px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-family:monospace;font-size:13px;color:#fafafa;font-weight:700;">${e.item === 'ALL' ? 'All Items' : e.item}</span>
              <span style="background:#f43f5e;color:#fff;padding:2px 8px;border-radius:2px;font-size:10px;font-family:monospace;font-weight:900;letter-spacing:0.1em;">${e.type.toUpperCase().replace('_', ' ')}</span>
            </div>
            <p style="font-size:11px;color:#a1a1aa;margin:0;font-family:monospace;line-height:1.6;">${e.message}</p>
          </div>`).join('')

        const faultResult = await Swal.fire({
          icon: undefined, title: '',
          html: `
            <div style="background:#09090b;font-family:'Geist Mono',monospace;text-align:left;padding:4px;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #27272a;">
                <div style="width:10px;height:10px;border-radius:50%;background:#f43f5e;box-shadow:0 0 10px rgba(244,63,94,0.8);flex-shrink:0;"></div>
                <span style="font-size:16px;font-weight:900;letter-spacing:0.15em;color:#f43f5e;text-transform:uppercase;">Job Order Validation Fault</span>
              </div>
              <div style="background:#18181b;border:1px solid #27272a;border-radius:4px;padding:12px;margin-bottom:16px;">
                <div style="font-size:10px;color:#71717a;letter-spacing:0.1em;margin-bottom:6px;">OPERATOR</div>
                <div style="font-size:14px;color:#fafafa;font-weight:700;">${selectedEmployee.fullName}</div>
                <div style="font-size:11px;color:#71717a;margin-top:2px;">ID: ${selectedEmployee.idNumber} · BAR: ${selectedEmployee.idBarcode}</div>
              </div>
              <div style="font-size:10px;color:#f43f5e;letter-spacing:0.1em;margin-bottom:10px;">FAULT LOG (${validation.errors.length})</div>
              ${errorRows}
              <div style="background:#18181b;border:1px solid #27272a;border-radius:4px;padding:12px;margin-top:14px;">
                <div style="font-size:10px;color:#71717a;margin-bottom:6px;">RESOLUTION</div>
                <div style="font-size:11px;color:#a1a1aa;line-height:1.7;">
                  Only employees with active job-order assignments may extract materials.<br>
                  Verify assignments with Operations Dept. or use Override to bypass.
                </div>
              </div>
            </div>`,
          background: '#09090b', width: '780px',
          showCancelButton: true,
          confirmButtonText: 'ABORT',
          cancelButtonText: 'OVERRIDE & PROCEED',
          confirmButtonColor: '#3f3f46', cancelButtonColor: '#f97316',
          customClass: { popup: 'swal-toolbox', htmlContainer: 'swal-toolbox-html' },
          backdrop: 'rgba(0,0,0,0.9)',
        })

        if (faultResult.isConfirmed) { setSaving(false); setLoadingStage(null); return }
        wasOverride = true
      }

      // ── Step C: Per-item job order assignment Swal ─────────────────────────
      // Default assignments fallback (used when override OR single JO)
      let itemAssignments: ItemJobAssignment[] = items.map(item => ({
        itemId:        item.id,
        itemName:      item.name,
        quantity:      item.quantity,
        jobOrderId:    validation.matchedJobs[0]?.id ?? null,
        jobOrderLabel: validation.matchedJobs[0]
          ? (validation.matchedJobs[0].jo_number
              ? `JO# ${validation.matchedJobs[0].jo_number}`
              : validation.matchedJobs[0].description)
          : null,
      }))

      if (!wasOverride) {
        // ── Build a lookup: joId → { materials[], label } ──────────────────
        // Used to render requirements panel and validate item vs selected JO
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

        interface JoMeta {
          id: number
          label: string
          shortLabel: string
          materials: Array<{ item_no?: string; name: string; quantity: number; unit: string; notes?: string }>
          operations: JobOperation[]
        }

        const joMeta: JoMeta[] = validation.matchedJobs.map(j => {
          const allMats: any[] = []
          ;(j.operations || []).forEach(op => {
            ;(op.materials || []).forEach(m => allMats.push(m))
          })
          return {
            id:         j.id,
            label:      j.jo_number ? `JO# ${j.jo_number} — ${j.description}` : j.description,
            shortLabel: j.jo_number ? `JO# ${j.jo_number}` : j.description,
            materials:  allMats,
            operations: j.operations || [],
          }
        })

        // Helper: find the required material entry in a JO for a given cart item
        const findRequiredMat = (joId: number, cartItem: CartItem) => {
          const jo = joMeta.find(j => j.id === joId)
          if (!jo) return null
          const iNorm = norm(cartItem.name)
          return jo.materials.find(m => {
            const mNorm = norm(m.name || '')
            const idMatch = m.item_no && String(m.item_no) === String(cartItem.id)
            return mNorm.includes(iNorm) || iNorm.includes(mNorm) || idMatch
          }) ?? null
        }

        const totalItemCount = items.length
        const autoJobId      = joMeta.length === 1 ? joMeta[0].id    : null
        const autoJobLabel   = joMeta.length === 1 ? joMeta[0].label : null

        // ── Build select options HTML (called client-side via window fn) ────
        // We encode joMeta as JSON into the page so JS can re-render options
        const joMetaJson = JSON.stringify(joMeta)

        const initSaved = joMeta.length === 1 ? totalItemCount : 0

        // Build initial item rows
        const buildItemRowHtml = (item: CartItem, idx: number, autoSaved: boolean, autoJoId: number | null) => {
          const selectOptions = `
            <option value="" style="background:#18181b;color:#71717a;">— Select job order —</option>
            ${joMeta.map(jo => {
              const mat = findRequiredMat(jo.id, item)
              const hasItem = mat !== null
              const reqQty  = mat ? `${parseFloat(String(mat.quantity))} ${mat.unit}` : null
              const optLabel = hasItem
                ? `${jo.shortLabel} ✓ req: ${reqQty}`
                : `${jo.shortLabel} — item not listed`
              return `<option value="${jo.id}" ${autoJoId === jo.id ? 'selected' : ''}
                style="background:#18181b;color:${hasItem ? '#fafafa' : '#71717a'};">
                ${optLabel}
              </option>`
            }).join('')}
          `

          // Initial requirement panel (shown for auto-selected JO or empty)
          const initMat    = autoJoId ? findRequiredMat(autoJoId, item) : null
          const reqPanel   = buildReqPanelHtml(item, autoJoId, initMat, autoSaved)

          return `
            <div id="item-row-${idx}"
              style="background:#111113;border:1px solid ${autoSaved && initMat ? 'rgba(34,197,94,0.3)' : autoSaved ? '#f59e0b44' : '#27272a'};
                     border-radius:4px;margin-bottom:8px;overflow:hidden;
                     transition:border-color 0.2s,background 0.2s;">

              <!-- Top bar: qty badge + item name + save btn -->
              <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;">
                <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:center;
                            width:36px;height:36px;border-radius:4px;border:1px solid #3f3f46;
                            background:#18181b;font-family:monospace;font-size:11px;
                            font-weight:900;color:#f97316;">
                  ${item.quantity}×
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-family:monospace;font-size:12px;font-weight:700;color:#fafafa;
                              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${item.name}
                  </div>
                  <div style="font-size:10px;color:#52525b;margin-top:1px;">
                    ${item.brand} · ${item.itemType} · Checking out: <span style="color:#f97316;font-weight:700;">${item.quantity} pcs</span>
                  </div>
                </div>
                <button id="save-btn-${idx}"
                  onclick="window.__joSaveItem(${idx})"
                  data-saved="${autoSaved ? '1' : '0'}"
                  style="flex:0 0 auto;padding:6px 14px;border-radius:3px;font-family:monospace;
                         font-size:10px;font-weight:900;letter-spacing:0.08em;cursor:pointer;
                         transition:all 0.15s;border:1px solid;white-space:nowrap;
                         ${autoSaved
                           ? 'border-color:#16a34a;background:rgba(22,163,74,0.15);color:#4ade80;'
                           : 'border-color:#3f3f46;background:#18181b;color:#71717a;'
                         }">
                  ${autoSaved ? '✓ SAVED' : 'SAVE'}
                </button>
              </div>

              <!-- Select row -->
              <div style="padding:0 12px 10px 12px;">
                <select id="jo-select-${idx}"
                  data-item-idx="${idx}"
                  onchange="window.__joRowChange(${idx})"
                  style="width:100%;padding:7px 10px;background:#0d0d0f;border:1px solid #3f3f46;
                         border-radius:3px;font-family:monospace;font-size:11px;color:#fafafa;
                         outline:none;cursor:pointer;appearance:none;
                         background-image:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 6%22><path fill=%22%23f97316%22 d=%22M0 0l5 6 5-6z%22/></svg>');
                         background-repeat:no-repeat;background-position:right 10px center;
                         background-size:8px;padding-right:28px;">
                  ${selectOptions}
                </select>
              </div>

              <!-- Requirement panel (dynamic) -->
              <div id="req-panel-${idx}" style="padding:0 12px 10px 12px;">
                ${reqPanel}
              </div>
            </div>`
        }

        // ── Requirement panel HTML (re-rendered on select change) ───────────
        const buildReqPanelHtml = (
          item: CartItem,
          joId: number | null,
          mat: any | null,
          isSaved: boolean
        ): string => {
          if (!joId) return `
            <div style="background:#18181b;border:1px solid #27272a;border-radius:3px;padding:8px 10px;">
              <span style="font-size:10px;color:#52525b;font-family:monospace;">
                Select a job order to see material requirements
              </span>
            </div>`

          if (!mat) return `
            <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.25);
                        border-radius:3px;padding:8px 10px;display:flex;align-items:center;gap:8px;">
              <span style="font-size:14px;">⚠️</span>
              <div>
                <div style="font-size:10px;color:#f87171;font-weight:900;font-family:monospace;
                            letter-spacing:0.06em;margin-bottom:2px;">ITEM NOT IN JO MATERIALS</div>
                <div style="font-size:10px;color:#71717a;font-family:monospace;">
                  "${item.name}" is not listed as a required material for this job order.
                  You can still proceed but it will be flagged for warehouse review.
                </div>
              </div>
            </div>`

          const reqQty      = parseFloat(String(mat.quantity))
          const checkoutQty = item.quantity
          const isOver      = checkoutQty > reqQty
          const isExact     = checkoutQty === reqQty
          const fillPct     = Math.min(100, Math.round((checkoutQty / reqQty) * 100))

          // Color logic
          const barColor  = isOver ? '#f43f5e' : isExact ? '#4ade80' : '#f97316'
          const lblColor  = isOver ? '#f87171' : isExact ? '#4ade80' : '#fbbf24'
          const statusTxt = isOver
            ? `OVER by ${checkoutQty - reqQty} ${mat.unit}`
            : isExact
            ? 'EXACT MATCH'
            : `${reqQty - checkoutQty} ${mat.unit} remaining`

          return `
            <div style="background:${isOver ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.02)'};
                        border:1px solid ${isOver ? 'rgba(239,68,68,0.3)' : isSaved ? 'rgba(34,197,94,0.2)' : '#27272a'};
                        border-radius:3px;padding:10px 12px;">

              <!-- Header row -->
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span style="font-size:10px;color:#71717a;font-weight:900;font-family:monospace;
                             letter-spacing:0.08em;text-transform:uppercase;">Required by JO</span>
                <span style="font-size:10px;color:${lblColor};font-weight:900;font-family:monospace;">
                  ${statusTxt}
                </span>
              </div>

              <!-- Qty comparison -->
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                <div style="flex:1;text-align:center;background:#18181b;border:1px solid #27272a;
                            border-radius:3px;padding:6px;">
                  <div style="font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">
                    JO Requires
                  </div>
                  <div style="font-family:monospace;font-size:18px;font-weight:900;color:#fafafa;">
                    ${reqQty}
                  </div>
                  <div style="font-size:9px;color:#71717a;">${mat.unit}</div>
                </div>
                <div style="font-size:18px;color:#3f3f46;">→</div>
                <div style="flex:1;text-align:center;background:#18181b;border:1px solid ${isOver ? '#f43f5e44' : '#27272a'};
                            border-radius:3px;padding:6px;">
                  <div style="font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">
                    Checking Out
                  </div>
                  <div style="font-family:monospace;font-size:18px;font-weight:900;color:${lblColor};">
                    ${checkoutQty}
                  </div>
                  <div style="font-size:9px;color:#71717a;">pcs</div>
                </div>
              </div>

              <!-- Progress bar -->
              <div style="background:#27272a;border-radius:2px;height:5px;overflow:hidden;margin-bottom:6px;">
                <div style="height:100%;border-radius:2px;transition:width 0.3s;
                            background:${barColor};width:${fillPct}%;
                            box-shadow:0 0 6px ${barColor}66;">
                </div>
              </div>

              <!-- Footer detail -->
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:10px;color:#52525b;font-family:monospace;">
                  ${mat.notes ? `Note: ${mat.notes}` : `Item: ${mat.name}`}
                </span>
                <span style="font-size:10px;font-family:monospace;font-weight:700;color:${lblColor};">
                  ${fillPct}% of requirement
                </span>
              </div>

              ${isOver ? `
                <div style="margin-top:8px;padding:6px 8px;background:rgba(239,68,68,0.1);
                            border:1px solid rgba(239,68,68,0.3);border-radius:3px;">
                  <span style="font-size:10px;color:#f87171;font-family:monospace;">
                    ⚠ Checkout quantity exceeds JO requirement. Warehouse will flag for review.
                  </span>
                </div>` : ''}
            </div>`
        }

        // Serialize helpers for use inside Swal's didOpen (no closure over React state)
        const itemsJson = JSON.stringify(items.map(i => ({
          id: i.id, name: i.name, brand: i.brand, itemType: i.itemType,
          quantity: i.quantity, balance: i.balance
        })))

        const itemRowsHtml = items.map((item, idx) => {
          const autoSaved = joMeta.length === 1
          return buildItemRowHtml(item, idx, autoSaved, autoJobId)
        }).join('')

        const buildWarningsPanel = (warns: typeof validation.warnings) => {
          if (warns.length === 0) return ''
          const warnRows = warns.map((w, i) => `
            <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;padding:10px;
                        background:#18181b;border:1px solid #27272a;border-left:3px solid #fbbf24;border-radius:4px;">
              <span style="font-family:monospace;font-size:10px;color:#fbbf24;font-weight:900;flex-shrink:0;">
                W${String(i + 1).padStart(2, '0')}
              </span>
              <span style="font-size:12px;color:#a1a1aa;">${w.message}</span>
            </div>`).join('')
          return `
            <div style="margin-bottom:14px;">
              <div style="font-size:10px;color:#fbbf24;letter-spacing:0.1em;font-weight:900;
                          text-transform:uppercase;margin-bottom:8px;">Warning Log (${warns.length})</div>
              ${warnRows}
            </div>`
        }

        const assignSwalResult = await Swal.fire({
          icon: undefined, title: '',
          html: `
            <div style="background:#09090b;font-family:'Geist Mono',monospace;text-align:left;padding:4px;">

              <!-- Header -->
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;
                          padding-bottom:16px;border-bottom:1px solid #27272a;">
                <div style="width:10px;height:10px;border-radius:50%;background:#f97316;
                            box-shadow:0 0 10px rgba(249,115,22,0.6);flex-shrink:0;"></div>
                <span style="font-size:15px;font-weight:900;letter-spacing:0.12em;
                             color:#f97316;text-transform:uppercase;">Assign Items to Job Orders</span>
              </div>

              <!-- Operator -->
              <div style="background:#18181b;border:1px solid #27272a;border-radius:4px;
                          padding:12px;margin-bottom:16px;">
                <div style="font-size:10px;color:#71717a;margin-bottom:4px;">OPERATOR</div>
                <div style="font-size:14px;color:#fafafa;font-weight:700;">${selectedEmployee.fullName}</div>
                <div style="font-size:11px;color:#71717a;margin-top:1px;">
                  ${selectedEmployee.position} · ${selectedEmployee.department}
                </div>
              </div>

              <!-- Instruction -->
              <div style="font-size:10px;color:#71717a;letter-spacing:0.08em;margin-bottom:12px;
                          text-transform:uppercase;">
                Select the job order each item is for, then press SAVE per item
              </div>

              <!-- Item rows -->
              <div id="item-assignments-container" style="margin-bottom:14px;">
                ${itemRowsHtml}
              </div>

              <!-- Progress -->
              <div style="background:#111113;border:1px solid #27272a;border-radius:4px;
                          padding:10px 12px;margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <span style="font-size:10px;color:#71717a;font-weight:900;text-transform:uppercase;
                               letter-spacing:0.08em;">Items Assigned</span>
                  <span id="saved-count-label"
                    style="font-family:monospace;font-size:12px;font-weight:700;
                           color:${initSaved === totalItemCount ? '#4ade80' : '#f97316'};">
                    ${initSaved}/${totalItemCount}
                  </span>
                </div>
                <div style="background:#27272a;border-radius:2px;height:4px;overflow:hidden;">
                  <div id="saved-progress-bar"
                    style="height:100%;border-radius:2px;transition:width 0.25s,background 0.25s;
                           background:${initSaved === totalItemCount ? '#16a34a' : '#f97316'};
                           width:${Math.round((initSaved / totalItemCount) * 100)}%;">
                  </div>
                </div>
              </div>

              ${buildWarningsPanel(validation.warnings)}

              <!-- Matched JOs -->
              ${validation.matchedJobs.length > 0 ? `
                <div style="background:#18181b;border:1px solid #27272a;border-radius:4px;
                            padding:12px;margin-bottom:14px;">
                  <div style="font-size:10px;color:#71717a;margin-bottom:6px;">
                    MATCHED JOB ORDER${validation.matchedJobs.length > 1 ? 'S' : ''}
                  </div>
                  ${validation.matchedJobs.map(j => `
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                      <div style="width:6px;height:6px;border-radius:50%;background:#22d3ee;flex-shrink:0;"></div>
                      <div style="font-size:12px;color:#fafafa;font-weight:700;">
                        ${j.description}${j.jo_number ? ` · JO# ${j.jo_number}` : ''}
                      </div>
                    </div>`).join('')}
                </div>` : ''}

              <!-- Auth box -->
              <div style="background:#18181b;border:1px solid #27272a;border-radius:4px;padding:12px;">
                <div style="font-size:12px;color:#fafafa;font-weight:700;margin-bottom:4px;">
                  Authorize extraction request?
                </div>
                <div style="font-size:11px;color:#71717a;line-height:1.7;">
                  Request will be sent to warehouse for review.<br>
                  Stock is <strong style="color:#fafafa;">NOT</strong> released until warehouse confirms.
                </div>
              </div>
            </div>`,

          background: '#09090b',
          width: '800px',
          showCancelButton: true,
          confirmButtonText: 'CONFIRM REQUEST',
          cancelButtonText: 'ABORT',
          confirmButtonColor: '#16a34a',
          cancelButtonColor: '#3f3f46',
          customClass: { popup: 'swal-toolbox', htmlContainer: 'swal-toolbox-html' },
          backdrop: 'rgba(0,0,0,0.9)',

          didOpen: () => {
            // Deserialize joMeta and items from embedded JSON
            const joMetaParsed: JoMeta[]   = JSON.parse(joMetaJson)
            const itemsParsed: CartItem[]  = JSON.parse(itemsJson)
            const normFn = (s: string)     => s.toLowerCase().replace(/[^a-z0-9]/g, '')

            const findMat = (joId: number, cartItem: CartItem) => {
              const jo = joMetaParsed.find(j => j.id === joId)
              if (!jo) return null
              const iNorm = normFn(cartItem.name)
              return jo.materials.find((m: any) => {
                const mNorm = normFn(m.name || '')
                const idMatch = m.item_no && String(m.item_no) === String(cartItem.id)
                return mNorm.includes(iNorm) || iNorm.includes(mNorm) || idMatch
              }) ?? null
            }

            // saved state
            const saved: Record<number, { jobOrderId: number | null; jobOrderLabel: string | null } | null> = {}
            itemsParsed.forEach((_, idx) => {
              saved[idx] = joMetaParsed.length === 1
                ? { jobOrderId: joMetaParsed[0].id, jobOrderLabel: joMetaParsed[0].label }
                : null
            })

            const updateProgress = () => {
              const count  = Object.values(saved).filter(v => v !== null).length
              const pct    = Math.round((count / itemsParsed.length) * 100)
              const isDone = count === itemsParsed.length
              const bar    = document.getElementById('saved-progress-bar')
              const lbl    = document.getElementById('saved-count-label')
              if (bar) { bar.style.width = `${pct}%`; bar.style.background = isDone ? '#16a34a' : '#f97316' }
              if (lbl) { lbl.textContent = `${count}/${itemsParsed.length}`; lbl.style.color = isDone ? '#4ade80' : '#f97316' }
              const confirmBtn = document.querySelector('.swal2-confirm') as HTMLButtonElement | null
              if (confirmBtn) {
                confirmBtn.disabled      = !isDone
                confirmBtn.style.opacity = isDone ? '1' : '0.35'
                confirmBtn.style.cursor  = isDone ? 'pointer' : 'not-allowed'
              }
            }

            // Re-render the requirement panel for a given item + selected JO
            const refreshReqPanel = (idx: number, joId: number | null, isSaved: boolean) => {
              const panelEl = document.getElementById(`req-panel-${idx}`)
              if (!panelEl) return
              const cartItem = itemsParsed[idx]
              const mat = joId ? findMat(joId, cartItem) : null

              if (!joId) {
                panelEl.innerHTML = `
                  <div style="background:#18181b;border:1px solid #27272a;border-radius:3px;padding:8px 10px;">
                    <span style="font-size:10px;color:#52525b;font-family:monospace;">
                      Select a job order to see material requirements
                    </span>
                  </div>`
                return
              }

              if (!mat) {
                panelEl.innerHTML = `
                  <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.25);
                              border-radius:3px;padding:8px 10px;display:flex;align-items:center;gap:8px;">
                    <span style="font-size:14px;">⚠️</span>
                    <div>
                      <div style="font-size:10px;color:#f87171;font-weight:900;font-family:monospace;
                                  letter-spacing:0.06em;margin-bottom:2px;">ITEM NOT IN JO MATERIALS</div>
                      <div style="font-size:10px;color:#71717a;font-family:monospace;">
                        "${cartItem.name}" is not listed as a required material for this job order.
                        You can still proceed but it will be flagged for warehouse review.
                      </div>
                    </div>
                  </div>`
                return
              }

              const reqQty      = parseFloat(String(mat.quantity))
              const checkoutQty = cartItem.quantity
              const isOver      = checkoutQty > reqQty
              const isExact     = checkoutQty === reqQty
              const fillPct     = Math.min(100, Math.round((checkoutQty / reqQty) * 100))
              const barColor    = isOver ? '#f43f5e' : isExact ? '#4ade80' : '#f97316'
              const lblColor    = isOver ? '#f87171' : isExact ? '#4ade80' : '#fbbf24'
              const statusTxt   = isOver
                ? `OVER by ${checkoutQty - reqQty} ${mat.unit}`
                : isExact ? 'EXACT MATCH'
                : `${reqQty - checkoutQty} ${mat.unit} remaining`

              panelEl.innerHTML = `
                <div style="background:${isOver ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.02)'};
                            border:1px solid ${isOver ? 'rgba(239,68,68,0.3)' : isSaved ? 'rgba(34,197,94,0.2)' : '#27272a'};
                            border-radius:3px;padding:10px 12px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <span style="font-size:10px;color:#71717a;font-weight:900;font-family:monospace;
                                 letter-spacing:0.08em;text-transform:uppercase;">Required by JO</span>
                    <span style="font-size:10px;color:${lblColor};font-weight:900;font-family:monospace;">${statusTxt}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                    <div style="flex:1;text-align:center;background:#18181b;border:1px solid #27272a;
                                border-radius:3px;padding:6px;">
                      <div style="font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">JO Requires</div>
                      <div style="font-family:monospace;font-size:18px;font-weight:900;color:#fafafa;">${reqQty}</div>
                      <div style="font-size:9px;color:#71717a;">${mat.unit}</div>
                    </div>
                    <div style="font-size:18px;color:#3f3f46;">→</div>
                    <div style="flex:1;text-align:center;background:#18181b;border:1px solid ${isOver ? '#f43f5e44' : '#27272a'};
                                border-radius:3px;padding:6px;">
                      <div style="font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Checking Out</div>
                      <div style="font-family:monospace;font-size:18px;font-weight:900;color:${lblColor};">${checkoutQty}</div>
                      <div style="font-size:9px;color:#71717a;">pcs</div>
                    </div>
                  </div>
                  <div style="background:#27272a;border-radius:2px;height:5px;overflow:hidden;margin-bottom:6px;">
                    <div style="height:100%;border-radius:2px;background:${barColor};width:${fillPct}%;
                                box-shadow:0 0 6px ${barColor}66;transition:width 0.3s;"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:10px;color:#52525b;font-family:monospace;">
                      ${mat.notes ? `Note: ${mat.notes}` : `Material: ${mat.name}`}
                    </span>
                    <span style="font-size:10px;font-family:monospace;font-weight:700;color:${lblColor};">
                      ${fillPct}% of requirement
                    </span>
                  </div>
                  ${isOver ? `
                    <div style="margin-top:8px;padding:6px 8px;background:rgba(239,68,68,0.1);
                                border:1px solid rgba(239,68,68,0.3);border-radius:3px;">
                      <span style="font-size:10px;color:#f87171;font-family:monospace;">
                        ⚠ Checkout quantity exceeds JO requirement. Warehouse will flag for review.
                      </span>
                    </div>` : ''}
                </div>`
            }

            // On select change: mark unsaved, refresh req panel
            ;(window as any).__joRowChange = (idx: number) => {
              saved[idx] = null
              const sel = document.getElementById(`jo-select-${idx}`) as HTMLSelectElement | null
              const btn = document.getElementById(`save-btn-${idx}`) as HTMLButtonElement | null
              const row = document.getElementById(`item-row-${idx}`)
              const joId = sel?.value ? parseInt(sel.value, 10) : null

              if (btn) {
                btn.dataset.saved = '0'; btn.textContent = 'SAVE'
                btn.style.borderColor = '#3f3f46'; btn.style.background = '#18181b'; btn.style.color = '#71717a'
              }
              if (row) { row.style.borderColor = '#27272a'; row.style.background = '#111113' }

              refreshReqPanel(idx, joId, false)
              updateProgress()
            }

            // On save: lock in selection, update UI
            ;(window as any).__joSaveItem = (idx: number) => {
              const sel = document.getElementById(`jo-select-${idx}`) as HTMLSelectElement | null
              const btn = document.getElementById(`save-btn-${idx}`) as HTMLButtonElement | null
              const row = document.getElementById(`item-row-${idx}`)
              if (!sel) return

              const joId  = sel.value ? parseInt(sel.value, 10) : null
              const joLbl = sel.value ? (sel.options[sel.selectedIndex]?.text ?? null) : null
              // Clean label (remove the req suffix we added to option text)
              const cleanLbl = joLbl?.replace(/ ✓ req:.*$/, '').replace(/ — item not listed$/, '') ?? null

              saved[idx] = { jobOrderId: joId, jobOrderLabel: cleanLbl }

              const cartItem = itemsParsed[idx]
              const mat      = joId ? findMat(joId, cartItem) : null
              const hasItem  = mat !== null

              if (btn) {
                btn.dataset.saved = '1'; btn.textContent = '✓ SAVED'
                btn.style.borderColor = '#16a34a'
                btn.style.background  = 'rgba(22,163,74,0.15)'
                btn.style.color       = '#4ade80'
              }
              if (row) {
                row.style.borderColor = hasItem ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'
                row.style.background  = hasItem ? 'rgba(22,163,74,0.03)' : 'rgba(251,191,36,0.03)'
              }

              refreshReqPanel(idx, joId, true)
              updateProgress()
            }

            ;(window as any).__joSavedAssignments = saved

            // Init: refresh requirement panels for auto-saved items
            itemsParsed.forEach((_, idx) => {
              if (saved[idx] !== null) {
                refreshReqPanel(idx, saved[idx]?.jobOrderId ?? null, true)
              }
            })

            updateProgress()
          },

          preConfirm: () => {
            const saved = (window as any).__joSavedAssignments as
              Record<number, { jobOrderId: number | null; jobOrderLabel: string | null } | null>
            const assignments: ItemJobAssignment[] = items.map((item, idx) => ({
              itemId:        item.id,
              itemName:      item.name,
              quantity:      item.quantity,
              jobOrderId:    saved[idx]?.jobOrderId    ?? null,
              jobOrderLabel: saved[idx]?.jobOrderLabel ?? null,
            }))
            return { assignments }
          },
        })

        if (!assignSwalResult.isConfirmed) { setSaving(false); setLoadingStage(null); return }
        itemAssignments = assignSwalResult.value?.assignments ?? itemAssignments
      }

      // Auto-fill purpose
      const assignedLabels = [...new Set(
        itemAssignments.filter(a => a.jobOrderLabel).map(a => a.jobOrderLabel!)
      )]
      if (!purpose.trim() && assignedLabels.length > 0) {
        setPurpose(`Materials for: ${assignedLabels.join(', ')}`)
      }

      // ── Step D: Submit ─────────────────────────────────────────────────────
      setLoadingStage('submitting-request')

      let requestsSaved = false
      let requestRefs: string[] = []

      try {
        const requests = items.map((item, idx) => {
          const assignment = itemAssignments[idx]
          return {
            employee_uid:       selectedEmployee.id,
            employee_barcode:   selectedEmployee.idBarcode,
            employee_name:      selectedEmployee.fullName,
            material_name:      item.name,
            quantity_requested: item.quantity,
            unit_of_measure:    'pcs',
            item_no:            item.id,
            item_description:   `${item.brand} - ${item.itemType}`,
            purpose:            purpose.trim() || 'Material extraction request',
            project_name:       assignment?.jobOrderLabel ?? null,
            job_order_id:       assignment?.jobOrderId    ?? null,
            request_notes:      `Requested via Toolbox. Balance at request time: ${item.balance}`,
          }
        })
        const response = await mainapiService.checkoutRequests.bulkCreateRequests(requests)
        requestsSaved = !!response?.success
        requestRefs   = response?.request_refs ?? []
        if (!requestsSaved) console.warn('[CheckoutModal] Request failed:', response?.error)
      } catch (err) {
        console.warn('[CheckoutModal] Request failed:', (err as Error).message)
      }

      try {
        const checkouts = items.map((item, idx) => {
          const assignment = itemAssignments[idx]
          return {
            employee_uid:         selectedEmployee.id,
            employee_barcode:     selectedEmployee.idBarcode,
            employee_name:        selectedEmployee.fullName,
            material_name:        item.name,
            quantity_checked_out: item.quantity,
            unit_of_measure:      'pcs',
            item_no:              item.id,
            item_description:     `${item.brand} - ${item.itemType}`,
            purpose:              purpose.trim() || 'Material extraction request',
            project_name:         assignment?.jobOrderLabel ?? null,
          }
        })
        const invResult = await mainapiService.employeeInventory.bulkCheckout(checkouts, null)
        if (!invResult?.success) console.warn('[CheckoutModal] Inventory tracking failed:', invResult?.error)
      } catch (err) {
        console.warn('[CheckoutModal] Inventory tracking failed:', (err as Error).message)
      }

      try {
        const itemSummary       = items.map(i => `${i.name} x${i.quantity}`).join(', ')
        const itemNos           = [...new Set(items.map(i => String(i.id)))].join(';')
        const assignmentSummary = itemAssignments
          .filter(a => a.jobOrderLabel)
          .map(a => `${a.itemName} → ${a.jobOrderLabel}`)
          .join('; ')

        await mainapiService.employeeLogs.createEmployeeLog({
          username:   selectedEmployee.fullName,
          id_number:  selectedEmployee.idNumber,
          id_barcode: selectedEmployee.idBarcode,
          details:    `Checkout: ${items.length} items - ${itemSummary}${assignmentSummary ? ` | Assignments: ${assignmentSummary}` : ''}`.slice(0, 500),
          purpose:    purpose.trim() || 'Material extraction request',
          item_no:    itemNos,
          items_json: JSON.stringify(items.map((i, idx) => ({
            id: i.id, name: i.name, qty: i.quantity,
            job_order_id: itemAssignments[idx]?.jobOrderId ?? null,
          }))),
          status: 'ACTIVE',
        })
      } catch (err) {
        console.warn('[CheckoutModal] Employee log write failed:', (err as Error).message)
      }

      onConfirmCheckout(selectedEmployee, purpose.trim() || undefined, { requestsSaved, requestRefs })

    } catch (err) {
      await Swal.fire({
        icon: undefined,
        html: `<div style="background:#09090b;font-family:'Geist Mono',monospace;text-align:center;padding:8px;">
          <div style="width:48px;height:48px;border:2px solid #f43f5e;border-radius:4px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 0 20px rgba(244,63,94,0.4);">
            <span style="color:#f43f5e;font-size:24px;font-weight:900;">!</span>
          </div>
          <p style="color:#f43f5e;font-size:12px;font-weight:900;letter-spacing:0.15em;margin-bottom:8px;">SYSTEM FAULT</p>
          <p style="color:#71717a;font-size:12px;">${(err as Error).message}</p>
        </div>`,
        background: '#09090b', confirmButtonColor: '#f97316',
        customClass: { popup: 'swal-toolbox' }, backdrop: 'rgba(0,0,0,0.9)', width: '380px',
      })
      setError(`FAULT: ${(err as Error).message}`)
    } finally { setLoadingStage(null); setSaving(false) }
  }

  const goToNextStep = useCallback(() => { if (currentStep < 3) setCurrentStep(p => (p + 1) as WizardStep) }, [currentStep])
  const goToPrevStep = useCallback(() => { if (currentStep > 1) { setCurrentStep(p => (p - 1) as WizardStep); setError(null) } }, [currentStep])
  const goToStep = useCallback((s: WizardStep) => { if (s <= currentStep) { setCurrentStep(s); setError(null) } }, [currentStep])
  const canProceedToNext = useCallback(() => {
    if (currentStep === 1) return items.length > 0
    if (currentStep === 2) return true
    if (currentStep === 3) return !!selectedEmployee
    return false
  }, [currentStep, items.length, selectedEmployee])

  if (!isOpen) return null
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const totalValue = items.reduce((s, i) => s + i.quantity * 10, 0)
  const apiConfig = apiBridge.getConfig()

  const StepIndicator = () => (
    <div className="px-4 sm:px-6 py-3 border-b border-zinc-800 bg-black/40">
      <div className="flex items-center justify-center gap-0">
        {WIZARD_STEPS.map((s, i) => {
          const Icon = s.icon; const isActive = currentStep === s.step; const isDone = currentStep > s.step; const isClickable = s.step <= currentStep && !isCommitting
          return (
            <div key={s.step} className="flex items-center">
              <button type="button" onClick={() => isClickable && goToStep(s.step as WizardStep)} disabled={!isClickable}
                className={`flex items-center gap-2 px-3 sm:px-5 py-2 transition-all duration-150 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}>
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-sm border-2 transition-all duration-200 ${isActive ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_12px_rgba(249,115,22,0.4)]' : isDone ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-900'}`}>
                  {isDone ? <Check className="w-4 h-4 text-emerald-400" /> : <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-zinc-600'}`} />}
                </div>
                <div className="hidden md:block text-left">
                  <p className={`text-[10px] font-black uppercase tracking-widest leading-tight ${isActive ? 'text-orange-400 drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]' : isDone ? 'text-emerald-400' : 'text-zinc-600'}`}>{s.title}</p>
                  <p className="text-[9px] text-zinc-600 leading-tight font-mono">{s.description}</p>
                </div>
              </button>
              {i < WIZARD_STEPS.length - 1 && (
                <div className="mx-1 hidden sm:flex items-center">
                  <div className={`h-px w-8 transition-colors duration-200 ${isDone ? 'bg-emerald-700' : 'bg-zinc-800'}`} />
                  <div className={`w-1 h-1 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/90 flex items-start sm:items-center justify-center z-50 p-2 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[51]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)' }} />

      <div className="w-full max-w-4xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-3rem)] bg-zinc-950 border-2 border-zinc-800 shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-sm overflow-hidden flex flex-col">

        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-800 bg-black/60">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <LedDot status={apiConfig.isConnected ? 'ok' : 'warn'} />
              <LedDot status={currentStep === 3 && selectedEmployee ? 'ok' : 'idle'} />
              <LedDot status={saving ? 'warn' : 'idle'} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-100">Extraction Manifest</h2>
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
                STEP {currentStep}/3 — {WIZARD_STEPS[currentStep - 1]?.title}
                {detectedJobs.length > 0 && ` · ${detectedJobs.length} JO DETECTED`}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={isCommitting}
            className="w-8 h-8 rounded-sm border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:border-rose-800 hover:bg-rose-900/20 transition-all duration-150 active:translate-y-px">
            <X className="w-4 h-4" />
          </button>
        </div>

        <StepIndicator />

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">

          {currentStep === 1 && (
            <div className="space-y-4">
              <Panel className="px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <LedDot status={apiConfig.isConnected ? 'ok' : 'warn'} />
                    {apiConfig.isConnected ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
                    <span className={`text-[10px] font-black uppercase tracking-widest ${apiConfig.isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {apiConfig.isConnected ? 'UPLINK ACTIVE' : 'OFFLINE MODE'}
                    </span>
                  </div>
                  <span className={`text-[9px] font-mono border rounded-[2px] px-1.5 py-0.5 ${apiConfig.isConnected ? 'border-emerald-800 text-emerald-500' : 'border-amber-800 text-amber-500'}`}>
                    {apiConfig.isConnected ? 'SYNCED' : 'LOCAL_ONLY'}
                  </span>
                </div>
              </Panel>
              <div>
                <SectionHeader label="Buffer Contents" icon={Package} status="ok" />
                <Panel inset className="divide-y divide-zinc-900 max-h-[32vh] overflow-y-auto">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-900/50 transition-colors">
                      <div className="flex items-center justify-center w-8 h-8 rounded-sm bg-orange-500/10 border border-orange-900 text-orange-400 font-mono font-black text-[11px] shrink-0">{item.quantity}×</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-200 truncate leading-tight">{item.name}</p>
                        <p className="text-[10px] font-mono text-zinc-600 truncate leading-tight">{item.brand} · {item.itemType} · BAL:{item.balance}</p>
                      </div>
                      <div className="text-right shrink-0"><LedBar segments={8} filled={Math.min(8, item.quantity)} color="bg-orange-500" /></div>
                    </div>
                  ))}
                </Panel>
              </div>
              <Panel inset className="px-4 py-3">
                <SectionHeader label="Extraction Summary" icon={Activity} />
                <TelemetryLabel label="Total Units" value={`${totalItems} pcs`} />
                <TelemetryLabel label="Unique SKUs" value={items.length} />
                <TelemetryLabel label="Est. Value" value={`₱${totalValue.toFixed(2)}`} accent />
              </Panel>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-sm border-2 border-orange-800 bg-orange-500/10 mb-4 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                  <FileText className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100">Log Extraction Purpose</h3>
                <p className="text-[10px] font-mono text-zinc-600 mt-1">Reason code for audit trail (optional)</p>
              </div>
              <Panel inset className="p-1">
                <Textarea placeholder="e.g., MAINT-LINE4, PROJ-REQ-007, EMERGENCY-REPAIR..." value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  className="min-h-[90px] resize-none font-mono text-xs bg-transparent border-0 focus:ring-0 focus-visible:ring-0 text-zinc-300 placeholder:text-zinc-700"
                  maxLength={255} disabled={isCommitting} />
              </Panel>
              <div className="flex justify-between text-[9px] font-mono text-zinc-700">
                <span>CHARS: {purpose.length}/255</span><span>FIELD: PURPOSE_CODE</span>
              </div>
              <div>
                <SectionHeader label="Quick Codes" icon={Terminal} />
                <div className="flex flex-wrap gap-1.5">
                  {["Maintenance Work", "Project Requirement", "Equipment Repair", "Stock Replenishment", "Emergency Use", "Customer Request"].map(s => (
                    <button key={s} type="button" onClick={() => setPurpose(s)}
                      className={`px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wide rounded-sm border transition-all duration-100 active:translate-y-px
                        ${purpose === s ? 'bg-orange-500/20 border-orange-600 text-orange-300 shadow-[0_0_8px_rgba(249,115,22,0.3)]' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-orange-800 hover:text-orange-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-sm border-2 border-orange-800 bg-orange-500/10 mb-3 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                  <UserCheck className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100">Operator Verification</h3>
                <p className="text-[10px] font-mono text-zinc-600 mt-1">
                  Scan ID badge or enter operator number — job assignment will be auto-detected
                </p>
              </div>

              <Panel className="px-3 py-2.5 border-amber-900/50 bg-amber-500/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Request-Based Checkout Flow</p>
                    <p className="text-[9px] font-mono text-zinc-600 mt-0.5">
                      Submission creates a <span className="text-amber-500">checkout request</span> in the requests queue.
                      Warehouse staff confirms &amp; deducts stock separately.
                    </p>
                  </div>
                </div>
              </Panel>

              <Panel className="p-1 flex gap-1">
                {([
                  { id: 'barcode' as const, icon: Scan, label: 'SCAN BADGE' },
                  { id: 'manual' as const, icon: CreditCard, label: 'ENTER ID' },
                ] as const).map(({ id, icon: Icon, label }) => (
                  <button key={id} type="button" onClick={() => { setInputMethod(id); setUserInput(""); setSelectedEmployee(null); setError(null); setDetectedJobs([]) }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all duration-100
                      ${inputMethod === id ? 'bg-orange-500/15 border border-orange-700 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'text-zinc-600 hover:text-zinc-400 border border-transparent'}`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </Panel>

              <div className="relative">
                <Panel inset className="flex items-center gap-2 px-3">
                  {inputMethod === 'barcode' ? <Radio className="w-3.5 h-3.5 text-orange-500 shrink-0" /> : <Terminal className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                  <Input placeholder={inputMethod === 'barcode' ? "SCAN_BARCODE..." : "OPERATOR_ID..."} value={userInput}
                    onChange={e => {
                      const v = e.target.value; setUserInput(v)
                      if (inputMethod === 'barcode') { v.trim().length > 3 ? handleBarcodeScanned(v.trim()) : setSelectedEmployee(null) }
                      else { handleManualInput(v) }
                    }}
                    className="h-10 text-sm font-mono font-bold text-center bg-transparent border-0 focus:ring-0 focus-visible:ring-0 text-orange-300 placeholder:text-zinc-700 tracking-widest"
                    disabled={isCommitting} autoComplete="off" />
                  {isScanning && <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                </Panel>
                {inputMethod === 'barcode' && !selectedEmployee && !error && (
                  <p className="flex items-center justify-center gap-1.5 mt-1.5 text-[9px] font-mono text-zinc-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />AWAITING SCAN INPUT
                  </p>
                )}
              </div>

              {loadingEmployees && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Querying operator registry...</span>
                </div>
              )}

              {loadingStage && (
                <Panel className="px-3 py-2.5 border-orange-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                        {loadingStage === 'detecting-jobs' && 'Detecting Job Assignments...'}
                        {loadingStage === 'validating' && 'Validating Against Operations...'}
                        {loadingStage === 'submitting-request' && 'Submitting to Requests Queue...'}
                      </p>
                      <p className="text-[9px] font-mono text-zinc-600 mt-0.5">
                        {loadingStage === 'detecting-jobs' && 'Loading open job orders for this operator.'}
                        {loadingStage === 'validating' && 'Cross-checking items against assigned operation names.'}
                        {loadingStage === 'submitting-request' && 'Writing to checkout requests table — no stock deducted yet.'}
                      </p>
                    </div>
                  </div>
                </Panel>
              )}

              {error && (
                <Panel className={`px-3 py-2.5 ${error.includes('DEACTIVATED') ? 'border-amber-900' : 'border-rose-900'}`}>
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${error.includes('DEACTIVATED') ? 'text-amber-400' : 'text-rose-400'}`} />
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${error.includes('DEACTIVATED') ? 'text-amber-400' : 'text-rose-400'}`}>
                        {error.includes('DEACTIVATED') ? 'ACCESS REVOKED' : 'AUTH FAULT'}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-500 mt-1 leading-relaxed">{error}</p>
                    </div>
                  </div>
                </Panel>
              )}

              {selectedEmployee && (
                <Panel className="px-3 py-3 border-emerald-900/60 bg-emerald-500/5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-sm border-2 border-emerald-800 bg-emerald-900/30 text-emerald-300 font-black text-base overflow-hidden shrink-0 shadow-[0_0_12px_rgba(52,211,153,0.2)]">
                      {selectedEmployee.profilePicture
                        ? <img src={selectedEmployee.profilePicture} alt={selectedEmployee.firstName} className="w-full h-full object-cover"
                          onError={e => { const img = e.target as HTMLImageElement; img.style.display = 'none'; if (img.parentElement) img.parentElement.textContent = `${selectedEmployee.firstName[0]}${selectedEmployee.lastName[0]}` }} />
                        : `${selectedEmployee.firstName[0]}${selectedEmployee.lastName[0]}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-emerald-300 truncate drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
                        {selectedEmployee.firstName} {selectedEmployee.middleName && selectedEmployee.middleName + ' '}{selectedEmployee.lastName}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-500 truncate">{selectedEmployee.position} · {selectedEmployee.department}</p>
                      {detectedJobs.length > 0 ? (
                        <p className="text-[9px] font-mono text-emerald-600 mt-0.5">
                          {detectedJobs.length} job order{detectedJobs.length > 1 ? 's' : ''} detected:{' '}
                          {detectedJobs.map(j => j.jo_number || j.description).join(', ')}
                        </p>
                      ) : (
                        <p className="text-[9px] font-mono text-amber-600 mt-0.5">Detecting job assignments…</p>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">AUTH</span>
                    </div>
                  </div>
                </Panel>
              )}

              <Panel inset className="px-4 py-3">
                <SectionHeader label="Request Summary" icon={Activity} />
                <TelemetryLabel label="Items in Buffer" value={`${items.length} SKUs`} />
                <TelemetryLabel label="Total Quantity" value={`${totalItems} pcs`} />
                <TelemetryLabel label="Est. Value" value={`₱${totalValue.toFixed(2)}`} accent />
                {detectedJobs.length > 0 && <TelemetryLabel label="Job Orders" value={detectedJobs.map(j => j.jo_number || j.description).join(', ')} />}
                {purpose && <TelemetryLabel label="Purpose" value={purpose} />}
                <TelemetryLabel label="Destination Table" value="operations_checkout_requests" />
                <TelemetryLabel label="Stock Deducted Now" value="NO — pending warehouse" />
              </Panel>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-zinc-800 bg-black/60">
          <button onClick={currentStep === 1 ? onClose : goToPrevStep} disabled={isCommitting}
            className="flex items-center justify-center gap-2 h-10 px-5 min-w-[110px] rounded-sm border-2 border-zinc-700 bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 active:translate-y-px transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft className="w-3.5 h-3.5" />
            {currentStep === 1 ? 'ABORT' : 'BACK'}
          </button>
          <div className="flex items-center justify-center gap-1.5">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1 rounded-[1px] transition-all duration-200 ${s === currentStep ? 'w-6 bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.7)]' : s < currentStep ? 'w-3 bg-emerald-600' : 'w-3 bg-zinc-800'}`} />
            ))}
          </div>
          {currentStep < 3 ? (
            <button onClick={goToNextStep} disabled={!canProceedToNext()}
              className="flex items-center justify-center gap-2 h-10 px-5 min-w-[140px] rounded-sm border-2 border-orange-700 bg-orange-500/10 text-[10px] font-black uppercase tracking-widest text-orange-300 hover:bg-orange-500/20 hover:border-orange-500 hover:shadow-[0_0_14px_rgba(249,115,22,0.3)] active:translate-y-px transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed">
              CONTINUE <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={handleConfirm} disabled={!selectedEmployee || isCommitting || loadingEmployees || saving}
              className="flex items-center justify-center gap-2 h-10 px-5 min-w-[200px] rounded-sm border-2 border-amber-700 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-300 hover:bg-amber-500/20 hover:border-amber-500 hover:shadow-[0_0_14px_rgba(251,191,36,0.3)] active:translate-y-px transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed">
              {isCommitting || saving ? (
                <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {loadingStage === 'submitting-request' ? 'QUEUING REQUEST...' : loadingStage === 'validating' ? 'VALIDATING...' : 'DETECTING...'}</>
              ) : (
                <><Zap className="w-3.5 h-3.5" />SUBMIT REQUEST</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}