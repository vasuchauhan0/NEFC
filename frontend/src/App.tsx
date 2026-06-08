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
import AdminLoginPage from './features/auth/pages/AdminLoginPage.tsx';
import AdminPortal from './components/AdminPortal.tsx';

export default function App() {
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activePage, setActivePage] = useState<string>(() => {
  if (localStorage.getItem('nefc_admin') === 'true') return 'admin';
  if (localStorage.getItem('nefc_member')) return 'dashboard';
  return 'home';
  });

  // Authenticated states
  const [loggedInMember, setLoggedInMember] = useState<Member | null>(() => {
  const saved = localStorage.getItem('nefc_member');
  return saved ? JSON.parse(saved) : null;
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
  return localStorage.getItem('nefc_admin') === 'true';
  });
  // Login form systems
  const [loginTab, setLoginTab] = useState<'member' | 'admin'>('member');
  const [memberEmail, setMemberEmail] = useState<string>('');
  const [memberPass, setMemberPass] = useState<string>('');
  const [adminPass, setAdminPass] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Load site registers on initial load
  useEffect(() => {
    const fetchRecordData = async () => {
      try {
        const isAdmin = localStorage.getItem('nefc_admin') === 'true';
        const url = isAdmin ? '/api/admin/data' : '/api/data';
        const headers: Record<string, string> = isAdmin 
          ? { 'x-admin-token': 'admin-session-token' } 
          : {};
        const response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          setSiteData(data);
        }
      } catch (err) {
        console.error('Failed to load backend system data record', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecordData();
  }, []);

  // Check once on initial mount for secret URL query parameters or hash to switch to admin-login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isParam = window.location.search.includes('admin=true');
      const isHash = window.location.hash.includes('admin');
      if (isParam || isHash) {
        setActivePage('admin-login');
        // Clean URL to prevent any refresh loops or trace
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);



  // Sync state back to the node backup backend database
  const handleUpdateData = async (newData: SiteData) => {
    setSiteData(newData);
    try {
      await fetch('/api/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
    } catch (e) {
      console.error('Failed to auto-sync layout definitions with Express server backend', e);
    }
  };

  // Login Handlers
  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim() || !memberPass.trim()) {
      setLoginError('Please enter email address and password credentials.');
      return;
    }
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/login/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: memberEmail, password: memberPass })
      });
      const data = await res.json();
      if (data.success && data.member) {
        setLoggedInMember(data.member);
        localStorage.setItem('nefc_member', JSON.stringify(data.member));
        setActivePage('dashboard');
        // Reset fields
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
      const res = await fetch('/api/login/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdminLoggedIn(true);
        localStorage.setItem('nefc_admin', 'true');
        localStorage.setItem('nefc_admin_token', 'admin-session-token');
        // Fetch full data including members for admin
        const adminRes = await fetch('/api/admin/data', {
          headers: { 'x-admin-token': 'admin-session-token' }
        });
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          setSiteData(adminData);
        }
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
    localStorage.removeItem('nefc_admin');
    localStorage.removeItem('nefc_admin_token');  // ← ADD THIS LINE
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

  // Handle direct admin panels route overrides
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
        {/* Banner Announcement */}
        <AnnouncementBar text={siteData.announcement} />

        {/* Global Public Navigation Bar */}
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

        {/* Routing content blocks */}
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
            <SchemesView 
              schemes={siteData.schemes} 
              navigate={setActivePage} 
            />
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

          {/* DUAL PORTAL REGISTER & LOGIN SCREEN */}
          {activePage === 'login' && (
            <LoginPage
              onMemberLogin={async (email, pass) => {
                setLoginError('');
                setLoginLoading(true);
                try {
                  const res = await fetch('/api/login/member', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: pass })
                  });
                  const data = await res.json();
                  if (data.success && data.member) {
                    setLoggedInMember(data.member);
                    localStorage.setItem('nefc_member', JSON.stringify(data.member));
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

          {/* SECRET ADMIN ONLY LOGIN SCREEN */}
          {activePage === 'admin-login' && (
            <AdminLoginPage
              onAdminLogin={async (pass) => {
                setLoginError('');
                setLoginLoading(true);
                try {
                  const res = await fetch('/api/login/admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pass })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setIsAdminLoggedIn(true);
                    localStorage.setItem('nefc_admin', 'true');
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

      {/* Institutional footer */}
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
            onDoubleClick={() => {
              setActivePage('admin-login');
            }}
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
