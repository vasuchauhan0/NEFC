/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  User, 
  Lock, 
  UserPlus, 
  ChevronRight, 
  HelpCircle, 
  DollarSign, 
  ArrowLeft 
} from 'lucide-react';
import { SiteData, Member, InvestmentScheme } from './shared/types/index.ts';
import AnnouncementBar from './features/homepage/components/AnnouncementBar.tsx';
import PublicNav from './shared/components/PublicNav.tsx';
import HomeView from './features/homepage/pages/HomePage.tsx';
import SchemesView from './features/schemes/pages/SchemesPage.tsx';
import CalculatorView from './features/calculator/pages/CalculatorPage.tsx';
import AboutView from './features/about/pages/AboutPage.tsx';
import ContactView from './features/contact/pages/ContactPage.tsx';
import MemberDashboard from './features/member/pages/DashboardPage.tsx';
import LoginPage from './features/auth/pages/LoginPage.tsx';
import ForgotPasswordForm from './features/auth/components/ForgotPasswordForm.tsx';
import AdminLoginPage from './features/auth/pages/AdminLoginPage.tsx';
import AdminPortal from './components/AdminPortal.tsx';

const API = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activePage, setActivePage] = useState<string>(() => {
  if (localStorage.getItem('nefc_admin') === 'true') return 'admin';
  if (localStorage.getItem('nefc_member')) return 'dashboard';
  return 'home';
  });

  const [loggedInMember, setLoggedInMember] = useState<Member | null>(() => {
  const saved = localStorage.getItem('nefc_member');
  return saved ? JSON.parse(saved) : null;
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
  return localStorage.getItem('nefc_admin') === 'true';
  });
  const [loginTab, setLoginTab] = useState<'member' | 'admin'>('member');
  const [memberEmail, setMemberEmail] = useState<string>('');
  const [memberPass, setMemberPass] = useState<string>('');
  const [adminPass, setAdminPass] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Sync activePage with browser history
  useEffect(() => {
    window.history.pushState({ page: activePage }, '', window.location.pathname);
  }, [activePage]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const page = event.state?.page;
      if (page) {
        setActivePage(page);
      } else {
        setActivePage('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const fetchRecordData = async () => {
      try {
        const isAdmin = localStorage.getItem('nefc_admin') === 'true';
        const url = isAdmin ? `${API}/api/admin/data` : `${API}/api/data`;
        const headers: Record<string, string> = isAdmin 
          ? { 'x-admin-token': localStorage.getItem('nefc_admin_token') || '' }
          : {};
        const response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          setSiteData(data);
        } else if (response.status === 401) {
          localStorage.removeItem('nefc_admin');
          localStorage.removeItem('nefc_admin_token');
          setIsAdminLoggedIn(false);
          setActivePage('home');
          const publicRes = await fetch(`${API}/api/data`);
          if (publicRes.ok) setSiteData(await publicRes.json());
        }
      } catch (err) {
        console.error('Failed to load backend system data record', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecordData();

    // Refresh logged-in member data from backend to avoid stale localStorage
    const memberToken = localStorage.getItem('nefc_member_token');
    if (memberToken) {
      fetch(`${API}/api/member/me`, {
        headers: { 'Authorization': `Bearer ${memberToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.member) {
            setLoggedInMember(data.member);
            localStorage.setItem('nefc_member', JSON.stringify(data.member));
          } else {
            // Token expired or member suspended — force logout
            localStorage.removeItem('nefc_member');
            localStorage.removeItem('nefc_member_token');
            setLoggedInMember(null);
            setActivePage('home');
          }
        })
        .catch(() => {
          // Network error — keep existing localStorage data as fallback
        });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isParam = window.location.search.includes('admin=true');
      const isHash = window.location.hash.includes('admin');
      if (isParam || isHash) {
        setActivePage('admin-login');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

// AFTER
const handleUpdateData = async (newData: SiteData) => {
  setSiteData(newData);
};

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim() || !memberPass.trim()) {
      setLoginError('Please enter email address and password credentials.');
      return;
    }
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${API}/api/login/member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: memberEmail, password: memberPass })
      });
      const data = await res.json();
      if (data.success && data.member) {
        setLoggedInMember(data.member);
        localStorage.setItem('nefc_member', JSON.stringify(data.member));
        if (data.token) localStorage.setItem('nefc_member_token', data.token);
        setActivePage('dashboard');
        setMemberEmail('');
        setMemberPass('');
      } else {
        setLoginError(data.error || 'Authentication credential mismatch');
      }
    } catch (err) {
      setLoginError('Unable to reach auth server.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPass) {
      setLoginError('Please enter the administrator password.');
      return;
    }
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${API}/api/login/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('nefc_admin', 'true');
        localStorage.setItem('nefc_admin_token', data.token);
        const adminRes = await fetch(`${API}/api/admin/data`, {
          headers: { 'x-admin-token': data.token }
        });
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          setSiteData(adminData);
        }
        setIsAdminLoggedIn(true);
        setActivePage('admin');
        setAdminPass('');
      } else {
        setLoginError(data.error || 'Password credentials incorrect');
      }
    } catch (err) {
      setLoginError('Unable to reach auth server.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setLoggedInMember(null);
    setIsAdminLoggedIn(false);
    setActivePage('home');
    localStorage.removeItem('nefc_member');
    localStorage.removeItem('nefc_member_token');
    localStorage.removeItem('nefc_admin');
    localStorage.removeItem('nefc_admin_token');
  };

  if (loading || !siteData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-sans select-none">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-700 mb-4" />
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest animate-pulse">
          Establishing connection to NEFC Ledger...
        </p>
      </div>
    );
  }

  if (activePage === 'admin' && isAdminLoggedIn) {
    return (
      <AdminPortal 
        siteData={siteData} 
        onUpdateData={handleUpdateData} 
        onExit={() => setActivePage('home')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      <div>
        <AnnouncementBar text={siteData.announcement} />
        <PublicNav 
          activePage={activePage} 
          company={siteData.company} 
          navigate={setActivePage} 
          isLoggedIn={!!loggedInMember}
          memberName={loggedInMember?.name}
          onLogout={handleLogout}
          isAdminLoggedIn={isAdminLoggedIn}
          onEnterAdmin={() => setActivePage('admin')}
        />
        <main>
          {activePage === 'home' && (
            <HomeView 
              hero={siteData.hero} 
              stats={siteData.stats} 
              steps={siteData.steps} 
              trust={siteData.trust} 
              navigate={setActivePage} 
            />
          )}
          {activePage === 'schemes' && (
            <SchemesView schemes={siteData.schemes} navigate={setActivePage} />
          )}
          {activePage === 'calculator' && (
            <CalculatorView schemes={siteData.schemes} />
          )}
          {activePage === 'about' && (
            <AboutView company={siteData.company} />
          )}
          {activePage === 'contact' && (
            <ContactView company={siteData.company} />
          )}
          {activePage === 'dashboard' && loggedInMember && (
            <MemberDashboard 
              member={loggedInMember} 
              onLogout={handleLogout} 
              contactEmail={siteData.company.email} 
              company={siteData.company}
            />
          )}
          {activePage === 'login' && (
            <LoginPage
              onMemberLogin={async (email, pass) => {
                setLoginError('');
                setLoginLoading(true);
                try {
                  const res = await fetch(`${API}/api/login/member`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: pass })
                  });
                  const data = await res.json();
                  if (data.success && data.member) {
                    setLoggedInMember(data.member);
                    localStorage.setItem('nefc_member', JSON.stringify(data.member));
                    if (data.token) localStorage.setItem('nefc_member_token', data.token);
                    setActivePage('dashboard');
                    setMemberEmail('');
                    setMemberPass('');
                  } else {
                    setLoginError(data.error || 'Authentication credential mismatch');
                  }
                } catch (err) {
                  setLoginError('Unable to reach auth server.');
                } finally {
                  setLoginLoading(false);
                }
              }}
              loginLoading={loginLoading}
              loginError={loginError}
              setLoginError={setLoginError}
              navigate={setActivePage}
            />
          )}
          {activePage === 'forgot-password' && (
            <ForgotPasswordForm navigate={setActivePage} />
          )}
          {activePage === 'admin-login' && (
            <AdminLoginPage
              onAdminLogin={async (pass) => {
                setLoginError('');
                setLoginLoading(true);
                try {
                  const res = await fetch(`${API}/api/login/admin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pass })
                  });
                  const data = await res.json();
                  if (data.success) {
                    localStorage.setItem('nefc_admin', 'true');
                    localStorage.setItem('nefc_admin_token', data.token);
                    const adminRes = await fetch(`${API}/api/admin/data`, {
                      headers: { 'x-admin-token': data.token }
                    });
                    if (adminRes.ok) {
                      const adminData = await adminRes.json();
                      setSiteData(adminData);
                    }
                    setIsAdminLoggedIn(true);
                    setActivePage('admin');
                    setAdminPass('');
                  } else {
                    setLoginError(data.error || 'Password credentials incorrect');
                  }
                } catch (err) {
                  setLoginError('Unable to reach auth server.');
                } finally {
                  setLoginLoading(false);
                }
              }}
              loginLoading={loginLoading}
              loginError={loginError}
              setLoginError={setLoginError}
              navigate={setActivePage}
            />
          )}
        </main>
      </div>

      <footer className="bg-slate-900 border-t border-slate-950 text-slate-400 text-xs py-12 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-8">
          <div>
            <h4 className="font-serif text-lg font-bold text-white tracking-tight">{siteData.company.name}</h4>
            <p className="text-slate-550 block mt-2 leading-relaxed text-[11px] text-slate-500">
              Approved credit cooperative investment framework assisting members with reliable returns since over 4 years. Compliance certified.
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-white uppercase text-[10px] tracking-wider mb-3">Branch office Address</h5>
            <p className="text-slate-400 font-sans leading-relaxed text-[11px] whitespace-pre-line">
              {siteData.company.address}
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-white uppercase text-[10px] tracking-wider mb-3">Support Contacts</h5>
            <div className="space-y-1 text-[11px] font-medium">
              <div>Phone: <span className="text-white font-mono">{siteData.company.phone}</span></div>
              <div>Email: <span className="text-white">{siteData.company.email}</span></div>
              <div>Website Domain: <span className="text-white font-mono">{siteData.company.website}</span></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          <span 
            onDoubleClick={() => setActivePage('admin-login')}
            className="select-none text-slate-500"
          >
            {siteData.company.copyright}
          </span>
          <span className="flex items-center gap-3 mt-2 sm:mt-0">
            <span onClick={() => setActivePage('schemes')} className="hover:text-white cursor-pointer transition-colors duration-150">
              Schemes Catalog
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}