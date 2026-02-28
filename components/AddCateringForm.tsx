
import React, { useState } from 'react';
import { User, CateringEvent } from '../types';

interface AddCateringFormProps {
  currentUser: User;
  onSubmit: (event: CateringEvent) => void;
  onCancel: () => void;
}

const AddCateringForm: React.FC<AddCateringFormProps> = ({ currentUser, onSubmit, onCancel }) => {
  const [orderingPersonName, setOrderingPersonName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!orderingPersonName || !date) return;

    const newEvent: CateringEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      event_date: date,
      ordering_person_name: orderingPersonName,
      phone_number: phoneNumber || undefined,
      photo: photo || undefined,
      status: 'Booked',
      logged_by: currentUser.name,
    };

    onSubmit(newEvent);
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-slideUp">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800">Add Catering</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Step 1: Event Booking</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative group">
          <label className={`block w-full h-32 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
            photo ? 'border-blue-300 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
          }`}>
            {photo ? (
              isPdf ? (
                <div className="flex flex-col items-center justify-center text-rose-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M9 15h3a1.5 1.5 0 0 0 0-3H9v4Z"/></svg>
                  <p className="text-[10px] font-black uppercase mt-1">PDF READY</p>
                </div>
              ) : (
                <img src={photo} alt="Event" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="text-center p-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                <p className="text-xs font-bold text-slate-600">Photo or PDF</p>
              </div>
            )}
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ordering Person Name</label>
          <input
            type="text"
            required
            placeholder="e.g. John Smith"
            value={orderingPersonName}
            onChange={(e) => setOrderingPersonName(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number (Optional)</label>
          <input
            type="tel"
            placeholder="e.g. +1 234 567 8900"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Event Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold text-slate-800"
          />
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 active:scale-95 transition-all mt-4"
        >
          Book Catering Event
        </button>
      </form>
    </div>
  );
};

export default AddCateringForm;
