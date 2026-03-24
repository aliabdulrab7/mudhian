# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**يومية المضيان للمجوهرات** — Multi-branch Arabic ERP + accounting web app for a jewelry business.

**Three roles:**
- `admin` — full access: all branches, dashboard, reports, system admin, ERP modules
- `branch` — own branch only: daily journal + archive
- `viewer` — read-only: dashboard + reports + any branch drawer (cannot edit)

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4 CSS, Prisma 7 + PostgreSQL (DigitalOcean managed), `jose` JWT auth, `bcryptjs`, `next-pwa` (Workbox service worker), `@prisma/adapter-pg`.

**Production:** https://mudhiyan.shop — DigitalOcean droplet, nginx reverse proxy, Let's Encrypt SSL, PM2 process manager. Auto-deploys on push to `main` via `.github/workflows/deploy.yml`.

## Commands

```bash
npm run dev       # Dev server (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint

# Database — after ANY schema change run all three:
npx prisma migrate dev --name <name>   # Apply schema changes + generate client
rm -rf .next                           # REQUIRED: clear Turbopack cache
npm run dev                            # Restart with fresh bundle

npx prisma studio                      # GUI to inspect DB

# First-time setup
curl http://localhost:3000/api/seed    # Creates admin account (admin/admin123)
```

> **Critical:** After every `prisma migrate dev`, delete `.next/` before restarting or old schema will still be used at runtime. Also bump `SCHEMA_VERSION` in `src/lib/prisma.ts` to force Prisma singleton recreation.

## Architecture

### Database (Prisma v7 + PostgreSQL)
- `DATABASE_URL` in `.env` — DigitalOcean managed PostgreSQL with SSL
- `src/lib/prisma.ts` uses `@prisma/adapter-pg` (`PrismaPg`) with a `pg.Pool` configured for SSL (`rejectUnauthorized: false`, stripping `sslmode` from URL to set it programmatically)
- `prisma.config.ts` holds Prisma v7 config; do NOT put `url` in `datasource db {}` in schema
- `SCHEMA_VERSION` constant — bump after every migration (currently `"v6_supplier_transfer"`)
- `ca-certificate.crt` in repo root — DigitalOcean CA cert (used for SSL if present)

**All models:**

*Core (Daily Journal):*
- `Branch`, `User`, `DailyDrawer`, `SoldItem`, `BankTransfer`, `Invoice`, `AuditLog`, `AppSetting`, `Employee`

*ERP — Inventory & Pricing:*
- `JewelryItem` — SKU, barcode, category, karat, weights, cost, salePrice, status (available/sold/reserved/repair), branchId, supplierId (FK)
- `MetalPrice` — daily gold/silver/platinum prices per gram
- `Supplier` — name, phone, email, address, isActive; linked to JewelryItems

*ERP — Sales:*
- `Customer` — name, phone, vatNumber
- `Sale` — invoiceNum, branch, customer, employee, totalAmount, paymentMethod (cash/card/transfer), notes (refund marker uses `[مرتجع]` prefix)
- `SaleItem` — line items on a sale (FK to JewelryItem)

*ERP — Repairs:*
- `Repair` — customer, employee, itemDescription, status (received/in_progress/completed/delivered), costs, dates
- `RepairStatusLog` — history of status changes

*ERP — Stock:*
- `StockTransfer` — fromBranch → toBranch, status (pending/completed/cancelled), items
- `StockTransferItem` — FK to JewelryItem (cascade delete on transfer)

### Auth (`src/lib/auth.ts` + `src/middleware.ts`)
- JWT stored in `session` httpOnly cookie (7 days)
- `getSession()` reads cookie server-side; `GET /api/auth/me` reads it client-side
- NavBar re-fetches session on every pathname change to avoid stale state

### Daily Journal Logic
When a drawer is created (`GET /api/drawer`):
- 6 `SoldItem` rows auto-created: طقم، خاتم، حلق، اسوارة، تعليقة، نص طقم
- 5 `BankTransfer` rows auto-created: الانماء، الراجحي، الرياض، ساب، الاهلي
- `yesterdayBalance` auto-filled from previous day's `bookBalance`

