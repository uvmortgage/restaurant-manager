
import { Transaction, User, Receipt, CateringEvent, CloudConfig } from '../types';
import { INITIAL_USERS } from '../constants';

const STORAGE_KEYS = {
  TRANSACTIONS: 'cashpool_transactions',
  RECEIPTS: 'cashpool_receipts',
  CATERING: 'cashpool_catering',
  USERS: 'cashpool_users',
  CLOUD: 'cashpool_cloud_config',
};

const DEFAULT_CLOUD_CONFIG: CloudConfig = {
  syncUrl: 'https://script.google.com/macros/s/AKfycbzb--nQ_455qEkbOQZrp_0WG8JeX_QfwOx4S-HPBooHZeuPEQXKDwbGjuD4bH2spPs/exec',
  apiKey: 'B@mboo2025'
};

export const storageService = {
  getTransactions: (): Transaction[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  saveTransaction: (transaction: Transaction) => {
    const transactions = storageService.getTransactions();
    const updated = [transaction, ...transactions];
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
    return updated;
  },

  getReceipts: (): Receipt[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  saveReceipt: (receipt: Receipt) => {
    const receipts = storageService.getReceipts();
    const updated = [receipt, ...receipts];
    localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(updated));
    return updated;
  },

  getCateringEvents: (): CateringEvent[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATERING);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  saveCateringEvent: (event: CateringEvent) => {
    const events = storageService.getCateringEvents();
    const updated = [event, ...events];
    localStorage.setItem(STORAGE_KEYS.CATERING, JSON.stringify(updated));
    return updated;
  },

  updateCateringEvent: (updatedEvent: CateringEvent) => {
    const events = storageService.getCateringEvents();
    const updated = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
    localStorage.setItem(STORAGE_KEYS.CATERING, JSON.stringify(updated));
    return updated;
  },

  getUsers: (): User[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        return INITIAL_USERS;
      }
      const users = JSON.parse(data);
      // If list is empty, restore initial users
      if (!Array.isArray(users) || users.length === 0) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        return INITIAL_USERS;
      }
      return users;
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUser: (user: User) => {
    const users = storageService.getUsers();
    const updated = [...users, user];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
    return updated;
  },

  updateUser: (updatedUser: User) => {
    const users = storageService.getUsers();
    const updated = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
    return updated;
  },

  deleteUser: (userId: string) => {
    const users = storageService.getUsers();
    const updated = users.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
    return updated;
  },

  getCloudConfig: (): CloudConfig => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLOUD);
      return data ? JSON.parse(data) : DEFAULT_CLOUD_CONFIG;
    } catch {
      return DEFAULT_CLOUD_CONFIG;
    }
  },

  saveCloudConfig: (config: CloudConfig) => {
    localStorage.setItem(STORAGE_KEYS.CLOUD, JSON.stringify(config));
  },

  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  }
};
