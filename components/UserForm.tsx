
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface UserFormProps {
  user?: User;
  onSubmit: (userData: User) => void;
  onCancel: () => void;
}

const ROLES: UserRole[] = ['Owner', 'Manager', 'Dish Washer', 'Food Runner', 'Front Staff'];

const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, onCancel }) => {
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'Front Staff');
  const [pin, setPin] = useState(user?.pin || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !pin || pin.length < 4) return;

    const userData: User = {
      id: user?.id || crypto.randomUUID(),
      name,
      role,
      pin,
      status: user?.status || 'Active',
      photo: user?.photo
    };

    onSubmit(userData);
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-slideUp">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800">{user ? 'Edit User' : 'Add User'}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Staff Management</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
          <input
            type="text"
            required
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 transition-all outline-none font-bold text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 transition-all outline-none text-sm font-bold text-slate-700"
          >
            {ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Login PIN (4-6 digits)</label>
          <input
            type="text"
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={6}
            minLength={4}
            required
            placeholder="****"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 transition-all outline-none font-black text-slate-800 tracking-widest"
          />
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 active:scale-95 transition-all mt-4"
        >
          {user ? 'Update User' : 'Create User Account'}
        </button>
      </form>
    </div>
  );
};

export default UserForm;
