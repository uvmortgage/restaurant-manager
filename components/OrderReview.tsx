import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Order, OrderLineDetail } from '../inventory-types';
import { fetchOrderLinesWithProducts, submitOrder } from '../services/inventoryService';

interface Props {
  user: User;
  order: Order;
  onBack: () => void;
  onSubmitted: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  SENT: 'bg-blue-100 text-blue-700',
};

const OrderReview: React.FC<Props> = ({ user, order, onBack, onSubmitted }) => {
  const [lines, setLines] = useState<OrderLineDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLines();
  }, []);

  const loadLines = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrderLinesWithProducts(order.id);
      // Sort by category sort_order then product name
      data.sort((a, b) => {
        const diff = (a.category_sort_order ?? 99) - (b.category_sort_order ?? 99);
        return diff !== 0 ? diff : a.product_name.localeCompare(b.product_name);
      });
      setLines(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load order items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitOrder(order.id, user.name);
      onSubmitted();
    } catch (e: any) {
      setError(e.message ?? 'Failed to submit order');
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Group sorted lines by category
  const grouped: [string, OrderLineDetail[]][] = [];
  const seen = new Set<string>();
  lines.forEach((l) => {
    const cat = l.category_name ?? 'Other';
    if (!seen.has(cat)) { seen.add(cat); grouped.push([cat, []]); }
    grouped.find(([c]) => c === cat)![1].push(l);
  });

  const isDraft = order.status === 'DRAFT';

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 animate-fadeIn">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 bg-white border-b border-slate-100 sticky top-0 z-10">
        <button
          onClick={onBack}
          disabled={submitting}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Review Order</h1>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
            Due {formatDate(order.due_date)}
          </p>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
          {order.status}
        </span>
      </header>

      <div className={`flex-1 p-4 space-y-4 ${isDraft ? 'pb-28' : 'pb-6'}`}>
        {/* Order meta */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-semibold">Created by</span>
            <span className="text-slate-700 font-bold">{order.submitted_by ?? '—'}</span>
          </div>
          {order.submitted_at && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-semibold">Submitted</span>
              <span className="text-slate-700 font-bold">{formatDate(order.submitted_at)}</span>
            </div>
          )}
          {order.notes && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
              {order.notes}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
            <p className="text-rose-700 font-semibold text-sm">{error}</p>
          </div>
        )}

        {/* Lines grouped by category */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="w-10 h-10 border-4 border-teal-100 rounded-full"></div>
              <div className="absolute top-0 left-0 w-10 h-10 border-4 border-t-teal-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-400 text-sm">Loading items...</p>
          </div>
        ) : lines.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <p className="text-slate-500 font-semibold text-sm">No items in this order.</p>
          </div>
        ) : (
          grouped.map(([category, catLines]) => (
            <div key={category} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Category header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-teal-100 text-teal-700">
                  {category}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{catLines.length} item{catLines.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Line rows */}
              <div className="divide-y divide-slate-50">
                {catLines.map((line) => (
                  <div key={line.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 leading-tight">{line.product_name}</p>
                      {line.vendor_name && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 mt-1 inline-block">
                          {line.vendor_name}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-teal-700">{line.qty_ordered}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{line.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Summary count */}
        {!loading && lines.length > 0 && (
          <p className="text-center text-xs text-slate-400 font-semibold pb-2">
            {lines.length} item{lines.length !== 1 ? 's' : ''} total
          </p>
        )}
      </div>

      {/* Submit footer — only for DRAFT orders */}
      {isDraft && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-white border-t border-slate-100 shadow-lg">
          <button
            onClick={handleSubmit}
            disabled={submitting || lines.length === 0 || loading}
            className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
              submitting || lines.length === 0 || loading
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98] shadow-md shadow-teal-200'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Submitting Order...
              </span>
            ) : (
              `Submit Order — ${lines.length} Item${lines.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderReview;
