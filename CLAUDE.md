# RestoHub — Claude Code Reference

Quick-start context file for AI sessions. Read this before touching any code.

---

## Project Summary

**RestoHub** — Mobile-first restaurant management app for **Inchin's Bamboo Garden, South Charlotte**.

| Stack | Detail |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Database | Supabase (schema: `ibgsc`) |
| Auth | Google OAuth (`@react-oauth/google`) |
| Styling | Tailwind CSS |
| Deployment | Vercel |
| Routing | Screen-based (no URL router — `App.tsx` owns a `currentScreen` state) |

Dev server: `npm run dev` → http://localhost:3000

---

## File Map

```
App.tsx                        Main router + global state (useState only, no Redux/Zustand)
index.tsx                      Entry point — wraps app in GoogleOAuthProvider
types.ts                       User, Transaction, Receipt, CateringEvent, AppState
inventory-types.ts             Category, Vendor, Product, Order, OrderLine, OrderLineDetail, OrderType
constants.ts                   INITIAL_USERS, INCOME_CATEGORIES, RECEIPT_CATEGORIES

services/
  supabaseClient.ts            Supabase singleton (schema: ibgsc)
  dataService.ts               CRUD: users, transactions, receipts, catering
  inventoryService.ts          CRUD: products, vendors, categories, orders, order_lines

components/
  Dashboard.tsx                Home screen — 5 nav cards
  CashManager.tsx              Transaction list + balance
  AddCashForm.tsx              Income form
  PaySalaryForm.tsx            Salary expense form
  ReceiptsManager.tsx          Receipt list with thumbnails
  AddReceiptForm.tsx           Receipt upload
  CateringManager.tsx          Catering events list
  AddCateringForm.tsx          New catering event
  AddCateringPaymentForm.tsx   Record payment for a catering event
  UserManager.tsx              Staff list + edit/delete
  UserForm.tsx                 Edit user (name, role, status)
  InventoryManager.tsx         Orders tab + Products master list tab ← see below
  CreateOrderForm.tsx          Product picker for new orders
  OrderReview.tsx              Review, edit, submit, export order as PNG
  FileViewer.tsx               Full-screen image lightbox
  PinPad.tsx                   Numeric PIN input
  SignaturePad.tsx             Canvas signature capture

migrations/
  001_create_app_tables.sql    Initial schema
  002_add_order_type.sql       Adds order_type column to orders table
```

---

## Screen Flow (App.tsx `currentScreen` states)

```
LOGIN → DASHBOARD
  ├─ CASH_MANAGER → ADD_CASH | PAY_SALARY
  ├─ RECEIPTS_MANAGER → ADD_RECEIPT
  ├─ CATERING_MANAGER → ADD_CATERING | ADD_CATERING_PAYMENT
  ├─ USER_MANAGER → EDIT_USER
  └─ INVENTORY_MANAGER → CREATE_ORDER → ORDER_REVIEW
```

Navigation: `setCurrentScreen('SCREEN_NAME')`. No `<Link>`, no `useNavigate`.

---

## Auth & Roles

- Google OAuth → JWT decoded locally (no backend).
- On first login: user auto-created. `sri7576@gmail.com` → `Owner` role; everyone else → `User`.
- Session stored in `localStorage` as `'restohub_session'`.
- Owner-only screens: `CASH_MANAGER`, `USER_MANAGER`.

---

## Database — ibgsc Schema

### Key Tables

| Table | Key Columns |
|---|---|
| `app_users` | id (google sub), name, email, role, status |
| `transactions` | id, trans_type, category, amount, fund_source, logged_by |
| `receipts` | id, category, vendor_name, amount, photo (file path) |
| `catering_events` | id, event_date, ordering_person_name, status, payment_method |
| `categories` | id, name, sort_order |
| `vendors` | id, code, name, is_active, cutoff_day |
| `products` | id, name, category_id, vendor_id, unit, is_active, notes |
| `orders` | id, due_date, status, order_type, submitted_by, notes |
| `order_lines` | id, order_id, product_id, qty_ordered, unit, notes |

### Order Types (orders.order_type)

```typescript
type OrderType = 'WEEKLY_FOOD' | 'BAR' | 'IBG';
```

- `WEEKLY_FOOD` — 🥦 Default. Weekly food & produce.
- `BAR` — 🍺 Bar & beverage orders.
- `IBG` — 🏮 IBG direct orders.

> **If `order_type` column doesn't exist yet**, run `migrations/002_add_order_type.sql` in Supabase SQL editor.

### Order Status Flow

