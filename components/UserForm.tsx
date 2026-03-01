
import React, { useState } from 'react';
import { User, UserRole } from '../types';

interface UserFormProps {
  user: User;
  onSubmit: (userData: User) => void;
  onCancel: () => void;
}

const ROLES: UserRole[] = ['Owner', 'Manager', 'Front Staff', 'Food Runner', 'Dish Washer', 'User'];

const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, onCancel }) => {
  const [role, setRole] = useState<UserRole>(user.role);
  const [status, setStatus] = useState<'Active' | 'Inactive'>(user.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...user, role, status });
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-slideUp">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800">Edit Role</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Staff Management</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      {/* User identity (read-only) */}
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl mb-6">
        <img
          src={user.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
          alt={user.name}
          className="w-12 h-12 rounded-full object-cover border border-slate-200"
        />
        <div>
          <p className="font-bold text-slate-800 text-sm">{user.name}</p>
          <p className="text-[11px] text-slate-400">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 transition-all outline-none text-sm font-bold text-slate-700"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 active:scale-95 transition-all mt-4"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default UserForm;
