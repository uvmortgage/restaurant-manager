
import { supabase } from './supabaseClient';
import { User, Transaction, Receipt, CateringEvent, Restaurant, AccessRequest } from '../types';

const OWNER_EMAILS = new Set(['sri7576@gmail.com', 'Sree.m2608@gmail.com']);

export const dataService = {
  // ── Users ────────────────────────────────────────────────────────────────────

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('name');
    if (error) console.error('getUsers error:', error);
    return (data ?? []) as User[];
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email)
      .single();
    if (error || !data) return null;
    return data as User;
  },

  createUserFromAuth: async (authUser: { id: string; name: string; email: string; photo?: string }): Promise<User> => {
    const newUser: User = {
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      role: OWNER_EMAILS.has(authUser.email) ? 'Owner' : 'User',
      status: 'Active',
      photo: authUser.photo,
    };
    const { data, error } = await supabase
      .from('app_users')
      .insert(newUser)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as User;
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

  // ── Restaurants ───────────────────────────────────────────────────────────────

  getRestaurants: async (): Promise<Restaurant[]> => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('name');
    if (error) console.error('getRestaurants error:', error);
    return (data ?? []) as Restaurant[];
  },

  createRestaurant: async (payload: Omit<Restaurant, 'id' | 'created_at'>): Promise<Restaurant> => {
    const { data, error } = await supabase
      .from('restaurants')
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Restaurant;
  },

  updateRestaurant: async (restaurant: Restaurant): Promise<void> => {
    const { error } = await supabase
      .from('restaurants')
      .update(restaurant)
      .eq('id', restaurant.id);
    if (error) throw new Error(error.message);
  },

  assignUserToRestaurant: async (userId: string, restaurantId: string | null): Promise<void> => {
    const { error } = await supabase
      .from('app_users')
      .update({ restaurant_id: restaurantId })
      .eq('id', userId);
    if (error) throw new Error(error.message);
  },

  // ── Access Requests ───────────────────────────────────────────────────────────

  submitAccessRequest: async (payload: { user_email: string; user_name?: string; restaurant_id: string }): Promise<void> => {
    const record = {
      ...payload,
      status: 'pending',
      requested_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('access_requests').insert(record);
    if (error) throw new Error(error.message);
  },

  getAccessRequests: async (): Promise<AccessRequest[]> => {
    const { data, error } = await supabase
      .from('access_requests')
      .select('*')
      .order('requested_at', { ascending: false });
    if (error) console.error('getAccessRequests error:', error);
    return (data ?? []) as AccessRequest[];
  },

  updateAccessRequestStatus: async (id: string, status: 'approved' | 'rejected'): Promise<void> => {
    const { error } = await supabase
      .from('access_requests')
      .update({ status })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
};
