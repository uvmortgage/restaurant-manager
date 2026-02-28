
import React, { useState, useEffect, useCallback } from 'react';
import { User, Transaction, Receipt, CateringEvent, AppState, CloudConfig } from './types';
import { storageService } from './services/storageService';
import { cloudService } from './services/cloudService';
import PinPad from './components/PinPad';
import Dashboard from './components/Dashboard';
import CashManager from './components/CashManager';
import ReceiptsManager from './components/ReceiptsManager';
import CateringManager from './components/CateringManager';
import UserManager from './components/UserManager';
import UserForm from './components/UserForm';
import CloudSettings from './components/CloudSettings';
import AddCashForm from './components/AddCashForm';
import PaySalaryForm from './components/PaySalaryForm';
import AddReceiptForm from './components/AddReceiptForm';
import AddCateringForm from './components/AddCateringForm';
import AddCateringPaymentForm from './components/AddCateringPaymentForm';

type Screen = 
  | 'LOGIN' 
  | 'DASHBOARD' 
  | 'CASH_MANAGER' 
  | 'RECEIPTS_MANAGER' 
  | 'CATERING_MANAGER'
  | 'USER_MANAGER'
  | 'ADD_USER'
  | 'EDIT_USER'
  | 'CLOUD_SETTINGS'
  | 'ADD_CASH' 
  | 'PAY_SALARY' 
  | 'ADD_RECEIPT'
  | 'ADD_CATERING'
  | 'ADD_CATERING_PAYMENT';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    transactions: storageService.getTransactions(),
    receipts: storageService.getReceipts(),
    cateringEvents: storageService.getCateringEvents(),
    users: storageService.getUsers(),
    cloudConfig: storageService.getCloudConfig(),
    isSyncing: false,
  });
  const [currentScreen, setCurrentScreen] = useState<Screen>('LOGIN');
  const [selectedEvent, setSelectedEvent] = useState<CateringEvent | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string | undefined>();
  const [isInitializing, setIsInitializing] = useState(true);
  const [syncError, setSyncError] = useState(false);
  const [initMessage, setInitMessage] = useState('Verifying Cloud Connection...');

  // Initial Load & Pull Sync
  useEffect(() => {
    const initApp = async () => {
      const cloudConfig = storageService.getCloudConfig();
      
      // Load local data immediately to prevent empty states
      setState(prev => ({
        ...prev,
        transactions: storageService.getTransactions(),
        receipts: storageService.getReceipts(),
        cateringEvents: storageService.getCateringEvents(),
        users: storageService.getUsers(),
        cloudConfig
      }));

      if (cloudConfig?.syncUrl) {
        setInitMessage('Fetching Latest Data from Sheet...');
        setState(prev => ({ ...prev, isSyncing: true }));
        
        try {
          const cloudData = await cloudService.fetchLatest(cloudConfig);
          if (cloudData) {
            setInitMessage('Cloud Connected! Syncing Local Store...');
            const cloudUsers = cloudData.users as User[];
            
            setState(prev => {
              const newState = {
                ...prev,
                users: (Array.isArray(cloudUsers) && cloudUsers.length > 0) ? cloudUsers : prev.users,
                transactions: (Array.isArray(cloudData.transactions) && cloudData.transactions.length > 0) ? (cloudData.transactions as Transaction[]) : prev.transactions,
                receipts: (Array.isArray(cloudData.receipts) && cloudData.receipts.length > 0) ? (cloudData.receipts as Receipt[]) : prev.receipts,
                cateringEvents: (Array.isArray(cloudData.cateringEvents) && cloudData.cateringEvents.length > 0) ? (cloudData.cateringEvents as CateringEvent[]) : prev.cateringEvents,
                isSyncing: false
              };
              // Save cloud users to local storage for offline login capability
              localStorage.setItem('cashpool_users', JSON.stringify(newState.users));
              return newState;
            });
            setSyncError(false);
          } else {
            console.warn("Could not reach cloud. Working with local data.");
            setSyncError(true);
            setState(prev => ({ ...prev, isSyncing: false }));
          }
        } catch (e) {
          console.error("Critical Cloud Fetch Error:", e);
          setSyncError(true);
          setState(prev => ({ ...prev, isSyncing: false }));
        }
      }

      // Small delay to ensure splash is visible for UX
      setTimeout(() => setIsInitializing(false), 1200);
    };

    initApp();
  }, []);

  // Sync Logic (Push)
  const triggerCloudSync = useCallback(async (newState: AppState) => {
    if (!newState.cloudConfig?.syncUrl) return;
    
    setState(prev => ({ ...prev, isSyncing: true }));
    setSyncError(false);
    
    const success = await cloudService.sync(newState.cloudConfig, {
      transactions: newState.transactions,
      receipts: newState.receipts,
      cateringEvents: newState.cateringEvents,
      users: newState.users
    });
    
    setState(prev => ({ ...prev, isSyncing: false }));
    setSyncError(!success);
  }, []);

  const handleManualSync = async () => {
    if (!state.cloudConfig?.syncUrl) return;
    setState(prev => ({ ...prev, isSyncing: true }));
    setSyncError(false);
    
    try {
      const cloudData = await cloudService.fetchLatest(state.cloudConfig);
      if (cloudData) {
        setState(prev => {
          const newState = {
            ...prev,
            users: (Array.isArray(cloudData.users) && cloudData.users.length > 0) ? (cloudData.users as User[]) : prev.users,
            transactions: (Array.isArray(cloudData.transactions) && cloudData.transactions.length > 0) ? (cloudData.transactions as Transaction[]) : prev.transactions,
            receipts: (Array.isArray(cloudData.receipts) && cloudData.receipts.length > 0) ? (cloudData.receipts as Receipt[]) : prev.receipts,
            cateringEvents: (Array.isArray(cloudData.cateringEvents) && cloudData.cateringEvents.length > 0) ? (cloudData.cateringEvents as CateringEvent[]) : prev.cateringEvents,
            isSyncing: false
          };
          localStorage.setItem('cashpool_users', JSON.stringify(newState.users));
          return newState;
        });
      } else {
        setSyncError(true);
        setState(prev => ({ ...prev, isSyncing: false }));
      }
    } catch (e) {
      setSyncError(true);
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const handleLogin = (pin: string) => {
    // SECURITY: Trim and stringify to handle auto-converted numeric fields from Google Sheets
    const user = state.users.find(u => 
      String(u.pin).trim() === pin.trim() && 
      u.status === 'Active'
    );
    
    if (user) {
      setState(prev => ({ ...prev, currentUser: user }));
      setCurrentScreen('DASHBOARD');
      setLoginError(undefined);
    } else {
      setLoginError('Invalid PIN. Check connection or credentials.');
    }
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    setCurrentScreen('LOGIN');
  };

  const handleTransactionSubmit = (transaction: Transaction) => {
    const updatedTransactions = storageService.saveTransaction(transaction);
    const newState = { ...state, transactions: updatedTransactions };
    setState(newState);
    triggerCloudSync(newState);
    setCurrentScreen('CASH_MANAGER');
  };

  const handleReceiptSubmit = (receipt: Receipt) => {
    const updatedReceipts = storageService.saveReceipt(receipt);
    const newState = { ...state, receipts: updatedReceipts };
    setState(newState);
    triggerCloudSync(newState);
    setCurrentScreen('RECEIPTS_MANAGER');
  };

  const handleCateringSubmit = (event: CateringEvent) => {
    const updatedEvents = storageService.saveCateringEvent(event);
    const newState = { ...state, cateringEvents: updatedEvents };
    setState(newState);
    triggerCloudSync(newState);
    setCurrentScreen('CATERING_MANAGER');
  };

  const handleCateringPaymentSubmit = (updatedEvent: CateringEvent) => {
    const updatedEvents = storageService.updateCateringEvent(updatedEvent);
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
      updatedTransactions = storageService.saveTransaction(transaction);
    }
    
    const newState = { ...state, cateringEvents: updatedEvents, transactions: updatedTransactions };
    setState(newState);
    triggerCloudSync(newState);
    setCurrentScreen('CATERING_MANAGER');
    setSelectedEvent(null);
  };

  const handleUserSubmit = (userData: User) => {
    let updatedUsers;
    if (currentScreen === 'EDIT_USER') {
      updatedUsers = storageService.updateUser(userData);
    } else {
      updatedUsers = storageService.saveUser(userData);
    }
    const newState = { ...state, users: updatedUsers };
    setState(newState);
    triggerCloudSync(newState);
    setCurrentScreen('USER_MANAGER');
    setSelectedUser(null);
  };

  const handleUserDelete = (userId: string) => {
    const updatedUsers = storageService.deleteUser(userId);
    const newState = { ...state, users: updatedUsers };
    setState(newState);
    triggerCloudSync(newState);
  };

  const handleCloudConfigSave = (config: CloudConfig) => {
    storageService.saveCloudConfig(config);
    const newState = { ...state, cloudConfig: config };
    setState(newState);
    handleManualSync();
    setCurrentScreen('DASHBOARD');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
           <div className="w-24 h-24 border-8 border-indigo-100 rounded-full"></div>
           <div className="absolute top-0 left-0 w-24 h-24 border-8 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2 uppercase">RestoHub Cloud</h2>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] animate-pulse">
          {initMessage}
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
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Portal Version 9.0</p>
              
              <div className="mt-6 flex items-center justify-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                 <div className={`w-2.5 h-2.5 rounded-full ${syncError ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                 <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                   {syncError ? 'Server Offline' : state.isSyncing ? 'Syncing...' : 'Live Connected'}
                 </span>
              </div>
            </div>
            
            <PinPad onComplete={handleLogin} error={loginError} />
            
            <p className="mt-12 text-[9px] text-slate-300 font-bold uppercase tracking-widest text-center">
              Secure Staff Gateway Only<br/>Cloud Sync Enabled
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
            cloudConfig={state.cloudConfig}
            isSyncing={state.isSyncing}
            syncError={syncError}
            onManualSync={handleManualSync}
            onNavigate={(screen) => setCurrentScreen(screen as any)}
            onLogout={handleLogout}
          />
        );
      case 'CLOUD_SETTINGS':
        return (
          <CloudSettings
            config={state.cloudConfig}
            onSave={handleCloudConfigSave}
            onBack={() => setCurrentScreen('DASHBOARD')}
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
            onAddUser={() => setCurrentScreen('ADD_USER')}
            onEditUser={(u) => {
              setSelectedUser(u);
              setCurrentScreen('EDIT_USER');
            }}
            onDeleteUser={handleUserDelete}
            onBack={() => setCurrentScreen('DASHBOARD')}
          />
        );
      case 'ADD_USER':
      case 'EDIT_USER':
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <UserForm
              user={currentScreen === 'EDIT_USER' ? selectedUser! : undefined}
              onSubmit={handleUserSubmit}
              onCancel={() => {
                setCurrentScreen('USER_MANAGER');
                setSelectedUser(null);
              }}
            />
          </div>
        );
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
