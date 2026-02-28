import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Order } from '../inventory-types';
import { fetchOrders, fetchOrderLines } from '../services/inventoryService';

type OrderStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'SENT';

interface Props {
  user: User;
  onCreateOrder: () => void;
  onBack: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  SENT: 'bg-blue-100 text-blue-700',
};

const InventoryManager: React.FC<Props> = ({ user, onCreateOrder, onBack }) => {
  const [orders, setOrders] = useState<(Order & { line_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrders();
      // Fetch line counts concurrently
      const withCounts = await Promise.all(
        data.map(async (o) => {
          try {
            const lines = await fetchOrderLines(Number(o.id));
            return { ...o, line_count: lines.length };
          } catch {
            return { ...o, line_count: 0 };
          }
        })
      );
      setOrders(withCounts);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 animate-fadeIn">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 bg-white border-b border-slate-100 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Inventory Manager</h1>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Supply Orders</p>
        </div>
        <button
          onClick={onCreateOrder}
          className="flex items-center gap-2 bg-teal-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-teal-700 active:scale-95 transition-all shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Order
        </button>
      </header>

      <div className="flex-1 p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-teal-100 rounded-full"></div>
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-t-teal-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-400 text-sm font-medium">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
            <p className="text-rose-700 font-semibold text-sm">{error}</p>
            <button
              onClick={loadOrders}
              className="mt-3 text-rose-600 text-xs font-bold underline"
            >
              Try again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>
            </div>
            <div>
              <p className="text-slate-800 font-bold text-base">No orders yet</p>
              <p className="text-slate-400 text-sm mt-1">Tap "New Order" to create your first supply order</p>
            </div>
            <button
              onClick={onCreateOrder}
              className="mt-2 bg-teal-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-teal-700 transition-colors text-sm"
            >
              Create First Order
            </button>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-slate-800 font-bold text-sm">
                    Due: {formatDate(order.due_date)}
                  </p>
                  {order.submitted_by && (
                    <p className="text-slate-500 text-xs mt-0.5">
                      By {order.submitted_by}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-black text-teal-600">{order.line_count ?? 0}</p>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">items</p>
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                  {order.notes}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider pt-1 border-t border-slate-50">
                <span>Created {formatDate(order.created_at)}</span>
                {order.approved_by && (
                  <span className="text-emerald-600 font-bold">✓ Approved by {order.approved_by}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InventoryManager;
