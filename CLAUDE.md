# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**يومية المضيان للمجوهرات** — Multi-branch Arabic accounting web app for a jewelry business.

**Two roles:**
- `admin` — root accountant: sees all branches, manages users, dashboard
- `branch` — branch employee: sees only their branch's daily journal

**Two core modules:**
1. **اليومية اليومية** (Daily Journal): Matches exact PDF format with sold items (6 fixed jewelry categories), bank transfers (5 fixed banks), cash flow calculation, and book balance vs actual balance reconciliation.
2. **أرشيف** (Archive): Monthly view of past journals per branch.

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Prisma 7 + SQLite, `jose` JWT auth, `bcryptjs`.

## Commands

```bash
npm run dev       # Dev server (usually http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint

# Database
npx prisma migrate dev --name <name>   # Apply schema changes
npx prisma generate                    # Regenerate client after schema changes
npx prisma studio                      # GUI to inspect DB

# First-time setup
curl http://localhost:3000/api/seed    # Creates admin account (admin/admin123)
```

## Architecture

### Auth (`src/lib/auth.ts` + `src/middleware.ts`)
- JWT stored in `session` httpOnly cookie (7 days)
- `getSession()` reads cookie server-side; `GET /api/auth/me` reads it client-side
- Middleware redirects unauthenticated users to `/login`
- Branch users are restricted to their own `branchId` routes
- Admin users can access `/dashboard` and `/admin`

### Database (Prisma v7 + SQLite)
- DB file: `prisma/dev.db` — connection URL in `.env` (`DATABASE_URL="file:./prisma/dev.db"`)
- `prisma.config.ts` holds Prisma v7 config (NOT `schema.prisma`)
- `src/lib/prisma.ts` uses `@prisma/adapter-libsql` (`PrismaLibSql`) — required for Prisma v7 SQLite
- Do NOT put `url` in `datasource db {}` in schema

**Key models:** `Branch`, `User`, `DailyDrawer`, `SoldItem` (6 rows per drawer), `BankTransfer` (5 rows per drawer)

### Daily Journal Logic
When a drawer is created (`GET /api/drawer`):
- 6 `SoldItem` rows auto-created: طقم، خاتم، حلق، اسوارة، تعليقة، نص طقم
- 5 `BankTransfer` rows auto-created: الانماء، الراجحي، الرياض، ساب، الاهلي
- `yesterdayBalance` auto-filled from previous day's `bookBalance`

**Calculations (all computed on frontend + stored on save):**
- `balanceValue` = **manually entered** by user (قيمة الموازنة = bank/network sales, NOT auto-summed from bank transfers)
- `cashSales` = `totalSales` − `balanceValue`
- `bookBalance` = `cashSales` + additions − deductions
- `difference` = `actualBalance` − `bookBalance`

Auto-save: fields update triggers a 1.5s debounced save via `PATCH /api/drawer/[id]`.

### API Routes (`src/app/api/`)
- `POST /api/auth/login` → sets cookie, returns role + branchId
- `POST /api/auth/logout` → clears cookie
- `GET /api/auth/me` → current session (client-safe)
- `GET /api/seed` → creates admin account (run once)
- `GET/POST /api/branches` → list/create branches (admin only)
- `PATCH/DELETE /api/branches/[id]` → update/delete branch + user
- `GET /api/drawer?branchId=X&date=YYYY-MM-DD` → get or create drawer
- `PATCH /api/drawer/[id]` → update all drawer fields + sold items + bank transfers in one call
- `GET /api/dashboard?date=YYYY-MM-DD` → all branches summary for date (admin only)
- `GET /api/archive?branchId=X&year=Y&month=M` → monthly drawer list

### Pages
- `/login` — login page (public)
- `/` — redirects based on role
- `/dashboard` — admin: all branches table with daily totals
- `/admin` — admin: create/edit/delete branches + user accounts
- `/branch/[id]/drawer` — daily journal (date-navigable, auto-save)
- `/branch/[id]/archive` — monthly archive list, click row to open journal

### Key Components
- `src/components/NavBar.tsx` — role-aware navigation (fetches session client-side)
- `src/app/branch/[id]/drawer/page.tsx` — full journal UI matching the PDF layout exactly

## Initial Setup (New Installation)
1. `npm install`
2. `npx prisma migrate dev --name init`
3. `npx prisma generate`
4. `npm run dev`
5. Visit `http://localhost:3000/api/seed` to create admin account
6. Login as `admin` / `admin123` and go to `/admin` to create branches
