
import React, { useState } from 'react';
import { User, Receipt, ReceiptCategory } from '../types';
import { RECEIPT_CATEGORIES } from '../constants';

interface AddReceiptFormProps {
  currentUser: User;
  onSubmit: (receipt: Receipt) => void;
  onCancel: () => void;
}

const AddReceiptForm: React.FC<AddReceiptFormProps> = ({ currentUser, onSubmit, onCancel }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ReceiptCategory>('RD');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsPdf(file.type === 'application/pdf');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !photo) return;

    const newReceipt: Receipt = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      category,
      amount: parseFloat(amount),
      photo,
      logged_by: currentUser.name,
      status: 'Synced',
    };

    onSubmit(newReceipt);
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-slideUp">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800">Add Receipt</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Upload to Category Folder</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative group">
          <label className={`block w-full h-48 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
            photo ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
          }`}>
            {photo ? (
              isPdf ? (
                <div className="flex flex-col items-center justify-center text-rose-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M9 15h3a1.5 1.5 0 0 0 0-3H9v4Z"/></svg>
                  <p className="text-sm font-black mt-2">PDF Document Ready</p>
                </div>
              ) : (
                <img src={photo} alt="Receipt preview" className="w-full h-full object-contain" />
              )
            ) : (
              <div className="text-center p-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                </div>
                <p className="text-sm font-bold text-slate-600">Image or PDF</p>
                <p className="text-[10px] text-slate-400 font-medium">Capture or browse files</p>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Category (Folder)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ReceiptCategory)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold text-slate-700"
            >
              {RECEIPT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Total ($)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-black text-slate-800"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!photo || !amount}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 active:scale-95 transition-all mt-4 disabled:opacity-30 disabled:grayscale"
        >
          Store Receipt
        </button>
      </form>
    </div>
  );
};

export default AddReceiptForm;
