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
    <nav className="bg-white border-b border-slate-150 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
  <img
    onClick={() => handleNav('home')}
    src="/logo.svg"
    alt={company.short}
    className="h-10 w-auto cursor-pointer select-none"
    id="brand-logo"
  />
</div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            {links.map((link) => (
              <span
                key={link.id}
                onClick={() => handleNav(link.id)}
                className={`text-sm font-medium cursor-pointer transition-colors duration-150 ${
                  activePage === link.id
                    ? 'text-blue-700'
                    : 'text-slate-600 hover:text-blue-700'
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
                className="btn btn-outline border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
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
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  id="nav-member-account"
                >
                  <User size={15} />
                  {memberName || 'My Account'}
                </button>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="text-slate-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  id="nav-logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNav('login')}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
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
              className="text-slate-600 hover:text-blue-700 p-1.5 rounded-lg hover:bg-slate-50 focus:outline-hidden"
              id="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-50 border-b border-slate-200 py-3 px-4 space-y-2">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                activePage === link.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
            {isAdminLoggedIn && (
              <button
                onClick={onEnterAdmin}
                className="w-full bg-slate-100 hover:bg-slate-200 text-blue-700 font-semibold text-sm px-3 py-2 rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert size={15} />
                Admin Panel
              </button>
            )}

            {isLoggedIn ? (
              <div className="space-y-1">
                <button
                  onClick={() => handleNav('dashboard')}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-3 py-2 rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <User size={15} />
                  {memberName || 'My Account'}
                </button>
                <button
                  onClick={onLogout}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm px-3 py-2 rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNav('login')}
                className="w-full bg-blue-700 text-white hover:bg-blue-800 text-center font-medium text-sm px-3 py-2 rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
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
