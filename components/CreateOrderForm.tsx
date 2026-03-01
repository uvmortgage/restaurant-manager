import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Product, Order, OrderLine, Vendor, OrderType, ORDER_TYPE_LABELS } from '../inventory-types';
import { fetchProducts, fetchVendors, createOrder, createOrderLines, updateProductVendor } from '../services/inventoryService';

interface SelectionState {
  selected: boolean;
  qtyDropdown: number;
  qtyOverride: string;
  unitOverride: string;
}

// Vendor override per product: vendorId to use, and whether to save it permanently
interface VendorOverride {
  vendorId: number;
  permanent: boolean;
}

interface Props {
  user: User;
  orderType: OrderType;
  onSubmit: (order: Order) => void;
  onCancel: () => void;
  // "Add items to existing order" mode
  existingOrder?: Order;
  excludeProductIds?: Set<number>;
  onItemsAdded?: () => void;
}

function fmtOrderDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PRESET_QTYS = [1, 2, 3, 4, 5, 6, 10, 12, 24, 48];

const CreateOrderForm: React.FC<Props> = ({ user, orderType, onSubmit, onCancel, existingOrder, excludeProductIds, onItemsAdded }) => {
  const isAddMode = !!existingOrder;
  const [dueDate, setDueDate] = useState(existingOrder?.due_date ?? '');
  const [notes, setNotes] = useState(existingOrder?.notes ?? '');
  const [products, setProducts] = useState<Product[]>([]);
  const [selections, setSelections] = useState<Map<number, SelectionState>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorFilter, setVendorFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  // productId → { vendorId, permanent }
  const [vendorOverrides, setVendorOverrides] = useState<Map<number, VendorOverride>>(new Map());

  useEffect(() => {
    loadProducts();
    fetchVendors().then(setAllVendors).catch(() => {});
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

  const setVendorOverride = (productId: number, vendorId: number, permanent: boolean) => {
    setVendorOverrides((prev) => new Map(prev).set(productId, { vendorId, permanent }));
  };

  const clearVendorOverride = (productId: number) => {
    setVendorOverrides((prev) => { const next = new Map(prev); next.delete(productId); return next; });
  };

  const selectedCount = Array.from(selections.values()).filter((s) => s.selected).length;

  // Unique vendors and categories for filter dropdowns — scoped to this order type
  const orderTypeProducts = products.filter((p) => {
    const catOrderType = p.categories?.order_type;
    return !catOrderType || catOrderType === orderType;
  });
  const vendors = [...new Map(orderTypeProducts.filter((p) => p.vendors?.name).map((p) => [p.vendors!.name, p.vendors!.name])).values()].sort();
  const categories = [...new Map(orderTypeProducts.filter((p) => p.categories?.name).map((p) => [p.categories!.name, p.categories!.name])).values()].sort();

  // Apply filters then group by category
  const filteredProducts = products.filter((p) => {
    // Only show products whose category belongs to this order type (or has no order_type set)
    const catOrderType = p.categories?.order_type;
    if (catOrderType && catOrderType !== orderType) return false;
    if (vendorFilter && p.vendors?.name !== vendorFilter) return false;
    if (categoryFilter && p.categories?.name !== categoryFilter) return false;
    if (searchFilter && !p.name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    if (excludeProductIds?.has(p.id)) return false;
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
    if (!isAddMode && !dueDate) { setError('Please select a due date.'); return; }
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
      if (isAddMode) {
        // Adding items to an existing order
        const lines: Omit<OrderLine, 'id' | 'created_at'>[] = [];
        for (const [pid, sel] of selections.entries()) {
          if (!sel.selected) continue;
          const qty = sel.qtyOverride ? parseFloat(sel.qtyOverride) : sel.qtyDropdown;
          const product = products.find((p) => p.id === pid);
          lines.push({
            order_id: existingOrder!.id,
            product_id: pid,
            qty_ordered: qty,
            unit: sel.unitOverride || product?.unit || undefined,
            notes: undefined,
          });
        }
        await createOrderLines(lines);
        onItemsAdded?.();
      } else {
        // Save permanent vendor changes first
        const permanentChanges = [...vendorOverrides.entries()].filter(([, ov]) => ov.permanent);
        await Promise.all(permanentChanges.map(([pid, ov]) => updateProductVendor(pid, ov.vendorId)));

        const orderPayload: Omit<Order, 'id' | 'created_at' | 'updated_at'> = {
          due_date: dueDate,
          submitted_by: user.name,
          submitted_at: new Date().toISOString(),
          status: 'DRAFT',
          order_type: orderType,
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
            qty_ordered: qty,
            unit: sel.unitOverride || product?.unit || undefined,
            notes: undefined,
          });
        }

        await createOrderLines(lines);
        onSubmit(newOrder);
      }
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
          <h1 className="text-lg font-black text-slate-900 tracking-tight">
            {isAddMode ? 'Add Items' : `New ${ORDER_TYPE_LABELS[orderType]} Order`}
          </h1>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
            {selectedCount > 0 ? `${selectedCount} product${selectedCount > 1 ? 's' : ''} selected` : 'Select products below'}
          </p>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-4 pb-32">
        {/* Order context banner (add-items mode) or Due Date + Notes form (new order mode) */}
        {isAddMode ? (
          <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <div>
              <p className="text-teal-800 font-black text-xs uppercase tracking-widest">Due {fmtOrderDate(existingOrder!.due_date)}</p>
              {existingOrder!.notes && <p className="text-teal-600 text-xs font-medium mt-0.5">{existingOrder!.notes}</p>}
            </div>
          </div>
        ) : (
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
        )}

        {/* Search + Vendor + Category Filters */}
        {!loading && products.length > 0 && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search products..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              autoFocus={isAddMode}
            />
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
            <p className="text-slate-500 font-semibold text-sm">
              {searchFilter ? `No products match "${searchFilter}".` : isAddMode ? 'All products are already in this order.' : 'No products match the selected filters.'}
            </p>
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
                  const vendorOv = vendorOverrides.get(product.id);
                  const effectiveVendorId = vendorOv?.vendorId ?? product.vendor_id;
                  const effectiveVendorName = vendorOv
                    ? allVendors.find((v) => v.id === vendorOv.vendorId)?.name
                    : product.vendors?.name;

                  return (
                    <div
                      key={product.id}
                      className={`p-4 transition-colors ${sel.selected ? 'bg-teal-50/40' : ''}`}
                    >
                      {/* Row 1: Checkbox + Name + Vendor badge */}
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
                            <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${vendorOv ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                              {effectiveVendorName ?? '—'}
                              {vendorOv && !vendorOv.permanent && ' · order only'}
                              {vendorOv && vendorOv.permanent && ' · permanent'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{product.unit}</span>
                          </div>
                        </label>
                      </div>

                      {/* Expanded controls — only when selected */}
                      {sel.selected && (
                        <div className="ml-8 space-y-3">
                          {/* Qty controls */}
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Qty</label>
                              <select
                                value={sel.qtyDropdown}
                                onChange={(e) => updateSelection(product.id, { qtyDropdown: Number(e.target.value) })}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                              >
                                {PRESET_QTYS.map((q) => <option key={q} value={q}>{q}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Override Qty</label>
                              <input
                                type="number"
                                min="0.01"
                                step="0.5"
                                value={sel.qtyOverride}
                                onChange={(e) => updateSelection(product.id, { qtyOverride: e.target.value })}
                                placeholder="Custom"
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-300"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Unit Override</label>
                              <input
                                type="text"
                                value={sel.unitOverride || product.unit}
                                onChange={(e) =>
                                  updateSelection(product.id, {
                                    unitOverride: e.target.value === product.unit ? '' : e.target.value,
                                  })
                                }
                                placeholder={product.unit}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-300"
                              />
                            </div>
                          </div>

                          {/* Supplier change — only available when creating a new order */}
                          {!isAddMode && allVendors.length > 0 && (
                            <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                Change Supplier
                              </label>
                              <select
                                value={effectiveVendorId}
                                onChange={(e) => {
                                  const newId = Number(e.target.value);
                                  if (newId === product.vendor_id) {
                                    clearVendorOverride(product.id);
                                  } else {
                                    setVendorOverride(product.id, newId, vendorOv?.permanent ?? false);
                                  }
                                }}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                              >
                                {allVendors.map((v) => (
                                  <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                              </select>

                              {/* Only show save options if vendor was actually changed */}
                              {vendorOv && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setVendorOverride(product.id, vendorOv.vendorId, false)}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors ${
                                      !vendorOv.permanent
                                        ? 'bg-amber-500 text-white border-amber-500'
                                        : 'bg-white text-slate-500 border-slate-200'
                                    }`}
                                  >
                                    This order only
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setVendorOverride(product.id, vendorOv.vendorId, true)}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors ${
                                      vendorOv.permanent
                                        ? 'bg-teal-600 text-white border-teal-600'
                                        : 'bg-white text-slate-500 border-slate-200'
                                    }`}
                                  >
                                    Save permanently
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
          disabled={saving || selectedCount === 0 || (!isAddMode && !dueDate)}
          className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
            saving || selectedCount === 0 || (!isAddMode && !dueDate)
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
              {isAddMode ? 'Adding Items...' : 'Saving Draft...'}
            </span>
          ) : selectedCount === 0 ? (
            'Select Products to Continue'
          ) : !isAddMode && !dueDate ? (
            'Set Due Date to Continue'
          ) : isAddMode ? (
            `Add ${selectedCount} Item${selectedCount > 1 ? 's' : ''} to Order`
          ) : (
            `Save Draft — ${selectedCount} Item${selectedCount > 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateOrderForm;
