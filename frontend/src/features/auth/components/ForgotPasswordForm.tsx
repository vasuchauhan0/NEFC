import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

interface ForgotPasswordFormProps {
  navigate: (page: string) => void;
}

export default function ForgotPasswordForm({ navigate }: ForgotPasswordFormProps) {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setInfo('If that email is registered, a 6-digit OTP has been sent. Check your inbox.');
        setStep('reset');
      } else {
        setError(data.error || 'Failed to send OTP. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim() || !newPassword.trim()) {
      setError('Please enter the OTP and your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setInfo('Password reset successfully. You can now sign in.');
        setTimeout(() => navigate('login'), 1500);
      } else {
        setError(data.error || 'Failed to reset password.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
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
          Reset Password
        </h3>
        <p className="text-xs text-slate-400 text-center font-medium mb-6">
          {step === 'email' ? 'Step 1 of 2 — Verify your email' : 'Step 2 of 2 — Enter OTP & new password'}
        </p>

        {step === 'email' ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Username / Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-hidden focus:border-blue-500"
                placeholder="amit@gmail.com"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100">
                {error}
              </div>
            )}
            {info && (
              <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-100">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl shadow-xs transition-colors text-sm cursor-pointer"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                6-Digit OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm tracking-[6px] font-mono focus:outline-hidden focus:border-blue-500"
                placeholder="••••••"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-hidden focus:border-blue-500"
                  placeholder="••••••••"
                  required
                  disabled={loading}
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

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 text-sm focus:outline-hidden focus:border-blue-500"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100">
                {error}
              </div>
            )}
            {info && (
              <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-100">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl shadow-xs transition-colors text-sm cursor-pointer"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <button
              type="button"
              onClick={requestOtp}
              disabled={loading}
              className="w-full text-xs font-semibold text-slate-400 hover:text-blue-700 text-center pt-1 cursor-pointer"
            >
              Didn't get a code? Resend OTP
            </button>
          </form>
        )}

        <button
          onClick={() => navigate('login')}
          className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-slate-400 hover:text-blue-700 mt-6 cursor-pointer"
        >
          <ArrowLeft size={13} />
          Back to sign in
        </button>

      </div>
    </div>
  );
}