**Calculations (computed on frontend, stored on save):**
- `balanceValue` = manually entered (bank/network sales — NOT auto-summed)
- `cashSales` = `totalSales` − `balanceValue`
- `bookBalance` = `cashSales` − `bankTotal` + Σ(enabled "+" rows) − Σ(enabled "−" rows)
- `difference` = `actualBalance` − `bookBalance`

`computeBookBalance` is **template-driven** — never hardcode field names.

**POS → Drawer sync:** When a sale is created via `POST /api/pos`, it auto-creates `Invoice` records in that day's drawer and increments `totalSales` (+ `balanceValue` for card/transfer). Refunding a sale (`PATCH /api/pos/[id]` with `{ action: "refund" }`) reverses this. Locked drawers are skipped.

**POS invoices in drawer** are identified by `invoiceNum.startsWith("INV-")` — shown with a blue "POS" badge and a summary card.

Auto-save: field changes trigger 1.5s debounced `PATCH /api/drawer/[id]`. Invoice saves use dedicated sub-routes.

### SKU & Barcode (`src/lib/skuGenerator.ts`, `src/lib/barcodeUtils.ts`)
- `generateSKU(category)` → `PREFIX-NNNN` (RNG, BRL, NKL, EAR, FSET, REP, ITM)
- `detectBarcodeType(barcode)` → Arabic category name from prefix
- Barcode input in drawer: text modal with quick-prefix buttons; creates "صميت" invoice

### Journal Template (`src/lib/drawerTemplate.ts`)
- `TemplateRow`: `{ key, label, sign: "+" | "-", enabled, custom }`
- Custom rows use keys `custom_<timestamp>`; values in `DailyDrawer.customFields`
- Stored in `AppSetting` key `"drawerTemplate"`; admin edits in `/admin` → "قالب اليومية" tab

### User Preferences (`src/lib/userPrefs.tsx`)
- `useFormatCurrency()` hook — **use for ALL money display in ALL pages**; never raw `formatCurrency` from utils
- `const toast = useToast()` — returns the context value directly; do NOT destructure as `{ toast }`
- Prefs: `theme`, `numberFormat`, `numberLang` — stored in localStorage `"mudhian-prefs"`

### Date Handling (`src/lib/utils.ts`)
- `todayISO()` — local `YYYY-MM-DD` without UTC conversion (Saudi Arabia UTC+3)
- `shiftDate(dateStr, delta)` — date arithmetic in local time; use everywhere for navigation
- **Never** use `new Date(dateStr + "T00:00:00").toISOString().split("T")[0]` — causes UTC offset bugs

### UI Design System
Background `#edf1f8`, navy primary `#1e3a5f`.

```typescript
// Define at top of every page component:
const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const CARD_HDR = "px-5 py-4 flex items-center gap-3";
```

- Cards: white, `rounded-2xl`, shadow above, **no border**
- Card headers: `linear-gradient(135deg, #f8faff, #f0f4fb)` + icon + bold title
- Stat cards: rich gradient (emerald/blue/violet/rose/amber) with white text
- Inputs: `border-0 bg-slate-50 rounded-xl focus:ring-2 focus:ring-blue-300`
- Use `border-slate-*` (not `border-gray-*`)
- **No per-component `dark:` Tailwind classes** — dark mode via `.dark .bg-white { ... }` in `globals.css`
- Mobile: stacked cards on mobile, table/grid on desktop (`md:grid`, `hidden md:table-*`)
- Bottom nav adds 80px padding — `main` uses `pb-20 sm:pb-5`

### NavBar (`src/components/NavBar.tsx`)
- Desktop: horizontal links per role
- Mobile: hamburger dropdown + fixed bottom nav bar (role-aware)
- Admin links include: Dashboard, Reports, Admin panel, Inventory, POS, Repairs, Customers, **الموردون** (`/suppliers`), **تحويلات المخزون** (`/stock-transfers`)

### API Routes

**Auth:** `POST /api/auth/login|logout`, `GET /api/auth/me`, `PATCH /api/auth/password`

