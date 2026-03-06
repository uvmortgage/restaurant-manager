import { supabase, getActiveRestaurantId } from './supabaseClient';
import { Product, Order, OrderLine, OrderLineDetail, Vendor, Category } from '../inventory-types';

// ── Products ──────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  let q = supabase
    .from('products')
    .select('*, categories(name, sort_order, order_type), vendors(name, code)')
    .eq('is_active', true)
    .order('name');
  const rId = getActiveRestaurantId();
  if (rId) q = q.eq('restaurant_id', rId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export async function fetchAllProducts(): Promise<Product[]> {
  let q = supabase
    .from('products')
    .select('*, categories(name, sort_order, order_type), vendors(name, code)')
    .order('name');
  const rId = getActiveRestaurantId();
  if (rId) q = q.eq('restaurant_id', rId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export async function fetchVendors(): Promise<Vendor[]> {
  let q = supabase
    .from('vendors')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name');
  const rId = getActiveRestaurantId();
  if (rId) q = q.eq('restaurant_id', rId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Vendor[];
}

export async function fetchCategories(): Promise<Category[]> {
  let q = supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  const rId = getActiveRestaurantId();
  if (rId) q = q.eq('restaurant_id', rId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function updateProductVendor(productId: number, vendorId: number): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ vendor_id: vendorId })
    .eq('id', productId);
  if (error) throw new Error(error.message);
}

export async function createProduct(
  payload: Pick<Product, 'name' | 'category_id' | 'vendor_id' | 'unit'> & { notes?: string, min_order?: number }
): Promise<Product> {
  const finalPayload: any = { ...payload, is_active: true };
  const rId = getActiveRestaurantId();
  if (rId) finalPayload.restaurant_id = rId;

  const { data, error } = await supabase
    .from('products')
    .insert(finalPayload)
    .select('*, categories(name, sort_order, order_type), vendors(name, code)')
    .single();
  if (error) throw new Error(error.message);
  return data as Product;
}

export async function updateProduct(
  id: number,
  payload: Partial<Pick<Product, 'name' | 'category_id' | 'vendor_id' | 'unit' | 'notes' | 'is_active' | 'min_order'>>
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function softDeleteProduct(id: number): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function fetchOrders(): Promise<Order[]> {
  let q = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  const rId = getActiveRestaurantId();
  if (rId) q = q.eq('restaurant_id', rId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}

export async function createOrder(
  payload: Omit<Order, 'id' | 'created_at' | 'updated_at'>
): Promise<Order> {
  const finalPayload: any = { ...payload };
  const rId = getActiveRestaurantId();
  if (rId) finalPayload.restaurant_id = rId;

  const { data, error } = await supabase
    .from('orders')
    .insert(finalPayload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Order;
}

// ── Order Lines ───────────────────────────────────────────────────────────────

export async function fetchOrderLines(orderId: number): Promise<OrderLine[]> {
  const { data, error } = await supabase
    .from('order_lines')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at');

  if (error) throw new Error(error.message);
  return (data ?? []) as OrderLine[];
}

export async function createOrderLines(
  lines: Omit<OrderLine, 'id' | 'created_at'>[]
): Promise<void> {
  if (lines.length === 0) return;
  const { error } = await supabase.from('order_lines').insert(lines);
  if (error) throw new Error(error.message);
}

// Fetch order lines joined with product name, vendor name, and category for review screen
export async function fetchOrderLinesWithProducts(orderId: number): Promise<OrderLineDetail[]> {
  const { data, error } = await supabase
    .from('order_lines')
    .select('*, products(name, unit, vendors(name), categories(name, sort_order))')
    .eq('order_id', orderId)
    .order('created_at');

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    order_id: row.order_id,
    product_id: row.product_id,
    qty_ordered: row.qty_ordered,
    unit: row.unit ?? row.products?.unit,
    notes: row.notes,
    created_at: row.created_at,
    product_name: row.products?.name ?? `Product #${row.product_id}`,
    vendor_name: row.products?.vendors?.name,
    category_name: row.products?.categories?.name,
    category_sort_order: row.products?.categories?.sort_order ?? 99,
  }));
}

export async function submitOrder(orderId: number, submittedBy: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'SUBMITTED', submitted_by: submittedBy, submitted_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw new Error(error.message);
}

export async function deleteOrderLine(lineId: number): Promise<void> {
  const { error } = await supabase
    .from('order_lines')
    .delete()
    .eq('id', lineId);
  if (error) throw new Error(error.message);
}

export async function updateOrderLine(lineId: number, qty: number, unit?: string): Promise<void> {
  const patch: Record<string, unknown> = { qty_ordered: qty };
  if (unit !== undefined) patch.unit = unit;
  const { error } = await supabase
    .from('order_lines')
    .update(patch)
    .eq('id', lineId);
  if (error) throw new Error(error.message);
}

export async function deleteOrder(orderId: number): Promise<void> {
  // Delete order_lines first to avoid FK constraint issues
  const { error: linesError } = await supabase
    .from('order_lines')
    .delete()
    .eq('order_id', orderId);
  if (linesError) throw new Error(linesError.message);

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);
  if (error) throw new Error(error.message);
}

// ── Order History ─────────────────────────────────────────────────────────────

export interface ProductHistory {
  date: string;   // ISO due_date of most recent submitted order
  qty: number;
  unit?: string;
}

/**
 * Returns product_id → most-recent order info for the given order type.
 * Only counts SUBMITTED / APPROVED / SENT orders so drafts are excluded.
 */
export async function fetchLastOrderedByType(
  orderType: string
): Promise<Record<number, ProductHistory>> {
  let q = supabase
    .from('orders')
    .select('id, due_date')
    .eq('order_type', orderType)
    .in('status', ['SUBMITTED', 'APPROVED', 'SENT'])
    .order('due_date', { ascending: false })
    .limit(100);
  const rId = getActiveRestaurantId();
  if (rId) q = q.eq('restaurant_id', rId);

  const { data: orders, error: ordErr } = await q;

  if (ordErr) throw new Error(ordErr.message);
  if (!orders?.length) return {};

  const { data: lines, error: lineErr } = await supabase
    .from('order_lines')
    .select('product_id, qty_ordered, unit, order_id')
    .in('order_id', orders.map((o) => o.id));

  if (lineErr) throw new Error(lineErr.message);

  const dateMap = new Map(orders.map((o) => [o.id, o.due_date]));
  const result: Record<number, ProductHistory> = {};

  for (const line of lines ?? []) {
    const date = dateMap.get(line.order_id);
    if (!date) continue;
    if (!result[line.product_id] || date > result[line.product_id].date) {
      result[line.product_id] = { date, qty: line.qty_ordered, unit: line.unit ?? undefined };
    }
  }
  return result;
}
