import React from 'react';
import { Landmark, RefreshCw, TrendingUp } from 'lucide-react';
import FDSchemesTable from '../components/FDSchemesTable.tsx';
import RDSchemesTable from '../components/RDSchemesTable.tsx';
import { InvestmentScheme } from '../../../shared/types/index.ts';

interface SchemesPageProps {
  schemes: InvestmentScheme[];
  navigate: (page: string) => void;
}

export default function SchemesPage({ schemes, navigate }: SchemesPageProps) {
  const fdSchemes = schemes.filter(s => s.type === 'fd');
  const rdSchemes = schemes.filter(s => s.type === 'rd');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight">
          High-Yield Investment Options
        </h2>
        <p className="text-slate-500 mt-3 max-w-xl mx-auto text-sm sm:text-base">
          Browse our curated line-up of Fixed Deposits (FD) and Recurring Deposits (RD) configured for wealth creation and secure reserves.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Fixed Deposit Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <div className="bg-blue-100 p-2.5 rounded-xl text-blue-700">
              <Landmark size={20} />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-slate-900">Fixed Deposit (FD) Schemes</h3>
              <p className="text-xs text-slate-500 mt-0.5">One-time lump sum lump compound reserve</p>
            </div>
          </div>

          <FDSchemesTable schemes={fdSchemes} />

          <div className="flex justify-end pt-2">
            <button
              onClick={() => navigate('calculator')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              id="analyze-fd-calculator"
            >
              Analyze yields inside calculator
              <TrendingUp size={14} />
            </button>
          </div>
        </div>

        {/* Recurring Deposit Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-700">
              <RefreshCw size={20} />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-slate-900">Recurring Deposit (RD) Schemes</h3>
              <p className="text-xs text-slate-500 mt-0.5">Flexible high-yield monthly savings blueprint</p>
            </div>
          </div>

          <RDSchemesTable schemes={rdSchemes} />

          <div className="flex justify-end pt-2">
            <button
              onClick={() => navigate('calculator')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              id="analyze-rd-calculator"
            >
              Analyze RD compound projections
              <TrendingUp size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
