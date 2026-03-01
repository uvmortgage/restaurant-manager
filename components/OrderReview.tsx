import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Order, OrderLineDetail } from '../inventory-types';
import {
  fetchOrderLinesWithProducts,
  submitOrder,
  deleteOrderLine,
  updateOrderLine,
} from '../services/inventoryService';
import CreateOrderForm from './CreateOrderForm';

interface Props {
  user: User;
  order: Order;
  onBack: () => void;
  onSubmitted: () => void;
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function drawRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function makeVendorGroups(lines: OrderLineDetail[]): [string, OrderLineDetail[]][] {
  const map = new Map<string, OrderLineDetail[]>();
  for (const l of lines) {
    const k = l.vendor_name ?? 'Other';
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(l);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

async function generateOrderImage(
  order: Order,
  lines: OrderLineDetail[],
  groups: [string, OrderLineDetail[]][]
): Promise<File> {
  const DPR = 2, W = 800;
  const H_HDR = 130, H_META = 56, H_VND = 40, H_ITEM = 54, H_FOOT = 60, PAD = 16;
  const bodyH = PAD + groups.reduce((s, [, g]) => s + H_VND + g.length * H_ITEM + 8, 0) + PAD;
  const TH = H_HDR + H_META + bodyH + H_FOOT;

  const canvas = document.createElement('canvas');
  canvas.width = W * DPR; canvas.height = TH * DPR;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(DPR, DPR);

  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, TH);

  // Header
  const grad = ctx.createLinearGradient(0, 0, W, H_HDR);
  grad.addColorStop(0, '#0d9488'); grad.addColorStop(1, '#0f766e');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H_HDR);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.arc(W - 60, 30, 90, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#fff'; ctx.font = 'bold 30px system-ui,sans-serif';
  ctx.fillText('INVENTORY ORDER', 36, 52);
  ctx.fillStyle = '#99f6e4'; ctx.font = '600 12px system-ui,sans-serif';
  ctx.fillText("RESTOHUB · INCHIN'S BAMBOO GARDEN", 36, 74);

  const stxt = (order.status as string).toUpperCase();
  ctx.font = 'bold 11px system-ui,sans-serif';
  const sw = ctx.measureText(stxt).width + 28;
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; drawRR(ctx, W - sw - 28, 16, sw, 26, 13); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(stxt, W - 28 - sw / 2, 33); ctx.textAlign = 'left';

  ctx.fillStyle = '#ccfbf1'; ctx.font = '600 14px system-ui,sans-serif';
  ctx.fillText(`Due: ${fmtDate(order.due_date)}   ·   ${lines.length} item${lines.length !== 1 ? 's' : ''}`, 36, 108);

  // Meta
  ctx.fillStyle = '#fff'; ctx.fillRect(0, H_HDR, W, H_META);
  ctx.fillStyle = '#64748b'; ctx.font = '600 12px system-ui,sans-serif';
  ctx.fillText('Submitted by', 36, H_HDR + 20);
  ctx.fillStyle = '#1e293b'; ctx.font = 'bold 14px system-ui,sans-serif';
  ctx.fillText(order.submitted_by ?? '—', 36, H_HDR + 40);
  ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, H_HDR + H_META - 1, W, 1);

  // Vendor groups
  let y = H_HDR + H_META + PAD;
  for (const [vendor, vls] of groups) {
    ctx.fillStyle = '#f0fdfa'; ctx.fillRect(0, y, W, H_VND);
    ctx.font = 'bold 13px system-ui,sans-serif';
    const vw = ctx.measureText(vendor).width + 28;
    ctx.fillStyle = '#0d9488'; drawRR(ctx, 36, y + 8, vw, 24, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(vendor, 50, y + 24);
    ctx.fillStyle = '#94a3b8'; ctx.font = '500 11px system-ui,sans-serif';
    ctx.fillText(`${vls.length} item${vls.length !== 1 ? 's' : ''}`, 36 + vw + 10, y + 24);
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, y + H_VND - 1, W, 1);
    y += H_VND;

    for (let i = 0; i < vls.length; i++) {
      const l = vls[i];
      ctx.fillStyle = i % 2 === 0 ? '#fff' : '#fafafa'; ctx.fillRect(0, y, W, H_ITEM);
      ctx.fillStyle = '#1e293b'; ctx.font = 'bold 14px system-ui,sans-serif';
      ctx.fillText(l.product_name, 36, y + 20);
      if (l.category_name) {
        ctx.font = 'bold 10px system-ui,sans-serif';
        const cw = ctx.measureText(l.category_name).width + 16;
        ctx.fillStyle = '#ccfbf1'; drawRR(ctx, 36, y + 28, cw, 16, 8); ctx.fill();
        ctx.fillStyle = '#0f766e'; ctx.fillText(l.category_name, 44, y + 40);
      }
      ctx.fillStyle = '#0d9488'; ctx.font = 'bold 22px system-ui,sans-serif';
      ctx.textAlign = 'right'; ctx.fillText(String(l.qty_ordered), W - 90, y + 26);
      ctx.fillStyle = '#94a3b8'; ctx.font = '500 11px system-ui,sans-serif';
      ctx.fillText(l.unit ?? '', W - 36, y + 26); ctx.textAlign = 'left';
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(36, y + H_ITEM - 1, W - 72, 1);
      y += H_ITEM;
    }
    y += 8;
  }

  // Footer
  ctx.fillStyle = '#0d9488'; ctx.fillRect(0, y + PAD, W, H_FOOT);
  ctx.fillStyle = '#ccfbf1'; ctx.font = '600 12px system-ui,sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('RestoHub · Inventory Management System', W / 2, y + PAD + 22);
  ctx.fillStyle = '#99f6e4'; ctx.font = '500 11px system-ui,sans-serif';
  ctx.fillText(`Order #${order.id} · Generated ${fmtDate(new Date().toISOString())}`, W / 2, y + PAD + 42);
  ctx.textAlign = 'left';

  return new Promise(resolve => {
    canvas.toBlob(
      blob => resolve(new File([blob!], `order-${order.id}.png`, { type: 'image/png' })),
      'image/png'
    );
  });
}

// ── Status colors ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  APPROVED:  'bg-emerald-100 text-emerald-700',
  SENT:      'bg-blue-100 text-blue-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

const OrderReview: React.FC<Props> = ({ user, order, onBack, onSubmitted }) => {
  const [lines, setLines]             = useState<OrderLineDetail[]>([]);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [sharing, setSharing]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Per-line local edits { qty, unit } — applied on submit
  const [lineEdits, setLineEdits] = useState<Map<number, { qty: string; unit: string }>>(new Map());

  // Add items — open full CreateOrderForm
  const [showAddItems, setShowAddItems] = useState(false);

  const currentStatus  = submitted ? 'SUBMITTED' : (order.status as string);
  const showSubmit     = order.status === 'DRAFT' && !submitted;
  const canShare       = submitted || order.status !== 'DRAFT';

  useEffect(() => { loadLines(); }, []);

  const loadLines = async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchOrderLinesWithProducts(order.id);
      data.sort((a, b) => {
        const vd = (a.vendor_name ?? '').localeCompare(b.vendor_name ?? '');
        return vd !== 0 ? vd : a.product_name.localeCompare(b.product_name);
      });
      setLines(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load order items');
    } finally {
      setLoading(false);
    }
  };

