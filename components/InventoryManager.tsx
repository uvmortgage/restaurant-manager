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
  deleteOrder,
  createOrder,
  createOrderLines,
} from '../services/inventoryService';

type ActiveTab = 'orders' | 'products';
type OrderTypeFilter = 'ALL' | OrderType;

interface Props {
  user: User;
  onCreateOrder: (orderType: OrderType) => void;
  onViewOrder: (order: Order, autoOpenAddItems?: boolean) => void;
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
  'IBG Products': 'bg-indigo-100 text-indigo-700',
  'IBG Crockery': 'bg-rose-100 text-rose-700',
};

const ORDER_TYPE_HEADER_COLORS: Record<string, string> = {
  WEEKLY_FOOD: 'bg-teal-600',
  BAR: 'bg-purple-600',
  'IBG Products': 'bg-indigo-600',
  'IBG Crockery': 'bg-rose-600',
};

const ORDER_TYPE_BADGE_COLORS: Record<string, string> = {
  WEEKLY_FOOD: 'bg-teal-100 text-teal-700',
  BAR: 'bg-purple-100 text-purple-700',
  'IBG Products': 'bg-indigo-100 text-indigo-700',
};

const ORDER_TYPE_ICONS: Record<string, string> = {
  WEEKLY_FOOD: '🥦',
  BAR: '🍺',
  'IBG Products': '🏮',
  'IBG Crockery': '🍽️',
};

interface ProductFormState {
  name: string;
  category_id: string;
  vendor_id: string;
  unit: string;
  notes: string;
  min_order: string;
}

const EMPTY_FORM: ProductFormState = { name: '', category_id: '', vendor_id: '', unit: '', notes: '', min_order: '' };

