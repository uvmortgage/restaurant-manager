
import React, { useState, useMemo } from 'react';
import { User, Receipt, ReceiptCategory } from '../types';
import { RECEIPT_CATEGORIES } from '../constants';
import FileViewer from './FileViewer';

interface ReceiptsManagerProps {
  user: User;
  receipts: Receipt[];
  onAddReceipt: () => void;
  onBack: () => void;
}

const ReceiptsManager: React.FC<ReceiptsManagerProps> = ({ user, receipts, onAddReceipt, onBack }) => {
  const [filter, setFilter] = useState<ReceiptCategory | 'All'>('All');
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);

  const sortedAndFilteredReceipts = useMemo(() => {
    let result = [...receipts];
    if (filter !== 'All') {
      result = result.filter(r => r.category === filter);
    }
    return result.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [receipts, filter]);

  return (
    <div className="flex flex-col h-full w-full max-w-xl mx-auto p-4 sm:p-6 pb-24 animate-slideInRight">
      <header className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900">Receipts Registry</h1>
        <button 
          onClick={onAddReceipt}
          className="bg-emerald-600 text-white p-2 rounded-xl shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </button>
      </header>

      <div className="mb-6 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max pb-2">
          {['All', ...RECEIPT_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat as any)}
              className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                filter === cat 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                  : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {sortedAndFilteredReceipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-20"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">No records found</p>
          </div>
        ) : (
          sortedAndFilteredReceipts.map((receipt) => (
            <div 
              key={receipt.id} 
              onClick={() => setViewingUrl(receipt.photo)}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex gap-5 hover:shadow-md transition-all active:scale-[0.99] group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-50 relative flex items-center justify-center">
                {receipt.photo.startsWith('data:application/pdf') ? (
                   <div className="w-full h-full flex flex-col items-center justify-center bg-rose-50 text-rose-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M9 15h3a1.5 1.5 0 0 0 0-3H9v4Z"/></svg>
                   </div>
                ) : (
                  <img src={receipt.photo} alt="Receipt" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors"></div>
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">
                      {receipt.category} Receipt
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      {new Date(receipt.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <p className="font-black text-slate-900 text-base tabular-nums">
                    ${receipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-auto">
                   <p className="text-[10px] text-slate-400 font-bold tracking-tight">
                     By {receipt.logged_by}
                   </p>
                   <button 
                     className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all"
                   >
                     View File
                   </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {viewingUrl && <FileViewer url={viewingUrl} onClose={() => setViewingUrl(null)} />}
    </div>
  );
};

export default ReceiptsManager;
