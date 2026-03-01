
import React, { useState, useEffect } from 'react';
import { User, Transaction, Receipt, CateringEvent, AppState } from './types';
import { Order } from './inventory-types';
import { supabase } from './services/supabaseClient';
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
  const [isInitializing, setIsInitializing] = useState(true);
  const [authError, setAuthError] = useState<string | undefined>();
  const [signingIn, setSigningIn] = useState(false);

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
    }
  };

  const resolveAuthUser = async (authUser: { id: string; email: string; user_metadata: Record<string, string> }): Promise<void> => {
    let appUser = await dataService.getUserByEmail(authUser.email);
    if (!appUser) {
      appUser = await dataService.createUserFromAuth({
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        email: authUser.email,
        photo: authUser.user_metadata?.avatar_url,
      });
    }
    if (appUser.status !== 'Active') {
      await supabase.auth.signOut();
      setAuthError('Your account is inactive. Contact the admin.');
      return;
    }
    await loadDataAndEnter(appUser);
  };

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await resolveAuthUser(session.user as any);
      }
      setIsInitializing(false);
    });

    // Listen for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSigningIn(false);
        await resolveAuthUser(session.user as any);
      } else if (event === 'SIGNED_OUT') {
        setState({ currentUser: null, transactions: [], receipts: [], cateringEvents: [], users: [] });
        setCurrentScreen('LOGIN');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(undefined);
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(error.message);
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
      // Update currentUser if they edited themselves
      currentUser: prev.currentUser?.id === userData.id ? userData : prev.currentUser,
    }));
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
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] animate-pulse">
          Loading...
        </p>
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

            <div className="w-full max-w-xs space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl py-4 px-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                <span className="font-bold text-slate-700 text-sm">
                  {signingIn ? 'Redirecting to Google...' : 'Sign in with Google'}
                </span>
              </button>

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
            onCreateOrder={() => setCurrentScreen('CREATE_ORDER')}
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
