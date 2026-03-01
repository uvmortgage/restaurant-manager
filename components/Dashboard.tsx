
import React from 'react';
import { User, Transaction, Receipt, CateringEvent } from '../types';

interface DashboardProps {
  user: User;
  transactions: Transaction[];
  receipts: Receipt[];
  cateringEvents: CateringEvent[];
  onNavigate: (screen: 'CASH_MANAGER' | 'RECEIPTS_MANAGER' | 'INVENTORY_MANAGER' | 'CATERING_MANAGER' | 'USER_MANAGER') => void;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  user,
  transactions,
  receipts,
  cateringEvents,
  onNavigate,
  onLogout
}) => {
  const balance = transactions.reduce((acc, t) => {
    return t.trans_type === 'Income' ? acc + t.amount : acc - t.amount;
  }, 0);

  const isOwner = user.role === 'Owner';

  return (
    <div className="flex flex-col h-full w-full max-w-xl mx-auto p-4 sm:p-6 animate-fadeIn">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{user.name}</h1>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{user.role}</p>
              {isOwner && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>}
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </header>

      <div className="space-y-6">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Management Hub</h2>

        {/* Cash Manager Card - ONLY VISIBLE TO OWNER */}
        {isOwner && (
          <button
            onClick={() => onNavigate('CASH_MANAGER')}
            className="w-full text-left bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 text-sm">Cash Manager</h3>
              <p className="text-2xl font-black text-indigo-600">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </button>
        )}

        {/* User Manager Card - ONLY VISIBLE TO OWNER */}
        {isOwner && (
          <button
            onClick={() => onNavigate('USER_MANAGER')}
            className="w-full text-left bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:border-violet-300 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v2m0 4v2m-5-3h6"/></svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 text-sm">User Manager</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Manage staff, roles & PINs</p>
            </div>
            <div className="text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </button>
        )}

        {/* Catering Manager Card */}
        <button
          onClick={() => onNavigate('CATERING_MANAGER')}
          className="w-full text-left bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 text-sm">Catering Manager</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">{cateringEvents.length} events recorded</p>
          </div>
          <div className="text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </button>

        {/* Receipts Manager Card */}
        <button
          onClick={() => onNavigate('RECEIPTS_MANAGER')}
          className="w-full text-left bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:border-emerald-300 hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4c0-.5.2-1 .6-1.4C5 2.2 5.5 2 6 2h12c.5 0 1 .2 1.4.6.4.4.6.9.6 1.4v18l-4-2-4 2-4-2-4 2Z"/><path d="M14 14h-4"/><path d="M14 18h-4"/><path d="M14 10h-4"/><path d="M14 6h-4"/></svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 text-sm">Receipts Manager</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">{receipts.length} receipts stored</p>
          </div>
          <div className="text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </button>

        {/* Inventory Manager Card */}
        <button
          onClick={() => onNavigate('INVENTORY_MANAGER')}
          className="w-full text-left bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:border-teal-300 hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 text-sm">Inventory Manager</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Manage supply orders</p>
          </div>
          <div className="text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </button>
      </div>

      <footer className="mt-auto pt-10 text-center">
        <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest flex items-center justify-center gap-2">
          RestoHub v9.0
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
