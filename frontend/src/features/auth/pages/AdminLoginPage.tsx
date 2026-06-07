import React from 'react';
import AdminLoginForm from '../components/AdminLoginForm.tsx';

interface AdminLoginPageProps {
  onAdminLogin: (pass: string) => Promise<void>;
  loginLoading: boolean;
  loginError: string;
  setLoginError: (err: string) => void;
  navigate: (page: string) => void;
}

export default function AdminLoginPage({
  onAdminLogin,
  loginLoading,
  loginError,
  setLoginError,
  navigate,
}: AdminLoginPageProps) {
  return (
    <div className="bg-slate-950 min-h-[70vh] flex flex-col justify-center">
      <AdminLoginForm
        onAdminLogin={onAdminLogin}
        loginLoading={loginLoading}
        loginError={loginError}
        setLoginError={setLoginError}
        navigate={navigate}
      />
    </div>
  );
}
