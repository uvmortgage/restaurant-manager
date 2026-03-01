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

// ── Canvas image generator ────────────────────────────────────────────────────

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
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

async function generateOrderImage(
  order: Order,
  lines: OrderLineDetail[],
  grouped: [string, OrderLineDetail[]][]
): Promise<File> {
  const DPR = 2;
  const W = 800;

  const HEADER_H = 130;
  const META_H   = 56;
  const CAT_H    = 38;
  const ITEM_H   = 54;
  const FOOTER_H = 60;
  const PAD      = 20;

  const bodyH  = PAD + grouped.length * CAT_H + lines.length * ITEM_H + PAD;
  const totalH = HEADER_H + META_H + bodyH + FOOTER_H;

  const canvas  = document.createElement('canvas');
  canvas.width  = W * DPR;
  canvas.height = totalH * DPR;
  const ctx     = canvas.getContext('2d')!;
  ctx.scale(DPR, DPR);

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, W, totalH);

  // ── Header ──────────────────────────────────────────────────────────────────
  // Gradient
  const grad = ctx.createLinearGradient(0, 0, W, HEADER_H);
  grad.addColorStop(0, '#0d9488');
  grad.addColorStop(1, '#0f766e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, HEADER_H);

  // Decorative circle
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(W - 60, 30, 90, 0, Math.PI * 2);
  ctx.fill();

  // "INVENTORY ORDER"
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
  ctx.fillText('INVENTORY ORDER', 36, 52);

  // Sub-label
  ctx.fillStyle = '#99f6e4';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText('RESTOHUB · INCHIN\'S BAMBOO GARDEN', 36, 76);

  // Status pill
  const statusText = (order.status as string).toUpperCase();
  ctx.font = 'bold 11px system-ui, sans-serif';
  const statusW = ctx.measureText(statusText).width + 28;
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  drawRoundRect(ctx, W - statusW - 28, 16, statusW, 26, 13);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(statusText, W - 28 - statusW / 2, 33);
  ctx.textAlign = 'left';

  // Due date + item count
  ctx.fillStyle = '#ccfbf1';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillText(
    `Due: ${fmtDate(order.due_date)}   ·   ${lines.length} item${lines.length !== 1 ? 's' : ''}`,
    36, 108
  );

  // ── Meta row ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, HEADER_H, W, META_H);
  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(`Submitted by`, 36, HEADER_H + 22);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(order.submitted_by ?? '—', 36, HEADER_H + 40);

  if (order.notes) {
    ctx.fillStyle = '#92400e';
    ctx.font = '500 12px system-ui, sans-serif';
    ctx.fillText(`Note: ${order.notes}`, 300, HEADER_H + 34);
  }

  // Separator
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, HEADER_H + META_H - 1, W, 1);

  // ── Item rows ────────────────────────────────────────────────────────────────
  let y = HEADER_H + META_H + PAD;

  for (const [category, catLines] of grouped) {
    // Category header
    ctx.fillStyle = '#f0fdfa';
    ctx.fillRect(0, y, W, CAT_H);

    ctx.font = 'bold 11px system-ui, sans-serif';
    const cpw = ctx.measureText(category).width + 24;
    ctx.fillStyle = '#ccfbf1';
    drawRoundRect(ctx, 36, y + 8, cpw, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#0f766e';
    ctx.fillText(category, 48, y + 23);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 11px system-ui, sans-serif';
    ctx.fillText(
      `${catLines.length} item${catLines.length !== 1 ? 's' : ''}`,
      36 + cpw + 10, y + 23
    );

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, y + CAT_H - 1, W, 1);
    y += CAT_H;

    for (let i = 0; i < catLines.length; i++) {
      const line = catLines[i];

      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fafafa';
      ctx.fillRect(0, y, W, ITEM_H);

      // Product name
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(line.product_name, 36, y + 20);

      // Vendor badge
      if (line.vendor_name) {
        ctx.font = '600 10px system-ui, sans-serif';
        const vw = ctx.measureText(line.vendor_name).width + 16;
        ctx.fillStyle = '#f1f5f9';
        drawRoundRect(ctx, 36, y + 27, vw, 18, 9);
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.fillText(line.vendor_name, 44, y + 39);
      }

      // Qty
      ctx.fillStyle = '#0d9488';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(line.qty_ordered), W - 90, y + 26);

      // Unit
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 11px system-ui, sans-serif';
      ctx.fillText(line.unit ?? '', W - 36, y + 26);
      ctx.textAlign = 'left';

      // Row rule
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(36, y + ITEM_H - 1, W - 72, 1);
      y += ITEM_H;
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  y += PAD;
  ctx.fillStyle = '#0d9488';
  ctx.fillRect(0, y, W, FOOTER_H);

  ctx.fillStyle = '#ccfbf1';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RestoHub · Inventory Management', W / 2, y + 22);
  ctx.fillStyle = '#99f6e4';
  ctx.font = '500 11px system-ui, sans-serif';
  ctx.fillText(
    `Order #${order.id} · Generated ${fmtDate(new Date().toISOString())}`,
    W / 2, y + 42
  );
  ctx.textAlign = 'left';

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(new File([blob!], `order-${order.id}.png`, { type: 'image/png' })),
      'image/png'
    );
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

