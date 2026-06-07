import React, { useState } from 'react';
import { User, Lock, ArrowLeft } from 'lucide-react';

interface LoginFormProps {
  onMemberLogin: (email: string, pass: string) => Promise<void>;
  loginLoading: boolean;
  loginError: string;
  setLoginError: (err: string) => void;
  navigate: (page: string) => void;
}

export default function LoginForm({
  onMemberLogin,
  loginLoading,
  loginError,
  setLoginError,
  navigate,
}: LoginFormProps) {
  const [memberEmail, setMemberEmail] = useState<string>('');
  const [memberPass, setMemberPass] = useState<string>('');

  const submitMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim() || !memberPass.trim()) {
      setLoginError('Please enter email address and password credentials.');
      return;
    }
    onMemberLogin(memberEmail, memberPass);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20 select-none animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        
        {/* Back link */}
        <button 
          onClick={() => navigate('home')} 
          className="group text-xs font-bold text-slate-500 hover:text-blue-700 flex items-center gap-1 mb-6 cursor-pointer"
          id="back-home-login"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          Return home
        </button>

        <h3 className="font-serif text-2xl font-bold text-slate-950 text-center tracking-tight mb-2">
          NEFC Secure Portal Entry
        </h3>
        <p className="text-xs text-slate-400 text-center uppercase tracking-wider font-semibold mb-6">
          Secure client access terminal
        </p>

        <form onSubmit={submitMember} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Registered Member Email
            </label>
            <input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-hidden focus:border-blue-500 font-semibold"
              placeholder="amit@gmail.com"
              required
              disabled={loginLoading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Portal Account Password
            </label>
            <input
              type="password"
              value={memberPass}
              onChange={(e) => setMemberPass(e.target.value)}
              className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-hidden focus:border-blue-500 font-semibold font-mono"
              placeholder="••••••••"
              required
              disabled={loginLoading}
            />
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 rounded-xl shadow-xs transition-colors text-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock size={14} />
            {loginLoading ? 'Authenticating...' : 'Sign In Portal'}
          </button>
          
          <div className="text-[10px] text-slate-400 text-center leading-normal pt-2 border-t border-slate-100 uppercase font-semibold">
            * Membership accounts are registered formally at offline branches. Forgot password? Contact branch.
          </div>
        </form>

      </div>
    </div>
  );
}
