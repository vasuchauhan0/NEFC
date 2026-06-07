import React from 'react';
import LoginForm from '../components/LoginForm.tsx';

interface LoginPageProps {
  onMemberLogin: (email: string, pass: string) => Promise<void>;
  loginLoading: boolean;
  loginError: string;
  setLoginError: (err: string) => void;
  navigate: (page: string) => void;
}

export default function LoginPage({
  onMemberLogin,
  loginLoading,
  loginError,
  setLoginError,
  navigate,
}: LoginPageProps) {
  return (
    <div className="bg-slate-50 min-h-[70vh]">
      <LoginForm
        onMemberLogin={onMemberLogin}
        loginLoading={loginLoading}
        loginError={loginError}
        setLoginError={setLoginError}
        navigate={navigate}
      />
    </div>
  );
}
