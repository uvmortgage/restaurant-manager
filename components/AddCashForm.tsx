
import React, { useState } from 'react';
import { User, Transaction, IncomeCategory } from '../types';
import { INCOME_CATEGORIES } from '../constants';

interface AddCashFormProps {
  currentUser: User;
  onSubmit: (transaction: Transaction) => void;
  onCancel: () => void;
}

const AddCashForm: React.FC<AddCashFormProps> = ({ currentUser, onSubmit, onCancel }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<IncomeCategory>('Catering Order');
  const [details, setDetails] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      trans_type: 'Income',
      category,
      amount: parseFloat(amount),
      logged_by: currentUser.name,
      reference_details: details,
      fund_source: 'Pool',
      receipt_photo: photo,
    };

    onSubmit(newTransaction);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-slideUp">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Add Cash (IN)</h2>
        <button onClick={onCancel} className="text-slate-400 p-1 hover:text-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as IncomeCategory)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          >
            {INCOME_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-xl font-semibold"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reference Details</label>
          <textarea
            placeholder="Order #, Event name, etc."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Receipt / Confirmation</label>
          <div className="flex items-center gap-4">
            <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              {photo ? (
                <img src={photo} className="w-full h-full object-cover rounded-lg" alt="Preview" />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  <span className="text-[10px] mt-1 font-medium">Capture</span>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
            </label>
            <div className="flex-1">
              <p className="text-sm text-slate-500 font-medium">Log By</p>
              <p className="text-sm text-slate-800 font-bold">{currentUser.name}</p>
              <p className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">{currentUser.role}</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 active:scale-95 transition-all mt-4"
        >
          Confirm Income
        </button>
      </form>
    </div>
  );
};

export default AddCashForm;