// ── IBG Brand Header ──────────────────────────────────────────────────────────
const BrandHeader: React.FC<{ onBack: () => void; title: string; subtitle?: string; action?: React.ReactNode }> = ({
  onBack, title, subtitle, action,
}) => (
  <header className="flex items-center gap-3 px-4 py-3 bg-ibg-600 sticky top-0 z-20 shadow-md">
    <button
      onClick={onBack}
      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors shrink-0 border border-white/20"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
    </button>
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
        <rect x="14" y="2" width="5" height="11" rx="2.5" fill="white" fillOpacity="0.95" />
        <rect x="14" y="15" width="5" height="11" rx="2.5" fill="white" fillOpacity="0.8" />
        <rect x="14" y="28" width="5" height="10" rx="2.5" fill="white" fillOpacity="0.95" />
        <rect x="11" y="12" width="11" height="3.5" rx="1.75" fill="white" fillOpacity="0.5" />
        <rect x="11" y="25" width="11" height="3.5" rx="1.75" fill="white" fillOpacity="0.5" />
        <path d="M19 7.5 Q28 3 26 13 Q21 9 19 7.5Z" fill="white" fillOpacity="0.65" />
        <path d="M14 21 Q5 16 7 27 Q12 23 14 21Z" fill="white" fillOpacity="0.65" />
      </svg>
      <div className="min-w-0">
        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest leading-none">Inchin's Bamboo Garden</p>
        <h1 className="text-white font-black text-lg leading-tight truncate">{title}</h1>
      </div>
    </div>
    {subtitle && <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider shrink-0">{subtitle}</span>}
    {action}
  </header>
);

const InventoryManager: React.FC<Props> = ({ user, onCreateOrder, onViewOrder, onBack }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('orders');

  // ── Orders tab state ──────────────────────────────────────────────────────
  const [orders, setOrders] = useState<(Order & { line_count?: number })[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('ALL');
  const [showTypePickerFor, setShowTypePickerFor] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<number | null>(null);
  const [deleteOrderError, setDeleteOrderError] = useState<string | null>(null);
  const [duplicatingOrderId, setDuplicatingOrderId] = useState<number | null>(null);

  // ── Products tab state ────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState<string | null>(null);
  const [prodSearch, setProdSearch] = useState('');
  const [prodTypeFilter, setProdTypeFilter] = useState<OrderTypeFilter>('ALL');
  const [prodCategoryFilter, setProdCategoryFilter] = useState<number | 'ALL'>('ALL');
  const [prodVendorFilter, setProdVendorFilter] = useState<number | 'ALL'>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<ProductFormState>(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ProductFormState>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Bulk edit state (desktop only) ───────────────────────────────────────
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
  const [bulkEdits, setBulkEdits] = useState<Record<number, ProductFormState>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSaveResults, setBulkSaveResults] = useState<{ saved: number; failed: number } | null>(null);

  // ── Load orders ────────────────────────────────────────────────────────────
  useEffect(() => { loadOrders(); }, []);

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

  const handleDuplicateOrder = async (order: Order) => {
    setDuplicatingOrderId(Number(order.id));
    setOrdersError(null);
    try {
      const lines = await fetchOrderLines(Number(order.id));
      const d = new Date(); d.setDate(d.getDate() + 2);
      const newOrder = await createOrder({
        due_date: d.toISOString().split('T')[0],
        submitted_by: user.name,
        status: 'DRAFT',
        order_type: (order.order_type ?? 'WEEKLY_FOOD') as OrderType,
        notes: order.notes,
      });
      if (lines.length > 0) {
        await createOrderLines(
          lines.map((l) => ({
            order_id: newOrder.id,
            product_id: l.product_id,
            qty_ordered: l.qty_ordered,
            unit: l.unit,
            notes: l.notes,
          }))
        );
      }
      onViewOrder({ ...newOrder, line_count: lines.length }, true);
    } catch (e: any) {
      setOrdersError(e.message ?? 'Failed to duplicate order');
    } finally {
      setDuplicatingOrderId(null);
    }
  };

  // ── Load products (lazy) ───────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'products' && products.length === 0 && !prodLoading) {
      loadProducts();
    }
  }, [activeTab]);

  const loadProducts = async () => {
    setProdLoading(true);
    setProdError(null);
    try {
      const [prods, vends, cats] = await Promise.all([fetchAllProducts(), fetchVendors(), fetchCategories()]);
      setProducts(prods);
      setVendors(vends);
      setCategories(cats);
    } catch (e: any) {
      setProdError(e.message ?? 'Failed to load products');
    } finally {
      setProdLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    setDeletingOrderId(orderId);
    setConfirmDeleteOrderId(null);
    setDeleteOrderError(null);
    try {
      await deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => Number(o.id) !== orderId));
    } catch (e: any) {
      setDeleteOrderError(e.message ?? 'Failed to delete order');
    } finally {
      setDeletingOrderId(null);
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
    return (o.order_type ?? 'WEEKLY_FOOD') === typeFilter;
  });

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
        min_order: addForm.min_order ? Number(addForm.min_order) : undefined,
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
      min_order: p.min_order?.toString() ?? '',
    });
    setEditError(null);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editForm.name.trim()) { setEditError('Name is required.'); return; }
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
        min_order: editForm.min_order ? Number(editForm.min_order) : undefined,
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
              min_order: editForm.min_order ? Number(editForm.min_order) : undefined,
              categories: categories.find((c) => c.id === Number(editForm.category_id))
                ? { name: categories.find((c) => c.id === Number(editForm.category_id))!.name, order_type: categories.find((c) => c.id === Number(editForm.category_id))!.order_type }
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
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: false } : p)));
    } catch { /* silently fail */ } finally {
      setDeletingId(null);
    }
  };

  const handleReactivate = async (id: number) => {
    setDeletingId(id);
    try {
      await updateProduct(id, { is_active: true });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: true } : p)));
    } catch { /* silently fail */ } finally {
      setDeletingId(null);
    }
  };

  // ── Bulk edit handlers ────────────────────────────────────────────────────
  const toggleBulkEditMode = () => {
    setBulkEditMode((v) => !v);
    setBulkSelected(new Set());
    setBulkEdits({});
    setBulkError(null);
    setBulkSaveResults(null);
    setEditingId(null);
  };

  const toggleBulkSelect = (p: Product) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
        setBulkEdits((e) => { const n = { ...e }; delete n[p.id]; return n; });
      } else {
        next.add(p.id);
        setBulkEdits((e) => ({
          ...e,
          [p.id]: {
            name: p.name,
            category_id: String(p.category_id),
            vendor_id: String(p.vendor_id),
            unit: p.unit,
            notes: p.notes ?? '',
            min_order: p.min_order?.toString() ?? '',
          },
        }));
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    const newEdits: Record<number, ProductFormState> = { ...bulkEdits };
    const newSelected = new Set<number>(bulkSelected);
    filteredProducts.forEach((p) => {
      if (!newSelected.has(p.id)) {
        newSelected.add(p.id);
        newEdits[p.id] = {
          name: p.name,
          category_id: String(p.category_id),
          vendor_id: String(p.vendor_id),
          unit: p.unit,
          notes: p.notes ?? '',
          min_order: p.min_order?.toString() ?? '',
        };
      }
    });
    setBulkSelected(newSelected);
    setBulkEdits(newEdits);
  };

  const updateBulkEdit = (id: number, field: keyof ProductFormState, value: string) => {
    setBulkEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSaveBulk = async () => {
    setBulkSaving(true);
    setBulkError(null);
    setBulkSaveResults(null);
    let saved = 0;
    let failed = 0;
    const results = await Promise.allSettled(
      Array.from(bulkSelected).map(async (id: unknown) => {
        const numId = id as number;
        const form = bulkEdits[numId];
        if (!form) return;
        await updateProduct(numId, {
          name: form.name.trim(),
          category_id: Number(form.category_id),
          vendor_id: Number(form.vendor_id),
          unit: form.unit.trim(),
          notes: form.notes.trim() || undefined,
          min_order: form.min_order ? Number(form.min_order) : undefined,
        });
        return id;
      })
    );
    results.forEach((r) => (r.status === 'fulfilled' ? saved++ : failed++));

    // Refresh local product list from successful saves
    setProducts((prev) =>
      prev.map((p) => {
        if (!bulkSelected.has(p.id)) return p;
        const form = bulkEdits[p.id];
        if (!form) return p;
        return {
          ...p,
          name: form.name.trim(),
          category_id: Number(form.category_id),
          vendor_id: Number(form.vendor_id),
          unit: form.unit.trim(),
          notes: form.notes.trim() || undefined,
          categories: categories.find((c) => c.id === Number(form.category_id))
            ? { name: categories.find((c) => c.id === Number(form.category_id))!.name, order_type: categories.find((c) => c.id === Number(form.category_id))!.order_type }
            : p.categories,
          vendors: vendors.find((v) => v.id === Number(form.vendor_id))
            ? { name: vendors.find((v) => v.id === Number(form.vendor_id))!.name }
            : p.vendors,
        };
      })
    );

    setBulkSaveResults({ saved, failed });
    if (failed === 0) {
      setBulkSelected(new Set());
      setBulkEdits({});
      setBulkEditMode(false);
    } else {
      setBulkError(`${failed} product(s) failed to save. Please retry.`);
    }
    setBulkSaving(false);
  };

  // ── Computed: category order_type map ──────────────────────────────────────
  const catOrderTypeMap = useMemo(() => {
    const m: Record<number, string> = {};
    categories.forEach((c) => { m[c.id] = c.order_type ?? 'WEEKLY_FOOD'; });
    return m;
  }, [categories]);

  // ── Vendors filtered by current type selection ─────────────────────────────
  const vendorsForType = useMemo(() => {
    if (prodTypeFilter === 'ALL') return vendors;
    const ids = new Set(
      products
        .filter((p) => {
          const ot = p.categories?.order_type ?? catOrderTypeMap[p.category_id] ?? 'WEEKLY_FOOD';
          return ot === prodTypeFilter;
        })
        .map((p) => p.vendor_id)
    );
    return vendors.filter((v) => ids.has(v.id));
  }, [vendors, products, prodTypeFilter, catOrderTypeMap]);

  // ── Categories filtered for current type filter ────────────────────────────
  const categoryPills = useMemo(() => {
    if (prodTypeFilter === 'ALL') return categories;
    return categories.filter((c) => (c.order_type ?? 'WEEKLY_FOOD') === prodTypeFilter);
  }, [categories, prodTypeFilter]);

  // ── Filtered product list ──────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    if (prodSearch && !p.name.toLowerCase().includes(prodSearch.toLowerCase())) return false;
    if (prodCategoryFilter !== 'ALL' && p.category_id !== prodCategoryFilter) return false;
    if (prodVendorFilter !== 'ALL' && p.vendor_id !== prodVendorFilter) return false;
    if (prodTypeFilter !== 'ALL') {
      const ot = p.categories?.order_type ?? catOrderTypeMap[p.category_id] ?? 'WEEKLY_FOOD';
      if (ot !== prodTypeFilter) return false;
    }
    return true;
  });

  // ── Group products: order_type → {catSortOrder, products[]} ───────────────
  const groupedProducts = useMemo(() => {
    const typeOrder: OrderType[] = ['WEEKLY_FOOD', 'BAR', 'IBG Products', 'IBG Crockery'];
    const groups: Record<string, { catName: string; catSortOrder: number; products: Product[] }[]> = {};

    typeOrder.forEach((ot) => {
      const forType = filteredProducts.filter((p) => {
        const pot = p.categories?.order_type ?? catOrderTypeMap[p.category_id] ?? 'WEEKLY_FOOD';
        return pot === ot;
      });
      if (forType.length === 0) return;

      const byCategory: Record<string, { catName: string; catSortOrder: number; products: Product[] }> = {};
      forType.forEach((p) => {
        const catName = p.categories?.name ?? 'Uncategorized';
        if (!byCategory[catName]) {
          byCategory[catName] = { catName, catSortOrder: p.categories?.sort_order ?? 99, products: [] };
        }
        byCategory[catName].products.push(p);
      });

      groups[ot] = Object.values(byCategory).sort((a, b) => a.catSortOrder - b.catSortOrder);
    });

    return groups;
  }, [filteredProducts, catOrderTypeMap]);

  const totalFilteredCount = filteredProducts.length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 animate-fadeIn flex flex-col">
      <BrandHeader
        onBack={onBack}
        title="Inventory Manager"
        subtitle={activeTab === 'orders' ? `${filteredOrders.length} orders` : `${totalFilteredCount} products`}
        action={
          activeTab === 'orders' ? (
            <button
              onClick={() => {
                if (typeFilter !== 'ALL') { onCreateOrder(typeFilter as OrderType); }
                else { setShowTypePickerFor(true); }
              }}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-xl transition-colors border border-white/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Order
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleBulkEditMode}
                className={`hidden lg:flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-xl transition-colors border ${bulkEditMode
                  ? 'bg-amber-400 text-amber-900 hover:bg-amber-300 border-amber-300'
                  : 'bg-white/20 hover:bg-white/30 text-white border-white/20'
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                {bulkEditMode ? 'Exit Bulk' : 'Bulk Edit'}
              </button>
              <button
                onClick={() => { setShowAddForm((v) => !v); setAddError(null); }}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-xl transition-colors border border-white/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Add Product
              </button>
            </div>
          )
        }
      />

      {/* Tab Bar */}
      <div className="flex bg-white border-b border-slate-100 px-4 gap-1 shrink-0">
        {(['orders', 'products'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-5 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === tab
              ? 'border-ibg-600 text-ibg-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
          >
            {tab === 'orders' ? 'Orders' : 'Products'}
          </button>
        ))}
      </div>

      {/* ── ORDERS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="flex-1">
          {/* Type filter */}
          <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto bg-white border-b border-slate-50">
            {(['ALL', 'WEEKLY_FOOD', 'BAR', 'IBG Products', 'IBG Crockery'] as OrderTypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-colors ${typeFilter === t
                  ? 'bg-ibg-600 text-white border-ibg-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
              >
                {t === 'ALL' ? 'All Orders' : `${ORDER_TYPE_ICONS[t]} ${ORDER_TYPE_LABELS[t as OrderType]}`}
              </button>
            ))}
          </div>

          {/* Type picker modal */}
          {showTypePickerFor && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowTypePickerFor(false)}>
              <div className="w-full max-w-2xl bg-white rounded-t-3xl p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-ibg-600 rounded-full"></div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">Select Order Type</h2>
                </div>
                {(['WEEKLY_FOOD', 'BAR', 'IBG Products', 'IBG Crockery'] as OrderType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setShowTypePickerFor(false); onCreateOrder(t); }}
                    className="w-full flex items-center gap-4 bg-slate-50 hover:bg-ibg-50 border border-slate-100 hover:border-ibg-200 rounded-2xl p-4 text-left transition-colors active:scale-[0.98]"
                  >
                    <span className="text-2xl">{ORDER_TYPE_ICONS[t]}</span>
                    <div className="flex-1">
                      <p className="font-black text-slate-800 text-sm">{ORDER_TYPE_LABELS[t]}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                        {t === 'WEEKLY_FOOD' ? 'Food & produce orders' : t === 'BAR' ? 'Bar & beverage orders' : t === 'IBG Products' ? 'IBG direct orders' : 'IBG glassware & crockery orders'}
                      </p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                ))}
                <button onClick={() => setShowTypePickerFor(false)} className="w-full py-3 text-slate-500 text-sm font-bold">Cancel</button>
              </div>
            </div>
          )}

          <div className="p-4 lg:p-6">
            {deleteOrderError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 mb-4 flex items-center justify-between gap-2">
                <p className="text-rose-700 font-semibold text-xs">{deleteOrderError}</p>
                <button onClick={() => setDeleteOrderError(null)} className="text-rose-400 hover:text-rose-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            )}

            {ordersLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-ibg-100 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-t-ibg-600 rounded-full animate-spin"></div>
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
                <div className="w-16 h-16 bg-ibg-50 rounded-2xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#952D34" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6" /><path d="M9 16h4" /></svg>
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-base">
                    {typeFilter === 'ALL' ? 'No orders yet' : `No ${ORDER_TYPE_LABELS[typeFilter as OrderType]} orders`}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">Create your first order to get started</p>
                </div>
                <button
                  onClick={() => typeFilter !== 'ALL' ? onCreateOrder(typeFilter as OrderType) : setShowTypePickerFor(true)}
                  className="bg-ibg-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-ibg-700 transition-colors text-sm"
                >
                  Create Order
                </button>
              </div>
            ) : (
              /* Desktop: wider grid; Mobile: single column */
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {filteredOrders.map((order) => {
                  const otype = (order.order_type ?? 'WEEKLY_FOOD') as OrderType;
                  const orderId = Number(order.id);
                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <button
                        onClick={() => onViewOrder(order)}
                        className="w-full text-left p-4 hover:bg-slate-50 active:scale-[0.99] transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                {order.status}
                              </span>
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${ORDER_TYPE_COLORS[otype] ?? 'bg-slate-100 text-slate-600'}`}>
                                {ORDER_TYPE_ICONS[otype]} {ORDER_TYPE_LABELS[otype]}
                              </span>
                            </div>
                            <p className="text-slate-800 font-bold text-sm">Due: {formatDate(order.due_date)}</p>
                            {order.submitted_by && (
                              <p className="text-slate-400 text-xs mt-0.5">By {order.submitted_by}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-2xl font-black text-ibg-600">{order.line_count ?? 0}</p>
                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">items</p>
                          </div>
                        </div>
                        {order.notes && (
                          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 mb-2">{order.notes}</p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider pt-2 border-t border-slate-50">
                          <span>Created {formatDate(order.created_at)}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="m9 18 6-6-6-6" /></svg>
                        </div>
                      </button>

                      <div className="border-t border-slate-50 px-4 py-2 flex justify-between gap-3 min-h-[44px]">
                        {confirmDeleteOrderId === orderId && user.role === 'Owner' ? (
                          <div className="flex items-center gap-2 justify-end w-full">
                            <span className="text-[11px] text-slate-500 font-semibold">Delete this order?</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteOrder(orderId); }}
                              disabled={deletingOrderId === orderId}
                              className="text-[11px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 disabled:opacity-40 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              {deletingOrderId === orderId ? 'Deleting...' : 'Yes, delete'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteOrderId(null); }}
                              className="text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center w-full justify-end gap-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateOrder(order);
                              }}
                              disabled={duplicatingOrderId === orderId}
                              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-ibg-600 hover:bg-ibg-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                              {duplicatingOrderId === orderId ? 'Copying...' : 'Duplicate'}
                            </button>

                            {user.role === 'Owner' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteOrderId(orderId); }}
                                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PRODUCTS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* ── Sidebar: filters + search (desktop left panel) ── */}
          <div className="bg-white border-b lg:border-b-0 lg:border-r border-slate-100 lg:w-72 xl:w-80 lg:shrink-0 lg:sticky lg:top-[120px] lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Search */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Search</label>
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input
                    type="text"
                    placeholder="Product name..."
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400 bg-white"
                  />
                  {prodSearch && (
                    <button onClick={() => setProdSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Order Type Filter */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Order Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['ALL', 'WEEKLY_FOOD', 'BAR', 'IBG Products', 'IBG Crockery'] as OrderTypeFilter[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setProdTypeFilter(t); setProdCategoryFilter('ALL'); setProdVendorFilter('ALL'); }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-colors ${prodTypeFilter === t
                        ? 'bg-ibg-600 text-white border-ibg-600'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      {t === 'ALL' ? 'All' : `${ORDER_TYPE_ICONS[t]} ${ORDER_TYPE_LABELS[t as OrderType]}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vendor Filter — scoped to selected order type */}
              {vendorsForType.length > 0 && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                    Vendor
                    {prodTypeFilter !== 'ALL' && (
                      <span className="ml-1 text-ibg-400 normal-case font-medium">(filtered)</span>
                    )}
                  </label>
                  <select
                    value={prodVendorFilter}
                    onChange={(e) => setProdVendorFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400 bg-white"
                  >
                    <option value="ALL">All Vendors</option>
                    {vendorsForType.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Filter */}
              {categoryPills.length > 0 && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setProdCategoryFilter('ALL')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-colors ${prodCategoryFilter === 'ALL'
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      All
                    </button>
                    {categoryPills.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setProdCategoryFilter(c.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-colors ${prodCategoryFilter === c.id
                          ? 'bg-slate-700 text-white border-slate-700'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active filter summary */}
              {(prodSearch || prodTypeFilter !== 'ALL' || prodCategoryFilter !== 'ALL' || prodVendorFilter !== 'ALL') && (
                <button
                  onClick={() => { setProdSearch(''); setProdTypeFilter('ALL'); setProdCategoryFilter('ALL'); setProdVendorFilter('ALL'); }}
                  className="w-full text-[11px] font-bold text-ibg-600 hover:text-ibg-700 py-2 border border-ibg-200 rounded-xl hover:bg-ibg-50 transition-colors"
                >
                  Clear all filters
                </button>
              )}

              {/* Bulk Edit panel (desktop only) */}
              {bulkEditMode && (
                <div className="hidden lg:block mt-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Bulk Edit Mode</p>
                  <p className="text-[11px] text-amber-600 font-medium">Check products in the list to edit them simultaneously. Changes save when you click "Save Changes".</p>
                  {bulkSelected.size > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-800">{bulkSelected.size} selected</span>
                        <button
                          onClick={() => { setBulkSelected(new Set()); setBulkEdits({}); }}
                          className="text-[10px] font-bold text-amber-600 hover:text-amber-800 underline"
                        >
                          Clear
                        </button>
                      </div>
                      <button
                        onClick={handleSaveBulk}
                        disabled={bulkSaving}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] uppercase tracking-widest py-2.5 rounded-xl disabled:opacity-50 transition-colors"
                      >
                        {bulkSaving ? 'Saving...' : `Save ${bulkSelected.size} Product${bulkSelected.size !== 1 ? 's' : ''}`}
                      </button>
                      {bulkError && (
                        <p className="text-[11px] text-rose-600 font-semibold">{bulkError}</p>
                      )}
                      {bulkSaveResults && bulkSaveResults.saved > 0 && (
                        <p className="text-[11px] text-emerald-700 font-semibold">✓ {bulkSaveResults.saved} saved</p>
                      )}
                    </div>
                  )}
                  <button
                    onClick={selectAllVisible}
                    className="w-full text-[10px] font-bold text-amber-700 hover:text-amber-900 py-1.5 border border-amber-300 rounded-xl hover:bg-amber-100 transition-colors"
                  >
                    Select all visible ({filteredProducts.length})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Main product area ── */}
          <div className="flex-1 p-4 lg:p-6 min-w-0">
            {/* Add Product Form */}
            {showAddForm && (
              <div className="bg-white rounded-2xl border-2 border-ibg-200 shadow-sm p-5 mb-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-ibg-600 rounded-full"></div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-ibg-700">Add New Product</h3>
                </div>
                {addError && (
                  <p className="text-rose-600 text-xs font-semibold bg-rose-50 rounded-xl px-4 py-2.5 border border-rose-100">{addError}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Name *</label>
                    <input
                      type="text"
                      placeholder="Product name"
                      value={addForm.name}
                      onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Category *</label>
                    <select
                      value={addForm.category_id}
                      onChange={(e) => setAddForm((f) => ({ ...f, category_id: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400 bg-white"
                    >
                      <option value="">Select category</option>
                      {(prodTypeFilter === 'ALL' ? categories : categoryPills).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                      Vendor *
                      {prodTypeFilter !== 'ALL' && <span className="ml-1 text-ibg-400 normal-case font-medium">(filtered)</span>}
                    </label>
                    <select
                      value={addForm.vendor_id}
                      onChange={(e) => setAddForm((f) => ({ ...f, vendor_id: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400 bg-white"
                    >
                      <option value="">Select vendor</option>
                      {vendorsForType.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Unit *</label>
                    <input
                      type="text"
                      placeholder="e.g. lbs, pcs, case"
                      value={addForm.unit}
                      onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Min Order</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Optional"
                      value={addForm.min_order}
                      onChange={(e) => setAddForm((f) => ({ ...f, min_order: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Notes (optional)</label>
                    <input
                      type="text"
                      placeholder="Additional notes"
                      value={addForm.notes}
                      onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleAddProduct}
                    disabled={addSaving}
                    className="flex-1 bg-ibg-600 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl hover:bg-ibg-700 disabled:opacity-50 transition-colors"
                  >
                    {addSaving ? 'Saving...' : 'Save Product'}
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setAddError(null); setAddForm(EMPTY_FORM); }}
                    className="flex-1 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest py-3 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Loading / Error / Empty */}
            {prodLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-ibg-100 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-t-ibg-600 rounded-full animate-spin"></div>
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
                <div className="w-14 h-14 bg-ibg-50 rounded-2xl flex items-center justify-center text-2xl">📦</div>
                <p className="text-slate-700 font-bold text-sm">No products found</p>
                <p className="text-slate-400 text-xs">Try a different filter or add a new product</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(['WEEKLY_FOOD', 'BAR', 'IBG Products', 'IBG Crockery'] as OrderType[])
                  .filter((ot) => groupedProducts[ot]?.length)
                  .map((ot) => {
                    const headerCls = ORDER_TYPE_HEADER_COLORS[ot];
                    const badgeCls = ORDER_TYPE_BADGE_COLORS[ot];
                    const typeLabel = { WEEKLY_FOOD: 'Weekly Food', BAR: 'Bar & Front of House', 'IBG Products': 'IBG Order', 'IBG Crockery': 'IBG Crockery' }[ot];

                    return (
                      <div key={ot} className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {/* Section header */}
                        <div className={`${headerCls} px-4 py-3 flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{ORDER_TYPE_ICONS[ot]}</span>
                            <span className="text-white font-black text-sm uppercase tracking-widest">{typeLabel}</span>
                          </div>
                          <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider">
                            {groupedProducts[ot].reduce((sum, g) => sum + g.products.length, 0)} items
                          </span>
                        </div>

                        {/* ── Desktop: table layout | Mobile: card rows ── */}
                        <div className="bg-white">
                          {/* Desktop column headers */}
                          <div className={`hidden lg:grid gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 ${bulkEditMode ? 'lg:grid-cols-[28px,1fr,160px,160px,80px,100px]' : 'lg:grid-cols-[1fr,160px,160px,80px,100px]'}`}>
                            {bulkEditMode && (
                              <button
                                onClick={selectAllVisible}
                                title="Select all visible"
                                className="flex items-center justify-center text-amber-500 hover:text-amber-700 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                              </button>
                            )}
                            <span>Product</span>
                            <span>Vendor</span>
                            <span>Category</span>
                            <span>Unit</span>
                            <span className="text-right">Actions</span>
                          </div>

                          {groupedProducts[ot].map((catGroup) => (
                            <div key={catGroup.catName}>
                              {/* Category sub-header (mobile only) */}
                              <div className={`lg:hidden px-4 py-2 ${badgeCls.replace('bg-', 'bg-').replace('text-', '')} bg-opacity-20 border-y border-slate-100 flex items-center justify-between`}
                                style={{ backgroundColor: ot === 'WEEKLY_FOOD' ? '#f0fdfa' : ot === 'BAR' ? '#faf5ff' : '#eef2ff' }}>
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">{catGroup.catName}</span>
                                <span className="text-[10px] font-medium text-slate-400">{catGroup.products.length}</span>
                              </div>
                              {/* Desktop: show category as a label in the row */}

                              <div className="divide-y divide-slate-50">
                                {catGroup.products.map((p) => (
                                  <div key={p.id} className={`${!p.is_active ? 'opacity-50' : ''}`}>
                                    {editingId === p.id ? (
                                      /* ── Edit Mode ── */
                                      <div className="p-4 bg-ibg-50/30 border-l-4 border-ibg-400">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-ibg-600 mb-3">Editing: {p.name}</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                                          <div className="sm:col-span-2 lg:col-span-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Name *</label>
                                            <input
                                              type="text"
                                              value={editForm.name}
                                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                              className="w-full border border-ibg-200 rounded-xl px-3 py-2 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Category</label>
                                            <select
                                              value={editForm.category_id}
                                              onChange={(e) => setEditForm((f) => ({ ...f, category_id: e.target.value }))}
                                              className="w-full border border-slate-200 rounded-xl px-2 py-2 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400 bg-white"
                                            >
                                              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Vendor</label>
                                            <select
                                              value={editForm.vendor_id}
                                              onChange={(e) => setEditForm((f) => ({ ...f, vendor_id: e.target.value }))}
                                              className="w-full border border-slate-200 rounded-xl px-2 py-2 text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400 bg-white"
                                            >
                                              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Unit</label>
                                            <input
                                              type="text"
                                              value={editForm.unit}
                                              onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                                              className="w-full border border-slate-200 rounded-xl px-2 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Min Order</label>
                                            <input
                                              type="number"
                                              min="0"
                                              step="any"
                                              value={editForm.min_order}
                                              onChange={(e) => setEditForm((f) => ({ ...f, min_order: e.target.value }))}
                                              placeholder="Optional"
                                              className="w-full border border-slate-200 rounded-xl px-2 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400"
                                            />
                                          </div>
                                        </div>
                                        <div className="mb-3">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Notes</label>
                                          <input
                                            type="text"
                                            value={editForm.notes}
                                            onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                                            placeholder="Optional notes"
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400"
                                          />
                                        </div>
                                        {editError && (
                                          <p className="text-rose-600 text-xs font-semibold mb-2">{editError}</p>
                                        )}
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleSaveEdit(p.id)}
                                            disabled={editSaving}
                                            className="flex-1 bg-ibg-600 text-white font-black text-xs uppercase tracking-widest py-2.5 rounded-xl hover:bg-ibg-700 disabled:opacity-50 transition-colors"
                                          >
                                            {editSaving ? 'Saving...' : 'Save Changes'}
                                          </button>
                                          <button
                                            onClick={() => setEditingId(null)}
                                            className="flex-1 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest py-2.5 rounded-xl hover:bg-slate-200 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* ── View Mode ── */
                                      <>
                                        {/* Mobile view */}
                                        <div className="lg:hidden flex items-start gap-3 p-4">
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
                                                <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">Inactive</span>
                                              )}
                                            </div>
                                            {p.notes && <p className="text-[11px] text-slate-400 mt-1">{p.notes}</p>}
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => startEdit(p)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Edit">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            </button>
                                            {p.is_active ? (
                                              <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-40" title="Deactivate">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                              </button>
                                            ) : (
                                              <button onClick={() => handleReactivate(p.id)} disabled={deletingId === p.id} className="p-2 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-40" title="Reactivate">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Desktop table row */}
                                        {bulkEditMode && bulkSelected.has(p.id) ? (
                                          /* ── Bulk Edit Row ── */
                                          <div className={`hidden lg:grid gap-2 items-start px-4 py-2.5 bg-amber-50/50 border-l-2 border-amber-400 ${bulkEditMode ? 'lg:grid-cols-[28px,1fr,160px,160px,80px,100px]' : 'lg:grid-cols-[1fr,160px,160px,80px,100px]'}`}>
                                            <div className="flex items-center justify-center pt-2">
                                              <input
                                                type="checkbox"
                                                checked
                                                onChange={() => toggleBulkSelect(p)}
                                                className="w-4 h-4 accent-amber-500 cursor-pointer"
                                              />
                                            </div>
                                            <input
                                              type="text"
                                              value={bulkEdits[p.id]?.name ?? p.name}
                                              onChange={(e) => updateBulkEdit(p.id, 'name', e.target.value)}
                                              className="border border-amber-300 rounded-lg px-2 py-1.5 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white w-full"
                                              placeholder="Name"
                                            />
                                            <select
                                              value={bulkEdits[p.id]?.vendor_id ?? String(p.vendor_id)}
                                              onChange={(e) => updateBulkEdit(p.id, 'vendor_id', e.target.value)}
                                              className="border border-amber-300 rounded-lg px-2 py-1.5 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white w-full"
                                            >
                                              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                            <select
                                              value={bulkEdits[p.id]?.category_id ?? String(p.category_id)}
                                              onChange={(e) => updateBulkEdit(p.id, 'category_id', e.target.value)}
                                              className="border border-amber-300 rounded-lg px-2 py-1.5 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white w-full"
                                            >
                                              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            <input
                                              type="text"
                                              value={bulkEdits[p.id]?.unit ?? p.unit}
                                              onChange={(e) => updateBulkEdit(p.id, 'unit', e.target.value)}
                                              className="border border-amber-300 rounded-lg px-2 py-1.5 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white w-full"
                                              placeholder="Unit"
                                            />
                                            <div className="flex items-center justify-end gap-1 pt-1">
                                              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">editing</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className={`hidden lg:grid gap-3 items-center px-4 py-3 hover:bg-slate-50 transition-colors ${bulkEditMode ? 'lg:grid-cols-[28px,1fr,160px,160px,80px,100px]' : 'lg:grid-cols-[1fr,160px,160px,80px,100px]'}`}>
                                            {bulkEditMode && (
                                              <div className="flex items-center justify-center">
                                                <input
                                                  type="checkbox"
                                                  checked={bulkSelected.has(p.id)}
                                                  onChange={() => toggleBulkSelect(p)}
                                                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                                                />
                                              </div>
                                            )}
                                            <div className="min-w-0">
                                              <p className="font-semibold text-sm text-slate-800 truncate">{p.name}</p>
                                              {p.notes && <p className="text-[11px] text-slate-400 truncate">{p.notes}</p>}
                                              {!p.is_active && (
                                                <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">Inactive</span>
                                              )}
                                            </div>
                                            <div className="truncate">
                                              <span className="text-xs font-semibold text-slate-600">{p.vendors?.name ?? '—'}</span>
                                            </div>
                                            <div className="truncate">
                                              <span className="text-xs text-slate-500">{catGroup.catName}</span>
                                            </div>
                                            <div>
                                              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{p.unit}</span>
                                            </div>
                                            <div className="flex items-center gap-1 justify-end">
                                              {!bulkEditMode && (
                                                <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-ibg-50 text-slate-400 hover:text-ibg-600 transition-colors" title="Edit">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                              )}
                                              {p.is_active ? (
                                                <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-40" title="Deactivate">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                                </button>
                                              ) : (
                                                <button onClick={() => handleReactivate(p.id)} disabled={deletingId === p.id} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-40" title="Reactivate">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
                                                </button>
                                              )}
                                              {bulkEditMode && (
                                                <button
                                                  onClick={() => toggleBulkSelect(p)}
                                                  className="text-[10px] font-bold text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors"
                                                >
                                                  Select
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bulk Edit Floating Save Bar (desktop) ─────────────────────────── */}
      {bulkEditMode && bulkSelected.size > 0 && (
        <div className="hidden lg:flex fixed bottom-0 left-0 right-0 z-40 items-center justify-between gap-4 px-6 py-4 bg-white border-t-2 border-amber-300 shadow-2xl shadow-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
            <p className="text-sm font-black text-slate-800">
              {bulkSelected.size} product{bulkSelected.size !== 1 ? 's' : ''} selected
            </p>
            <span className="text-slate-300">·</span>
            <p className="text-xs text-slate-500 font-medium">Edit fields inline in the table, then save all at once</p>
            {bulkError && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-1 rounded-full">{bulkError}</p>
            )}
            {bulkSaveResults && bulkSaveResults.saved > 0 && (
              <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-full">
                ✓ {bulkSaveResults.saved} saved
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setBulkSelected(new Set()); setBulkEdits({}); setBulkError(null); }}
              className="text-sm font-bold text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={toggleBulkEditMode}
              className="text-sm font-bold text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Exit Bulk Edit
            </button>
            <button
              onClick={handleSaveBulk}
              disabled={bulkSaving}
              className="bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase tracking-widest px-6 py-2.5 rounded-xl disabled:opacity-50 transition-colors shadow-lg shadow-amber-200"
            >
              {bulkSaving ? 'Saving...' : `Save ${bulkSelected.size} Change${bulkSelected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
