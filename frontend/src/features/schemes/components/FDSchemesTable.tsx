import React from 'react';
import { Sparkles } from 'lucide-react';
import { InvestmentScheme } from '../../../shared/types/index.ts';
import { formatRupee } from '../../../shared/utils/index.ts';

interface FDSchemesTableProps {
  schemes: InvestmentScheme[];
}

export default function FDSchemesTable({ schemes }: FDSchemesTableProps) {
  const getStatusBadge = (status: InvestmentScheme['status']) => {
    switch (status) {
      case 'Popular':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
            <Sparkles size={11} />
            Popular
          </span>
        );
      case 'Closed':
        return (
          <span className="bg-red-100 text-red-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
            Closed
          </span>
        );
      default:
        return (
          <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
            Active
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Plan ID</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Duration</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Interest Rate</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Maturity / ₹1 Lakh</th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Tag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {schemes.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                <td className="py-4 px-4 font-mono text-sm font-semibold text-slate-800">{s.id}</td>
                <td className="py-4 px-4 text-sm text-slate-600">{s.durationYears} {s.durationYears === 1 ? 'Year' : 'Years'}</td>
                <td className="py-4 px-4 text-sm font-semibold text-blue-700 font-sans">{s.interestPct.toFixed(1)}% p.a.</td>
                <td className="py-4 px-4 text-sm font-semibold text-slate-800 font-mono">{formatRupee(s.maturityAmountPreview)}</td>
                <td className="py-4 px-4">{getStatusBadge(s.status)}</td>
              </tr>
            ))}
            {schemes.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">No Active Fixed Deposit Options</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
