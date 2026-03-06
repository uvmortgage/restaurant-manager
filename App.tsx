
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { User, UserRole, Transaction, Receipt, CateringEvent, AppState, Restaurant } from './types';
import { Order, OrderType } from './inventory-types';
import { dataService } from './services/dataService';
import { setActiveRestaurantId } from './services/supabaseClient';
import Dashboard from './components/Dashboard';
import CashManager from './components/CashManager';
import ReceiptsManager from './components/ReceiptsManager';
import CateringManager from './components/CateringManager';
import UserManager from './components/UserManager';
import UserForm from './components/UserForm';
import AddCashForm from './components/AddCashForm';
import PaySalaryForm from './components/PaySalaryForm';
import AddReceiptForm from './components/AddReceiptForm';
import AddCateringForm from './components/AddCateringForm';
import AddCateringPaymentForm from './components/AddCateringPaymentForm';
import InventoryManager from './components/InventoryManager';
import CreateOrderForm from './components/CreateOrderForm';
import OrderReview from './components/OrderReview';
import AdminPanel from './components/AdminPanel';
import RequestAccess from './components/RequestAccess';

const SESSION_KEY = 'restohub_session';

// Super-admins have full platform access and can manage restaurants
const SUPER_ADMIN_EMAILS = new Set(['sri7576@gmail.com', 'Sree.m2608@gmail.com']);
export const isSuperAdmin = (email: string) => SUPER_ADMIN_EMAILS.has(email);

// Decode a Google JWT credential without a library
const decodeGoogleJwt = (token: string): Record<string, string> | null => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