const OrderReview: React.FC<Props> = ({ user, order, onBack, onSubmitted }) => {
  const [lines, setLines]         = useState<OrderLineDetail[]>([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false); // flips after successful submit
  const [sharing, setSharing]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Treat already-submitted orders as if we just submitted them (show share button)
  const currentStatus = submitted ? 'SUBMITTED' : (order.status as string);
  const isDraft       = currentStatus === 'DRAFT';
  const canShare      = !isDraft && !loading && lines.length > 0;

  useEffect(() => { loadLines(); }, []);

  const loadLines = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrderLinesWithProducts(order.id);
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
      setSubmitted(true); // stay on page — show share footer
    } catch (e: any) {
      setError(e.message ?? 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    setError(null);
    try {
      // Build grouped structure for the image
      const grouped: [string, OrderLineDetail[]][] = [];
      const seen = new Set<string>();
      lines.forEach((l) => {
        const cat = l.category_name ?? 'Other';
        if (!seen.has(cat)) { seen.add(cat); grouped.push([cat, []]); }
        grouped.find(([c]) => c === cat)![1].push(l);
      });

      const file = await generateOrderImage(
        submitted ? { ...order, status: 'SUBMITTED', submitted_by: user.name } : order,
        lines,
        grouped
      );

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Inventory Order — Due ${fmtDate(order.due_date)}`,
          text: `${lines.length} items · Submitted by ${user.name}`,
          files: [file],
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(file);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError('Could not share. Try again.');
      }
    } finally {
      setSharing(false);
    }
  };

  const formatDate = (iso: string) => fmtDate(iso);

  // Group for display
  const grouped: [string, OrderLineDetail[]][] = [];
  const seen = new Set<string>();
  lines.forEach((l) => {
    const cat = l.category_name ?? 'Other';
    if (!seen.has(cat)) { seen.add(cat); grouped.push([cat, []]); }
    grouped.find(([c]) => c === cat)![1].push(l);
  });

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
        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_COLORS[currentStatus] ?? 'bg-slate-100 text-slate-600'}`}>
          {currentStatus}
        </span>
      </header>

      <div className={`flex-1 p-4 space-y-4 ${isDraft ? 'pb-28' : 'pb-28'}`}>

        {/* Success banner after submit */}
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

        {/* Order meta */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-semibold">Created by</span>
            <span className="text-slate-700 font-bold">{order.submitted_by ?? user.name}</span>
          </div>
          {order.submitted_at && !submitted && (
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
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-teal-100 text-teal-700">
                  {category}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{catLines.length} item{catLines.length !== 1 ? 's' : ''}</span>
              </div>
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

        {!loading && lines.length > 0 && (
          <p className="text-center text-xs text-slate-400 font-semibold pb-2">
            {lines.length} item{lines.length !== 1 ? 's' : ''} total
          </p>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-white border-t border-slate-100 shadow-lg">

        {/* DRAFT — Submit button */}
        {isDraft && (
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
        )}

        {/* SUBMITTED / APPROVED / SENT — Share + Done */}
        {canShare && (
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              disabled={sharing}
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
