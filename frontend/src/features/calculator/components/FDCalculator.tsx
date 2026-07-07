import React from 'react';
import { InvestmentScheme } from '../../../shared/types/index.ts';

interface FDCalculatorProps {
  fdPrincipal: number;
  setFdPrincipal: (val: number) => void;
  fdSelectedSchemeId: string;
  setFdSelectedSchemeId: (val: string) => void;
  fdSchemes: InvestmentScheme[];
}

export default function FDCalculator({
  fdPrincipal,
  setFdPrincipal,
  fdSelectedSchemeId,
  setFdSelectedSchemeId,
  fdSchemes,
}: FDCalculatorProps) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
          Lump Sum Investment (₹)
        </label>
        <div className="relative rounded-xl shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-slate-400 font-sans text-sm font-semibold">₹</span>
          </div>
          <input
            type="number"
            value={fdPrincipal}
            onChange={(e) => setFdPrincipal(Math.max(0, parseInt(e.target.value) || 0))}
            className="block w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-hidden focus:border-blue-500 text-sm font-semibold font-mono"
            placeholder="100000"
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">Enter direct payment reserve capital.</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
          Associate Scheme Model
        </label>
        <select
          value={fdSelectedSchemeId}
          onChange={(e) => setFdSelectedSchemeId(e.target.value)}
          className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-hidden focus:border-blue-500 text-sm font-medium"
        >
          {fdSchemes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} — {s.durationYears} {s.durationYears === 1 ? 'Year' : 'Years'}
            </option>
          ))}
          {fdSchemes.length === 0 && <option value="">No Active Models</option>}
        </select>
      </div>
    </div>
  );
}