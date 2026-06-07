import React from 'react';
import { Calendar } from 'lucide-react';
import { formatRupee } from '../../../shared/utils/index.ts';

interface ResultCardProps {
  maturityAmount: number;
  investedAmount: number;
  interestEarned: number;
  maturityDateStr: string;
}

export default function ResultCard({
  maturityAmount,
  investedAmount,
  interestEarned,
  maturityDateStr,
}: ResultCardProps) {
  return (
    <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-blue-950 text-white p-6 sm:p-8 flex flex-col justify-between">
      <div>
        <span className="inline-block bg-blue-500/20 text-blue-300 border border-blue-400/25 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md mb-6">
          Maturity Analysis
        </span>

        <div className="space-y-6">
          <div>
            <div className="text-[10px] text-blue-300 font-semibold tracking-wider uppercase">Projected Maturity Balance</div>
            <div className="text-3xl sm:text-4.5xl font-serif font-black tracking-tight mt-1 text-emerald-400 font-mono">
              {formatRupee(maturityAmount)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Total Funds</div>
              <div className="text-sm font-semibold mt-1 font-mono">{formatRupee(investedAmount)}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Interest Gain</div>
              <div className="text-sm font-semibold text-green-300 mt-1 font-mono">+{formatRupee(interestEarned)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 border-t border-slate-800 pt-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Calendar size={14} className="text-blue-400" />
              <span>Maturity Date: <strong>{maturityDateStr}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-800 pt-4 text-[11px] text-slate-400 leading-normal">
        * Compounded on annual reserves for FDs, and monthly reserves under compounding rules for RDs. Remittances issued clean at our offices.
      </div>
    </div>
  );
}
