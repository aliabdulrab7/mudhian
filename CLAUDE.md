# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**يومية المضيان للمجوهرات** — Multi-branch Arabic accounting web app for a jewelry business.

**Three roles:**
- `admin` — full access: all branches, dashboard, reports, system admin, template editor
- `branch` — own branch only: daily journal + archive
- `viewer` — read-only: dashboard + reports + any branch drawer (cannot edit)

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4 CSS, Prisma 7 + SQLite, `jose` JWT auth, `bcryptjs`.

## Commands

```bash
npm run dev       # Dev server (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint

# Database — after ANY schema change run all three:
npx prisma migrate dev --name <name>   # Apply schema changes + generate client
rm -rf .next                           # REQUIRED: clear Turbopack cache or Invoice/new models won't be found
npm run dev                            # Restart with fresh bundle

npx prisma studio                      # GUI to inspect DB

# First-time setup
curl http://localhost:3000/api/seed    # Creates admin account (admin/admin123)
```

> **Critical:** Turbopack aggressively caches Prisma client bundles. After every `prisma migrate dev`, you MUST delete `.next/` before restarting the dev server, or the old schema (without new models/relations) will still be used at runtime.

> **Also:** After adding a new model, bump `SCHEMA_VERSION` in `src/lib/prisma.ts` to force the Prisma singleton to recreate itself on hot reload.

## Architecture

### Auth (`src/lib/auth.ts` + `src/middleware.ts`)
- JWT stored in `session` httpOnly cookie (7 days)
- `getSession()` reads cookie server-side; `GET /api/auth/me` reads it client-side
- NavBar re-fetches session on every pathname change to avoid stale user state after switching accounts
- Branch users restricted to their own `branchId` routes; viewers have read-only access to all; admin has full access

### Database (Prisma v7 + SQLite)
- DB file: `prisma/dev.db` — `DATABASE_URL="file:./prisma/dev.db"` in `.env`
- `prisma.config.ts` holds Prisma v7 config (NOT `schema.prisma`)
- `src/lib/prisma.ts` uses `@prisma/adapter-libsql` (`PrismaLibSql`) — required for Prisma v7 SQLite
- Do NOT put `url` in `datasource db {}` in schema
- `SCHEMA_VERSION` constant in `src/lib/prisma.ts` — bump after every `prisma migrate dev` to force singleton recreation in dev

**Models:** `Branch`, `User`, `DailyDrawer`, `SoldItem`, `BankTransfer`, `Invoice`, `AuditLog`, `AppSetting`

**DailyDrawer notable fields:**
- `isLocked: Boolean` — branch users cannot edit locked drawers; only admin can unlock
- `notes` — `JSON.stringify(string[])` array of note strings
- `customFields` — `JSON.stringify(Record<string, number>)` for custom template row values
- `fieldNotes` — `JSON.stringify(Record<string, string>)` for per-field inline notes

**Invoice fields:** `drawerId`, `type` ("صميت"|"عادية"), `invoiceNum`, `price`, `employeeName`, `barcodes` (JSON array string). Invoices are reference-only — they do NOT feed into `bookBalance` calculations.

### Daily Journal Logic
When a drawer is created (`GET /api/drawer`):
- 6 `SoldItem` rows auto-created: طقم، خاتم، حلق، اسوارة، تعليقة، نص طقم
- 5 `BankTransfer` rows auto-created: الانماء، الراجحي، الرياض، ساب، الاهلي
- `yesterdayBalance` auto-filled from previous day's `bookBalance`
- `Invoice` rows are NOT auto-created — zero invoices on a new drawer

**Calculations (computed on frontend, stored on save):**
- `balanceValue` = manually entered (bank/network sales — NOT auto-summed from bank transfers)
- `cashSales` = `totalSales` − `balanceValue`
- `bookBalance` = `cashSales` − `bankTotal` + Σ(enabled template "+" rows) − Σ(enabled template "−" rows)
- `difference` = `actualBalance` − `bookBalance`

`computeBookBalance` in `drawer/page.tsx` is **template-driven** — it receives `template: TemplateRow[]` and `customFields: Record<string, number>` and iterates over enabled rows. Do not revert to hardcoded field names.

Auto-save: any field change triggers 1.5s debounced `PATCH /api/drawer/[id]`. Invoice saves go through their own dedicated sub-routes (not through the main PATCH).

