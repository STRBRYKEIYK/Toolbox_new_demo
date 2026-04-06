/**
 * Example: Checkout Modal Component - Bridge Migration
 * 
 * This example shows a complete checkout flow using the API Bridge,
 * demonstrating how to handle employee validation, item checkout,
 * and transaction logging.
 */

import { useState } from 'react'
import { apiBridge } from "../lib/api-bridge"
import type { EmployeeValidationResult } from "../lib/api-bridge"

interface CartItem {
  id: string
  item_no: string
  name: string
  brand?: string
  itemType?: string
  location?: string
  quantity: number
  image?: string
}

interface CheckoutModalProps {
  cartItems: CartItem[]
  onCheckoutComplete: () => void
  onClose: () => void
}

export function CheckoutModal({ cartItems, onCheckoutComplete, onClose }: CheckoutModalProps) {
  const [step, setStep] = useState<'scan' | 'confirm' | 'processing' | 'success' | 'error'>('scan')
  const [employeeId, setEmployeeId] = useState('')
  const [employee, setEmployee] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ========================================================================
  // STEP 1: Employee Validation
  // ========================================================================

  const handleEmployeeScan = async (scannedId: string) => {
    if (!scannedId.trim()) {
      setError('Please enter or scan an employee ID')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Use the bridge to validate employee
      const validationResult: EmployeeValidationResult = await apiBridge.validateEmployee(
        scannedId.trim()
      )

      if (validationResult.valid && validationResult.employee) {
        setEmployee(validationResult.employee)
        setStep('confirm')
        console.log('✅ Employee validated:', validationResult.employee.fullName)
      } else {
        setError(validationResult.error || 'Employee not found or inactive')
        console.log('❌ Validation failed:', validationResult.error)
      }
    } catch (err) {
      console.error('Employee validation error:', err)
      setError('Failed to validate employee. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleManualIdSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleEmployeeScan(employeeId)
  }

  // ========================================================================
  // STEP 2: Checkout Processing
  // ========================================================================

  const handleConfirmCheckout = async () => {
    if (!employee) {
      setError('No employee selected')
      return
    }

    if (cartItems.length === 0) {
      setError('Cart is empty')
      return
    }

    setStep('processing')
    setError(null)

    try {
      // Step 2a: Perform bulk checkout
      console.log(`📦 Processing checkout for ${cartItems.length} items...`)
      
      const checkoutResult = await apiBridge.bulkCheckout(
        cartItems.map(item => ({
          item_no: item.item_no,
          id: item.id,
          quantity: item.quantity,
          item_name: item.name
        })),
        {
          checkout_by: employee.fullName || employee.firstName,
          notes: `Toolbox checkout - ${cartItems.length} items by ${employee.fullName}`
        }
      )

      if (!checkoutResult.success) {
        throw new Error(checkoutResult.message || 'Checkout failed')
      }

      console.log('✅ Checkout successful:', checkoutResult)

      // Step 2b: Create enhanced transaction log
      console.log('📝 Creating transaction log...')
      
      const logResult = await apiBridge.createEnhancedLog({
        userId: employee.id_number || employee.employeeId,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          brand: item.brand,
          itemType: item.itemType,
          location: item.location,
          quantity: item.quantity
        })),
        username: employee.fullName || `${employee.firstName} ${employee.lastName}`,
        totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        timestamp: new Date().toISOString(),
        purpose: `Toolbox checkout - ${cartItems.length} different items`,
        idBarcode: employee.id_barcode
      })

      console.log('✅ Transaction log created:', logResult)

      // Success!
      setStep('success')
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onCheckoutComplete()
        onClose()
      }, 2000)

    } catch (err) {
      console.error('Checkout error:', err)
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setStep('error')
    }
  }

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  const renderScanStep = () => (
    <div className="checkout-step scan-step">
      <h2>📱 Scan Employee ID</h2>
      <p>Scan your ID card or enter your employee ID manually</p>

      <form onSubmit={handleManualIdSubmit}>
        <input
          type="text"
          placeholder="Employee ID or Barcode"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          autoFocus
          disabled={loading}
        />

        <button 
          type="submit" 
          disabled={loading || !employeeId.trim()}
          className="btn-primary"
        >
          {loading ? 'Validating...' : 'Continue'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="helpful-tips">
        <h4>Tips:</h4>
        <ul>
          <li>Hold your ID card up to the scanner</li>
          <li>Or manually type your employee ID number</li>
          <li>Make sure you are an active employee</li>
        </ul>
      </div>
    </div>
  )

  const renderConfirmStep = () => (
    <div className="checkout-step confirm-step">
      <h2>✅ Confirm Checkout</h2>

      <div className="employee-info">
        <h3>Employee</h3>
        <p className="employee-name">{employee?.fullName || 'Unknown'}</p>
        <p className="employee-id">ID: {employee?.id_number || 'N/A'}</p>
        {employee?.department && (
          <p className="employee-dept">Department: {employee.department}</p>
        )}
      </div>

      <div className="cart-summary">
        <h3>Items ({cartItems.length})</h3>
        <div className="cart-items-list">
          {cartItems.map((item, index) => (
            <div key={index} className="cart-item-summary">
              {item.image && (
                <img src={item.image} alt={item.name} className="item-thumbnail" />
              )}
              <div className="item-details">
                <p className="item-name">{item.name}</p>
                {item.brand && <p className="item-brand">{item.brand}</p>}
                <p className="item-quantity">Quantity: {item.quantity}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="total-summary">
        <p>Total Items: <strong>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</strong></p>
        <p>Different Items: <strong>{cartItems.length}</strong></p>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="actions">
        <button onClick={() => setStep('scan')} className="btn-secondary">
          ← Back
        </button>
        <button onClick={handleConfirmCheckout} className="btn-primary">
          Confirm Checkout →
        </button>
      </div>
    </div>
  )

  const renderProcessingStep = () => (
    <div className="checkout-step processing-step">
      <div className="spinner-large"></div>
      <h2>🔄 Processing Checkout...</h2>
      <p>Please wait while we process your checkout</p>
      
      <div className="processing-steps">
        <p>✅ Validating employee</p>
        <p>🔄 Updating inventory...</p>
        <p>⏳ Creating transaction log...</p>
      </div>
    </div>
  )

  const renderSuccessStep = () => (
    <div className="checkout-step success-step">
      <div className="success-icon">✅</div>
      <h2>Checkout Complete!</h2>
      <p>Thank you, {employee?.fullName}!</p>
      
      <div className="success-summary">
        <p>✅ {cartItems.length} items checked out</p>
        <p>✅ Inventory updated</p>
        <p>✅ Transaction logged</p>
      </div>

      <p className="closing-message">This window will close automatically...</p>
    </div>
  )

  const renderErrorStep = () => (
    <div className="checkout-step error-step">
      <div className="error-icon">❌</div>
      <h2>Checkout Failed</h2>
      
      {error && (
        <div className="error-details">
          <p>{error}</p>
        </div>
      )}

      <div className="actions">
        <button onClick={() => setStep('scan')} className="btn-primary">
          ← Start Over
        </button>
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </div>
  )

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  return (
    <div className="checkout-modal-overlay">
      <div className="checkout-modal">
        <button onClick={onClose} className="close-button">×</button>

        {step === 'scan' && renderScanStep()}
        {step === 'confirm' && renderConfirmStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'success' && renderSuccessStep()}
        {step === 'error' && renderErrorStep()}

        <div className="progress-indicator">
          <div className={`step ${step === 'scan' ? 'active' : ''} ${['confirm', 'processing', 'success'].includes(step) ? 'complete' : ''}`}>
            1. Scan
          </div>
          <div className={`step ${step === 'confirm' ? 'active' : ''} ${['processing', 'success'].includes(step) ? 'complete' : ''}`}>
            2. Confirm
          </div>
          <div className={`step ${['processing', 'success'].includes(step) ? 'active' : ''} ${step === 'success' ? 'complete' : ''}`}>
            3. Complete
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
function App() {
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: '123',
      item_no: 'ITEM-001',
      name: 'Safety Helmet',
      brand: 'SafetyPro',
      quantity: 2
    },
    {
      id: '124',
      item_no: 'ITEM-002',
      name: 'Work Gloves',
      brand: 'WorkGear',
      quantity: 1
    }
  ])
  const [showCheckout, setShowCheckout] = useState(false)

  const handleCheckoutComplete = () => {
    // Clear cart
    setCart([])
    
    // Show success notification
    alert('Checkout completed successfully!')
    
    // Refresh items list
    // (handled by parent component)
  }

  return (
    <div>
      <button onClick={() => setShowCheckout(true)}>
        Checkout ({cart.length} items)
      </button>

      {showCheckout && (
        <CheckoutModal
          cartItems={cart}
          onCheckoutComplete={handleCheckoutComplete}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  )
}
*/

// ============================================================================
// KEY BRIDGE FEATURES DEMONSTRATED
// ============================================================================

/*

1. Employee Validation:
   ✅ apiBridge.validateEmployee(identifier, pin)
   ✅ Returns typed EmployeeValidationResult
   ✅ Handles both ID number and barcode lookup

2. Bulk Checkout:
   ✅ apiBridge.bulkCheckout(items, options)
   ✅ Automatically tries bulk endpoint
   ✅ Falls back to individual item checkout if needed
   ✅ Returns detailed success/error information

3. Enhanced Transaction Logging:
   ✅ apiBridge.createEnhancedLog(data)
   ✅ Formats item details automatically
   ✅ Includes all relevant employee information
   ✅ Timestamps automatically handled

4. Error Handling:
   ✅ Comprehensive try/catch blocks
   ✅ User-friendly error messages
   ✅ Detailed console logging (via bridge)
   ✅ Graceful fallbacks

5. Type Safety:
   ✅ TypeScript interfaces for all data
   ✅ Proper typing for API responses
   ✅ Editor autocomplete and validation

*/

export default CheckoutModal
