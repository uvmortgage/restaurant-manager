import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  fetchOrders,
  fetchOrderLines,
  fetchAllProducts,
  fetchVendors,
  fetchCategories,
  createOrder,
  createProduct,
  deleteOrder,
  duplicateOrder,
  updateProduct,
  softDeleteProduct as deleteProduct,
  reactivateProduct,
  bulkUpdateProducts
} from '../services/inventoryService';
import { Order, OrderLine, Product, Vendor, Category, OrderType, OrderTypeFilter } from '../inventory-types';
import { ORDER_TYPE_ICONS, isSuperAdmin } from '../constants';

const EMPTY_FORM = {
  name: '',
  category_id: '',
  vendor_id: '',
  unit: '',
  min_order: '',
  notes: ''
};

interface ProductFormState {
  name: string;
  category_id: string;
  vendor_id: string;
  unit: string;
  min_order: string;
  notes: string;
};

interface InventoryManagerProps {
  onViewOrder: (order: Order & { line_count?: number }, isNew?: boolean) => void;
  activeTab?: 'orders' | 'products';
  onBack?: () => void;
  user?: any;
  onCreateOrder?: (orderType: OrderType) => void;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ onViewOrder, activeTab: initialTab = 'orders', onBack, onCreateOrder }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>(initialTab);

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
  const [displayCount, setDisplayCount] = useState(100);

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

  const handleDuplicate = async (order: Order) => {
    setDuplicatingOrderId(Number(order.id));
    try {
      const newOrder = await duplicateOrder(Number(order.id));
      const lines = await fetchOrderLines(Number(order.id));
      if (lines.length > 0) {
        await supabase.from('order_lines').insert(
          lines.map(l => ({
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
    setDisplayCount(100);
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
    try {
      await deleteOrder(orderId);
      setOrders(prev => prev.filter(o => Number(o.id) !== orderId));
    } catch (e: any) {
      setDeleteOrderError(e.message ?? 'Failed to delete order');
    } finally {
      setDeletingOrderId(null);
    }
  };

  // ── Product specific handlers ─────────────────────────────────────────────
  const handleSaveAdd = async () => {
    if (!addForm.name || !addForm.category_id || !addForm.vendor_id || !addForm.unit) {
      setAddError('Please fill in name, category, vendor, and unit');
      return;
    }
    setAddSaving(true);
    setAddError(null);
    try {
      const p = await createProduct({
        name: addForm.name,
        category_id: Number(addForm.category_id),
        vendor_id: Number(addForm.vendor_id),
        unit: addForm.unit,
        min_order: addForm.min_order ? Number(addForm.min_order) : undefined,
        notes: addForm.notes
      });
      setProducts(prev => [...prev, p]);
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
    } catch (e: any) {
      setAddError(e.message ?? 'Failed to add product');
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
      min_order: p.min_order?.toString() || '',
      notes: p.notes || ''
    });
    setEditError(null);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editForm.name || !editForm.category_id || !editForm.vendor_id) {
      setEditError('Please fill in name, category, and vendor');
      return;
    }
    setEditSaving(true);
    try {
      const updated = await updateProduct(id, {
        name: editForm.name,
        category_id: Number(editForm.category_id),
        vendor_id: Number(editForm.vendor_id),
        unit: editForm.unit,
        min_order: editForm.min_order ? Number(editForm.min_order) : null,
        notes: editForm.notes
      });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      setEditingId(null);
    } catch (e: any) {
      setEditError(e.message ?? 'Failed to update product');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this product? It will no longer appear in search.')) return;
    setDeletingId(id);
    try {
      await deleteProduct(id);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: false } : p));
    } catch (e: any) {
      alert(e.message ?? 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReactivate = async (id: number) => {
    setDeletingId(id);
    try {
      await reactivateProduct(id);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: true } : p));
    } catch (e: any) {
      alert(e.message ?? 'Failed to reactivate product');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveBulk = async () => {
    setBulkSaving(true);
    setBulkError(null);
    setBulkSaveResults(null);
    try {
      const updates = Object.entries(bulkEdits).map(([id, form]) => ({
        id: Number(id),
        updates: {
          name: form.name,
          vendor_id: form.vendor_id ? Number(form.vendor_id) : undefined,
          category_id: form.category_id ? Number(form.category_id) : undefined,
          unit: form.unit,
        }
      }));

      const results = await bulkUpdateProducts(updates);
      const savedCount = results.filter(r => r.success).length;
      const failedCount = results.length - savedCount;

      // Update local state with successful updates
      const updatedIds = new Set(results.filter(r => r.success).map(r => r.id));
      setProducts(prev => prev.map(p => {
        if (updatedIds.has(p.id)) {
          const form = bulkEdits[p.id];
          return {
            ...p,
            name: form.name ?? p.name,
            vendor_id: form.vendor_id ? Number(form.vendor_id) : p.vendor_id,
            category_id: form.category_id ? Number(form.category_id) : p.category_id,
            unit: form.unit ?? p.unit,
          };
        }
        return p;
      }));

      setBulkSaveResults({ saved: savedCount, failed: failedCount });
      if (failedCount === 0) {
        setBulkSelected(new Set());
        setBulkEdits({});
        setTimeout(() => setBulkSaveResults(null), 3000);
      } else {
        setBulkError(`${failedCount} products failed to save.`);
      }
    } catch (e: any) {
      setBulkError(e.message ?? 'Bulk update failed');
    } finally {
      setBulkSaving(false);
    }
  };

  const toggleBulkSelect = (p: Product) => {
    const next = new Set(bulkSelected);
    if (next.has(p.id)) {
      next.delete(p.id);
      const nextEdits = { ...bulkEdits };
      delete nextEdits[p.id];
      setBulkEdits(nextEdits);
    } else {
      next.add(p.id);
      setBulkEdits(prev => ({
        ...prev,
        [p.id]: {
          name: p.name,
          vendor_id: String(p.vendor_id),
          category_id: String(p.category_id),
          unit: p.unit,
          min_order: String(p.min_order || ''),
          notes: p.notes || ''
        }
      }));
    }
    setBulkSelected(next);
  };

  const selectAllVisible = () => {
    const next = new Set(bulkSelected);
    filteredProducts.forEach(p => {
      next.add(p.id);
      if (!bulkEdits[p.id]) {
        setBulkEdits(prev => ({
          ...prev,
          [p.id]: {
            name: p.name,
            vendor_id: String(p.vendor_id),
            category_id: String(p.category_id),
            unit: p.unit,
            min_order: String(p.min_order || ''),
            notes: p.notes || ''
          }
        }));
      }
    });
    setBulkSelected(next);
  };

  const updateBulkEdit = (id: number, field: keyof ProductFormState, value: string) => {
    setBulkEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const toggleBulkEditMode = () => {
    if (bulkEditMode) {
      setBulkSelected(new Set());
      setBulkEdits({});
      setBulkError(null);
      setBulkSaveResults(null);
    }
    setBulkEditMode(!bulkEditMode);
  };

  // ── Derived products state ────────────────────────────────────────────────
  const catOrderTypeMap = useMemo(() => {
    const m: Record<number, OrderType> = {};
    categories.forEach(c => { m[c.id] = c.order_type || 'WEEKLY_FOOD'; });
    return m;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (prodTypeFilter === 'ALL') return categories;
    return categories.filter((c) => (c.order_type ?? 'WEEKLY_FOOD') === prodTypeFilter);
  }, [categories, prodTypeFilter]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (prodSearch && !p.name.toLowerCase().includes(prodSearch.toLowerCase())) return false;
      if (prodCategoryFilter !== 'ALL' && p.category_id !== prodCategoryFilter) return false;
      if (prodVendorFilter !== 'ALL' && p.vendor_id !== prodVendorFilter) return false;
      if (prodTypeFilter !== 'ALL') {
        const catObj = Array.isArray(p.categories) ? p.categories[0] : p.categories;
        const ot = catObj?.order_type || catOrderTypeMap[p.category_id] || 'WEEKLY_FOOD';
        if (ot !== prodTypeFilter) return false;
      }
      return true;
    });
  }, [products, prodSearch, prodCategoryFilter, prodVendorFilter, prodTypeFilter, catOrderTypeMap]);

  const groupedProducts = useMemo(() => {
    const typeOrder: OrderType[] = ['WEEKLY_FOOD', 'BAR', 'IBG Products', 'IBG Crockery'];
    const groups: Record<string, { catName: string; catSortOrder: number; products: Product[] }[]> = {};

    const limitedProducts = filteredProducts.slice(0, displayCount);

    typeOrder.forEach((ot) => {
      const forType = limitedProducts.filter((p) => {
        const catObj = Array.isArray(p.categories) ? p.categories[0] : p.categories;
        const pot = catObj?.order_type || catOrderTypeMap[p.category_id] || 'WEEKLY_FOOD';
        return pot === ot;
      });
      if (forType.length === 0) return;

      const byCategory: Record<string, { catName: string; catSortOrder: number; products: Product[] }> = {};
      forType.forEach((p) => {
        const catObj = Array.isArray(p.categories) ? p.categories[0] : p.categories;
        const catName = catObj?.name ?? 'Uncategorized';
        if (!byCategory[catName]) {
          byCategory[catName] = { catName, catSortOrder: catObj?.sort_order ?? 99, products: [] };
        }
        byCategory[catName].products.push(p);
      });

      groups[ot] = Object.values(byCategory).sort((a, b) => a.catSortOrder - b.catSortOrder);
    });

    return groups;
  }, [filteredProducts, catOrderTypeMap, displayCount]);

  const totalFilteredCount = filteredProducts.length;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-ibg-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22V2" /><path d="M7 22V2" /><path d="M7 4h10" /><path d="M7 8h10" /><path d="M7 12h10" /><path d="M7 16h10" /><path d="M7 20h10" /></svg>
              <h1 className="font-black tracking-tight text-lg">Inventory Manager</h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-slate-200 bg-white sticky top-[52px] z-30 px-4 pt-4 shrink-0">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'orders' ? 'text-ibg-600' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          Orders
          {activeTab === 'orders' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-ibg-500 rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'products' ? 'text-ibg-600' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
          Products
          {activeTab === 'products' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-ibg-500 rounded-t-full"></div>}
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent">Order History</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap bg-black/20 border border-white/5 p-1 rounded-xl shadow-inner gap-1">
                  {(['ALL', 'WEEKLY_FOOD', 'BAR', 'IBG Products', 'IBG Crockery'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setTypeFilter(f)}
                      className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${typeFilter === f ? 'bg-ibg-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                    >
                      {f === 'ALL' ? 'All Types' : f === 'WEEKLY_FOOD' ? 'Weekly Food' : f}
                    </button>
                  ))}
                </div>
                {isSuperAdmin() && (
                  <button
                    onClick={() => {
                      if (onCreateOrder) {
                        onCreateOrder((typeFilter === 'ALL' ? 'WEEKLY_FOOD' : typeFilter) as OrderType);
                      } else {
                        onViewOrder({ id: 0, status: 'OPEN', created_at: '', restaurant_id: 0, created_by: '', type: 'WEEKLY_FOOD' }, true);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 bg-ibg-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ibg-700 transition-colors shadow-lg shadow-ibg-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                    New Order
                  </button>
                )}
              </div>
            </div>

            {ordersLoading ? (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-12 h-12 border-4 border-ibg-100 border-t-ibg-500 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 font-bold text-sm">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z" /><path d="M11 15v4h4" /><path d="M15 15l6 6" /></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">No orders yet</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">Create your first inventory order to start tracking stock.</p>
                {isSuperAdmin() && (
                  <button
                    onClick={() => {
                      if (onCreateOrder) {
                        onCreateOrder('WEEKLY_FOOD');
                      } else {
                        onViewOrder({ id: 0, status: 'OPEN', created_at: '', restaurant_id: 0, created_by: '', type: 'WEEKLY_FOOD' }, true);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-ibg-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-ibg-700 transition-colors shadow-xl shadow-ibg-100"
                  >
                    Create First Order
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {orders
                  .filter(o => typeFilter === 'ALL' || o.type === typeFilter)
                  .map(o => (
                    <div key={o.id} className="bg-white border border-slate-200 rounded-3xl p-4 hover:shadow-xl hover:border-ibg-200 transition-all duration-300 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 cursor-pointer flex-1 min-w-0" onClick={() => onViewOrder(o)}>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform ${o.type === 'BAR' ? 'bg-amber-50 text-amber-600' :
                            o.type === 'IBG Products' ? 'bg-indigo-50 text-indigo-600' :
                              o.type === 'IBG Crockery' ? 'bg-emerald-50 text-emerald-600' :
                                'bg-teal-50 text-teal-600'
                            }`}>
                            {ORDER_TYPE_ICONS[o.type as OrderType] || '📦'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-800 truncate">
                                {o.type === 'WEEKLY_FOOD' ? 'Weekly Food' : o.type === 'BAR' ? 'Bar' : o.type === 'IBG Products' ? 'IBG Products' : o.type === 'IBG Crockery' ? 'IBG Crockery' : 'Weekly Food order'}
                              </h3>
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${o.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                                o.status === 'DRAFT' ? 'bg-slate-100 text-slate-400' :
                                  'bg-amber-50 text-amber-600'
                                }`}>
                                {o.status}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                              {new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              <span className="mx-2 text-slate-200">|</span>
                              {o.line_count || 0} items
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDuplicate(o)}
                            disabled={duplicatingOrderId === Number(o.id)}
                            className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-ibg-600 transition-colors"
                            title="Duplicate order"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                          </button>
                          {isSuperAdmin() && (
                            <div className="relative">
                              <button
                                onClick={() => setConfirmDeleteOrderId(confirmDeleteOrderId === Number(o.id) ? null : Number(o.id))}
                                className="p-2.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete order"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                              </button>
                              {confirmDeleteOrderId === Number(o.id) && (
                                <div className="absolute right-0 bottom-full mb-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-2xl z-50 w-48 animate-in zoom-in-95 overflow-hidden">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Delete this order?</p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleDeleteOrder(Number(o.id))}
                                      disabled={deletingOrderId === Number(o.id)}
                                      className="flex-1 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-rose-700"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteOrderId(null)}
                                      className="flex-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-slate-200"
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Products Tab ── */
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
          {/* Products Filter Bar */}
          <div className="p-4 bg-white border-b border-slate-200 shadow-sm sticky top-[49px] z-20">
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400 transition-all font-medium"
                />
              </div>
              <div className="flex flex-wrap lg:flex-row items-center gap-2">
                <div className="flex flex-wrap bg-black/20 border border-white/5 p-1 rounded-xl shadow-inner gap-1 w-full xl:w-auto">
                  {(['ALL', 'WEEKLY_FOOD', 'BAR', 'IBG Products', 'IBG Crockery'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => { setProdTypeFilter(f); setProdCategoryFilter('ALL'); }}
                      className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${prodTypeFilter === f ? 'bg-ibg-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                    >
                      {f === 'ALL' ? 'All Types' : f === 'WEEKLY_FOOD' ? 'Weekly Food' : f}
                    </button>
                  ))}
                </div>
                <select
                  value={prodCategoryFilter}
                  onChange={(e) => setProdCategoryFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-ibg-400"
                >
                  <option value="ALL">All Categories</option>
                  {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  value={prodVendorFilter}
                  onChange={(e) => setProdVendorFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-ibg-400"
                >
                  <option value="ALL">All Vendors</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>

                <div className="flex items-center gap-2 ml-auto">
                  {isSuperAdmin() && (
                    <>
                      <button
                        onClick={toggleBulkEditMode}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${bulkEditMode
                          ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        {bulkEditMode ? 'Cancel Bulk' : 'Bulk Edit'}
                      </button>
                      <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-ibg-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ibg-700 transition-colors shadow-lg shadow-ibg-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                        Add Product
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto min-h-0">
            {prodLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-ibg-500 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Scanning Inventory...</p>
              </div>
            ) : totalFilteredCount === 0 ? (
              <div className="bg-white m-4 border-2 border-dashed border-slate-200 rounded-[32px] p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" /><path d="m21 12-1 8H5l-1-8" /><path d="M10 12h4" /><path d="M12 3v9" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No items found</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">We couldn't find any products matching your current filters or search term.</p>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto h-full p-4 lg:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Showing {Math.min(displayCount, totalFilteredCount)} of {totalFilteredCount} matching items
                  </p>
                </div>

                {showAddForm && (
                  <div className="bg-white border-2 border-ibg-200 rounded-3xl p-6 mb-8 shadow-lg shadow-ibg-100/50">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Add New Product</h3>
                    {addError && <p className="text-xs text-rose-500 font-semibold mb-4 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{addError}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-5">
                      <div className="lg:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Name <span className="text-rose-500">*</span></label>
                        <input type="text" value={addForm.name} onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-ibg-400 font-medium" placeholder="E.g. Basmati Rice" />
                      </div>
                      <div className="lg:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Category <span className="text-rose-500">*</span></label>
                        <select value={addForm.category_id} onChange={(e) => setAddForm(f => ({ ...f, category_id: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-ibg-400 font-semibold bg-slate-50">
                          <option value="">Select...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="lg:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Vendor <span className="text-rose-500">*</span></label>
                        <select value={addForm.vendor_id} onChange={(e) => setAddForm(f => ({ ...f, vendor_id: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-ibg-400 font-semibold bg-slate-50">
                          <option value="">Select...</option>
                          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </div>
                      <div className="lg:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Unit <span className="text-rose-500">*</span></label>
                        <input type="text" value={addForm.unit} onChange={(e) => setAddForm(f => ({ ...f, unit: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-ibg-400 font-medium" placeholder="e.g. lbs, cs" />
                      </div>
                      <div className="lg:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Min Order</label>
                        <input type="number" min="0" value={addForm.min_order} onChange={(e) => setAddForm(f => ({ ...f, min_order: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-ibg-400 font-medium" placeholder="Optional" />
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => { setShowAddForm(false); setAddForm(EMPTY_FORM); setAddError(null); }} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl transition-colors">Cancel</button>
                      <button onClick={handleSaveAdd} disabled={addSaving} className="px-6 py-2.5 bg-ibg-600 hover:bg-ibg-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-ibg-100 disabled:opacity-50 transition-colors">{addSaving ? 'Saving...' : 'Save Product'}</button>
                    </div>
                  </div>
                )}

                <div className="space-y-8 pb-32">
                  {Object.entries(groupedProducts).map(([ot, catGroups]) => {
                    const typeLabel = ot === 'WEEKLY_FOOD' ? 'Weekly Food' : ot;
                    const badgeCls = ot === 'BAR' ? 'bg-purple-600 text-white' :
                      ot === 'IBG Products' ? 'bg-indigo-600 text-white' :
                        ot === 'IBG Crockery' ? 'bg-emerald-600 text-white' :
                          'bg-teal-600 text-white';

                    return (
                      <div key={ot} className="overflow-hidden rounded-[32px] border border-slate-200 shadow-sm bg-white">
                        <div className={`px-6 py-4 flex items-center justify-between ${badgeCls}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{ORDER_TYPE_ICONS[ot as OrderType]}</span>
                            <span className="text-white font-black text-sm uppercase tracking-widest">{typeLabel}</span>
                          </div>
                          <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider">
                            {catGroups.reduce((sum, g) => sum + g.products.length, 0)} items
                          </span>
                        </div>

                        <div className="bg-white">
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

                          {catGroups.map((catGroup) => (
                            <div key={catGroup.catName}>
                              <div className="lg:hidden px-4 py-2 bg-black/20 border-y border-white/5 flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">{catGroup.catName}</span>
                                <span className="text-[10px] font-medium text-slate-400">{catGroup.products.length}</span>
                              </div>

                              <div className="divide-y divide-slate-50">
                                {catGroup.products.map((p) => (
                                  <div key={p.id} className={`${!p.is_active ? 'opacity-50' : ''}`}>
                                    {editingId === p.id ? (
                                      <div className="p-4 bg-ibg-50/30 border-l-4 border-ibg-400">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-ibg-600 mb-3">Editing: {p.name}</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                                          <div className="sm:col-span-2 lg:col-span-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Name *</label>
                                            <input
                                              type="text"
                                              value={editForm.name}
                                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                              className="w-full border border-slate-200 rounded-xl px-2 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400"
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
                                        </div>
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
                                      <>
                                        <div className="lg:hidden flex items-start gap-3 p-4">
                                          <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-slate-800 leading-tight">{p.name}</p>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                              {(() => {
                                                const vObj = Array.isArray(p.vendors) ? p.vendors[0] : p.vendors;
                                                return vObj?.name && (
                                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{vObj.name}</span>
                                                );
                                              })()}
                                              <span className="text-[10px] text-slate-400 font-medium">{p.unit}</span>
                                              {!p.is_active && <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">Inactive</span>}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => startEdit(p)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            </button>
                                          </div>
                                        </div>

                                        {bulkEditMode && bulkSelected.has(p.id) ? (
                                          <div className={`hidden lg:grid gap-2 items-start px-4 py-2.5 bg-amber-50/50 border-l-2 border-amber-400 lg:grid-cols-[28px,1fr,160px,160px,80px,100px]`}>
                                            <div className="flex items-center justify-center pt-2">
                                              <input type="checkbox" checked onChange={() => toggleBulkSelect(p)} className="w-4 h-4 accent-amber-500 cursor-pointer" />
                                            </div>
                                            <input type="text" value={bulkEdits[p.id]?.name ?? p.name} onChange={(e) => updateBulkEdit(p.id, 'name', e.target.value)} className="border border-amber-300 rounded-lg px-2 py-1.5 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white w-full" placeholder="Name" />
                                            <select value={bulkEdits[p.id]?.vendor_id ?? String(p.vendor_id)} onChange={(e) => updateBulkEdit(p.id, 'vendor_id', e.target.value)} className="border border-amber-300 rounded-lg px-2 py-1.5 text-slate-700 text-xs font-semibold bg-white w-full">{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                                            <select value={bulkEdits[p.id]?.category_id ?? String(p.category_id)} onChange={(e) => updateBulkEdit(p.id, 'category_id', e.target.value)} className="border border-amber-300 rounded-lg px-2 py-1.5 text-slate-700 text-xs font-semibold bg-white w-full">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                            <input type="text" value={bulkEdits[p.id]?.unit ?? p.unit} onChange={(e) => updateBulkEdit(p.id, 'unit', e.target.value)} className="border border-amber-300 rounded-lg px-2 py-1.5 text-slate-800 text-xs font-semibold bg-white w-full" placeholder="Unit" />
                                            <div className="flex items-center justify-end gap-1 pt-1"><span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">editing</span></div>
                                          </div>
                                        ) : (
                                          <div className={`hidden lg:grid gap-3 items-center px-4 py-3 hover:bg-slate-50 transition-colors ${bulkEditMode ? 'lg:grid-cols-[28px,1fr,160px,160px,80px,100px]' : 'lg:grid-cols-[1fr,160px,160px,80px,100px]'}`}>
                                            {bulkEditMode && (
                                              <div className="flex items-center justify-center">
                                                <input type="checkbox" checked={bulkSelected.has(p.id)} onChange={() => toggleBulkSelect(p)} className="w-4 h-4 accent-amber-500 cursor-pointer" />
                                              </div>
                                            )}
                                            <div className="min-w-0">
                                              <p className="font-semibold text-sm text-slate-800 truncate">{p.name}</p>
                                              {p.notes && <p className="text-[11px] text-slate-400 truncate">{p.notes}</p>}
                                              {!p.is_active && <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">Inactive</span>}
                                            </div>
                                            <div className="truncate">
                                              {(() => {
                                                const vObj = Array.isArray(p.vendors) ? p.vendors[0] : p.vendors;
                                                return <span className="text-xs font-semibold text-slate-600">{vObj?.name ?? '—'}</span>;
                                              })()}
                                            </div>
                                            <div className="truncate"><span className="text-xs text-slate-500">{catGroup.catName}</span></div>
                                            <div><span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{p.unit}</span></div>
                                            <div className="flex items-center gap-1 justify-end">
                                              {!bulkEditMode && (
                                                <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-ibg-50 text-slate-400 hover:text-ibg-600 transition-colors" title="Edit">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                              )}
                                              {p.is_active ? (
                                                <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors" title="Deactivate">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                                </button>
                                              ) : (
                                                <button onClick={() => handleReactivate(p.id)} disabled={deletingId === p.id} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors" title="Reactivate">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
                                                </button>
                                              )}
                                              {bulkEditMode && (
                                                <button onClick={() => toggleBulkSelect(p)} className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Select</button>
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

                {filteredProducts.length > displayCount && (
                  <div className="mt-8 flex justify-center pb-8">
                    <button
                      onClick={() => setDisplayCount(prev => prev + 100)}
                      className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 shadow-sm"
                    >
                      Load More Products ({filteredProducts.length - displayCount} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {bulkEditMode && bulkSelected.size > 0 && (
        <div className="hidden lg:flex fixed bottom-0 left-0 right-0 z-40 items-center justify-between gap-4 px-6 py-4 bg-white border-t-2 border-amber-300 shadow-2xl shadow-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
            <p className="text-sm font-black text-slate-800">{bulkSelected.size} products selected</p>
            {bulkError && <p className="text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-1 rounded-full">{bulkError}</p>}
            {bulkSaveResults && bulkSaveResults.saved > 0 && <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-full">✓ {bulkSaveResults.saved} saved</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setBulkSelected(new Set()); setBulkEdits({}); setBulkError(null); }}
              className="text-sm font-bold text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl"
            >
              Deselect All
            </button>
            <button
              onClick={handleSaveBulk}
              disabled={bulkSaving}
              className="bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase px-6 py-2 rounded-xl disabled:opacity-50 transition-colors"
            >
              {bulkSaving ? 'Saving...' : `Save ${bulkSelected.size} Changes`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
