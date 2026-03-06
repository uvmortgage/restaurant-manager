
import { User, IncomeCategory, ReceiptCategory } from './types';

export const INITIAL_USERS: User[] = [
  { id: '1', name: 'Sri', email: 'sri@example.com', role: 'Owner', status: 'Active', photo: 'https://picsum.photos/seed/sri/200' },
  { id: '2', name: 'Sunil', email: 'sunil@example.com', role: 'Manager', status: 'Active', photo: 'https://picsum.photos/seed/sunil/200' },
  { id: '3', name: 'Vamsi', email: 'vamsi@example.com', role: 'Manager', status: 'Active', photo: 'https://picsum.photos/seed/vamsi/200' },
];

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Catering Order',
  'Daily Drawer',
  'ATM Withdrawal/Outside'
];

export const RECEIPT_CATEGORIES: ReceiptCategory[] = [
  'RD',
  'Walmart',
  'Indian',
  'Chinese',
  'Other'
];
