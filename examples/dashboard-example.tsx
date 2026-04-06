/**
 * Example: Dashboard View Component - Before and After Bridge Migration
 * 
 * This file shows a side-by-side comparison of how a Toolbox component
 * would work before and after migrating to the API Bridge.
 */

// ============================================================================
// BEFORE: Using old Toolbox TypeScript services
// ============================================================================

/*
import { useState, useEffect } from 'react'
import { apiService } from "../lib/api_service"  // Old service

export function DashboardViewOld() {
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch data using old service
      const [itemsData, employeesData, statsData] = await Promise.all([
        apiService.items.fetchItems({ limit: 1000 }),
        apiService.employees.fetchEmployees({ includeAllStatuses: false }),
        apiService.transactions.fetchTransactionStats(30)
      ])

      setItems(itemsData || [])
      setEmployees(employeesData || [])
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await loadDashboardData()
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Items</h3>
          <p>{items.length}</p>
        </div>
        
        <div className="stat-card">
          <h3>Active Employees</h3>
          <p>{employees.length}</p>
        </div>
        
        <div className="stat-card">
          <h3>Total Transactions</h3>
          <p>{stats?.total_logs || 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>Recent Activity</h3>
          <p>{stats?.recent_logs || 0}</p>
        </div>
      </div>

      <button onClick={handleRefresh}>Refresh</button>
    </div>
  )
}
*/

// ============================================================================
// AFTER: Using API Bridge (Option 1 - Direct Bridge)
// ============================================================================

import { useState, useEffect } from 'react'
import { apiBridge } from "../lib/api-bridge"  // New bridge

export function DashboardViewBridge() {
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch data using bridge - cleaner API!
      const [itemsData, employeesData, statsData] = await Promise.all([
        apiBridge.fetchItems({ limit: 1000 }),
        apiBridge.fetchEmployees({ includeAllStatuses: false }),
        apiBridge.fetchTransactionStats(30)
      ])

      setItems(itemsData || [])
      setEmployees(employeesData || [])
      setStats(statsData)
    } catch (err) {
      // Errors are already logged by the bridge
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await loadDashboardData()
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Items</h3>
          <p>{items.length}</p>
        </div>
        
        <div className="stat-card">
          <h3>Active Employees</h3>
          <p>{employees.length}</p>
        </div>
        
        <div className="stat-card">
          <h3>Total Transactions</h3>
          <p>{stats?.total_logs || 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>Recent Activity</h3>
          <p>{stats?.recent_logs || 0}</p>
        </div>
      </div>

      <button onClick={handleRefresh}>Refresh</button>
    </div>
  )
}

// ============================================================================
// AFTER: Using Compat Layer (Option 2 - Easiest Migration)
// ============================================================================

/*
import { useState, useEffect } from 'react'
import { apiService } from "../lib/api_service_compat"  // Compat layer

export function DashboardViewCompat() {
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // EXACT SAME CODE AS BEFORE! Just different import
      const [itemsData, employeesData, statsData] = await Promise.all([
        apiService.items.fetchItems({ limit: 1000 }),
        apiService.employees.fetchEmployees({ includeAllStatuses: false }),
        apiService.transactions.fetchTransactionStats(30)
      ])

      setItems(itemsData || [])
      setEmployees(employeesData || [])
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await loadDashboardData()
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Items</h3>
          <p>{items.length}</p>
        </div>
        
        <div className="stat-card">
          <h3>Active Employees</h3>
          <p>{employees.length}</p>
        </div>
        
        <div className="stat-card">
          <h3>Total Transactions</h3>
          <p>{stats?.total_logs || 0}</p>
        </div>
        
        <div className="stat-card">
          <h3>Recent Activity</h3>
          <p>{stats?.recent_logs || 0}</p>
        </div>
      </div>

      <button onClick={handleRefresh}>Refresh</button>
    </div>
  )
}
*/

// ============================================================================
// ADVANCED EXAMPLE: Type-Safe Bridge Usage
// ============================================================================

import type { 
  TransactionStats,
  ConnectionStatus 
} from "../lib/api-bridge"

