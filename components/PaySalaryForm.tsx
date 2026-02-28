
import React, { useState } from 'react';
import { User, Transaction } from '../types';
import SignaturePad from './SignaturePad';

interface PaySalaryFormProps {
  currentUser: User;
  allUsers: User[];
  onSubmit: (transaction: Transaction) => void;
  onCancel: () => void;
}

const PaySalaryForm: React.FC<PaySalaryFormProps> = ({ currentUser, allUsers, onSubmit, onCancel }) => {
  const [amount, setAmount] = useState('');
  const [payeeId, setPayeeId] = useState('');
  const [signature, setSignature] = useState<string | undefined>(undefined);

  const activeStaff = allUsers.filter(u => u.status === 'Active');
  const selectedPayee = activeStaff.find(u => u.id === payeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !payeeId || !signature || parseFloat(amount) <= 0) return;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      trans_type: 'Expense',
      category: 'Salary Payment',
      amount: parseFloat(amount),
      logged_by: currentUser.name,
      payee_name: selectedPayee?.name,
      reference_details: `Payment to ${selectedPayee?.name} (${selectedPayee?.role})`,
      fund_source: 'Pool',
      signature: signature,
    };

    onSubmit(newTransaction);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-slideUp">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Pay Salary (OUT)</h2>
        <button onClick={onCancel} className="text-slate-400 p-1 hover:text-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Payee (Staff Name)</label>
          <select
            value={payeeId}
            onChange={(e) => setPayeeId(e.target.value)}
            required
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          >
            <option value="">Select Payee...</option>
            {activeStaff.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {selectedPayee && (
            <p className="text-xs text-indigo-600 font-medium mt-1">Role: {selectedPayee.role}</p>
          )}
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
          <label className="block text-sm font-medium text-slate-700 mb-2">Payee Signature Required</label>
          <SignaturePad 
            onSave={(sig) => setSignature(sig)} 
            onClear={() => setSignature(undefined)} 
          />
        </div>

        <div className="p-3 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-500 font-medium">Logged By (Payer)</p>
          <p className="text-sm text-slate-800 font-bold">{currentUser.name}</p>
        </div>

        <button
          type="submit"
          disabled={!signature || !payeeId || !amount}
          className="w-full py-4 bg-rose-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-rose-700 active:scale-95 transition-all mt-4 disabled:opacity-50 disabled:grayscale"
        >
          Confirm Payment
        </button>
      </form>
    </div>
  );
};

export default PaySalaryForm;
