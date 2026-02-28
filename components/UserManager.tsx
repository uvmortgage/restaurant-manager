
import React from 'react';
import { User } from '../types';

interface UserManagerProps {
  users: User[];
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onBack: () => void;
}

const UserManager: React.FC<UserManagerProps> = ({ users, onAddUser, onEditUser, onDeleteUser, onBack }) => {
  return (
    <div className="flex flex-col h-full w-full max-w-xl mx-auto p-4 sm:p-6 pb-24 animate-slideInRight">
      <header className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900">User Manager</h1>
        <button 
          onClick={onAddUser}
          className="bg-violet-600 text-white p-2 rounded-xl shadow-lg hover:bg-violet-700 transition-all active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </button>
      </header>

      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        </div>
        <div className="flex-1">
          <p className="text-violet-800 text-xs font-bold">User Registry</p>
          <p className="text-violet-600 text-[10px]">Manage staff access and credentials</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
              <img src={user.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt={user.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-800 text-sm truncate">{user.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{user.role}</p>
              <p className="text-[10px] text-indigo-600 mt-0.5">PIN: {user.pin}</p>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => onEditUser(user)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              </button>
              <button 
                onClick={() => {
                  if(confirm(`Are you sure you want to remove ${user.name}?`)) onDeleteUser(user.id);
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManager;
