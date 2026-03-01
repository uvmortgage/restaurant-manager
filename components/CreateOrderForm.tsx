import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Product, Order, OrderLine } from '../inventory-types';
import { fetchProducts, createOrder, createOrderLines } from '../services/inventoryService';

interface SelectionState {
  selected: boolean;
  qtyDropdown: number;
  qtyOverride: string;
  unitOverride: string;
}

interface Props {
  user: User;
  onSubmit: (order: Order) => void;
  onCancel: () => void;
}

const PRESET_QTYS = [1, 2, 3, 4, 5, 6, 10, 12, 24, 48];

const CreateOrderForm: React.FC<Props> = ({ user, onSubmit, onCancel }) => {
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selections, setSelections] = useState<Map<number, SelectionState>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorFilter, setVendorFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
      const initial = new Map<number, SelectionState>();
      data.forEach((p) => {
        initial.set(p.id, { selected: false, qtyDropdown: 1, qtyOverride: '', unitOverride: '' });
      });
      setSelections(initial);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const updateSelection = (productId: number, patch: Partial<SelectionState>) => {
    setSelections((prev) => {
      const next = new Map(prev);
      const cur = next.get(productId);
      if (cur) next.set(productId, { ...cur, ...patch });
      return next;
    });
  };

  const selectedCount = Array.from(selections.values()).filter((s) => s.selected).length;

  // Unique vendors and categories for filter dropdowns
  const vendors = [...new Map(products.filter((p) => p.vendors?.name).map((p) => [p.vendors!.name, p.vendors!.name])).values()].sort();
  const categories = [...new Map(products.filter((p) => p.categories?.name).map((p) => [p.categories!.name, p.categories!.name])).values()].sort();

  // Apply filters then group by category
  const filteredProducts = products.filter((p) => {
    if (vendorFilter && p.vendors?.name !== vendorFilter) return false;
    if (categoryFilter && p.categories?.name !== categoryFilter) return false;
    return true;
  });

  const grouped: [string, Product[]][] = [];
  const seen = new Set<string>();
  const sorted = [...filteredProducts].sort((a, b) => {
    const ao = a.categories?.sort_order ?? 99;
    const bo = b.categories?.sort_order ?? 99;
    return ao !== bo ? ao - bo : a.name.localeCompare(b.name);
  });
  sorted.forEach((p) => {
    const cat = p.categories?.name ?? 'Other';
    if (!seen.has(cat)) { seen.add(cat); grouped.push([cat, []]); }
    grouped.find(([c]) => c === cat)![1].push(p);
  });

  const handleSubmit = async () => {
    if (!dueDate) { setError('Please select a due date.'); return; }
    if (selectedCount === 0) { setError('Select at least one product.'); return; }

    for (const [pid, sel] of selections.entries()) {
      if (!sel.selected) continue;
      const qty = sel.qtyOverride ? parseFloat(sel.qtyOverride) : sel.qtyDropdown;
      if (!qty || qty <= 0) {
        const p = products.find((x) => x.id === pid);
        setError(`Quantity for "${p?.name ?? pid}" must be > 0.`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const orderPayload: Omit<Order, 'id' | 'created_at' | 'updated_at'> = {
        due_date: dueDate,
        submitted_by: user.name,
        submitted_at: now,
        status: 'SUBMITTED',
        notes: notes.trim() || undefined,
      };

      const newOrder = await createOrder(orderPayload);

      const lines: Omit<OrderLine, 'id' | 'created_at'>[] = [];
      for (const [pid, sel] of selections.entries()) {
        if (!sel.selected) continue;
        const qty = sel.qtyOverride ? parseFloat(sel.qtyOverride) : sel.qtyDropdown;
        const product = products.find((p) => p.id === pid);
        lines.push({
          order_id: newOrder.id,
          product_id: pid,
          product_name: product?.name,
          qty_ordered: qty,
          unit: sel.unitOverride || product?.unit || undefined,
          notes: undefined,
        });
      }

      await createOrderLines(lines);
      onSubmit(newOrder);
    } catch (e: any) {
      setError(e.message ?? 'Failed to save order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 animate-fadeIn">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 bg-white border-b border-slate-100 sticky top-0 z-10">
        <button
          onClick={onCancel}
          disabled={saving}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">New Inventory Order</h1>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
            {selectedCount > 0 ? `${selectedCount} product${selectedCount > 1 ? 's' : ''} selected` : 'Select products below'}
          </p>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-4 pb-32">
        {/* Due Date + Notes */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 shadow-sm">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
              Due Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any special instructions for this order..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Vendor + Category Filters */}
        {!loading && products.length > 0 && (
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Vendor</label>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                <option value="">All Vendors</option>
                {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Type</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                <option value="">All Types</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
            <p className="text-rose-700 font-semibold text-sm">{error}</p>
          </div>
        )}

        {/* Products */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="w-10 h-10 border-4 border-teal-100 rounded-full"></div>
              <div className="absolute top-0 left-0 w-10 h-10 border-4 border-t-teal-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-400 text-sm">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <p className="text-slate-500 font-semibold text-sm">No active products found in the database.</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <p className="text-slate-500 font-semibold text-sm">No products match the selected filters.</p>
          </div>
        ) : (
          grouped.map(([category, catProducts]) => (
            <div key={category} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Category Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-teal-100 text-teal-700">
                  {category}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{catProducts.length} items</span>
              </div>

              {/* Product Rows */}
              <div className="divide-y divide-slate-50">
                {catProducts.map((product) => {
                  const sel = selections.get(product.id) ?? {
                    selected: false, qtyDropdown: 1, qtyOverride: '', unitOverride: '',
                  };

                  return (
                    <div
                      key={product.id}
                      className={`p-4 transition-colors ${sel.selected ? 'bg-teal-50/40' : ''}`}
                    >
                      {/* Row 1: Checkbox + Name + Vendor */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            id={`prod-${product.id}`}
                            checked={sel.selected}
                            onChange={(e) => updateSelection(product.id, { selected: e.target.checked })}
                            className="w-5 h-5 rounded border-slate-300 accent-teal-600 cursor-pointer"
                          />
                        </div>
                        <label htmlFor={`prod-${product.id}`} className="flex-1 cursor-pointer">
                          <p className={`font-bold text-sm leading-tight ${sel.selected ? 'text-slate-900' : 'text-slate-700'}`}>
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {product.vendors?.name && (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                                {product.vendors.name}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-medium">
                              {product.unit}
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Row 2: Qty controls */}
                      <div className={`ml-8 grid grid-cols-3 gap-2 transition-opacity ${sel.selected ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                        {/* Qty Dropdown */}
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Qty
                          </label>
                          <select
                            value={sel.qtyDropdown}
                            onChange={(e) => updateSelection(product.id, { qtyDropdown: Number(e.target.value) })}
                            disabled={!sel.selected}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                          >
                            {PRESET_QTYS.map((q) => (
                              <option key={q} value={q}>{q}</option>
                            ))}
                          </select>
                        </div>

                        {/* Override Qty */}
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Override Qty
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.5"
                            value={sel.qtyOverride}
                            onChange={(e) => updateSelection(product.id, { qtyOverride: e.target.value })}
                            disabled={!sel.selected}
                            placeholder="Custom"
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-300"
                          />
                        </div>

                        {/* Unit Override */}
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Unit Override
                          </label>
                          <input
                            type="text"
                            value={sel.unitOverride || product.unit}
                            onChange={(e) =>
                              updateSelection(product.id, {
                                unitOverride: e.target.value === product.unit ? '' : e.target.value,
                              })
                            }
                            disabled={!sel.selected}
                            placeholder={product.unit}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sticky Submit Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-white border-t border-slate-100 shadow-lg">
        <button
          onClick={handleSubmit}
          disabled={saving || selectedCount === 0 || !dueDate}
          className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
            saving || selectedCount === 0 || !dueDate
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98] shadow-md shadow-teal-200'
          }`}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Saving Order...
            </span>
          ) : selectedCount === 0 ? (
            'Select Products to Place Order'
          ) : !dueDate ? (
            'Set Due Date to Continue'
          ) : (
            `Place Order — ${selectedCount} Item${selectedCount > 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateOrderForm;
