
import React, { useState } from 'react';
import { User, Restaurant } from '../types';
import { dataService } from '../services/dataService';

interface RequestAccessProps {
  currentUser: User;
  restaurants: Restaurant[];
  onLogout: () => void;
}

type Step = 'form' | 'success';

const RequestAccess: React.FC<RequestAccessProps> = ({ currentUser, restaurants, onLogout }) => {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('form');

  const activeRestaurants = restaurants.filter(r => r.is_active);

  const selectedRestaurant = activeRestaurants.find(r => r.id === selectedRestaurantId);

  const handleSubmit = async () => {
    if (!selectedRestaurantId) {
      setError('Please select a restaurant.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await dataService.submitAccessRequest({
        user_email: currentUser.email,
        user_name: currentUser.name,
        restaurant_id: selectedRestaurantId,
      });

      // Open email client as a fallback notification
      if (selectedRestaurant) {
        const subject = encodeURIComponent(`RestoHub Access Request — ${currentUser.name}`);
        const body = encodeURIComponent(
          `Hello,\n\n${currentUser.name} (${currentUser.email}) is requesting access to ${selectedRestaurant.name}${selectedRestaurant.location ? ` · ${selectedRestaurant.location}` : ''}.\n\nPlease log in to the RestoHub Admin Panel to approve or reject this request.\n\nThank you.`
        );
        const mailtoLink = `mailto:${selectedRestaurant.admin_email}?subject=${subject}&body=${body}`;
        window.open(mailtoLink, '_blank');
      }

      setStep('success');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-ibg-100 rounded-full blur-[100px] opacity-30 pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-amber-100 rounded-full blur-[100px] opacity-30 pointer-events-none" />

      <div className="w-full max-w-sm animate-fadeIn relative z-10">

        {step === 'form' ? (
          <>
            {/* Logo / brand */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-ibg-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-ibg-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Request Access</h1>
              <p className="text-slate-500 text-sm font-medium mt-1">You don't have access to any restaurant yet.</p>
            </div>

            {/* User info */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-ibg-50 flex items-center justify-center flex-shrink-0">
                {currentUser.photo
                  ? <img src={currentUser.photo} alt="" className="w-full h-full object-cover" />
                  : <span className="text-ibg-600 font-black">{currentUser.name[0]}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-slate-800">{currentUser.name}</p>
                <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {currentUser.role}
              </span>
            </div>

            {/* Request form */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                  Select Restaurant
                </label>
                {activeRestaurants.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <p className="text-sm font-bold">No restaurants available</p>
                    <p className="text-xs mt-1">Contact your administrator</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeRestaurants.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRestaurantId(r.id)}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          selectedRestaurantId === r.id
                            ? 'border-ibg-600 bg-ibg-50'
                            : 'border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                          selectedRestaurantId === r.id ? 'bg-ibg-600' : 'bg-slate-100'
                        }`}>
                          {selectedRestaurantId === r.id
                            ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            : <span>🍽️</span>
                          }
                        </div>
                        <div>
                          <p className={`font-black text-sm ${selectedRestaurantId === r.id ? 'text-ibg-700' : 'text-slate-800'}`}>
                            {r.name}
                          </p>
                          {r.location && (
                            <p className="text-[11px] text-slate-500 font-medium">{r.location}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-rose-500 font-medium text-center">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedRestaurantId || activeRestaurants.length === 0}
                className="w-full bg-ibg-600 text-white font-black uppercase tracking-widest text-sm py-3.5 rounded-xl hover:bg-ibg-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Sending request…' : 'Request Access'}
              </button>

              <p className="text-[10px] text-slate-400 text-center font-medium">
                Your request will be sent to the restaurant admin for approval.
              </p>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={onLogout}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest transition-colors"
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          /* Success state */
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Request Sent!</h2>
            <p className="text-slate-500 text-sm font-medium mb-1">
              Your access request for
            </p>
            <p className="text-ibg-600 font-black text-base mb-1">{selectedRestaurant?.name}</p>
            {selectedRestaurant?.location && (
              <p className="text-slate-400 text-xs font-medium mb-4">{selectedRestaurant.location}</p>
            )}
            <p className="text-slate-500 text-sm font-medium mb-8">
              has been submitted. The admin will review and approve your request shortly.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left mb-6">
              <p className="text-amber-700 font-black text-xs uppercase tracking-widest mb-1">What's next?</p>
              <p className="text-amber-700 text-sm font-medium">
                Once approved, sign out and sign back in — you'll have full access to the restaurant dashboard.
              </p>
            </div>

            <button
              onClick={onLogout}
              className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-sm py-3.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestAccess;
