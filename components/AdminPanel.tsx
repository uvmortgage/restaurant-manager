
import React, { useState, useEffect } from 'react';
import { User, Restaurant, AccessRequest } from '../types';
import { dataService } from '../services/dataService';

interface AdminPanelProps {
  currentUser: User;
  restaurants: Restaurant[];
  onRestaurantCreated: (r: Restaurant) => void;
  onRestaurantUpdated: (r: Restaurant) => void;
  onBack: () => void;
}

type Tab = 'restaurants' | 'requests' | 'users';

const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  restaurants,
  onRestaurantCreated,
  onRestaurantUpdated,
  onBack,
}) => {
  const [tab, setTab] = useState<Tab>('restaurants');
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Create restaurant form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit restaurant
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');

  useEffect(() => {
    if (tab === 'requests') loadRequests();
    if (tab === 'users') loadUsers();
  }, [tab]);

  const loadRequests = async () => {
    setLoadingRequests(true);
    const data = await dataService.getAccessRequests();
    setAccessRequests(data);
    setLoadingRequests(false);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    const data = await dataService.getUsers();
    setAllUsers(data);
    setLoadingUsers(false);
  };

  const handleCreateRestaurant = async () => {
    if (!formName.trim() || !formAdminEmail.trim()) {
      setFormError('Name and admin email are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const newR = await dataService.createRestaurant({
        name: formName.trim(),
        location: formLocation.trim() || undefined,
        admin_email: formAdminEmail.trim(),
        is_active: true,
      });
      onRestaurantCreated(newR);
      setFormName('');
      setFormLocation('');
      setFormAdminEmail('');
      setShowCreateForm(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create restaurant.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRestaurant = async (r: Restaurant) => {
    const updated = { ...r, is_active: !r.is_active };
    await dataService.updateRestaurant(updated);
    onRestaurantUpdated(updated);
  };

  const startEdit = (r: Restaurant) => {
    setEditingRestaurant(r);
    setEditName(r.name);
    setEditLocation(r.location ?? '');
    setEditAdminEmail(r.admin_email);
  };

  const handleSaveEdit = async () => {
    if (!editingRestaurant) return;
    setSaving(true);
    try {
      const updated = {
        ...editingRestaurant,
        name: editName.trim(),
        location: editLocation.trim() || undefined,
        admin_email: editAdminEmail.trim(),
      };
      await dataService.updateRestaurant(updated);
      onRestaurantUpdated(updated);
      setEditingRestaurant(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveRequest = async (req: AccessRequest) => {
    try {
      await dataService.updateAccessRequestStatus(req.id, 'approved');
      // Find user by email and assign restaurant
      const user = await dataService.getUserByEmail(req.user_email);
      if (user) {
        await dataService.assignUserToRestaurant(user.id, req.restaurant_id);
        // Also activate the user
        await dataService.updateUser({ ...user, status: 'Active', restaurant_id: req.restaurant_id });
      }
      setAccessRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (req: AccessRequest) => {
    try {
      await dataService.updateAccessRequestStatus(req.id, 'rejected');
      setAccessRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to reject request');
    }
  };

  const handleAssignUserRestaurant = async (user: User, restaurantId: string) => {
    try {
      await dataService.assignUserToRestaurant(user.id, restaurantId || null);
      setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, restaurant_id: restaurantId || undefined } : u));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to assign restaurant');
    }
  };

  const getRestaurantName = (id: string) =>
    restaurants.find(r => r.id === id)?.name ?? 'Unknown';

  const pendingCount = accessRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-ibg-600 sticky top-0 z-20 shadow-md">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-white font-black text-base tracking-tight">Admin Panel</h1>
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Super-Admin Controls</p>
        </div>
        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
          {currentUser.photo
            ? <img src={currentUser.photo} alt="" className="w-full h-full object-cover" />
            : <span className="text-white font-black text-xs">{currentUser.name[0]}</span>
          }
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white sticky top-[52px] z-10">
        {([['restaurants', 'Restaurants'], ['requests', 'Requests'], ['users', 'Users']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors relative ${
              tab === key ? 'text-ibg-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {label}
            {key === 'requests' && pendingCount > 0 && (
              <span className="ml-1 bg-rose-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5">{pendingCount}</span>
            )}
            {tab === key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ibg-600 rounded-t-full" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">

        {/* ─── RESTAURANTS TAB ─── */}
        {tab === 'restaurants' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">
                {restaurants.length} Restaurant{restaurants.length !== 1 ? 's' : ''}
              </h2>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-1.5 bg-ibg-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-ibg-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  New Restaurant
                </button>
              )}
            </div>

            {/* Create form */}
            {showCreateForm && (
              <div className="bg-white rounded-2xl border-2 border-ibg-200 p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-5 bg-ibg-600 rounded-full" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-ibg-700">New Restaurant</h3>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Restaurant Name *</label>
                  <input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Inchin's Bamboo Garden"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Location</label>
                  <input
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    placeholder="e.g. South Charlotte"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Admin Email *</label>
                  <input
                    type="email"
                    value={formAdminEmail}
                    onChange={e => setFormAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-ibg-400"
                  />
                </div>
                {formError && <p className="text-xs text-rose-500 font-medium">{formError}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleCreateRestaurant}
                    disabled={saving}
                    className="flex-1 bg-ibg-600 text-white font-black uppercase tracking-widest text-xs py-2.5 rounded-xl hover:bg-ibg-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    onClick={() => { setShowCreateForm(false); setFormError(''); }}
                    className="flex-1 bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs py-2.5 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Restaurant list */}
            {restaurants.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-40"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
                <p className="text-sm font-bold">No restaurants yet</p>
                <p className="text-xs">Create your first restaurant above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {restaurants.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {editingRestaurant?.id === r.id ? (
                      <div className="p-4 space-y-3">
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-ibg-400" placeholder="Name" />
                        <input value={editLocation} onChange={e => setEditLocation(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-ibg-400" placeholder="Location" />
                        <input value={editAdminEmail} onChange={e => setEditAdminEmail(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-ibg-400" placeholder="Admin email" />
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-ibg-600 text-white text-xs font-black uppercase py-2 rounded-xl hover:bg-ibg-700 disabled:opacity-50 transition-colors">Save</button>
                          <button onClick={() => setEditingRestaurant(null)} className="flex-1 bg-slate-100 text-slate-600 text-xs font-black uppercase py-2 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${r.is_active ? 'bg-ibg-50' : 'bg-slate-100'}`}>
                          🍽️
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-black text-sm ${r.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{r.name}</p>
                          {r.location && <p className="text-xs text-slate-500 font-medium">{r.location}</p>}
                          <p className="text-[10px] text-slate-400 font-medium">{r.admin_email}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => startEdit(r)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-ibg-50 text-slate-500 hover:text-ibg-600 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                          <button
                            onClick={() => handleToggleRestaurant(r)}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${r.is_active ? 'bg-rose-50 hover:bg-rose-100 text-rose-500' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'}`}
                          >
                            {r.is_active
                              ? <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                              : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            }
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="px-4 pb-3">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── ACCESS REQUESTS TAB ─── */}
        {tab === 'requests' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Access Requests</h2>
              <button onClick={loadRequests} className="text-xs text-ibg-600 font-bold hover:underline">Refresh</button>
            </div>

            {loadingRequests ? (
              <div className="flex justify-center py-12">
                <div className="relative w-10 h-10">
                  <div className="w-10 h-10 border-4 border-ibg-100 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-10 h-10 border-4 border-t-ibg-600 rounded-full animate-spin"></div>
                </div>
              </div>
            ) : accessRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-40"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>
                <p className="text-sm font-bold">No requests</p>
                <p className="text-xs">Access requests from new users will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {accessRequests.map(req => (
                  <div key={req.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm">
                        {(req.user_name ?? req.user_email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-slate-800">{req.user_name ?? '—'}</p>
                        <p className="text-xs text-slate-500 font-medium truncate">{req.user_email}</p>
                        <p className="text-xs text-ibg-600 font-bold mt-0.5">→ {getRestaurantName(req.restaurant_id)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(req.requested_at).toLocaleString()}</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap ${
                        req.status === 'pending' ? 'bg-amber-100 text-amber-700'
                        : req.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleApproveRequest(req)}
                          className="flex-1 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest py-2 rounded-xl hover:bg-emerald-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req)}
                          className="flex-1 bg-rose-50 text-rose-600 text-xs font-black uppercase tracking-widest py-2 rounded-xl hover:bg-rose-100 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── USERS TAB ─── */}
        {tab === 'users' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">All Users</h2>
              <button onClick={loadUsers} className="text-xs text-ibg-600 font-bold hover:underline">Refresh</button>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <div className="relative w-10 h-10">
                  <div className="w-10 h-10 border-4 border-ibg-100 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-10 h-10 border-4 border-t-ibg-600 rounded-full animate-spin"></div>
                </div>
              </div>
            ) : allUsers.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-12">No users found</p>
            ) : (
              <div className="space-y-2">
                {allUsers.map(u => (
                  <div key={u.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
                        {u.photo
                          ? <img src={u.photo} alt="" className="w-full h-full object-cover" />
                          : <span className="text-slate-500 font-black text-sm">{u.name[0]}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        <p className="text-[10px] text-slate-400">{u.role} · {u.status}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Assign Restaurant</label>
                      <select
                        value={u.restaurant_id ?? ''}
                        onChange={e => handleAssignUserRestaurant(u, e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-ibg-400 bg-white"
                      >
                        <option value="">— No restaurant —</option>
                        {restaurants.map(r => (
                          <option key={r.id} value={r.id}>{r.name}{r.location ? ` · ${r.location}` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