export function AdvancedDashboardView() {
  const [items, setItems] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkConnection()
    loadDashboardData()
  }, [])

  const checkConnection = async () => {
    const connected = await apiBridge.testConnection()
    const status = apiBridge.getConnectionStatus()
    setConnectionStatus(status)
    
    if (!connected) {
      setError('Not connected to API server')
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Type-safe API calls
      const [itemsData, employeesData, statsData] = await Promise.all([
        apiBridge.fetchItems({ limit: 1000 }),
        apiBridge.fetchEmployees({ includeAllStatuses: false }),
        apiBridge.fetchTransactionStats(30)
      ])

      setItems(itemsData)
      setEmployees(employeesData)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await checkConnection()
    await loadDashboardData()
  }

  const handleRunDiagnostics = async () => {
    try {
      const diagnostics = await apiBridge.testConnectionDetailed()
      
      console.log('Connection Diagnostics:', {
        success: diagnostics.success,
        baseUrl: diagnostics.baseUrl,
        responseTime: diagnostics.responseTime,
        status: diagnostics.status,
        details: diagnostics.details
      })
      
      const endpointTests = await apiBridge.testEndpoints()
      
      console.log('Endpoint Tests:')
      endpointTests.endpoints.forEach(endpoint => {
        console.log(`  ${endpoint.name}: ${endpoint.success ? '✅' : '❌'} (${endpoint.responseTime}ms)`)
      })
      
      alert(`Diagnostics complete! Check console for details.\n\nOverall: ${endpointTests.overall ? '✅ All OK' : '❌ Issues found'}`)
    } catch (err) {
      console.error('Diagnostics failed:', err)
      alert('Failed to run diagnostics. Check console for details.')
    }
  }

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        
        <div className="connection-status">
          {connectionStatus ? (
            <>
              <span className={connectionStatus.isConnected ? 'connected' : 'disconnected'}>
                {connectionStatus.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
              <small>{connectionStatus.baseUrl}</small>
            </>
          ) : (
            <span>🟡 Checking connection...</span>
          )}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>📦 Total Items</h3>
          <p className="stat-value">{items.length}</p>
          <small>in inventory</small>
        </div>
        
        <div className="stat-card">
          <h3>👥 Active Employees</h3>
          <p className="stat-value">{employees.length}</p>
          <small>registered</small>
        </div>
        
        <div className="stat-card">
          <h3>📊 Total Transactions</h3>
          <p className="stat-value">{stats?.total_logs || 0}</p>
          <small>last {stats?.period_days || 30} days</small>
        </div>
        
        <div className="stat-card">
          <h3>🔥 Recent Activity</h3>
          <p className="stat-value">{stats?.recent_logs || 0}</p>
          <small>today</small>
        </div>

        <div className="stat-card">
          <h3>👤 Active Users</h3>
          <p className="stat-value">{stats?.active_users || 0}</p>
          <small>unique users</small>
        </div>

        <div className="stat-card">
          <h3>⚡ Response Time</h3>
          <p className="stat-value">
            {connectionStatus?.timeSinceLastTest 
              ? `${Math.round(connectionStatus.timeSinceLastTest / 1000)}s` 
              : 'N/A'}
          </p>
          <small>since last test</small>
        </div>
      </div>

      <div className="actions">
        <button onClick={handleRefresh} className="btn-primary">
          🔄 Refresh Data
        </button>
        
        <button onClick={handleRunDiagnostics} className="btn-secondary">
          🔍 Run Diagnostics
        </button>
      </div>

      {stats?.top_users && stats.top_users.length > 0 && (
        <div className="top-users">
          <h2>Top Users</h2>
          <ul>
            {stats.top_users.slice(0, 5).map((user, index) => (
              <li key={index}>
                <span className="user-name">{user.username}</span>
                <span className="user-count">{user.log_count} transactions</span>
                <small>Last: {new Date(user.last_activity).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats?.logs_by_day && stats.logs_by_day.length > 0 && (
        <div className="activity-chart">
          <h2>Activity by Day</h2>
          <div className="chart-container">
            {stats.logs_by_day.slice(-7).map((day, index) => {
              const maxLogs = Math.max(...stats.logs_by_day.map(d => d.log_count))
              const height = maxLogs > 0 ? (day.log_count / maxLogs) * 100 : 0
              
              return (
                <div key={index} className="chart-bar-wrapper">
                  <div className="chart-bar" style={{ height: `${height}%` }}>
                    <span className="bar-value">{day.log_count}</span>
                  </div>
                  <small className="bar-label">
                    {new Date(day.log_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </small>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// KEY DIFFERENCES SUMMARY
// ============================================================================

/*

CHANGES REQUIRED FOR MIGRATION:

Option 1 - Direct Bridge (Recommended for new code):
  ✅ Change import: "../lib/api_service" → "../lib/api-bridge"
  ✅ Change usage: apiService.items.method() → apiBridge.method()
  ✅ Benefits: Cleaner API, better type inference

Option 2 - Compat Layer (Easiest for existing code):
  ✅ Change import only: "../lib/api_service" → "../lib/api_service_compat"
  ✅ No other changes needed!
  ✅ Benefits: Zero code changes, instant migration

BENEFITS OF BOTH OPTIONS:
  ✅ Single source of truth for API logic
  ✅ Automatic encryption/decryption
  ✅ Request deduplication
  ✅ Centralized error handling
  ✅ Better logging and debugging
  ✅ Shared caching and data sync
  ✅ Type safety maintained

*/

export default DashboardViewBridge
