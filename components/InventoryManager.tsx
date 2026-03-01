import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { Order, OrderType, ORDER_TYPE_LABELS, Product, Vendor, Category } from '../inventory-types';
import {
  fetchOrders,
  fetchOrderLines,
  fetchAllProducts,
  fetchVendors,
  fetchCategories,
  createProduct,
  updateProduct,
  softDeleteProduct,
} from '../services/inventoryService';

type OrderStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'SENT';
type ActiveTab = 'orders' | 'products';
type OrderTypeFilter = 'ALL' | OrderType;

interface Props {
  user: User;
  onCreateOrder: (orderType: OrderType) => void;
  onViewOrder: (order: Order) => void;
  onBack: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  SENT: 'bg-blue-100 text-blue-700',
};

const ORDER_TYPE_COLORS: Record<string, string> = {
  WEEKLY_FOOD: 'bg-teal-100 text-teal-700',
  BAR: 'bg-purple-100 text-purple-700',
  IBG: 'bg-indigo-100 text-indigo-700',
};

const ORDER_TYPE_ICONS: Record<string, string> = {
  WEEKLY_FOOD: '🥦',
  BAR: '🍺',
  IBG: '🏮',
};

interface ProductFormState {
  name: string;
  category_id: string;
  vendor_id: string;
  unit: string;
  notes: string;
}

const EMPTY_FORM: ProductFormState = { name: '', category_id: '', vendor_id: '', unit: '', notes: '' };

