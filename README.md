# RestoHub — Restaurant Manager

Mobile-first restaurant management app for **Inchin's Bamboo Garden, South Charlotte**.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Layout](#project-layout)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Deploying to Vercel](#deploying-to-vercel)
- [Database Migrations](#database-migrations)
- [Screen Flow](#screen-flow)
- [Roles & Auth](#roles--auth)

---

## Project Overview

RestoHub handles day-to-day operations for a restaurant:

- **Cash Manager** — track income, expenses, and salary payments
- **Receipts** — photo-upload receipts with category tagging
- **Catering** — book catering events and record payments
- **Inventory** — manage vendors, products, and weekly/bar/IBG orders
- **User Manager** — staff list with role management (Owner only)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Database | Supabase (schema: `ibgsc`) |
| Auth | Google OAuth (`@react-oauth/google`) |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## Project Layout

```
restaurant-manager/
│
├── index.html                     HTML entry point
├── index.tsx                      React entry — wraps app in GoogleOAuthProvider
├── App.tsx                        Main router + all global state (useState only)
├── types.ts                       Core types: User, Transaction, Receipt, CateringEvent
├── inventory-types.ts             Inventory types: Category, Vendor, Product, Order, OrderLine
├── constants.ts                   INITIAL_USERS, INCOME_CATEGORIES, RECEIPT_CATEGORIES
├── vercel.json                    Vercel build config + SPA rewrite rule
├── vite.config.ts                 Vite config (port 3000)
├── tsconfig.json                  TypeScript config
├── package.json                   Dependencies + npm scripts
│
├── services/
│   ├── supabaseClient.ts          Supabase singleton (schema: ibgsc)
│   ├── dataService.ts             CRUD for users, transactions, receipts, catering
│   └── inventoryService.ts        CRUD for products, vendors, categories, orders, order lines
│
├── components/
│   ├── Dashboard.tsx              Home screen — 5 navigation cards
│   ├── CashManager.tsx            Transaction list + running balance
│   ├── AddCashForm.tsx            Income entry form
│   ├── PaySalaryForm.tsx          Salary expense form
│   ├── ReceiptsManager.tsx        Receipt list with thumbnails
│   ├── AddReceiptForm.tsx         Receipt photo upload form
│   ├── CateringManager.tsx        Catering events list
│   ├── AddCateringForm.tsx        New catering event form
│   ├── AddCateringPaymentForm.tsx Record a payment for a catering event
│   ├── UserManager.tsx            Staff list + edit/delete (Owner only)
│   ├── UserForm.tsx               Edit user name, role, and status
│   ├── InventoryManager.tsx       Orders tab + Products master list tab
│   ├── CreateOrderForm.tsx        Product picker for new orders
│   ├── OrderReview.tsx            Review, edit, submit, and export order as PNG
│   ├── FileViewer.tsx             Full-screen image lightbox
│   ├── PinPad.tsx                 Numeric PIN input widget
│   └── SignaturePad.tsx           Canvas-based signature capture
│
├── migrations/
│   ├── 001_create_app_tables.sql  Initial schema (app_users, transactions, receipts, catering_events)
│   └── 002_add_order_type.sql     Adds order_type column to orders table
│
└── scripts/
    └── migrate.js                 Migration runner (Supabase Management API or direct Postgres)
```

### Navigation model

There is no URL router. `App.tsx` owns a `currentScreen` string state. Every screen
transition calls `setCurrentScreen('SCREEN_NAME')`. Available screens:

```
LOGIN → DASHBOARD
  ├─ CASH_MANAGER → ADD_CASH | PAY_SALARY
  ├─ RECEIPTS_MANAGER → ADD_RECEIPT
  ├─ CATERING_MANAGER → ADD_CATERING | ADD_CATERING_PAYMENT
  ├─ USER_MANAGER → EDIT_USER
  └─ INVENTORY_MANAGER → CREATE_ORDER → ORDER_REVIEW
```

---

## Local Development

**Prerequisites:** Node.js 18+

```bash
# 1. Install dependencies
npm install

# 2. Create a .env.local file with required variables (see below)

# 3. Start dev server → http://localhost:3000
npm run dev
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Google OAuth — Client ID from Google Cloud Console
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Supabase project URL and anon key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> All `VITE_` variables are inlined at build time by Vite and are safe to expose in the browser.

---

## Deploying to Vercel

### First-time setup

1. Push the repo to GitHub (or GitLab / Bitbucket).
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Vercel auto-detects Vite. Leave the framework preset as **Vite**.
4. Under **Environment Variables**, add the three variables from the section above.
5. Click **Deploy**.

### Subsequent deploys

Every push to `main` (or your configured production branch) triggers an automatic
deployment. No extra steps needed.

### How the SPA rewrite works

`vercel.json` contains a catch-all rewrite so that hard-refreshing any path still
serves `index.html` (required for single-page apps):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Vercel environment variable checklist

| Variable | Where to get it |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials |
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |

After adding or changing env vars in Vercel, trigger a **Redeploy** for them to take effect.

---

## Database Migrations

All tables live in the `ibgsc` schema of your Supabase project.

### Option A — Supabase SQL Editor (manual, quickest)

1. Open your Supabase project → **SQL Editor**.
2. Paste and run each migration file in order:
   - `migrations/001_create_app_tables.sql`
   - `migrations/002_add_order_type.sql`

Each file is idempotent (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) so re-running is safe.

### Option B — Automated migration runner (`npm run migrate`)

`scripts/migrate.js` tracks which migrations have already run in `ibgsc._migrations`
and only applies new ones. It supports two connection modes tried in order:

#### Mode 1: Supabase Management API (recommended — works everywhere, no direct TCP needed)

```bash
SUPABASE_ACCESS_TOKEN=your-pat npm run migrate
```

Get a Personal Access Token from:
**Supabase Dashboard → Account → Access Tokens → Generate new token**

#### Mode 2: Direct PostgreSQL connection (fallback)

```bash
# Using a full connection string
DATABASE_URL=postgres://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres npm run migrate

# Or using just the DB password (runner tries multiple pooler regions automatically)
SUPABASE_DB_PASSWORD=your-db-password npm run migrate
```

### Migration files

| File | What it does |
|---|---|
| `001_create_app_tables.sql` | Creates `app_users`, `transactions`, `receipts`, `catering_events` + RLS policies |
| `002_add_order_type.sql` | Adds `order_type TEXT` column to `orders` with values `WEEKLY_FOOD \| BAR \| IBG` |

### Adding a new migration

1. Create `migrations/003_your_description.sql`.
2. Write idempotent SQL (use `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc.).
3. Run `npm run migrate` — only the new file will be applied.

---

## Roles & Auth

- Login is via **Google OAuth**. No passwords are stored.
- On first login the user is auto-created in `ibgsc.app_users`.
- `sri7576@gmail.com` is automatically assigned the `Owner` role; all other users get `User`.
- Session is persisted in `localStorage` as `restohub_session`.
- **Owner-only screens:** Cash Manager, User Manager.