type Screen =
  | 'LOGIN'
  | 'DASHBOARD'
  | 'CASH_MANAGER'
  | 'RECEIPTS_MANAGER'
  | 'CATERING_MANAGER'
  | 'USER_MANAGER'
  | 'EDIT_USER'
  | 'ADD_CASH'
  | 'PAY_SALARY'
  | 'ADD_RECEIPT'
  | 'ADD_CATERING'
  | 'ADD_CATERING_PAYMENT'
  | 'INVENTORY_MANAGER'
  | 'CREATE_ORDER'
  | 'ORDER_REVIEW'
  | 'ADMIN_PANEL'
  | 'REQUEST_ACCESS';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    transactions: [],
    receipts: [],
    cateringEvents: [],
    users: [],
    restaurants: [],
  });
  const [currentScreen, setCurrentScreen] = useState<Screen>('LOGIN');
  const [selectedEvent, setSelectedEvent] = useState<CateringEvent | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType>('WEEKLY_FOOD');
  const [isInitializing, setIsInitializing] = useState(true);
  const [autoOpenAddItems, setAutoOpenAddItems] = useState(false);
  const [authError, setAuthError] = useState<string | undefined>();
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [activeRestaurantIdState, setActiveRestaurantIdState] = useState<string | null>(null);

  // Compute effective user: override role when simulating
  const effectiveUser = useMemo(() => {
    if (!state.currentUser) return null;
    if (simulatedRole && isSuperAdmin(state.currentUser.email)) {
      return { ...state.currentUser, role: simulatedRole };
    }
    return state.currentUser;
  }, [state.currentUser, simulatedRole]);

  const loadDataAndEnter = async (appUser: User, explicitRestaurantId?: string) => {
    try {
      // First, fetch restaurants to determine access and IDs
      const restaurants = await dataService.getRestaurants();

      // Determine which restaurant to load data for
      let rIdToUse = explicitRestaurantId;
      if (!rIdToUse) {
        if (appUser.default_restaurant_id) {
          rIdToUse = appUser.default_restaurant_id;
        } else if (appUser.restaurant_id) {
          rIdToUse = appUser.restaurant_id;
        } else if (isSuperAdmin(appUser.email) && restaurants.length > 0) {
          rIdToUse = restaurants.find(r => r.name === "Inchin's Bamboo Garden")?.id || restaurants[0].id;
        }
      }

      if (rIdToUse) {
        setActiveRestaurantId(rIdToUse);
        setActiveRestaurantIdState(rIdToUse);
      } else {
        setActiveRestaurantId(null);
        setActiveRestaurantIdState(null);
      }

      // Now fetch the data. The services will automatically scope using the activeRestaurantId
      const [transactions, receipts, cateringEvents, users] = await Promise.all([
        dataService.getTransactions(),
        dataService.getReceipts(),
        dataService.getCateringEvents(),
        dataService.getUsers(),
      ]);

      setState({ currentUser: appUser, transactions, receipts, cateringEvents, users, restaurants });

      // Route based on access level
      if (isSuperAdmin(appUser.email)) {
        setCurrentScreen('DASHBOARD');
      } else if (appUser.restaurant_id) {
        setCurrentScreen('DASHBOARD');
      } else {
        // No restaurant assigned — show request access screen
        setState(prev => ({ ...prev, restaurants }));
        setCurrentScreen('REQUEST_ACCESS');
      }
    } catch (e) {
      console.error('Failed to load data:', e);
      setAuthError('Failed to load app data. Please try again.');
    }
  };

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const user: User = JSON.parse(stored);
        loadDataAndEnter(user).finally(() => setIsInitializing(false));
      } catch {
        localStorage.removeItem(SESSION_KEY);
        setIsInitializing(false);
      }
    } else {
      setIsInitializing(false);
    }
  }, []);

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    setAuthError(undefined);
    if (!credentialResponse.credential) {
      setAuthError('No credential received from Google.');
      return;
    }

    const profile = decodeGoogleJwt(credentialResponse.credential);
    if (!profile?.email) {
      setAuthError('Could not read profile from Google.');
      return;
    }

    try {
      let appUser = await dataService.getUserByEmail(profile.email);
      if (!appUser) {
        appUser = await dataService.createUserFromAuth({
          id: profile.sub,
          name: profile.name || profile.email.split('@')[0],
          email: profile.email,
          photo: profile.picture,
        });
      }

      if (appUser.status !== 'Active') {
        setAuthError('Your account is inactive. Contact the admin.');
        return;
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(appUser));
      await loadDataAndEnter(appUser);
    } catch (e) {
      console.error('Sign-in error:', e);
      setAuthError('Sign-in failed. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setState({ currentUser: null, transactions: [], receipts: [], cateringEvents: [], users: [], restaurants: [] });
    setSimulatedRole(null);
    setActiveRestaurantId(null);
    setActiveRestaurantIdState(null);
    setCurrentScreen('LOGIN');
  };

  const handleSwitchRestaurant = async (restaurantId: string) => {
    if (!state.currentUser) return;
    setIsInitializing(true);
    await loadDataAndEnter(state.currentUser, restaurantId);
    setIsInitializing(false);
  };

  const handleTransactionSubmit = async (transaction: Transaction) => {
    await dataService.saveTransaction(transaction);
    setState(prev => ({ ...prev, transactions: [transaction, ...prev.transactions] }));
    setCurrentScreen('CASH_MANAGER');
  };

  const handleReceiptSubmit = async (receipt: Receipt) => {
    await dataService.saveReceipt(receipt);
    setState(prev => ({ ...prev, receipts: [receipt, ...prev.receipts] }));
    setCurrentScreen('RECEIPTS_MANAGER');
  };

  const handleCateringSubmit = async (event: CateringEvent) => {
    await dataService.saveCateringEvent(event);
    setState(prev => ({ ...prev, cateringEvents: [event, ...prev.cateringEvents] }));
    setCurrentScreen('CATERING_MANAGER');
  };

  const handleCateringPaymentSubmit = async (updatedEvent: CateringEvent) => {
    await dataService.updateCateringEvent(updatedEvent);
    const updatedEvents = state.cateringEvents.map(e =>
      e.id === updatedEvent.id ? updatedEvent : e
    );

    let updatedTransactions = state.transactions;
    if (updatedEvent.payment_method === 'Cash' || updatedEvent.payment_method === 'Zelle') {
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        trans_type: 'Income',
        category: 'Catering Order',
        amount: updatedEvent.amount || 0,
        logged_by: state.currentUser?.name || 'System',
        reference_details: `Payment from ${updatedEvent.ordering_person_name}`,
        fund_source: 'Pool',
      };
      await dataService.saveTransaction(transaction);
      updatedTransactions = [transaction, ...state.transactions];
    }

    setState(prev => ({ ...prev, cateringEvents: updatedEvents, transactions: updatedTransactions }));
    setCurrentScreen('CATERING_MANAGER');
    setSelectedEvent(null);
  };

  const handleUserSubmit = async (userData: User) => {
    await dataService.updateUser(userData);
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userData.id ? userData : u),
      currentUser: prev.currentUser?.id === userData.id ? userData : prev.currentUser,
    }));
    if (state.currentUser?.id === userData.id) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    }
    setCurrentScreen('USER_MANAGER');
    setSelectedUser(null);
  };

  const handleUserDelete = async (userId: string) => {
    await dataService.deleteUser(userId);
    setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
  };

  const handleOrderCreated = (order: Order) => {
    setSelectedOrder(order);
    setCurrentScreen('ORDER_REVIEW');
  };

  const handleRestaurantCreated = (r: Restaurant) => {
    setState(prev => ({ ...prev, restaurants: [...prev.restaurants, r] }));
  };

  const handleRestaurantUpdated = (r: Restaurant) => {
    setState(prev => ({
      ...prev,
      restaurants: prev.restaurants.map(x => x.id === r.id ? r : x),
    }));
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-8 rounded-full" style={{ borderColor: 'rgba(20,184,166,0.15)' }}></div>
          <div className="absolute top-0 left-0 w-24 h-24 border-8 border-t-ibg-500 rounded-full animate-spin" style={{ borderColor: 'rgba(20,184,166,0.15)', borderTopColor: '#14b8a6' }}></div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 mb-1">
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="16" y="2" width="5" height="11" rx="2.5" fill="#14b8a6" />
              <rect x="16" y="15" width="5" height="11" rx="2.5" fill="#0d9488" />
              <rect x="16" y="28" width="5" height="10" rx="2.5" fill="#14b8a6" />
              <rect x="13" y="12" width="11" height="3.5" rx="1.75" fill="#2dd4bf" />
              <rect x="13" y="25" width="11" height="3.5" rx="1.75" fill="#2dd4bf" />
              <path d="M21 7.5 Q30 3 28 13 Q23 9 21 7.5Z" fill="#14b8a6" />
              <path d="M16 21 Q7 16 9 27 Q14 23 16 21Z" fill="#14b8a6" />
            </svg>
            <span className="font-black text-xs uppercase tracking-[0.2em]" style={{ color: '#14b8a6' }}>Inchin's Bamboo Garden</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight uppercase" style={{ color: 'rgba(255,255,255,0.9)' }}>RestoHub</h2>
          <p className="font-bold text-[10px] uppercase tracking-[0.3em] animate-pulse" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    if (!state.currentUser && currentScreen !== 'LOGIN') {
      setCurrentScreen('LOGIN');
      return null;
    }

    switch (currentScreen) {
      case 'LOGIN':
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
            {/* Decorative orbs */}
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #14b8a6, transparent)' }}></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }}></div>

            <div className="mb-10 text-center animate-fadeIn relative z-10">
              {/* Bamboo Logo */}
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)', boxShadow: '0 8px 32px rgba(20,184,166,0.3)' }}>
                <svg width="52" height="52" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="14" y="2" width="5" height="11" rx="2.5" fill="white" fillOpacity="0.95" />
                  <rect x="14" y="15" width="5" height="11" rx="2.5" fill="white" fillOpacity="0.8" />
                  <rect x="14" y="28" width="5" height="10" rx="2.5" fill="white" fillOpacity="0.95" />
                  <rect x="11" y="12" width="11" height="3.5" rx="1.75" fill="white" fillOpacity="0.6" />
                  <rect x="11" y="25" width="11" height="3.5" rx="1.75" fill="white" fillOpacity="0.6" />
                  <path d="M19 7.5 Q28 3 26 13 Q21 9 19 7.5Z" fill="white" fillOpacity="0.7" />
                  <path d="M14 21 Q5 16 7 27 Q12 23 14 21Z" fill="white" fillOpacity="0.7" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="font-black text-[11px] uppercase tracking-[0.25em]" style={{ color: '#14b8a6' }}>Inchin's Bamboo Garden</p>
                <h1 className="text-3xl font-black tracking-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>RestoHub</h1>
                <p className="font-bold text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.3)' }}>South Charlotte · Management Portal</p>
              </div>
            </div>

            <div className="w-full max-w-xs space-y-4 flex flex-col items-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setAuthError('Google sign-in failed. Please try again.')}
                useOneTap
                shape="pill"
                size="large"
                text="signin_with"
                theme="filled_black"
              />
              {authError && (
                <p className="text-center text-xs text-rose-400 font-medium">{authError}</p>
              )}
            </div>

            <p className="mt-16 text-[9px] font-bold uppercase tracking-widest text-center" style={{ color: 'rgba(255,255,255,0.15)' }}>
              Authorized Staff Only
            </p>
          </div>
        );

      case 'REQUEST_ACCESS':
        return (
          <RequestAccess
            currentUser={state.currentUser!}
            restaurants={state.restaurants}
            onLogout={handleLogout}
          />
        );

      case 'ADMIN_PANEL':
        return (
          <AdminPanel
            currentUser={state.currentUser!}
            restaurants={state.restaurants}
            onRestaurantCreated={handleRestaurantCreated}
            onRestaurantUpdated={handleRestaurantUpdated}
            onBack={() => setCurrentScreen('DASHBOARD')}
          />
        );

      case 'DASHBOARD':
        return (
          <Dashboard
            user={effectiveUser!}
            realUser={state.currentUser!}
            transactions={state.transactions}
            receipts={state.receipts}
            cateringEvents={state.cateringEvents}
            onNavigate={(screen) => setCurrentScreen(screen as Screen)}
            onLogout={handleLogout}
            simulatedRole={simulatedRole}
            onSimulateRole={setSimulatedRole}
            restaurants={state.restaurants}
            activeRestaurantId={activeRestaurantIdState}
            onSwitchRestaurant={handleSwitchRestaurant}
          />
        );

      case 'CASH_MANAGER':
        return (
          <CashManager
            user={effectiveUser!}
            transactions={state.transactions}
            onAddCash={() => setCurrentScreen('ADD_CASH')}
            onPaySalary={() => setCurrentScreen('PAY_SALARY')}
            onBack={() => setCurrentScreen('DASHBOARD')}
          />
        );

      case 'RECEIPTS_MANAGER':
        return (
          <ReceiptsManager
            user={state.currentUser!}
            receipts={state.receipts}
            onAddReceipt={() => setCurrentScreen('ADD_RECEIPT')}
            onBack={() => setCurrentScreen('DASHBOARD')}
          />
        );

      case 'CATERING_MANAGER':
        return (
          <CateringManager
            user={state.currentUser!}
            events={state.cateringEvents}
            onAddCatering={() => setCurrentScreen('ADD_CATERING')}
            onPayCatering={(event) => {
              setSelectedEvent(event);
              setCurrentScreen('ADD_CATERING_PAYMENT');
            }}
            onBack={() => setCurrentScreen('DASHBOARD')}
          />
        );

      case 'USER_MANAGER':
        return (
          <UserManager
            users={state.users}
            onEditUser={(u) => {
              setSelectedUser(u);
              setCurrentScreen('EDIT_USER');
            }}
            onDeleteUser={handleUserDelete}
            onBack={() => setCurrentScreen('DASHBOARD')}
          />
        );

      case 'EDIT_USER':
        return selectedUser ? (
          <div className="min-h-screen flex items-center justify-center p-4">
            <UserForm
              user={selectedUser}
              restaurants={state.restaurants}
              onSubmit={handleUserSubmit}
              onCancel={() => {
                setCurrentScreen('USER_MANAGER');
                setSelectedUser(null);
              }}
            />
          </div>
        ) : null;

      case 'ADD_CASH':
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <AddCashForm
              currentUser={state.currentUser!}
              onSubmit={handleTransactionSubmit}
              onCancel={() => setCurrentScreen('CASH_MANAGER')}
            />
          </div>
        );

      case 'PAY_SALARY':
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <PaySalaryForm
              currentUser={state.currentUser!}
              allUsers={state.users}
              onSubmit={handleTransactionSubmit}
              onCancel={() => setCurrentScreen('CASH_MANAGER')}
            />
          </div>
        );

      case 'ADD_RECEIPT':
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <AddReceiptForm
              currentUser={state.currentUser!}
              onSubmit={handleReceiptSubmit}
              onCancel={() => setCurrentScreen('RECEIPTS_MANAGER')}
            />
          </div>
        );

      case 'ADD_CATERING':
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <AddCateringForm
              currentUser={state.currentUser!}
              onSubmit={handleCateringSubmit}
              onCancel={() => setCurrentScreen('CATERING_MANAGER')}
            />
          </div>
        );

      case 'ADD_CATERING_PAYMENT':
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            {selectedEvent && (
              <AddCateringPaymentForm
                currentUser={state.currentUser!}
                event={selectedEvent}
                onSubmit={handleCateringPaymentSubmit}
                onCancel={() => setCurrentScreen('CATERING_MANAGER')}
              />
            )}
          </div>
        );

      case 'INVENTORY_MANAGER':
        return (
          <InventoryManager
            user={state.currentUser!}
            onCreateOrder={(orderType) => {
              setSelectedOrderType(orderType);
              setCurrentScreen('CREATE_ORDER');
            }}
            onViewOrder={(order, openAddItems) => {
              setSelectedOrder(order);
              setAutoOpenAddItems(openAddItems || false);
              setCurrentScreen('ORDER_REVIEW');
            }}
            onBack={() => setCurrentScreen('DASHBOARD')}
          />
        );

      case 'CREATE_ORDER':
        return (
          <CreateOrderForm
            user={state.currentUser!}
            orderType={selectedOrderType}
            onSubmit={handleOrderCreated}
            onCancel={() => setCurrentScreen('INVENTORY_MANAGER')}
          />
        );

      case 'ORDER_REVIEW':
        return selectedOrder ? (
          <OrderReview
            user={state.currentUser!}
            order={selectedOrder}
            initialShowAddItems={autoOpenAddItems}
            onBack={() => {
              setSelectedOrder(null);
              setAutoOpenAddItems(false);
              setCurrentScreen('INVENTORY_MANAGER');
            }}
            onSubmitted={() => {
              setSelectedOrder(null);
              setAutoOpenAddItems(false);
              setCurrentScreen('INVENTORY_MANAGER');
            }}
            onDeleted={() => {
              setSelectedOrder(null);
              setAutoOpenAddItems(false);
              setCurrentScreen('INVENTORY_MANAGER');
            }}
            onDuplicated={(newOrder) => {
              setSelectedOrder(newOrder);
              setAutoOpenAddItems(true);
            }}
          />
        ) : null;

      default:
        return null;
    }
  };

  const isFullWidth = ['DASHBOARD', 'INVENTORY_MANAGER', 'CREATE_ORDER', 'ORDER_REVIEW', 'ADMIN_PANEL', 'REQUEST_ACCESS'].includes(currentScreen);

  return (
    <div className={`min-h-screen relative flex flex-col overflow-x-hidden ${isFullWidth ? '' : 'max-w-lg mx-auto'}`} style={{ background: 'transparent' }}>
      {renderScreen()}
      {!isFullWidth && (
        <>
          <div className="fixed -top-40 -left-40 w-96 h-96 bg-ibg-100 rounded-full blur-[100px] opacity-30 pointer-events-none z-[-1]"></div>
          <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-amber-100 rounded-full blur-[100px] opacity-30 pointer-events-none z-[-1]"></div>
        </>
      )}
    </div>
  );
};

export default App;