const InventoryManager: React.FC<Props> = ({ user, onCreateOrder, onViewOrder, onBack }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('orders');

  // ── Orders tab state ──────────────────────────────────────────────────────
  const [orders, setOrders] = useState<(Order & { line_count?: number })[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('ALL');
  const [showTypePickerFor, setShowTypePickerFor] = useState(false);

  // ── Products tab state ────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState<string | null>(null);
  const [prodSearch, setProdSearch] = useState('');
  const [prodTypeFilter, setProdTypeFilter] = useState<OrderTypeFilter>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<ProductFormState>(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ProductFormState>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Load orders ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const data = await fetchOrders();
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
      setOrdersError(e.message ?? 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  // ── Load products (lazy, only when tab activated) ─────────────────────────
  useEffect(() => {
    if (activeTab === 'products' && products.length === 0 && !prodLoading) {
      loadProducts();
    }
  }, [activeTab]);

  const loadProducts = async () => {
    setProdLoading(true);
    setProdError(null);
    try {
      const [prods, vends, cats] = await Promise.all([
        fetchAllProducts(),
        fetchVendors(),
        fetchCategories(),
      ]);
      setProducts(prods);
      setVendors(vends);
      setCategories(cats);
    } catch (e: any) {
      setProdError(e.message ?? 'Failed to load products');
    } finally {
      setProdLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ── Filtered orders ────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    if (typeFilter === 'ALL') return true;
    const t = o.order_type ?? 'WEEKLY_FOOD';
    return t === typeFilter;
  });

  // ── New order handler ──────────────────────────────────────────────────────
  const handleNewOrder = () => {
    if (typeFilter !== 'ALL') {
      onCreateOrder(typeFilter as OrderType);
    } else {
      setShowTypePickerFor(true);
    }
  };

  // ── Product handlers ───────────────────────────────────────────────────────
  const handleAddProduct = async () => {
    if (!addForm.name.trim()) { setAddError('Product name is required.'); return; }
    if (!addForm.category_id) { setAddError('Category is required.'); return; }
    if (!addForm.vendor_id) { setAddError('Vendor is required.'); return; }
    if (!addForm.unit.trim()) { setAddError('Unit is required (e.g. lbs, pcs).'); return; }
    setAddSaving(true);
    setAddError(null);
    try {
      const created = await createProduct({
        name: addForm.name.trim(),
        category_id: Number(addForm.category_id),
        vendor_id: Number(addForm.vendor_id),
        unit: addForm.unit.trim(),
        notes: addForm.notes.trim() || undefined,
      });
      setProducts((prev) => [created, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAddForm(false);
      setAddForm(EMPTY_FORM);
    } catch (e: any) {
      setAddError(e.message ?? 'Failed to add product.');
    } finally {
      setAddSaving(false);
    }
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      category_id: String(p.category_id),
      vendor_id: String(p.vendor_id),
      unit: p.unit,
      notes: p.notes ?? '',
    });
    setEditError(null);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editForm.name.trim()) { setEditError('Product name is required.'); return; }
    if (!editForm.unit.trim()) { setEditError('Unit is required.'); return; }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateProduct(id, {
        name: editForm.name.trim(),
        category_id: Number(editForm.category_id),
        vendor_id: Number(editForm.vendor_id),
        unit: editForm.unit.trim(),
        notes: editForm.notes.trim() || undefined,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                name: editForm.name.trim(),
                category_id: Number(editForm.category_id),
                vendor_id: Number(editForm.vendor_id),
                unit: editForm.unit.trim(),
                notes: editForm.notes.trim() || undefined,
                categories: categories.find((c) => c.id === Number(editForm.category_id))
                  ? { name: categories.find((c) => c.id === Number(editForm.category_id))!.name }
                  : p.categories,
                vendors: vendors.find((v) => v.id === Number(editForm.vendor_id))
                  ? { name: vendors.find((v) => v.id === Number(editForm.vendor_id))!.name }
                  : p.vendors,
              }
            : p
        )
      );
      setEditingId(null);
    } catch (e: any) {
      setEditError(e.message ?? 'Failed to save.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await softDeleteProduct(id);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: false } : p))
      );
    } catch {
      // silently fail — let user retry
    } finally {
      setDeletingId(null);
    }
  };

  const handleReactivate = async (id: number) => {
    setDeletingId(id);
    try {
      await updateProduct(id, { is_active: true });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: true } : p))
      );
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProducts = products.filter((p) =>
    !prodSearch || p.name.toLowerCase().includes(prodSearch.toLowerCase())
  );

  // Build category id → order_type map for fast lookup
  const catOrderTypeMap = useMemo(() => {
    const m: Record<number, string> = {};
    categories.forEach((c) => { m[c.id] = c.order_type ?? 'WEEKLY_FOOD'; });
    return m;
  }, [categories]);

  // Group products: order_type → category_name → products[]
  const groupedProducts = useMemo(() => {
    const typeOrder: OrderType[] = ['WEEKLY_FOOD', 'BAR', 'IBG'];
    const groups: Record<string, { catSortOrder: number; products: Product[] }[]> = {};

    const visible = filteredProducts.filter((p) => {
      const ot = p.categories?.order_type ?? catOrderTypeMap[p.category_id] ?? 'WEEKLY_FOOD';
      return prodTypeFilter === 'ALL' || ot === prodTypeFilter;
    });

    typeOrder.forEach((ot) => {
      const forType = visible.filter((p) => {
        const pot = p.categories?.order_type ?? catOrderTypeMap[p.category_id] ?? 'WEEKLY_FOOD';
        return pot === ot;
      });
      if (forType.length === 0) return;

      // Group by category within this order type
      const byCategory: Record<string, { catSortOrder: number; products: Product[] }> = {};
      forType.forEach((p) => {
        const catName = p.categories?.name ?? 'Uncategorized';
        if (!byCategory[catName]) {
          byCategory[catName] = { catSortOrder: p.categories?.sort_order ?? 99, products: [] };
        }
        byCategory[catName].products.push(p);
      });

      groups[ot] = Object.entries(byCategory)
        .map(([, v]) => v)
        .sort((a, b) => a.catSortOrder - b.catSortOrder);
    });

    return groups;
  }, [filteredProducts, catOrderTypeMap, prodTypeFilter]);

  // Categories filtered to the current product type filter (for Add form dropdown)
  const filteredCategories = useMemo(() => {
    if (prodTypeFilter === 'ALL') return categories;
    return categories.filter((c) => (c.order_type ?? 'WEEKLY_FOOD') === prodTypeFilter);
  }, [categories, prodTypeFilter]);

  // ── Render ─────────────────────────────────────────────────────────────────
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
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
            {activeTab === 'orders' ? 'Supply Orders' : 'Product Master List'}
          </p>
        </div>
        {activeTab === 'orders' && (
          <button
            onClick={handleNewOrder}
            className="flex items-center gap-2 bg-teal-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-teal-700 active:scale-95 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Order
          </button>
        )}
        {activeTab === 'products' && (
          <button
            onClick={() => { setShowAddForm(true); setAddForm(EMPTY_FORM); setAddError(null); }}
            className="flex items-center gap-2 bg-teal-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-teal-700 active:scale-95 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Product
          </button>
        )}
      </header>

      {/* Tab switcher */}
      <div className="flex bg-white border-b border-slate-100 px-4 gap-1">
        {(['orders', 'products'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'orders' ? 'Orders' : 'Products'}
          </button>
        ))}
      </div>

      {/* ── ORDERS TAB ───────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="flex-1 p-4 space-y-3">
          {/* Order type filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['ALL', 'WEEKLY_FOOD', 'BAR', 'IBG'] as OrderTypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-colors ${
                  typeFilter === t
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t === 'ALL' ? 'All' : `${ORDER_TYPE_ICONS[t]} ${ORDER_TYPE_LABELS[t as OrderType]}`}
              </button>
            ))}
          </div>

          {/* Type picker modal (when "New Order" tapped on "All" filter) */}
          {showTypePickerFor && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowTypePickerFor(false)}>
              <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-widest text-center mb-4">Select Order Type</h2>
                {(['WEEKLY_FOOD', 'BAR', 'IBG'] as OrderType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setShowTypePickerFor(false); onCreateOrder(t); }}
                    className="w-full flex items-center gap-4 bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 rounded-2xl p-4 text-left transition-colors active:scale-[0.98]"
                  >
                    <span className="text-2xl">{ORDER_TYPE_ICONS[t]}</span>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{ORDER_TYPE_LABELS[t]}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {t === 'WEEKLY_FOOD' ? 'Food & produce orders' : t === 'BAR' ? 'Bar & beverage orders' : 'IBG direct orders'}
                      </p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-slate-300"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                ))}
                <button
                  onClick={() => setShowTypePickerFor(false)}
                  className="w-full py-3 text-slate-500 text-sm font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {ordersLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-teal-100 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-t-teal-600 rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-400 text-sm font-medium">Loading orders...</p>
            </div>
          ) : ordersError ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
              <p className="text-rose-700 font-semibold text-sm">{ordersError}</p>
              <button onClick={loadOrders} className="mt-3 text-rose-600 text-xs font-bold underline">Try again</button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>
              </div>
              <div>
                <p className="text-slate-800 font-bold text-base">
                  {typeFilter === 'ALL' ? 'No orders yet' : `No ${ORDER_TYPE_LABELS[typeFilter as OrderType]} orders`}
                </p>
                <p className="text-slate-400 text-sm mt-1">Tap "New Order" to create one</p>
              </div>
              <button
                onClick={handleNewOrder}
                className="mt-2 bg-teal-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-teal-700 transition-colors text-sm"
              >
                Create First Order
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const otype = (order.order_type ?? 'WEEKLY_FOOD') as OrderType;
              return (
                <button
                  key={order.id}
                  onClick={() => onViewOrder(order)}
                  className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {order.status}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${ORDER_TYPE_COLORS[otype] ?? 'bg-slate-100 text-slate-600'}`}>
                          {ORDER_TYPE_ICONS[otype]} {ORDER_TYPE_LABELS[otype]}
                        </span>
                      </div>
                      <p className="text-slate-800 font-bold text-sm">
                        Due: {formatDate(order.due_date)}
                      </p>
                      {order.submitted_by && (
                        <p className="text-slate-500 text-xs mt-0.5">By {order.submitted_by}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-black text-teal-600">{order.line_count ?? 0}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">items</p>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 shrink-0"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>
                  {order.notes && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      {order.notes}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider pt-1 border-t border-slate-50">
                    <span>Created {formatDate(order.created_at)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ── PRODUCTS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <div className="flex-1 p-4 space-y-3">
          {/* Order type filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['ALL', 'WEEKLY_FOOD', 'BAR', 'IBG'] as OrderTypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => { setProdTypeFilter(t); setAddForm(EMPTY_FORM); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-colors ${
                  prodTypeFilter === t
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t === 'ALL' ? 'All' : `${ORDER_TYPE_ICONS[t]} ${ORDER_TYPE_LABELS[t as OrderType]}`}
              </button>
            ))}
          </div>

          {/* Add Product form */}
          {showAddForm && (
            <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-teal-700">New Product</h3>
              {addError && (
                <p className="text-rose-600 text-xs font-semibold bg-rose-50 rounded-lg px-3 py-2">{addError}</p>
              )}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Product name *"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={addForm.category_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, category_id: e.target.value }))}
                    className="border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                  >
                    <option value="">Category *</option>
                    {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select
                    value={addForm.vendor_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, vendor_id: e.target.value }))}
                    className="border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                  >
                    <option value="">Vendor *</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Unit (e.g. lbs, pcs, bunch) *"
                  value={addForm.unit}
                  onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={addForm.notes}
                  onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddProduct}
                  disabled={addSaving}
                  className="flex-1 bg-teal-600 text-white font-black text-xs uppercase tracking-widest py-2.5 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {addSaving ? 'Saving...' : 'Add Product'}
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setAddError(null); }}
                  className="flex-1 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest py-2.5 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            placeholder="Search products..."
            value={prodSearch}
            onChange={(e) => setProdSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
          />

          {prodLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-teal-100 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-t-teal-600 rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-400 text-sm font-medium">Loading products...</p>
            </div>
          ) : prodError ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
              <p className="text-rose-700 font-semibold text-sm">{prodError}</p>
              <button onClick={loadProducts} className="mt-3 text-rose-600 text-xs font-bold underline">Try again</button>
            </div>
          ) : Object.keys(groupedProducts).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-400 text-2xl">📦</div>
              <p className="text-slate-700 font-bold text-sm">No products found</p>
              <p className="text-slate-400 text-xs">Try a different filter or add a product</p>
            </div>
          ) : (
            /* ── Grouped product list ── */
            <div className="space-y-4">
              {(['WEEKLY_FOOD', 'BAR', 'IBG'] as OrderType[])
                .filter((ot) => groupedProducts[ot]?.length)
                .map((ot) => {
                  const typeColor = {
                    WEEKLY_FOOD: { header: 'bg-teal-600', badge: 'bg-teal-100 text-teal-700', catBg: 'bg-teal-50 text-teal-600' },
                    BAR:         { header: 'bg-purple-600', badge: 'bg-purple-100 text-purple-700', catBg: 'bg-purple-50 text-purple-600' },
                    IBG:         { header: 'bg-indigo-600', badge: 'bg-indigo-100 text-indigo-700', catBg: 'bg-indigo-50 text-indigo-600' },
                  }[ot];
                  const typeLabel = {
                    WEEKLY_FOOD: 'Weekly Food Order',
                    BAR: 'Bar & Front of House',
                    IBG: 'IBG Order',
                  }[ot];

                  return (
                    <div key={ot} className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      {/* Order type header */}
                      <div className={`${typeColor.header} px-4 py-3 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{ORDER_TYPE_ICONS[ot]}</span>
                          <span className="text-white font-black text-sm uppercase tracking-widest">{typeLabel}</span>
                        </div>
                        <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider">
                          {groupedProducts[ot].reduce((sum, g) => sum + g.products.length, 0)} items
                        </span>
                      </div>

                      {/* Category groups */}
                      {groupedProducts[ot].map((catGroup, gi) => {
                        const catName = catGroup.products[0]?.categories?.name ?? 'Uncategorized';
                        return (
                          <div key={gi}>
                            {/* Category sub-header */}
                            <div className={`px-4 py-2 ${typeColor.catBg} border-y border-slate-100 flex items-center justify-between`}>
                              <span className="text-[11px] font-black uppercase tracking-widest">{catName}</span>
                              <span className="text-[10px] font-medium opacity-70">{catGroup.products.length}</span>
                            </div>
                            {/* Products in category */}
                            <div className="bg-white divide-y divide-slate-50">
                              {catGroup.products.map((p) => (
                                <div key={p.id} className={`p-4 ${!p.is_active ? 'opacity-50' : ''}`}>
                                  {editingId === p.id ? (
                                    /* ── Edit mode ── */
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                        className="w-full border border-teal-300 rounded-xl px-3 py-2 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                        <select
                                          value={editForm.category_id}
                                          onChange={(e) => setEditForm((f) => ({ ...f, category_id: e.target.value }))}
                                          className="border border-slate-200 rounded-xl px-2 py-2 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                        >
                                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <select
                                          value={editForm.vendor_id}
                                          onChange={(e) => setEditForm((f) => ({ ...f, vendor_id: e.target.value }))}
                                          className="border border-slate-200 rounded-xl px-2 py-2 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                        >
                                          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                      </div>
                                      <input
                                        type="text"
                                        value={editForm.unit}
                                        onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                                        placeholder="Unit"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                                      />
                                      <input
                                        type="text"
                                        value={editForm.notes}
                                        onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                                        placeholder="Notes (optional)"
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                                      />
                                      {editError && (
                                        <p className="text-rose-600 text-xs font-semibold">{editError}</p>
                                      )}
                                      <div className="flex gap-2 pt-1">
                                        <button
                                          onClick={() => handleSaveEdit(p.id)}
                                          disabled={editSaving}
                                          className="flex-1 bg-teal-600 text-white font-black text-xs uppercase tracking-widest py-2 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                        >
                                          {editSaving ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                          onClick={() => setEditingId(null)}
                                          className="flex-1 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest py-2 rounded-xl hover:bg-slate-200 transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* ── View mode ── */
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-800 leading-tight">{p.name}</p>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                          {p.vendors?.name && (
                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                              {p.vendors.name}
                                            </span>
                                          )}
                                          <span className="text-[10px] text-slate-400 font-medium">{p.unit}</span>
                                          {!p.is_active && (
                                            <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">
                                              Inactive
                                            </span>
                                          )}
                                        </div>
                                        {p.notes && (
                                          <p className="text-[11px] text-slate-400 mt-1">{p.notes}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          onClick={() => startEdit(p)}
                                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                          title="Edit"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        </button>
                                        {p.is_active ? (
                                          <button
                                            onClick={() => handleDelete(p.id)}
                                            disabled={deletingId === p.id}
                                            className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-40"
                                            title="Deactivate"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleReactivate(p.id)}
                                            disabled={deletingId === p.id}
                                            className="p-2 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-40"
                                            title="Reactivate"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
