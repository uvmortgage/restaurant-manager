
import React, { useState } from 'react';
import { User, CateringEvent, PaymentMethod } from '../types';

interface AddCateringPaymentFormProps {
  currentUser: User;
  event: CateringEvent;
  onSubmit: (updatedEvent: CateringEvent) => void;
  onCancel: () => void;
}

const AddCateringPaymentForm: React.FC<AddCateringPaymentFormProps> = ({ currentUser, event, onSubmit, onCancel }) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amount, setAmount] = useState('');
  const [payerName, setPayerName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Amount is strictly required for Cash/Zelle as per instruction, but good practice for all steps here
    if (!amount || ( (paymentMethod === 'Cash' || paymentMethod === 'Zelle') && !payerName )) {
      alert("Please provide the amount and the person's name for Cash/Zelle payments.");
      return;
    }

    const updatedEvent: CateringEvent = {
      ...event,
      status: 'Paid',
      payment_method: paymentMethod,
      amount: parseFloat(amount),
      payer_name: payerName || undefined,
      payment_timestamp: new Date().toISOString(),
      payment_logged_by: currentUser.name,
    };

    onSubmit(updatedEvent);
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-slideUp">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800">Add Payment</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Step 2: Payment Receipt</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
        <h3 className="text-sm font-bold text-blue-900">{event.ordering_person_name}</h3>
        <p className="text-xs text-blue-700">Event Date: {new Date(event.event_date).toLocaleDateString()}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Method of Payment</label>
          <div className="grid grid-cols-3 gap-2">
            {(['Card', 'Cash', 'Zelle'] as PaymentMethod[]).map(method => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-2 rounded-xl text-xs font-black border transition-all ${
                  paymentMethod === method 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl animate-fadeIn">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount Received ($)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none font-black text-slate-800"
            />
          </div>
          {(paymentMethod === 'Cash' || paymentMethod === 'Zelle') && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Name of Person Paying</label>
              <input
                type="text"
                required
                placeholder="Who paid?"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold text-slate-800"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-700 active:scale-95 transition-all mt-4"
        >
          Confirm Payment
        </button>
      </form>
    </div>
  );
};

export default AddCateringPaymentForm;
