// ─────────────────────────────────────────────────────────────────────────────
// Inventory Order Management — Data Model
// Inchin's Bamboo Garden, South Charlotte
// Backed by Supabase (ibgsc schema)
// ─────────────────────────────────────────────────────────────────────────────

// ── Enumerations ─────────────────────────────────────────────────────────────

export type ProductCategory =
  | 'Kitchen'
  | 'Front of House'
  | 'Crockery'
  | 'Paper & Packaging'
  | 'Sauces'
  | 'Spices'
  | 'Retail';

export type UnitOfMeasure = 'pcs' | 'lbs' | 'kg' | 'bottles' | 'pkts' | 'cases' | 'bags' | 'boxes';

export type OrderStatus = 'Draft' | 'Submitted' | 'Approved' | 'Sent to Supplier';

export type InventoryUserRole = 'Staff' | 'Manager' | 'Owner';

// ── Master Data: Products ─────────────────────────────────────────────────────
//
// One row per orderable product. Maintained by Owner/Manager.
// Staff never edit this table — they only read it when building an order.

export interface Product {
  id: string;                       // UUID
  name: string;                     // e.g. "Spring Roll Wrapper"
  category: ProductCategory;        // drives grouping in the order form
  sku: string;                      // supplier's SKU / item code
  case_size: string;                // human-readable, e.g. "30 pcs/case"
  unit_of_measure: UnitOfMeasure;   // base unit used when entering quantity
  min_order_qty: number;            // default = 1
  supplier_name: string;            // e.g. "US Foods", "RD"
  is_active: boolean;               // soft-delete; inactive items hidden from order form
  notes?: string;                   // optional manager notes about the product
  created_at: string;               // ISO 8601 timestamp
  updated_at: string;
}

// ── Master Data: Inventory Users ──────────────────────────────────────────────

export interface InventoryUserProfile {
  user_id: string;                  // FK → User.id (existing users table)
  inventory_role: InventoryUserRole;
  assigned_category?: ProductCategory;
}

// ── Orders ────────────────────────────────────────────────────────────────────
//
// One Order covers all categories for a given due date.
// Multiple order lines (one per product) are linked via order_id.

export interface Order {
  id: string;                       // UUID
  due_date: string;                 // ISO date string (YYYY-MM-DD) — when supplier needs it by

  // Submission
  submitted_by: string;             // User name (denormalised for display)
  submitted_at: string;             // ISO 8601 timestamp
  status: OrderStatus;

  // Manager actions
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;

  notes?: string;
  created_at: string;
  updated_at: string;
}

// ── Order Lines ───────────────────────────────────────────────────────────────
//
// One row per product line within an Order.
// Staff set quantity_ordered; manager can override with quantity_approved.
// uom_override allows ordering in a unit different from product.unit_of_measure.

export interface OrderItem {
  id: string;                       // UUID
  order_id: string;                 // FK → Order.id
  product_id: string;               // FK → Product.id
  product_name?: string;            // denormalised for display

  // Staff-entered
  quantity_ordered: number;
  uom_override?: UnitOfMeasure;     // if set, overrides product.unit_of_measure
  staff_notes?: string;

  // Manager-entered (set during Approve step)
  quantity_approved?: number;
  manager_notes?: string;

  created_at: string;
  updated_at: string;
}

// ── Derived / View Types ──────────────────────────────────────────────────────

export interface OrderWithLines {
  order: Order;
  lines: OrderItem[];
}

export interface WeekOrderSummary {
  due_date: string;
  total_orders: number;
  pending_approval: number;
  status: OrderStatus;
}

// ── App State ─────────────────────────────────────────────────────────────────

export interface InventoryAppState {
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  inventoryProfiles: InventoryUserProfile[];
}