**Branches/Users:** `GET|POST /api/branches`, `PATCH|DELETE /api/branches/[id]`, `GET|POST /api/viewers`, `DELETE /api/viewers/[id]`, `GET|POST /api/branches/[id]/employees`, `PATCH|DELETE /api/branches/[id]/employees/[empId]`

**Drawer:** `GET /api/drawer?branchId=X&date=YYYY-MM-DD`, `PATCH /api/drawer/[id]`, `POST|DELETE /api/drawer/[id]/banks/[bankId]`, `POST|PATCH|DELETE /api/drawer/[id]/invoices/[invoiceId]`

**Inventory:** `GET|POST /api/inventory`, `GET|PATCH|DELETE /api/inventory/[sku]`

**POS:** `GET|POST /api/pos`, `GET|PATCH /api/pos/[id]` — PATCH supports `{ action: "refund", reason? }`

**Repairs:** `GET|POST /api/repairs`, `GET|PATCH /api/repairs/[id]`, `POST /api/repairs/[id]/status`

**Customers:** `GET|POST /api/customers`, `GET|PATCH /api/customers/[id]`

**Suppliers:** `GET|POST /api/suppliers`, `GET|PATCH|DELETE /api/suppliers/[id]`

**Stock Transfers:** `GET|POST /api/stock-transfers`, `GET|PATCH /api/stock-transfers/[id]` — PATCH supports `{ action: "complete" | "cancel" }`

**Metal Prices:** `GET|POST /api/metal-prices`

**Reports:** `GET /api/reports/monthly`, `GET /api/reports/inventory`, `GET /api/reports/sales`, `GET /api/reports/repairs`, `GET /api/reports/profit?year=Y&month=M&branchId=X`, `GET /api/reports/consolidated?date=YYYY-MM-DD`

**System:** `GET /api/dashboard?date=YYYY-MM-DD`, `GET /api/archive?branchId=X&year=Y&month=M`, `GET /api/audit`, `GET /api/backup`, `GET|PATCH /api/settings`, `GET /api/seed`

### Pages
- `/login` — public
- `/dashboard` — consolidated view: journal totals + POS + repairs + inventory; date navigator
- `/admin` — 6 tabs: branches, viewers, audit, template, employees, **أسعار المعادن**
- `/reports` — tabs: monthly journal, inventory, sales, repairs, **الأرباح** (profit/margin)
- `/settings` — theme, number format, number language
- `/branch/[id]/drawer` — daily journal with POS summary card + POS badge on INV- invoices
- `/branch/[id]/archive` — monthly archive
- `/inventory` — jewelry item list; `/inventory/new`; `/inventory/[sku]` (edit + supplier dropdown)
- `/pos` — POS scanner + cart; `/pos/sale/[id]` (detail + refund button)
- `/repairs` — repair tickets; `/repairs/new`; `/repairs/[id]` (edit + status advance)
- `/customers` — customer list + search; `/customers/[id]` (history: sales + repairs + stats)
- `/suppliers` — admin only: supplier CRUD with active/inactive filter
- `/stock-transfers` — admin only: create transfers (SKU scanner input), complete/cancel

### Key Invariants
- `bookBalance` is stored by the API as-is from the frontend — never recompute in API routes
- `balanceValue` is always manually entered — never auto-summed from bank transfers
- Invoice totals are display-only — no effect on calculations
- POS refund uses `[مرتجع]` prefix in `Sale.notes` as the refunded marker (no separate status field)
- `AuditLog` via `logAction()` in `src/lib/audit.ts` — call silently (no await needed)
- Locked drawers: read-only for branch/viewer; admin can unlock; POS sync skips locked drawers
- StockTransfer complete: moves JewelryItems to toBranch + sets status=available; cancel: restores to available

## Initial Setup (New Installation)
1. `npm install`
2. Set `DATABASE_URL` in `.env` (PostgreSQL connection string)
3. Place `ca-certificate.crt` in repo root (DigitalOcean CA cert)
4. `npx prisma migrate deploy` (production) or `npx prisma migrate dev --name init` (dev)
5. `npx prisma generate`
6. `npm run dev`
7. Visit `http://localhost:3000/api/seed` to create admin account (admin/admin123)
