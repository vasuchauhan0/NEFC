import React from 'react';
import { Wallet, Calendar } from 'lucide-react';
import { MemberLoan } from '../../../shared/types/index.ts';
import { formatRupee } from '../../../shared/utils/index.ts';

interface LoansSectionProps {
  loans: MemberLoan[];
}

// Read-only view of a member's loans. Loans are managed by admin only.
export default function LoansSection({ loans }: LoansSectionProps) {
  if (!loans || loans.length === 0) return null;

  const activeLoans = loans.filter(l => l.status === 'Active');
  const totalOutstanding = activeLoans.reduce(
    (sum, l) => sum + Math.max(0, l.emiAmount * (l.tenureMonths - l.emisPaid)), 0
  );
  const monthlyDue = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);

  return (
    <div id="member-loans-section">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">My Loans</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <span className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider">Total Outstanding</span>
          <span className="font-mono text-xl font-black text-amber-900">{formatRupee(totalOutstanding)}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly EMI Due</span>
          <span className="font-mono text-xl font-black text-slate-800">{formatRupee(monthlyDue)}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {loans.map(loan => {
          const outstanding = Math.max(0, loan.emiAmount * (loan.tenureMonths - loan.emisPaid));
          const pct = Math.min(100, Math.round((loan.emisPaid / loan.tenureMonths) * 100));
          const closed = loan.status === 'Closed';
          return (
            <div key={loan.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-slate-900">
                      {loan.purpose || 'Loan'}
                    </span>
                    <span className="block font-mono text-[10px] text-slate-400">{loan.id}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  closed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {loan.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Loan Amount</span>
                  <span className="font-mono font-black text-slate-800">{formatRupee(loan.principal)}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Monthly EMI</span>
                  <span className="font-mono font-black text-slate-800">{formatRupee(loan.emiAmount)}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Interest Rate</span>
                  <span className="font-semibold text-slate-700">{loan.interestPct}% p.a.</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Tenure</span>
                  <span className="font-semibold text-slate-700">{loan.tenureMonths} months</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">EMIs Paid</span>
                  <span className="font-mono font-bold text-slate-800">{loan.emisPaid} / {loan.tenureMonths}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Outstanding</span>
                  <span className={`font-mono font-bold ${closed ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatRupee(outstanding)}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Repayment progress</span>
                  <span className="font-mono">{pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${closed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar size={10} />
                <span>Started {loan.startDate}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}