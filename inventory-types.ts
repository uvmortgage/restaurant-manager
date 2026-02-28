// ─────────────────────────────────────────────────────────────────────────────
// Inventory Order Management — Data Model
// Inchin's Bamboo Garden, South Charlotte
// Backed by Supabase ibgsc schema (integer serial IDs, normalized FKs)
// ─────────────────────────────────────────────────────────────────────────────

// ── Reference / lookup tables ─────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;          // e.g. "PRODUCE", "MEATS", "SEA FOOD"
  sort_order: number;
  created_at: string;
}

export interface Vendor {
  id: number;
  code: string;          // short code e.g. "RD", "WALMART"
  name: string;          // e.g. "Restaurant Depot"
  phone?: string;
  email?: string;
  notes?: string;
  is_active: boolean;
  cutoff_day?: string;   // e.g. "MONDAY"
  cutoff_time?: string;  // e.g. "12:00:00"
  created_at: string;
}

// ── Products ──────────────────────────────────────────────────────────────────
//
// One row per orderable product.
// category_id → ibgsc.categories; vendor_id → ibgsc.vendors

export interface Product {
  id: number;                       // integer serial
  name: string;
  category_id: number;              // FK → categories.id
  vendor_id: number;                // FK → vendors.id
  unit: string;                     // unit of measure, e.g. "lbs", "pcs", "bunch"
  is_active: boolean;
  notes?: string;
  created_at: string;

  // Joined fields — populated when using select('*, categories(name), vendors(name)')
  categories?: { name: string; sort_order?: number };
  vendors?: { name: string; code?: string };
}

// ── Orders ────────────────────────────────────────────────────────────────────

export type OrderStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'SENT';

export interface Order {
  id: number;                       // integer serial
  order_date?: string;              // DATE — auto-set to CURRENT_DATE by DB default
  due_date: string;                 // ISO date YYYY-MM-DD — when supplier needs it
  status: OrderStatus | string;     // default 'DRAFT'
  submitted_by?: string;            // display name (denormalised TEXT column)
  submitted_by_id?: number;         // FK → ibgsc.users.id
  placed_by_id?: number;
  closed_by_id?: number;
  closed_at?: string;
  submitted_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ── Order Lines ───────────────────────────────────────────────────────────────
//
// One row per product in an order.
// qty_ordered = staff-entered; qty_adjusted = manager override; qty_shipped = actual.

export interface OrderLine {
  id: number;                       // integer serial
  order_id: number;                 // FK → orders.id
  product_id: number;               // FK → products.id
  qty_ordered: number;
  unit?: string;                    // UOM override for this line (overrides product.unit)
  notes?: string;                   // staff notes
  qty_adjusted?: number;            // manager-approved override qty
  qty_shipped?: number;
  created_at: string;

  // Joined for display
  product_name?: string;
}
