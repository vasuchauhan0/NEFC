import React, { useState } from 'react';
import { Mail, KeyRound, Lock, ArrowLeft } from 'lucide-react';

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
      const res = await fetch(`${API}/api/auth/forgot-password`, {
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
      const res = await fetch(`${API}/api/auth/reset-password`, {
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
    <div className="max-w-md mx-auto px-4 py-20 select-none animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <button
          onClick={() => navigate('login')}
          className="group text-xs font-bold text-slate-500 hover:text-blue-700 flex items-center gap-1 mb-6 cursor-pointer"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          Back to sign in
        </button>

        <h3 className="font-serif text-2xl font-bold text-slate-950 text-center tracking-tight mb-2">
          Reset Portal Password
        </h3>
        <p className="text-xs text-slate-400 text-center uppercase tracking-wider font-semibold mb-6">
          {step === 'email' ? 'Step 1 of 2 — Verify your email' : 'Step 2 of 2 — Enter OTP & new password'}
        </p>

        {step === 'email' ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Registered Member Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-hidden focus:border-blue-500 font-semibold"
                  placeholder="amit@gmail.com"
                  required
                  disabled={loading}
                />
              </div>
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
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 rounded-xl shadow-xs transition-colors text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Mail size={14} />
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                6-Digit OTP
              </label>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="block w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm tracking-[6px] font-mono focus:outline-hidden focus:border-blue-500 font-semibold"
                  placeholder="••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-hidden focus:border-blue-500 font-semibold font-mono"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-hidden focus:border-blue-500 font-semibold font-mono"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
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
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 rounded-xl shadow-xs transition-colors text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lock size={14} />
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
      </div>
    </div>
  );
}