### Journal Template (`src/lib/drawerTemplate.ts`)
- `TemplateRow`: `{ key, label, sign: "+" | "-", enabled, custom }`
- `DEFAULT_TEMPLATE` — the 12 built-in calculation rows
- `parseTemplate(json)` — parses JSON from AppSetting, falls back to DEFAULT_TEMPLATE
- `parseNotes(raw)` — parses `notes` field (handles both old plain string and new JSON array format)
- Template stored in `AppSetting` with key `"drawerTemplate"` as JSON
- Admin edits via the "قالب اليومية" tab in `/admin`
- Custom rows (added by admin) use keys like `custom_<timestamp>`; their values live in `DailyDrawer.customFields`

### Barcode Utilities (`src/lib/barcodeUtils.ts`)
- `detectBarcodeType(barcode)` — maps barcode prefix to Arabic item category:
  - `RNG*` → خاتم, `BRL*` → سواره, `NKL*`/`PND*` → عقد, `EAR*` → حلق, `FSET*` → طقم

### Date Handling (`src/lib/utils.ts`)
- `todayISO()` — returns local date as `YYYY-MM-DD` **without UTC conversion** (avoids timezone shift in Saudi Arabia UTC+3)
- `shiftDate(dateStr, delta)` — adds/subtracts days from a `YYYY-MM-DD` string using local date arithmetic; use this everywhere instead of `new Date(...).toISOString()` for day navigation
- **Never use** `new Date(dateStr + "T00:00:00").toISOString().split("T")[0]` for date navigation — this causes UTC offset bugs

### User Preferences (`src/lib/userPrefs.tsx`)
- Client-side context stored in `localStorage` under key `"mudhian-prefs"`
- Prefs: `theme: "light" | "dark"`, `numberFormat: "comma" | "comma-decimal" | "plain"`, `numberLang: "en" | "ar"`
- `UserPrefsProvider` wraps the layout — reads localStorage on mount, applies `.dark` class to `<html>` for dark mode
- `useFormatCurrency()` hook — returns `(amount: number) => string` respecting current prefs
- **All money display in ALL pages must use `useFormatCurrency()` hook** — never the raw `formatCurrency` from `utils.ts` (which is hardcoded en-US and ignores user prefs)
- `formatAmount(amount, format, lang)` — the pure function (non-hook) for formatting

### UI Design System
The app uses a modern card-based design with a soft lavender-gray background (`#edf1f8`).

**Shared constants** — define at the top of each page component:
```typescript
const CARD = "bg-white rounded-2xl shadow-[0_4px_24px_rgba(30,58,95,0.08)] overflow-hidden";
const CARD_HDR = "px-5 py-4 flex items-center gap-3";
```

**Key conventions:**
- Cards: white background, `rounded-2xl`, `shadow-[0_4px_24px_rgba(30,58,95,0.08)]`, **no border**
- Card headers: soft gradient background `linear-gradient(135deg, #f8faff, #f0f4fb)` with icon + bold title
- Stat/metric cards: rich gradient backgrounds (emerald, blue, violet, rose) with white text
- Navy blue primary: `#1e3a5f` — use `var(--navy)` or `bg-navy` (defined in `globals.css`)
- Inputs: borderless (`border-0`), `bg-slate-50`, `rounded-xl`, `focus:ring-2 focus:ring-blue-300`
- Use `border-slate-*` color scale (not `border-gray-*`) consistently
- No per-component `dark:` Tailwind classes — dark mode handled globally in `globals.css` via `.dark .bg-white { ... }` overrides

**CSS utilities defined in `globals.css`:**
- `.bg-navy` — `background-color: var(--navy)`
- `.print-only` — hidden on screen (`display: none`), shown in print (`display: block !important`)
- `.no-print` — visible on screen, hidden in print (`display: none !important`)
- `.card` / `.card-hover` — floating card with `var(--shadow-card)`

### Drawer Page Layout (`src/app/branch/[id]/drawer/page.tsx`)
The page renders two completely separate trees:

