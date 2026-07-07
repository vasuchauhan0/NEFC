import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const submitMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim() || !memberPass.trim()) {
      setLoginError('Please enter email address and password credentials.');
      return;
    }
    onMemberLogin(memberEmail, memberPass);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 select-none animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">

        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.svg" alt="NEFC" className="h-14 w-14 mb-3 object-contain" />
          <span className="font-serif text-lg font-bold text-slate-900 tracking-tight">NEFC</span>
          <span className="text-xs text-slate-500 font-medium mt-0.5">Nation Empower Finance Capital</span>
        </div>

        <h3 className="text-2xl font-bold text-slate-950 text-center tracking-tight mb-1">
          Login
        </h3>
        <p className="text-xs text-slate-400 text-center font-medium mb-6">
          Access to the dashboard
        </p>

        <form onSubmit={submitMember} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Username
            </label>
            <input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-hidden focus:border-blue-500"
              placeholder="amit@gmail.com"
              required
              disabled={loginLoading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={memberPass}
                onChange={(e) => setMemberPass(e.target.value)}
                className="block w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-hidden focus:border-blue-500"
                placeholder="••••••••"
                required
                disabled={loginLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <label className="flex items-center gap-2 text-slate-600 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-blue-700 focus:ring-blue-500"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => navigate('forgot-password')}
              className="text-blue-700 font-semibold hover:underline cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl shadow-xs transition-colors text-sm cursor-pointer"
          >
            {loginLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <button
          onClick={() => navigate('home')}
          className="w-full text-center text-xs font-semibold text-slate-400 hover:text-blue-700 mt-6 cursor-pointer"
          id="back-home-login"
        >
          Return home
        </button>

      </div>
    </div>
  );
}