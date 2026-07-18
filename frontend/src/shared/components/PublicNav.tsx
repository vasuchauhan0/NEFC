import React, { useState } from 'react';
import { Menu, X, User, LogOut, ShieldAlert } from 'lucide-react';
import { Company } from '../types/index.ts';

interface PublicNavProps {
  activePage: string;
  company: Company;
  navigate: (page: string) => void;
  isLoggedIn: boolean;
  memberName?: string;
  onLogout: () => void;
  isAdminLoggedIn: boolean;
  onEnterAdmin: () => void;
}

export default function PublicNav({
  activePage,
  company,
  navigate,
  isLoggedIn,
  memberName,
  onLogout,
  isAdminLoggedIn,
  onEnterAdmin,
}: PublicNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { id: 'home', label: 'Home' },
    { id: 'schemes', label: 'Schemes' },
    { id: 'calculator', label: 'Calculator' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
  ];

  const handleNav = (page: string) => {
    navigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-black border-b border-white/10 sticky top-0 z-50 shadow-xs shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <span 
              onClick={() => handleNav('home')} 
              className="flex items-center gap-2 cursor-pointer select-none"
              id="brand-logo"
            >
              <img src="/logo.svg" alt={company.short} className="h-11 w-11 object-contain" />
              <span className="font-serif text-2xl font-bold text-blue-400 tracking-tight">
                {company.short}
              </span>
            </span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            {links.map((link) => (
              <span
                key={link.id}
                onClick={() => handleNav(link.id)}
                className={`text-sm font-medium cursor-pointer transition-colors duration-150 ${
                  activePage === link.id
                    ? 'text-blue-400'
                    : 'text-slate-300 hover:text-blue-400'
                }`}
                id={`nav-${link.id}`}
              >
                {link.label}
              </span>
            ))}
          </div>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {isAdminLoggedIn && (
              <button
                onClick={onEnterAdmin}
                className="btn btn-outline border-blue-500/40 text-blue-400 hover:bg-blue-500/10 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                id="nav-admin"
              >
                <ShieldAlert size={15} />
                Admin Panel
              </button>
            )}

            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleNav('dashboard')}
                  className={`text-sm font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer ${
                    activePage === 'dashboard'
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'border-white/15 text-slate-200 hover:bg-white/5'
                  }`}
                  id="nav-member-account"
                >
                  <User size={15} />
                  {memberName || 'My Account'}
                </button>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  id="nav-logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNav('login')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                id="nav-login"
              >
                <User size={15} />
                Member Login
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-300 hover:text-blue-400 p-1.5 rounded-lg hover:bg-white/5 focus:outline-hidden"
              id="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950 border-b border-white/10 py-3 px-4 space-y-2">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                activePage === link.id
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            {isAdminLoggedIn && (
              <button
                onClick={onEnterAdmin}
                className="w-full bg-white/5 hover:bg-white/10 text-blue-400 font-semibold text-sm px-3 py-2 rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert size={15} />
                Admin Panel
              </button>
            )}

            {isLoggedIn ? (
              <div className="space-y-1">
                <button
                  onClick={() => handleNav('dashboard')}
                  className="w-full bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-sm px-3 py-2 rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <User size={15} />
                  {memberName || 'My Account'}
                </button>
                <button
                  onClick={onLogout}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-sm px-3 py-2 rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNav('login')}
                className="w-full bg-blue-600 text-white hover:bg-blue-500 text-center font-medium text-sm px-3 py-2 rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <User size={15} />
                Member Login
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}