1. **Screen layout** (`no-print` div) — stacked cards:
   - Top bar (date navigation + action buttons)
   - Branch header (navy gradient, branch name, date)
   - 3 sales metric cards: إجمالي المبيعات (editable) | قيمة الموازنة (editable) | مبيعات كاش (computed gradient)
   - 2-column grid: الأصناف المباعة | التحويلات البنكية (with add/delete bank)
   - حساب الرصيد الدفتري (template-driven rows + navy gradient book balance)
   - 2-column grid: الرصيد الفعلي (editable) | العجز/الزيادة (colored gradient)
   - ملاحظات اليومية (dynamic add/delete notes)
   - **تفاصيل الفواتير** (invoice list — reference only, does not affect calculations)

2. **Print layout** (`print-only` div) — compact A4 single-page table layout with all the same data including invoices, using inline styles so it is unaffected by Tailwind and renders correctly across browsers. Print settings: `@page { size: A4 portrait; margin: 0.8cm }`.

### Dark Mode
- Tailwind v4 dark variant defined in `globals.css`: `@custom-variant dark (&:where(.dark, .dark *));`
- CSS custom properties in `:root` and `.dark`: `--navy`, `--background`, `--foreground`, `--card`, `--border`, etc.
- Dark mode overrides via `.dark .bg-white { ... }` etc. in `globals.css` — no per-component `dark:` classes needed

### API Routes (`src/app/api/`)
**Auth:**
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/password`

**Branches & Users:**
- `GET/POST /api/branches`, `PATCH/DELETE /api/branches/[id]`
- `GET/POST /api/viewers`, `DELETE /api/viewers/[id]`

**Drawer:**
- `GET /api/drawer?branchId=X&date=YYYY-MM-DD` — get or create drawer (includes `branch`, `soldItems`, `bankTransfers`, `invoices`)
- `PATCH /api/drawer/[id]` — update drawer fields + sold items + bank transfers + notes + customFields + `isLocked`
- `POST /api/drawer/[id]/banks` — add a new bank transfer row
- `DELETE /api/drawer/[id]/banks/[bankId]` — delete a bank transfer row
- `POST /api/drawer/[id]/invoices` — add a new invoice (`{ type: "صميت"|"عادية" }`)
- `PATCH /api/drawer/[id]/invoices/[invoiceId]` — update invoice fields
- `DELETE /api/drawer/[id]/invoices/[invoiceId]` — delete an invoice

**Admin & Reporting:**
- `GET /api/dashboard?date=YYYY-MM-DD` — all branches summary (admin + viewer)
- `GET /api/archive?branchId=X&year=Y&month=M` — monthly drawer list
- `GET /api/reports/monthly` — sold items + bank totals by branch/category
- `GET /api/audit?page=N&limit=30` — paginated audit log (admin only)
- `GET /api/backup` — download SQLite file (admin only)
- `GET/PATCH /api/settings?key=X` — read any AppSetting (auth required) / write (admin only)
- `GET /api/seed` — create admin account (one-time setup)

### Pages
- `/login` — public
- `/` — redirects by role
- `/dashboard` — admin/viewer: gradient stat cards + all branches summary table
- `/admin` — admin: branches, viewer accounts, audit log, journal template editor (4 tabs)
- `/reports` — admin/viewer: monthly reports with category comparison + bank breakdown
- `/settings` — all users: theme, number format, number language preferences
- `/branch/[id]/drawer` — daily journal (date-navigable, template-driven rows, dynamic notes, add/delete banks, invoice list, lock/unlock, print to A4)
- `/branch/[id]/archive` — monthly archive list

### Key Invariants
- `bookBalance` from the API (`drawer.bookBalance`) is the stored value — dashboard/archive/reports use it directly; do NOT recompute from individual fields in API routes
- `balanceValue` is always manually entered — never auto-summed from bank transfers
- Invoice totals are display-only — they have no effect on `bookBalance` or any calculation
- The PATCH API for drawers does not need the template to save — it stores whatever the frontend sends; the frontend applies the template
- Invoice updates go through `/invoices/[id]` sub-routes, not through the main drawer PATCH
- `AuditLog` entries are written via `src/lib/audit.ts` `logAction()` — call it silently (no await needed for non-critical paths)
- Locked drawers (`isLocked: true`) are read-only for branch users and viewers; only admin can unlock via PATCH `{ isLocked: false }`; all invoice sub-routes enforce the same lock check

## Initial Setup (New Installation)
1. `npm install`
2. `npx prisma migrate dev --name init`
3. `npx prisma generate`
4. `npm run dev`
5. Visit `http://localhost:3000/api/seed` to create admin account
6. Login as `admin` / `admin123` and go to `/admin` to create branches
