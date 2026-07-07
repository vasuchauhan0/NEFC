import React, { useState } from 'react';
import { User, FileText, HelpCircle, LogOut, BookOpen, IdCard } from 'lucide-react';
import DashboardStats from '../components/DashboardStats.tsx';
import InvestmentCard from '../components/InvestmentCard.tsx';
import MemberTransactionsModal from '../components/MemberTransactionsModal.tsx';
import PolicyDetailsModal from '../components/PolicyDetailsModal.tsx';
import { Member, Company } from '../../../shared/types/index.ts';

interface DashboardPageProps {
  member: Member;
  contactEmail: string;
  onLogout: () => void;
  company?: Company;
}

export default function DashboardPage({ member, contactEmail, onLogout, company }: DashboardPageProps) {
  const [isPassbookOpen, setIsPassbookOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const activeInvestments = member.investments || [];

  const defaultCompany: Company = {
    name: 'NEFC Investment',
    short: 'NEFC',
    address: 'Mohan Nagar Branch, Moti Cinema Road, Ghaziabad, UP',
    email: contactEmail || 'nefcpay@gmail.com',
    phone: '+91 98765 43210',
    website: 'nefcinvestment.org',
    copyright: '© 2026 NEFC Investment Portal. All rights reserved.',
    about: 'NEFC Investment Portal is a trusted platform for Fixed and Recurring Deposits.'
  };
  
  const activeCompany = company || defaultCompany;

  const totalInvestmentAmount = activeInvestments.reduce((sum, inv) => {
    if (inv.schemeType === 'rd') {
      const P = inv.amount;
      const i = (inv.interestPct / 100) / 12;
      const n = inv.durationYears * 12;
      const maturity = i === 0 ? P * n : Math.round(P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i));
      return sum + maturity;
    } else {
      return sum + Math.round(inv.amount * Math.pow(1 + inv.interestPct / 100, inv.durationYears));
    }
  }, 0);

  // Actual amount paid in by the member so far (not the projected maturity value).
  // FD: the full principal is deposited upfront in one go.
  // RD: only the installments actually marked as paid count towards the total.
  const totalDepositedAmount = activeInvestments.reduce((sum, inv) => {
    if (inv.schemeType === 'rd') {
      const monthsPaid = inv.paidMonths?.length || 0;
      return sum + inv.amount * monthsPaid;
    } else {
      return sum + inv.amount;
    }
  }, 0);

  const getProgressPercentage = (startStr: string, endStr: string): number => {
    try {
      const start = new Date(startStr).getTime();
      const end = new Date(endStr).getTime();
      const now = new Date().getTime();
      if (isNaN(start) || isNaN(end)) return 0;
      if (now >= end) return 100;
      if (now <= start) return 0;
      const total = end - start;
      const current = now - start;
      return Math.round((current / total) * 100);
    } catch (e) {
      return 0;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-200 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
              <User size={18} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
              Member Ledger Portal
            </h2>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Hi, <strong>{member.name}</strong> • Account ID: {member.id} • Phone: {member.phone}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsDetailsOpen(true)}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold shadow-xs select-none cursor-pointer transition-all"
            id="open-details-btn"
          >
            <IdCard size={14} />
            Details
          </button>

          <button
            onClick={() => setIsPassbookOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs select-none cursor-pointer transition-all"
            id="open-passbook-btn"
          >
            <BookOpen size={14} />
            View & Download Deposits
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 px-4 py-2 rounded-xl text-xs font-semibold select-none cursor-pointer transition-colors"
            id="member-logout"
          >
            <LogOut size={14} />
            Sign Out of Portal
          </button>
        </div>
      </div>

      <DashboardStats
        totalAmount={totalInvestmentAmount}
        totalDeposited={totalDepositedAmount}
        activeCount={activeInvestments.length}
        memberSince={member.memberSince}
      />

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Invested Records Ledgers</h3>
          {activeInvestments.length === 0 ? (
            <div className="bg-white border border-slate-150 rounded-2xl p-10 text-center text-slate-500">
              <FileText className="mx-auto text-slate-350 mb-3" size={32} />
              <p className="text-sm font-semibold text-slate-800">No active investment accounts found.</p>
              <p className="text-xs text-slate-400 mt-1">Contact your NEFC branch office agent to purchase investment bonds.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {activeInvestments.map((inv) => (
                <InvestmentCard
                  key={inv.id}
                  investment={inv}
                  progressPercent={getProgressPercentage(inv.startDate, inv.maturityDate)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between border border-slate-200/70 text-slate-600 text-xs sm:text-sm gap-4">
          <div className="flex items-center gap-2">
            <HelpCircle size={18} className="text-blue-600 flex-shrink-0" />
            <span>Need an official ledger excerpt or account updates? Contact our Mohan Nagar branch:</span>
          </div>
          <a 
            href={`mailto:${contactEmail}`}
            className="text-blue-700 bg-white border border-blue-200 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-50 transition-colors inline-block text-center w-full sm:w-auto"
          >
            {contactEmail}
          </a>
        </div>
      </div>

      {isPassbookOpen && (
        <MemberTransactionsModal
          isOpen={isPassbookOpen}
          onClose={() => setIsPassbookOpen(false)}
          member={member}
          company={activeCompany}
        />
      )}

      {isDetailsOpen && (
        <PolicyDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          member={member}
          company={activeCompany}
        />
      )}
    </div>
  );
}