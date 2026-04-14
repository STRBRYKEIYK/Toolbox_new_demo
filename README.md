# Toolbox Inventory

Implementation-accurate README for the current codebase (as of April 2026).

## What This Project Is

Toolbox is a React + TypeScript inventory workflow app for warehouse/material handling.

Current runtime behavior is centered on a demo in-memory backend (`lib/demo-backend.ts`) accessed through bridge/facade layers used by the UI.

## What The App Does Today

- Starts from a gated start screen (`StartPage`) and only enters the app shell when readiness checks pass.
- Shows inventory in dashboard view with:
  - search
  - category and stock-state filtering
  - sorting
  - grid/list presentation
  - bulk selection/export/add-to-cart
- Supports barcode intake from keyboard-wedge scanners using timing-based detection.
- Maintains a persistent cart in localStorage, including cart history, backup export, and restore.
- Provides a multi-step checkout modal that:
  - identifies employee by barcode/manual input
  - loads open job orders assigned to that employee
  - validates item/job matches and shows warnings/errors
  - requires per-item job-order assignment before confirm
  - submits request, inventory checkout, and transaction log operations
- Displays employee logs with filters, pagination, detail modal, and XLSX export.
- Keeps an offline action queue and retries queued checkout synchronization when online.

## Runtime Truth (Important)

By default, app data operations are fulfilled by the demo backend, not by a live remote API.

- `apiBridge` delegates to `demoBackend`.
- `apiService` delegates to `demoBackend`.
- `demoBackend` stores items/employees/logs/job orders/checkout requests in memory.

The UI still exposes API URL and connection labels, but connection checks in this runtime path are effectively tied to browser online status (`navigator.onLine`) through demo backend connection helpers.

## Checkout Behavior (Current Code Path)

Checkout flow (cart -> checkout modal -> orchestration):

1. Build checkout request payloads and submit bulk request refs (`checkoutRequests.bulkCreateRequests`).
2. Submit inventory checkout entries (`employeeInventory.bulkCheckout`).
3. Submit activity transaction log (`logTransaction`).
4. Return per-step meta flags (`requestsSaved`, `inventorySaved`, `transactionSaved`).
5. If offline/partial sync, queue remaining work in offline queue.

In current demo runtime, inventory checkout writes update stock immediately via demo backend item mutation logic.

## Realtime/Event Model

Realtime updates are local event subscriptions over a polling/event manager abstraction, not a live socket transport in active runtime code paths.

- `hooks/use-realtime.ts` subscribes to `pollingManager` events.
- `hooks/useInventorySync.ts` subscribes to inventory/procurement/log events.
- Dashboard and log views trigger refresh logic from these event callbacks.

## Offline and Persistence Model

### Cart persistence

- Hook: `hooks/use-cart-persistence.ts`
- Storage helpers: `lib/cart-persistence.ts`
- Persists cart state + metadata + bounded history in localStorage.
- Supports export/import JSON backups and restore from history snapshots.

### Offline action queue

- Hook: `hooks/use-offline-manager.ts`
- Queues actions (including checkout) in localStorage.
- On reconnect, retries queued operations and preserves partial state.

### Service worker status

- `public/sw.js` exists and contains caching/offline logic.
- Service worker registration is currently disabled in `use-offline-manager.ts`.
- Practical offline support currently comes from localStorage persistence + queueing logic in hooks.

## Barcode Behavior

- Global scanner hook detects rapid key sequences terminated by Enter/Tab.
- `lib/barcode-scanner.ts` resolves inventory barcodes using `ITM<digits>` format.
- Barcode modal supports queued multi-item additions and quantity edits with stock guards.

## UI/Theme Behavior

- Theme provider currently hard-locks resolved theme to dark in code.
- Theme toggle UI exists, but provider blocks effective theme switching.
- Industrial UI styling is implemented throughout dashboard/cart/checkout/log screens.

## Architecture Overview

```text
main.tsx
  -> ErrorBoundary
  -> ThemeProvider
  -> TooltipProvider
  -> LoadingProvider
  -> app/page.tsx

app/page.tsx
  -> Header
  -> DashboardView
  -> CartView
  -> ItemDetailView
  -> EmployeeLogsView
  -> EnhancedToaster
  -> KeyboardShortcuts

Data layer used by UI
  -> lib/api-bridge.ts -> lib/demo-backend.ts
  -> lib/api_service.ts -> lib/demo-backend.ts

State and behavior hooks
  -> use-cart-persistence
  -> use-offline-manager
  -> use-realtime
  -> useInventorySync
  -> use-toolbox-app-state
```

## Key Files

- `app/page.tsx`: app orchestration and view switching
- `components/dashboard-view.tsx`: inventory browse/filter/export/add
- `components/cart-view.tsx`: cart selection, checkout trigger, recovery tools
- `components/checkout-modal.tsx`: 3-step checkout wizard + assignment UI
- `components/employee-logs-view.tsx`: activity log browser
- `hooks/use-checkout-orchestration.ts`: job-order validation + submit flow
- `hooks/use-offline-manager.ts`: offline queue + sync retry
- `hooks/use-cart-persistence.ts`: cart persistence integration
- `lib/demo-backend.ts`: in-memory runtime backend + event source
- `lib/api-bridge.ts`: typed bridge consumed by components
- `lib/api_service.ts`: facade consumed by offline queue path

## Tech Stack

- React 18
- TypeScript (strict config)
- Vite
- Tailwind CSS v4
- Radix UI primitives
- Lucide React
- SweetAlert2
- XLSX
- Zod

## Run Locally

```bash
npm install
npm run dev
```

Dev server is configured in `vite.config.js` on port `3000`.

Build/preview:

```bash
npm run build
npm run preview
```

## Deployment Note

Production Vite base path is set to:

`/Toolbox_new_demo/`

If deployed at a different path, update `base` in `vite.config.js`.

## Known Constraints

- Default runtime backend is demo/in-memory.
- Service worker registration is disabled in the active hook path.
- Theme is effectively forced to dark mode.
- Next-style `app/layout.tsx` exists, but Vite runtime entry is `main.tsx`.