```
DRAFT → SUBMITTED → APPROVED → SENT
```

---

## Inventory Manager — Two Tabs

### Orders Tab
- Filter pills: All | Weekly Food | Bar | IBG
- "New Order" button:
  - If a specific type is filtered → creates that type directly
  - If "All" is filtered → shows bottom-sheet type picker
- Each order card shows: status badge, order type badge, due date, item count

### Products Tab
- Shows ALL products (active + inactive) from `products` table
- Search bar
- **Add Product** — inline form at top (name, category, vendor, unit, notes)
- **Edit** — expands inline edit form per row
- **Delete** — soft-deletes (sets `is_active = false`)
- **Reactivate** — sets `is_active = true` (button shown for inactive products)

---

## inventoryService.ts — All Exports

```typescript
// Products
fetchProducts()           // active only, joined with category+vendor
fetchAllProducts()        // ALL including inactive — used by Products tab
fetchVendors()            // active vendors
fetchCategories()         // all categories ordered by sort_order
updateProductVendor(productId, vendorId)
createProduct({ name, category_id, vendor_id, unit, notes? })
updateProduct(id, patch)
softDeleteProduct(id)     // sets is_active = false

// Orders
fetchOrders()
createOrder(payload)      // payload includes order_type
submitOrder(orderId, submittedBy)

// Order Lines
fetchOrderLines(orderId)
fetchOrderLinesWithProducts(orderId)  // joined: product, vendor, category
createOrderLines(lines[])
updateOrderLine(lineId, qty, unit?)
deleteOrderLine(lineId)
```

---

## CreateOrderForm Props

```typescript
interface Props {
  user: User;
  orderType: OrderType;          // NEW — passed from App.tsx
  onSubmit: (order: Order) => void;
  onCancel: () => void;
  existingOrder?: Order;         // "add items" mode
  excludeProductIds?: Set<number>;
  onItemsAdded?: () => void;
}
```

---

## State Management Pattern

```
User action
  → Component calls handler prop (from App.tsx)
  → Handler calls service (supabase query)
  → setState(prev => ...) to update global state
  → Component re-renders
```

No Context, no Redux, no Zustand. All state lives in `App.tsx` + component-local `useState`.

---

## UI Conventions

- **Container**: `max-w-lg mx-auto` — phone mockup effect on desktop
- **Cards**: `bg-white rounded-2xl border border-slate-100 shadow-sm`
- **Primary button**: `bg-teal-600 text-white font-black uppercase tracking-widest`
- **Danger button**: `bg-rose-500` or `hover:text-rose-500`
- **Status colors**: DRAFT=slate, SUBMITTED=amber, APPROVED=emerald, SENT=blue
- **Order type colors**: WEEKLY_FOOD=teal, BAR=purple, IBG=indigo
- **Sticky footer** for form submit buttons: `fixed bottom-0 left-0 right-0 max-w-lg mx-auto`
- **Loading spinner**: two concentric borders, top border animate-spin

---

## Common Gotchas

1. **Date parsing**: Always append `T00:00:00` when constructing dates from ISO strings to avoid timezone shift. e.g. `new Date(iso + 'T00:00:00')`.
2. **Supabase schema**: All tables are in `ibgsc` schema, not `public`. Client is configured with `{ db: { schema: 'ibgsc' } }`.
3. **order_type DB column**: Must run `migrations/002_add_order_type.sql` for order types to persist. Until then, `order_type` will be undefined on existing rows (treated as `WEEKLY_FOOD`).
4. **Products tab lazy-loads**: `fetchAllProducts()` only fires when the Products tab is first opened.
5. **OrderReview** uses Canvas API to generate a shareable PNG image of the order. The `generateOrderImage()` function is defined inline in `OrderReview.tsx`.
6. **Session restore**: On mount, App.tsx reads `localStorage['restohub_session']` and calls `loadDataAndEnter()` to skip login.

---

## Completed Features

- [x] Google OAuth login with session persistence
- [x] Cash Manager (income/expense, pool vs cash funds)
- [x] Salary payments
- [x] Receipts with photo upload
- [x] Catering event booking + payment recording
- [x] User/staff management (Owner-only)
- [x] Weekly Food Order creation + review + PNG export
- [x] Bar Order sub-category
- [x] IBG Order sub-category
- [x] Products master list (add / edit / deactivate / reactivate)

## Pending / Known Issues

- [ ] Run `migrations/002_add_order_type.sql` in Supabase to persist order types
- [ ] Google OAuth Client ID needs to be set in Vercel env var `VITE_GOOGLE_CLIENT_ID`