  // ── Edit helpers ──────────────────────────────────────────────────────────

  const getEditQty  = (l: OrderLineDetail) => lineEdits.get(l.id)?.qty  ?? String(l.qty_ordered);
  const getEditUnit = (l: OrderLineDetail) => lineEdits.get(l.id)?.unit ?? (l.unit ?? '');

  const patchEdit = (lineId: number, patch: Partial<{ qty: string; unit: string }>) =>
    setLineEdits(prev => {
      const line = lines.find(l => l.id === lineId);
      const base = prev.get(lineId) ?? { qty: String(line?.qty_ordered ?? ''), unit: line?.unit ?? '' };
      return new Map(prev).set(lineId, { ...base, ...patch });
    });

  // Save a single line to the DB (called on blur)
  const saveLineToDB = async (lineId: number) => {
    const edit = lineEdits.get(lineId);
    if (!edit) return;
    const qty = parseFloat(edit.qty);
    if (isNaN(qty) || qty <= 0) return;
    try {
      await updateOrderLine(lineId, qty, edit.unit || undefined);
      setLines(prev => prev.map(l =>
        l.id === lineId ? { ...l, qty_ordered: qty, unit: edit.unit || l.unit } : l
      ));
    } catch (e: any) {
      setError(e.message ?? 'Failed to save');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDeleteLine = async (lineId: number) => {
    setLines(prev => prev.filter(l => l.id !== lineId));          // optimistic
    setLineEdits(prev => { const n = new Map(prev); n.delete(lineId); return n; });
    try {
      await deleteOrderLine(lineId);
    } catch (e: any) {
      setError(e.message ?? 'Failed to remove item');
      loadLines();                                                  // restore on failure
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true); setError(null);
    try {
      // Flush any pending edits (in case user hadn't blurred inputs yet)
      for (const [id, e] of lineEdits.entries()) {
        const qty = parseFloat(e.qty);
        if (!isNaN(qty) && qty > 0) await updateOrderLine(id, qty, e.unit || undefined);
      }
      setLineEdits(new Map());
      await submitOrder(order.id, user.name);
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message ?? 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────

  const handleShare = async () => {
    setSharing(true); setError(null);
    try {
      const displayOrder = submitted
        ? { ...order, status: 'SUBMITTED', submitted_by: user.name }
        : order;
      const groups = makeVendorGroups(lines);
      const file   = await generateOrderImage(displayOrder, lines, groups);

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Inventory Order — Due ${fmtDate(order.due_date)}`,
          text:  `${lines.length} items · Submitted by ${user.name}`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(file);
        const a   = document.createElement('a');
        a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError('Could not share. Try again.');
    } finally {
      setSharing(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────────────────────

  const vendorGroups      = makeVendorGroups(lines);
  const orderedProductIds = new Set(lines.map(l => l.product_id));

  // ── Render ────────────────────────────────────────────────────────────────

  if (showAddItems) {
    return (
      <CreateOrderForm
        user={user}
        existingOrder={order}
        excludeProductIds={orderedProductIds}
        onCancel={() => setShowAddItems(false)}
        onItemsAdded={() => { setShowAddItems(false); loadLines(); }}
        onSubmit={() => {}}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 animate-fadeIn">

      {/* Header */}
      <header className="flex items-center gap-4 p-4 bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} disabled={submitting}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Review Order</h1>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Due {fmtDate(order.due_date)}</p>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_COLORS[currentStatus] ?? 'bg-slate-100 text-slate-600'}`}>
          {currentStatus}
        </span>
      </header>

      <div className="flex-1 p-4 space-y-4 pb-28">

        {/* Success banner */}
        {submitted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <p className="text-emerald-800 font-black text-sm">Order submitted!</p>
              <p className="text-emerald-600 text-xs font-medium mt-0.5">Share it with your team using the button below.</p>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-semibold">Created by</span>
            <span className="text-slate-700 font-bold">{order.submitted_by ?? user.name}</span>
          </div>
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

        {/* Lines grouped by vendor */}
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
            <p className="text-slate-500 font-semibold text-sm">No items yet. Tap "Add Items" below.</p>
          </div>
        ) : (
          vendorGroups.map(([vendor, vLines]) => (
            <div key={vendor} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

              {/* Vendor header */}
              <div className="px-4 py-3 bg-teal-600 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span className="text-[11px] font-black uppercase tracking-widest text-white flex-1">{vendor}</span>
                <span className="text-[10px] text-teal-200 font-medium">{vLines.length} item{vLines.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Line rows */}
              <div className="divide-y divide-slate-50">
                {vLines.map((line) => (
                  <div key={line.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 leading-tight">{line.product_name}</p>
                      {line.category_name && (
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 rounded px-1.5 py-0.5 mt-1 inline-block">
                          {line.category_name}
                        </span>
                      )}
                    </div>

                    {/* Edit controls — always visible */}
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number" min="0.1" step="0.5"
                        value={getEditQty(line)}
                        onChange={e => patchEdit(line.id, { qty: e.target.value })}
                        onBlur={() => saveLineToDB(line.id)}
                        className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-bold text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                      <input
                        type="text"
                        value={getEditUnit(line)}
                        onChange={e => patchEdit(line.id, { unit: e.target.value })}
                        onBlur={() => saveLineToDB(line.id)}
                        className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-500 font-medium text-xs text-center focus:outline-none focus:ring-2 focus:ring-teal-400"
                        placeholder="unit"
                      />
                      <button
                        onClick={() => handleDeleteLine(line.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Add items button — always visible */}
        {!loading && (
          <button
            onClick={() => setShowAddItems(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-sm hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Items
          </button>
        )}

        {!loading && lines.length > 0 && (
          <p className="text-center text-xs text-slate-400 font-semibold pb-2">
            {lines.length} item{lines.length !== 1 ? 's' : ''} total
          </p>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-white border-t border-slate-100 shadow-lg">
        {showSubmit && (
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
                Submitting...
              </span>
            ) : `Submit Order — ${lines.length} Item${lines.length !== 1 ? 's' : ''}`}
          </button>
        )}

        {canShare && (
          <div className="flex gap-3">
            <button
              onClick={handleShare} disabled={sharing}
              className={`flex-1 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                sharing
                  ? 'border-slate-200 text-slate-400 bg-white cursor-not-allowed'
                  : 'border-teal-600 text-teal-600 bg-white hover:bg-teal-50 active:scale-[0.98]'
              }`}
            >
              {sharing ? (
                <>
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Share Order
                </>
              )}
            </button>
            <button
              onClick={submitted ? onSubmitted : onBack}
              className="flex-1 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98] shadow-md shadow-teal-200 transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default OrderReview;
