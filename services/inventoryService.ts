import { supabase } from './supabaseClient';
import { Product, Order, OrderItem } from '../inventory-types';

// ── Products ──────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
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

export async function fetchOrderLines(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from('order_lines')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at');

  if (error) throw new Error(error.message);
  return (data ?? []) as OrderItem[];
}

export async function createOrderLines(
  lines: Omit<OrderItem, 'id' | 'created_at' | 'updated_at'>[]
): Promise<void> {
  if (lines.length === 0) return;
  const { error } = await supabase.from('order_lines').insert(lines);
  if (error) throw new Error(error.message);
}
