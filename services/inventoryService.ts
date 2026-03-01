import { supabase } from './supabaseClient';
import { Product, Order, OrderLine, OrderLineDetail, Vendor } from '../inventory-types';

// ── Products ──────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, sort_order), vendors(name, code)')
    .eq('is_active', true)
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export async function fetchVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Vendor[];
}

export async function updateProductVendor(productId: number, vendorId: number): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ vendor_id: vendorId })
    .eq('id', productId);
  if (error) throw new Error(error.message);
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}

export async function createOrder(
  payload: Omit<Order, 'id' | 'created_at' | 'updated_at'>
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert(payload)
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
