# Migration: Supabase → localStorage

## What this project is

A demo/POC operating expense planner. Vendors and monthly expense data are organized across three versions (Actuals, Live Forecast, Budget) and can be filtered by GL Account and Cost Center. The UI is a Next.js 15 App Router project using shadcn/ui components.

## What was changed (and why)

Supabase required live env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and an active database to run. For a demo app this created friction when sharing or deploying. The goal was to make the app fully self-contained: all data lives in `localStorage`, seeded with realistic sample data on first load.

---

## Files changed

### `lib/supabase.ts` — complete rewrite (same exports kept)
- Removed `@supabase/supabase-js` import and client creation
- Kept exported types: `Vendor`, `ExpenseData`, `ExpenseView`
- Kept `generateVendorCode()` helper
- Replaced `db` object with a localStorage-backed implementation
  - **localStorage keys:** `opex_vendors`, `opex_expense_data`
  - **Auto-seed:** on first access, if `opex_vendors` key is absent, writes 10 sample vendors + ~180 non-zero expense records for Jan–Dec 2025
  - **SSR-safe:** all localStorage access guarded by `typeof window === "undefined"` checks
  - All methods remain `async` (return `Promise`) so call sites didn't change
  - `db.supabase` property removed entirely; callers that checked it were updated (see below)

### `lib/expense-data-service.ts` — removed inline Supabase calls
- Removed 3 `if (!db.supabase)` guards in `saveExpenseData`, `saveVendors`, `saveVersionExpenseData`
- Replaced 5 locations using `db.supabase.from(...)` directly:
  - Vendor existence checks → use pre-fetched `db.getVendors()` results filtered client-side
  - Delete-then-insert pattern → `db.deleteExpenseData(vendorId, version)` + `db.saveExpenseDataBatch(batch)`

### `components/expense-planner-context.tsx` — removed `db` direct usage
- Removed `import { db } from "@/lib/supabase"` (line 6 of original)
- Removed `if (!db.supabase)` guard in `saveData`
- Simplified vendor deletion logic: removed the DB pre-fetch that was cross-checking `deletedVendorIds` against live DB; now uses `deletedVendorIds` directly (safe because these are explicitly tracked in React state)

### `components/expense-planner-grid-with-product.tsx` — no changes needed
- Still imports `db`, `Vendor`, `ExpenseView` from `@/lib/supabase` — all still exported; calls `db.getVendors()` and `db.getExpenseView()` which now hit localStorage transparently

### `lib/seed-database.ts` — deleted
- Seed logic is now embedded in `lib/supabase.ts` (`buildSeedExpenses()` + `ensureSeeded()`)

### `app/seed/` — deleted
- The `/seed` page that triggered DB seeding is no longer needed

### `package.json` — removed `@supabase/supabase-js`

---

## Seed data

**10 vendors** with IDs `v1`–`v10`:
Salesforce, Accenture, AWS, Slack, Deloitte, Zoom, Adobe, WeWork, Delta Airlines, Microsoft

**3 versions × 10 vendors × 12 months** (Jan'25–Dec'25):
- `Actuals` — Jan–Mar only (remaining months stored as absent/zero)
- `Live Forecast` — all 12 months
- `Budget` — all 12 months

Zero-amount records are not stored; consuming code handles missing months via `|| 0`.

---

## localStorage data shape

```
opex_vendors      → Vendor[]
opex_expense_data → ExpenseData[]   // { id, vendor_id, version, month, amount }
```

`getExpenseView()` joins these two arrays in memory to produce `ExpenseView[]`.

---

## How data flows at runtime

1. App mounts → `loadData()` in `ExpensePlannerProvider` calls `expenseDataService.loadExpenseData()`
2. That calls `db.getVendors()` and `db.getExpenseData()` on the localStorage db
3. `ensureSeeded()` runs: if `opex_vendors` key is missing, writes seed data first
4. Vendor registry and per-version expense maps are set in React state
5. Edits update React state immediately; `saveData()` persists back to localStorage via `expenseDataService.saveVendors()` / `saveVersionExpenseData()`
6. On refresh, data is loaded back from localStorage — changes persist

---

## No env vars required

The app runs with `pnpm dev` or `pnpm build` out of the box. No `.env` file needed.
