import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowLeft } from 'lucide-react';

interface AdminLoginFormProps {
  onAdminLogin: (pass: string) => Promise<void>;
  loginLoading: boolean;
  loginError: string;
  setLoginError: (err: string) => void;
  navigate: (page: string) => void;
}

export default function AdminLoginForm({
  onAdminLogin,
  loginLoading,
  loginError,
  setLoginError,
  navigate,
}: AdminLoginFormProps) {
  const [adminPass, setAdminPass] = useState<string>('');

  const submitAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPass) {
      setLoginError('Please enter the administrator password.');
      return;
    }
    onAdminLogin(adminPass);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20 select-none animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-slate-100">
        
        {/* Back link */}
        <button 
          onClick={() => navigate('home')} 
          className="group text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 mb-6 cursor-pointer"
          id="back-home-admin-login"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          Exit Terminal
        </button>

        <div className="flex justify-center mb-4">
          <div className="bg-red-950/50 text-red-500 border border-red-900/50 p-2.5 rounded-2xl">
            <ShieldCheck size={24} />
          </div>
        </div>

        <h3 className="font-mono text-xl font-bold text-center tracking-tight text-white mb-2">
          OVERSEER PORTAL NODE II
        </h3>
        <p className="font-mono text-[10px] text-red-400 text-center uppercase tracking-widest font-semibold mb-6">
          Authorized Admin Command Console
        </p>

        <form onSubmit={submitAdmin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Secure Authentication Key
            </label>
            <input
              type="password"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              className="block w-full px-4 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-white text-sm focus:outline-hidden focus:border-red-600 font-semibold font-mono"
              placeholder="••••••••"
              required
              disabled={loginLoading}
            />
          </div>

          {loginError && (
            <div className="p-3 bg-red-950/40 text-red-400 text-xs font-mono font-semibold rounded-xl border border-red-900/40">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-medium py-3 rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer font-mono"
          >
            <Lock size={14} />
            {loginLoading ? 'DECRYPTING SECURE PIN...' : 'ESTABLISH LINK'}
          </button>
          
          <div className="text-[9px] text-slate-500 text-center leading-normal pt-2 border-t border-slate-800 uppercase font-mono">
            IP logging is active. Brute forcing attempts automatically report to security officers and trigger a terminal lock.
          </div>
        </form>

      </div>
    </div>
  );
}
