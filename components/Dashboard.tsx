
import React from 'react';
import { User, UserRole, Transaction, Receipt, CateringEvent, Restaurant } from '../types';
import { isSuperAdmin } from '../constants';

interface DashboardProps {
  user: User;
  realUser: User;
  transactions: Transaction[];
  receipts: Receipt[];
  cateringEvents: CateringEvent[];
  onNavigate: (screen: 'CASH_MANAGER' | 'RECEIPTS_MANAGER' | 'INVENTORY_MANAGER' | 'CATERING_MANAGER' | 'USER_MANAGER' | 'ADMIN_PANEL') => void;
  onLogout: () => void;
  simulatedRole: UserRole | null;
  onSimulateRole: (role: UserRole | null) => void;
  restaurants?: Restaurant[];
  activeRestaurantId?: string | null;
  onSwitchRestaurant?: (restaurantId: string) => void;
}

const ROLES: UserRole[] = ['Owner', 'Manager', 'Dish Washer', 'Food Runner', 'Front Staff', 'User'];

const Dashboard: React.FC<DashboardProps> = ({
  user,
  realUser,
  transactions,
  receipts,
  cateringEvents,
  onNavigate,
  onLogout,
  simulatedRole,
  onSimulateRole,
  restaurants,
  activeRestaurantId,
  onSwitchRestaurant,
}) => {
  const balance = transactions.reduce((acc, t) => {
    return t.trans_type === 'Income' ? acc + t.amount : acc - t.amount;
  }, 0);

  const isOwner = user.role === 'Owner';
  const isSuperAdminUser = isSuperAdmin(realUser.email);
  const isSimulating = simulatedRole !== null;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  const userRestaurants = isSuperAdminUser
    ? (restaurants || [])
    : (restaurants || []).filter(r =>
      r.admin_email === realUser.email ||
      r.id === realUser.restaurant_id ||
      realUser.access?.some(acc => acc.restaurant_id === r.id)
    );

  const activeRestaurant = userRestaurants.find(r => r.id === activeRestaurantId) || userRestaurants[0];

  return (
    <div className="flex flex-col min-h-screen w-full max-w-5xl mx-auto animate-fadeIn" style={{ background: 'linear-gradient(165deg, #0c1821 0%, #162028 30%, #1a2a2e 60%, #0f2027 100%)' }}>

      {/* Hero Header */}
      <div className="relative overflow-hidden px-5 pt-8 pb-6 lg:px-8">
        {/* Decorative blurred orbs */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #14b8a6, transparent)' }}></div>
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }}></div>

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)', boxShadow: '0 4px 20px rgba(20,184,166,0.35)' }}>
              <svg width="26" height="26" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="14" y="2" width="5" height="11" rx="2.5" fill="white" fillOpacity="0.95" />
                <rect x="14" y="15" width="5" height="11" rx="2.5" fill="white" fillOpacity="0.8" />
                <rect x="14" y="28" width="5" height="10" rx="2.5" fill="white" fillOpacity="0.95" />
                <rect x="11" y="12" width="11" height="3.5" rx="1.75" fill="white" fillOpacity="0.6" />
                <rect x="11" y="25" width="11" height="3.5" rx="1.75" fill="white" fillOpacity="0.6" />
                <path d="M19 7.5 Q28 3 26 13 Q21 9 19 7.5Z" fill="white" fillOpacity="0.7" />
                <path d="M14 21 Q5 16 7 27 Q12 23 14 21Z" fill="white" fillOpacity="0.7" />
              </svg>
            </div>
            <div>
              {userRestaurants.length > 1 && !isSimulating ? (
                <div className="relative flex items-center">
                  <select
                    value={activeRestaurant?.id || ''}
                    onChange={(e) => onSwitchRestaurant?.(e.target.value)}
                    className="text-white font-black text-base tracking-tight leading-none bg-transparent border-none appearance-none outline-none focus:ring-0 cursor-pointer pr-5 py-1"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    {userRestaurants.map(r => (
                      <option key={r.id} value={r.id} className="text-slate-800 font-medium">
                        {r.name} {r.location ? `(${r.location})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-0 text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                </div>
              ) : (
                <p className="text-white font-black text-base tracking-tight leading-none">{activeRestaurant?.name || 'RestoHub'}</p>
              )}
              <p className="text-teal-400/70 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                {activeRestaurant?.location || 'All Locations'}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
            title="Sign out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </div>

        {/* Greeting */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-[0.15em]">{greeting}</p>
            <h1 className="text-white text-3xl font-black tracking-tight mt-1">{user.name.split(' ')[0]} 👋</h1>
            <p className="text-white/30 text-xs font-medium mt-1">
              {isSimulating ? `Simulating: ${simulatedRole}` : isSuperAdminUser ? '⚡ Super Admin' : `${user.role}`} · RestoHub
            </p>
          </div>

          {/* Role Simulation (Super Admin only) */}
          {isSuperAdminUser && (
            <div className="flex items-center gap-2 flex-wrap">
              {isSimulating && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest" style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  Viewing as {simulatedRole}
                </div>
              )}
              <select
                value={activeRestaurant?.id || ''}
                onChange={(e) => onSwitchRestaurant?.(e.target.value)}
                className="text-[11px] font-bold rounded-xl px-3 py-2 transition-colors cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                {restaurants?.map(r => (
                  <option key={r.id} value={r.id}>🏢 {r.name} {r.location ? `(${r.location})` : ''}</option>
                ))}
              </select>
              <select
                value={simulatedRole ?? ''}
                onChange={(e) => onSimulateRole(e.target.value ? e.target.value as UserRole : null)}
                className="text-[11px] font-bold rounded-xl px-3 py-2 transition-colors cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <option value="">🛡️ My Role (Super Admin)</option>
                {ROLES.map(r => (
                  <option key={r} value={r}>👁️ Simulate: {r}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Cards Section — responsive grid */}
      <div className="flex-1 px-5 pb-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">

          {/* Admin Panel - ONLY VISIBLE TO SUPER ADMINS */}
          {isSuperAdminUser && !isSimulating && (
            <button
              onClick={() => onNavigate('ADMIN_PANEL')}
              className="w-full text-left rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 active:scale-[0.97] group md:col-span-2 xl:col-span-3"
              style={{
                background: 'linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(15,118,110,0.25) 100%)',
                border: '1px solid rgba(20,184,166,0.2)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)', boxShadow: '0 4px 16px rgba(20,184,166,0.3)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M4.93 4.93a10 10 0 0 0 0 14.14" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.22 4.22 1.42 1.42" /><path d="m18.36 18.36 1.42 1.42" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m4.22 19.78 1.42-1.42" /><path d="m18.36 5.64 1.42-1.42" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-teal-400/60 text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">Platform Control</p>
                <h3 className="text-white font-bold text-sm">Admin Panel</h3>
                <p className="text-white/35 text-xs font-medium mt-0.5">Restaurants, users & access</p>
              </div>
              <div className="text-white/20 group-hover:text-teal-400/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </div>
            </button>
          )}

          {/* Inventory Manager Card */}
          {(activeRestaurant?.enable_inventory !== false) && (
            <button
              onClick={() => onNavigate('INVENTORY_MANAGER')}
              className="w-full text-left rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 active:scale-[0.97] group"
              style={{
                background: 'linear-gradient(135deg, rgba(251,146,60,0.08) 0%, rgba(234,88,12,0.12) 100%)',
                border: '1px solid rgba(251,146,60,0.15)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6" /><path d="M9 16h4" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm">Inventory Manager</h3>
                <p className="text-white/35 text-xs font-medium mt-0.5">Manage supply orders</p>
              </div>
              <div className="text-white/20 group-hover:text-orange-400/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </div>
            </button>
          )}

          {/* Cash Manager Card - ONLY VISIBLE TO OWNER */}
          {isOwner && (activeRestaurant?.enable_cash !== false) && (
            <button
              onClick={() => onNavigate('CASH_MANAGER')}
              className="w-full text-left rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 active:scale-[0.97] group"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.12) 100%)',
                border: '1px solid rgba(16,185,129,0.15)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm">Cash Manager</h3>
                <p className="text-2xl font-black mt-0.5" style={{ background: 'linear-gradient(135deg, #34d399, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-white/20 group-hover:text-emerald-400/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </div>
            </button>
          )}

          {/* User Manager Card - ONLY VISIBLE TO OWNER */}
          {isOwner && (activeRestaurant?.enable_users !== false) && (
            <button
              onClick={() => onNavigate('USER_MANAGER')}
              className="w-full text-left rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 active:scale-[0.97] group"
              style={{
                background: 'linear-gradient(135deg, rgba(244,63,94,0.08) 0%, rgba(225,29,72,0.12) 100%)',
                border: '1px solid rgba(244,63,94,0.15)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 4px 16px rgba(244,63,94,0.3)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v2m0 4v2m-5-3h6" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm">User Manager</h3>
                <p className="text-white/35 text-xs font-medium mt-0.5">Manage staff, roles & PINs</p>
              </div>
              <div className="text-white/20 group-hover:text-rose-400/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </div>
            </button>
          )}

          {/* Catering Manager Card */}
          {(activeRestaurant?.enable_catering !== false) && (
            <button
              onClick={() => onNavigate('CATERING_MANAGER')}
              className="w-full text-left rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 active:scale-[0.97] group"
              style={{
                background: 'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(14,165,233,0.12) 100%)',
                border: '1px solid rgba(56,189,248,0.15)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', boxShadow: '0 4px 16px rgba(56,189,248,0.3)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm">Catering Manager</h3>
                <p className="text-white/35 text-xs font-medium mt-0.5">{cateringEvents.length} events recorded</p>
              </div>
              <div className="text-white/20 group-hover:text-sky-400/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </div>
            </button>
          )}

          {/* Receipts Manager Card */}
          {(activeRestaurant?.enable_receipts !== false) && (
            <button
              onClick={() => onNavigate('RECEIPTS_MANAGER')}
              className="w-full text-left rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 active:scale-[0.97] group"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(124,58,237,0.12) 100%)',
                border: '1px solid rgba(139,92,246,0.15)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4c0-.5.2-1 .6-1.4C5 2.2 5.5 2 6 2h12c.5 0 1 .2 1.4.6.4.4.6.9.6 1.4v18l-4-2-4 2-4-2-4 2Z" /><path d="M14 14h-4" /><path d="M14 18h-4" /><path d="M14 10h-4" /><path d="M14 6h-4" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm">Receipts Manager</h3>
                <p className="text-white/35 text-xs font-medium mt-0.5">{receipts.length} receipts stored</p>
              </div>
              <div className="text-white/20 group-hover:text-violet-400/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </div>
            </button>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="px-5 pb-6 pt-4 text-center space-y-1.5">
        <div className="w-16 h-[1px] mx-auto mb-3" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}></div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ background: 'linear-gradient(90deg, #14b8a6, #2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Inchin's Bamboo Garden · South Charlotte
        </p>
        <p className="text-white/20 text-[9px] font-medium uppercase tracking-[0.15em] flex items-center justify-center gap-2">
          RestoHub v9.2
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 6px rgba(20,184,166,0.5)' }}></span>
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
