
import { User, IncomeCategory, ReceiptCategory } from './types';

export const INITIAL_USERS: User[] = [
  { id: '1', name: 'Sri', role: 'Owner', pin: '3607', status: 'Active', photo: 'https://picsum.photos/seed/sri/200' },
  { id: '2', name: 'Sunil', role: 'Manager', pin: '1231', status: 'Active', photo: 'https://picsum.photos/seed/sunil/200' },
  { id: '3', name: 'Vamsi', role: 'Manager', pin: '4881', status: 'Active', photo: 'https://picsum.photos/seed/vamsi/200' },
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
