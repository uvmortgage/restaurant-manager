
import React, { useState } from 'react';
import { User, CateringEvent } from '../types';
import FileViewer from './FileViewer';

interface CateringManagerProps {
  user: User;
  events: CateringEvent[];
  onAddCatering: () => void;
  onPayCatering: (event: CateringEvent) => void;
  onBack: () => void;
}

const CateringManager: React.FC<CateringManagerProps> = ({ user, events, onAddCatering, onPayCatering, onBack }) => {
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);

  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );

  return (
    <div className="flex flex-col h-full w-full max-w-xl mx-auto p-4 sm:p-6 pb-24 animate-slideInRight">
      <header className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900">Catering Manager</h1>
        <button 
          onClick={onAddCatering}
          className="bg-blue-600 text-white p-2 rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </button>
      </header>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        </div>
        <div className="flex-1">
          <p className="text-blue-800 text-xs font-bold">Catering Registry</p>
          <p className="text-blue-600 text-[10px]">Step 1: Book Event • Step 2: Record Payment</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <p className="text-sm font-medium italic">No catering events logged yet.</p>
          </div>
        ) : (
          sortedEvents.map((event) => (
            <div 
              key={event.id} 
              onClick={() => event.photo && setViewingUrl(event.photo)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-4 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center relative">
                {event.photo ? (
                  event.photo.startsWith('data:application/pdf') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-rose-50 text-rose-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M9 15h3a1.5 1.5 0 0 0 0-3H9v4Z"/></svg>
                      <span className="text-[7px] font-black uppercase mt-0.5">PDF</span>
                    </div>
                  ) : (
                    <img src={event.photo} alt="Event" className="w-full h-full object-cover" />
                  )
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                )}
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm truncate uppercase tracking-tight">{event.ordering_person_name}</h3>
                    <div className="flex items-center gap-2">
                       <p className="text-[10px] text-slate-400 font-bold">{new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                       {event.phone_number && (
                         <p className="text-[9px] text-indigo-500 font-black tracking-tighter flex items-center gap-1">
                           <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                           {event.phone_number}
                         </p>
                       )}
                    </div>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    {event.status === 'Paid' ? (
                      <>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          event.payment_method === 'Cash' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          event.payment_method === 'Zelle' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 
                          'bg-slate-50 text-slate-700 border-slate-100'
                        }`}>
                          {event.payment_method}
                        </span>
                        {event.amount && <p className="font-black text-slate-900 text-sm mt-1 tabular-nums">${event.amount.toFixed(2)}</p>}
                      </>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onPayCatering(event);
                        }}
                        className="text-[9px] font-black tracking-widest bg-amber-500 text-white px-3 py-1.5 rounded-full shadow-sm hover:bg-amber-600 transition-all active:scale-95"
                      >
                        PAYMENT
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {event.status === 'Paid' && event.payer_name ? (
                      <p className="text-[9px] text-slate-500 font-medium flex items-center gap-1 truncate">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Payer: {event.payer_name}
                      </p>
                    ) : (
                      <p className="text-[9px] text-amber-600 font-bold uppercase tracking-tight flex items-center gap-1">
                        <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></span>
                        Pending
                      </p>
                    )}
                  </div>
                  {event.photo && (
                    <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase border border-blue-100">
                      View File
                    </span>
                  )}
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

export default CateringManager;
