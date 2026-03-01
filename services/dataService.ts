
import { supabase } from './supabaseClient';
import { User, Transaction, Receipt, CateringEvent } from '../types';
import { INITIAL_USERS } from '../constants';

export const dataService = {
  // ── Users ────────────────────────────────────────────────────────────────────

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('name');
    if (error) console.error('getUsers error:', error);
    if (!data || data.length === 0) return INITIAL_USERS;
    return data as User[];
  },

  saveUser: async (user: User): Promise<void> => {
    const { error } = await supabase.from('app_users').insert(user);
    if (error) throw new Error(error.message);
  },

  updateUser: async (user: User): Promise<void> => {
    const { error } = await supabase.from('app_users').update(user).eq('id', user.id);
    if (error) throw new Error(error.message);
  },

  deleteUser: async (userId: string): Promise<void> => {
    const { error } = await supabase.from('app_users').delete().eq('id', userId);
    if (error) throw new Error(error.message);
  },

  // ── Transactions ─────────────────────────────────────────────────────────────

  getTransactions: async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) console.error('getTransactions error:', error);
    return (data ?? []) as Transaction[];
  },

  saveTransaction: async (transaction: Transaction): Promise<void> => {
    const { error } = await supabase.from('transactions').insert(transaction);
    if (error) throw new Error(error.message);
  },

  // ── Receipts ─────────────────────────────────────────────────────────────────

  getReceipts: async (): Promise<Receipt[]> => {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) console.error('getReceipts error:', error);
    return (data ?? []) as Receipt[];
  },

  saveReceipt: async (receipt: Receipt): Promise<void> => {
    const { error } = await supabase.from('receipts').insert(receipt);
    if (error) throw new Error(error.message);
  },

  // ── Catering Events ──────────────────────────────────────────────────────────

  getCateringEvents: async (): Promise<CateringEvent[]> => {
    const { data, error } = await supabase
      .from('catering_events')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) console.error('getCateringEvents error:', error);
    return (data ?? []) as CateringEvent[];
  },

  saveCateringEvent: async (event: CateringEvent): Promise<void> => {
    const { error } = await supabase.from('catering_events').insert(event);
    if (error) throw new Error(error.message);
  },

  updateCateringEvent: async (event: CateringEvent): Promise<void> => {
    const { error } = await supabase
      .from('catering_events')
      .update(event)
      .eq('id', event.id);
    if (error) throw new Error(error.message);
  },
};
