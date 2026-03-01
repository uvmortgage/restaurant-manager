
import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { User, Transaction, Receipt, CateringEvent, AppState } from './types';
import { Order, OrderType } from './inventory-types';
import { dataService } from './services/dataService';
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

const SESSION_KEY = 'restohub_session';

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
  | 'ORDER_REVIEW';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    transactions: [],
    receipts: [],
    cateringEvents: [],
    users: [],
  });
  const [currentScreen, setCurrentScreen] = useState<Screen>('LOGIN');
  const [selectedEvent, setSelectedEvent] = useState<CateringEvent | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType>('WEEKLY_FOOD');
  const [isInitializing, setIsInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | undefined>();

  const loadDataAndEnter = async (appUser: User) => {
    try {
      const [transactions, receipts, cateringEvents, users] = await Promise.all([
        dataService.getTransactions(),
        dataService.getReceipts(),
        dataService.getCateringEvents(),
        dataService.getUsers(),
      ]);
      setState({ currentUser: appUser, transactions, receipts, cateringEvents, users });
      setCurrentScreen('DASHBOARD');
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
    setState({ currentUser: null, transactions: [], receipts: [], cateringEvents: [], users: [] });
    setCurrentScreen('LOGIN');
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
    // Keep localStorage in sync if the current user was edited
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

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-8 border-indigo-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-24 h-24 border-8 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2 uppercase">RestoHub</h2>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] animate-pulse">Loading...</p>
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
          <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 relative overflow-hidden">
            <div className="mb-12 text-center animate-fadeIn relative z-10">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">RESTO<span className="text-indigo-600">HUB</span></h1>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Restaurant Management Portal</p>
            </div>

            <div className="w-full max-w-xs space-y-4 flex flex-col items-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setAuthError('Google sign-in failed. Please try again.')}
                useOneTap
                shape="pill"
                size="large"
                text="signin_with"
              />
              {authError && (
                <p className="text-center text-xs text-rose-500 font-medium">{authError}</p>
              )}
            </div>

            <p className="mt-16 text-[9px] text-slate-300 font-bold uppercase tracking-widest text-center">
              Authorized Staff Only
            </p>
          </div>
        );

      case 'DASHBOARD':
        return (
          <Dashboard
            user={state.currentUser!}
            transactions={state.transactions}
            receipts={state.receipts}
            cateringEvents={state.cateringEvents}
            onNavigate={(screen) => setCurrentScreen(screen as Screen)}
            onLogout={handleLogout}
          />
        );

      case 'CASH_MANAGER':
        return (
          <CashManager
            user={state.currentUser!}
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
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <UserForm
              user={selectedUser}
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
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
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
            onViewOrder={(order) => {
              setSelectedOrder(order);
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
            onBack={() => {
              setSelectedOrder(null);
              setCurrentScreen('INVENTORY_MANAGER');
            }}
            onSubmitted={() => {
              setSelectedOrder(null);
              setCurrentScreen('INVENTORY_MANAGER');
            }}
            onDeleted={() => {
              setSelectedOrder(null);
              setCurrentScreen('INVENTORY_MANAGER');
            }}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-slate-50 shadow-2xl relative flex flex-col overflow-x-hidden">
      {renderScreen()}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-indigo-100 rounded-full blur-[100px] opacity-40 pointer-events-none z-[-1]"></div>
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-emerald-100 rounded-full blur-[100px] opacity-40 pointer-events-none z-[-1]"></div>
    </div>
  );
};

export default App;
