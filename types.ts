
export type UserRole = 'Owner' | 'Manager' | 'Dish Washer' | 'Food Runner' | 'Front Staff' | 'User';

export interface UserRestaurantAccess {
  user_id: string;
  restaurant_id: string;
  role: UserRole;
  created_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole; // Current/Active role
  status: 'Active' | 'Inactive';
  photo?: string;
  restaurant_id?: string; // Current/Active restaurant
  default_restaurant_id?: string;
  access?: UserRestaurantAccess[];
}

export interface Restaurant {
  id: string;
  name: string;
  location?: string;
  admin_email: string;
  is_active: boolean;
  created_at?: string;
  enable_inventory?: boolean;
  enable_cash?: boolean;
  enable_users?: boolean;
  enable_catering?: boolean;
  enable_receipts?: boolean;
}

export interface AccessRequest {
  id: string;
  user_email: string;
  user_name?: string;
  restaurant_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}

export type TransactionType = 'Income' | 'Expense';

export type IncomeCategory = 'Catering Order' | 'Daily Drawer' | 'ATM Withdrawal/Outside';
export type ExpenseCategory = 'Salary Payment';

export type TransactionCategory = IncomeCategory | ExpenseCategory;

export interface Transaction {
  id: string;
  timestamp: string;
  trans_type: TransactionType;
  category: TransactionCategory;
  amount: number;
  logged_by: string;
  payee_name?: string;
  reference_details?: string;
  fund_source: 'Pool' | 'Cash';
  signature?: string;
  receipt_photo?: string;
  restaurant_id?: string;
}

export type ReceiptCategory = 'RD' | 'Walmart' | 'Indian' | 'Chinese' | 'Other';

export interface Receipt {
  id: string;
  timestamp: string;
  category: ReceiptCategory;
  vendor_name?: string;
  amount: number;
  photo: string;
  logged_by: string;
  status: 'Synced' | 'Pending';
  restaurant_id?: string;
}

export type PaymentMethod = 'Cash' | 'Zelle' | 'Card';

export interface CateringEvent {
  id: string;
  timestamp: string;
  event_date: string;
  ordering_person_name: string;
  phone_number?: string;
  photo?: string;
  status: 'Booked' | 'Paid';
  payment_method?: PaymentMethod;
  amount?: number;
  payer_name?: string;
  payment_timestamp?: string;
  logged_by: string;
  payment_logged_by?: string;
  restaurant_id?: string;
}

export interface AppState {
  currentUser: User | null;
  transactions: Transaction[];
  receipts: Receipt[];
  cateringEvents: CateringEvent[];
  users: User[];
  restaurants: Restaurant[];
}
