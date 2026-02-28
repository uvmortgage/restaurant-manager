
import React, { useState } from 'react';
import { User, Transaction } from '../types';
import FileViewer from './FileViewer';

interface CashManagerProps {
  user: User;
  transactions: Transaction[];
  onAddCash: () => void;
  onPaySalary: () => void;
  onBack: () => void;
}

const CashManager: React.FC<CashManagerProps> = ({ user, transactions, onAddCash, onPaySalary, onBack }) => {
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);

  const balance = transactions.reduce((acc, t) => {
    return t.trans_type === 'Income' ? acc + t.amount : acc - t.amount;
  }, 0);

  const recentTransactions = transactions.slice(0, 10);

  return (
    <div className="flex flex-col h-full w-full max-w-xl mx-auto p-4 sm:p-6 pb-24 animate-slideInRight">
      <header className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900">Cash Manager</h1>
        <div className="w-10"></div>
      </header>

      <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-3xl p-8 shadow-2xl mb-8 transform transition-all hover:scale-[1.02]">
        <p className="text-indigo-200 text-sm font-semibold mb-2 flex items-center gap-2">
          Pool Balance
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </p>
        <h2 className="text-5xl font-black text-white tracking-tight">
          ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <button
          onClick={onAddCash}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-emerald-50 text-emerald-700 rounded-3xl border border-emerald-100 shadow-sm hover:bg-emerald-100 active:scale-95 transition-all group"
        >
          <div className="p-3 bg-emerald-600 text-white rounded-2xl group-hover:shadow-lg transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <span className="font-bold text-lg">Add Cash</span>
        </button>

        <button
          onClick={onPaySalary}
          className="flex flex-col items-center justify-center gap-3 p-6 bg-rose-50 text-rose-700 rounded-3xl border border-rose-100 shadow-sm hover:bg-rose-100 active:scale-95 transition-all group"
        >
          <div className="p-3 bg-rose-600 text-white rounded-2xl group-hover:shadow-lg transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <span className="font-bold text-lg">Pay Salary</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="font-bold text-slate-800 text-lg">Recent Ledger</h3>
          <span className="text-xs font-medium text-slate-400">Last 10 entries</span>
        </div>
        
        <div className="space-y-3 overflow-y-auto pr-1">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm italic">No entries yet.</p>
            </div>
          ) : (
            recentTransactions.map((t) => (
              <div 
                key={t.id} 
                onClick={() => {
                  if (t.receipt_photo) setViewingUrl(t.receipt_photo);
                  else if (t.signature) setViewingUrl(t.signature);
                }}
                className={`flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all ${t.receipt_photo || t.signature ? 'cursor-pointer active:scale-[0.98]' : ''}`}
              >
                <div className={`p-2.5 rounded-xl ${t.trans_type === 'Income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {t.trans_type === 'Income' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 10-4-4-4 4"/><path d="M12 12v9"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 14 4 4 4-4"/><path d="M12 3v9"/></svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800 text-sm truncate">{t.category}</p>
                    {(t.receipt_photo || t.signature) && (
                      <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded border border-indigo-100">
                        {t.receipt_photo ? 'Receipt' : 'Sig'}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • by {t.logged_by}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${t.trans_type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.trans_type === 'Income' ? '+' : '-'}${t.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {viewingUrl && <FileViewer url={viewingUrl} onClose={() => setViewingUrl(null)} />}
    </div>
  );
};

export default CashManager;
