// ─────────────────────────────────────────────────────────────────────────────
// Inventory Order Management — Data Model
// Inchin's Bamboo Garden, South Charlotte
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
  category: ProductCategory;        // drives which staff member sees this product
  sku: string;                      // supplier's SKU / item code
  case_size: string;                // human-readable, e.g. "30 pcs/case", "44 lbs/case"
  unit_of_measure: UnitOfMeasure;   // base unit used when entering quantity
  min_order_qty: number;            // default = 1; UI warns if order qty is below this
  supplier_name: string;            // e.g. "US Foods", "RD"
  is_active: boolean;               // soft-delete; inactive items hidden from order form
  notes?: string;                   // optional manager notes about the product
  created_at: string;               // ISO 8601 timestamp
  updated_at: string;
}

// ── Master Data: Inventory Users ──────────────────────────────────────────────
//
// Extends the base User concept with inventory-specific fields.
// Linked to the existing User by id (same PIN-based login).
// A Staff member is assigned exactly one category; Manager/Owner can see all.

export interface InventoryUserProfile {
  user_id: string;                  // FK → User.id (existing users table)
  inventory_role: InventoryUserRole;
  assigned_category?: ProductCategory; // required when inventory_role === 'Staff'
}

// ── Orders ────────────────────────────────────────────────────────────────────
//
// One Order = one staff member's submission for a given week & category.
// A single week may have multiple Orders (one per category / staff member).
// The manager's consolidated view aggregates all Orders for the same week.

export interface Order {
  id: string;                       // UUID
  week_ending_date: string;         // ISO date string (YYYY-MM-DD), e.g. "2026-03-07"
  category: ProductCategory;        // category covered by this order

  // Submission
  submitted_by: string;             // FK → User.id
  submitted_at: string;             // ISO 8601 timestamp; null while status === 'Draft'
  status: OrderStatus;

  // Manager actions
  approved_by?: string;             // FK → User.id
  approved_at?: string;             // ISO 8601 timestamp
  sent_at?: string;                 // ISO 8601 timestamp; set when marked "Sent to Supplier"

  notes?: string;                   // general order-level notes (manager or staff)
  created_at: string;
  updated_at: string;
}

// ── Order Items ───────────────────────────────────────────────────────────────
//
// One row per product line within an Order.
// Staff set quantity_ordered; manager can override with quantity_approved.
// quantity_approved defaults to quantity_ordered unless manager changes it.

export interface OrderItem {
  id: string;                       // UUID
  order_id: string;                 // FK → Order.id
  product_id: string;               // FK → Product.id

  // Staff-entered
  quantity_ordered: number;         // must be >= product.min_order_qty (UI enforces)
  staff_notes?: string;             // optional per-line note from staff

  // Manager-entered (set during Approve step)
  quantity_approved?: number;       // if undefined, treat as equal to quantity_ordered
  manager_notes?: string;           // optional per-line note from manager

  created_at: string;
  updated_at: string;
}

// ── Derived / View Types ──────────────────────────────────────────────────────
//
// These are NOT stored — they are assembled at query time for the UI.

// Consolidated line for the manager's weekly order sheet
export interface OrderSheetLine {
  product: Product;
  order: Order;
  item: OrderItem;
  submitted_by_name: string;        // denormalised for display
}

// Summary card shown in the manager's dashboard
export interface WeekOrderSummary {
  week_ending_date: string;
  total_orders: number;
  categories_submitted: ProductCategory[];
  pending_approval: number;         // count of Orders still in 'Submitted' status
  status: OrderStatus;              // worst/lowest status across all orders that week
}

// ── App State ─────────────────────────────────────────────────────────────────

export interface InventoryAppState {
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  inventoryProfiles: InventoryUserProfile[];
}
