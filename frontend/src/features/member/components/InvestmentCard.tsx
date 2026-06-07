import React from 'react';
import { Landmark, RefreshCw } from 'lucide-react';
import { MemberInvestment } from '../../../shared/types/index.ts';
import { formatRupee } from '../../../shared/utils/index.ts';

interface InvestmentCardProps {
  key?: string;
  investment: MemberInvestment;
  progressPercent: number;
}

export default function InvestmentCard({ investment, progressPercent }: InvestmentCardProps) {
  const isRD = investment.schemeType === 'rd';

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-slate-300 transition-colors">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${isRD ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
            {isRD ? <RefreshCw size={16} /> : <Landmark size={16} />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-sans">
              {isRD ? 'Recurring Deposit' : 'Fixed Deposit'} ({investment.schemeId})
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Ledge Contract: {investment.id}</span>
          </div>
        </div>
        <span className="text-xs font-bold text-blue-700 font-mono bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
          {investment.interestPct.toFixed(1)}% p.a.
        </span>
      </div>

      <div className="py-4">
        <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
          <span>Timeline tracker</span>
          <span className="text-blue-700 font-mono">{progressPercent}% mature</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${isRD ? 'bg-emerald-500' : 'bg-blue-600'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 font-medium mt-2">
          <span>Booked: {investment.startDate}</span>
          <span>Maturity Slot: {investment.maturityDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100 text-center">
        <div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {isRD ? 'Monthly pay' : 'Principal'}
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1 font-mono">
            {formatRupee(investment.amount)}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Comp tenure</div>
          <div className="text-sm font-bold text-slate-800 mt-1 font-sans">
            {investment.durationYears} {investment.durationYears === 1 ? 'Year' : 'Years'}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Net Maturity</div>
          <div className="text-sm font-bold text-blue-800 mt-1 font-mono">
            {isRD 
              ? formatRupee(Math.round(investment.amount * investment.durationYears * 12 * (1 + (investment.interestPct/100)*0.45)))
              : formatRupee(Math.round(investment.amount * Math.pow(1 + investment.interestPct/100, investment.durationYears)))
            }
          </div>
        </div>
      </div>

      {isRD && (
        <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 flex justify-between items-center text-xs text-emerald-800 font-medium">
          <span>Monthly Installment Status:</span>
          <strong className={`${investment.paidMonths?.includes('2026-06') ? 'text-emerald-900 bg-emerald-105 bg-emerald-100' : 'text-amber-900 bg-amber-100'} px-2 py-0.5 rounded`}>
            {investment.paidMonths?.includes('2026-06') ? 'Remitted (On Schedule)' : 'Impending (Due this Month)'}
          </strong>
        </div>
      )}
    </div>
  );
}
