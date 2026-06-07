import React, { useState, useEffect } from 'react';
import { Landmark, RefreshCw } from 'lucide-react';
import { InvestmentScheme } from '../../../shared/types/index.ts';
import { 
  calculateFDMaturity, 
  calculateRDMaturity, 
  addYearsToDate, 
  formatDateReadable 
} from '../../../shared/utils/index.ts';
import FDCalculator from '../components/FDCalculator.tsx';
import RDCalculator from '../components/RDCalculator.tsx';
import ResultCard from '../components/ResultCard.tsx';

interface CalculatorPageProps {
  schemes: InvestmentScheme[];
}

export default function CalculatorPage({ schemes }: CalculatorPageProps) {
  const [calcType, setCalcType] = useState<'fd' | 'rd'>('fd');

  // FD States
  const [fdPrincipal, setFdPrincipal] = useState<number>(100000);
  const [fdSelectedSchemeId, setFdSelectedSchemeId] = useState<string>('');
  
  // RD States
  const [rdMonthly, setRdMonthly] = useState<number>(5000);
  const [rdSelectedSchemeId, setRdSelectedSchemeId] = useState<string>('');

  const fdSchemes = schemes.filter(s => s.type === 'fd' && s.status !== 'Closed');
  const rdSchemes = schemes.filter(s => s.type === 'rd' && s.status !== 'Closed');

  useEffect(() => {
    if (fdSchemes.length > 0 && !fdSelectedSchemeId) {
      setFdSelectedSchemeId(fdSchemes[0].id);
    }
  }, [fdSchemes]);

  useEffect(() => {
    if (rdSchemes.length > 0 && !rdSelectedSchemeId) {
      setRdSelectedSchemeId(rdSchemes[0].id);
    }
  }, [rdSchemes]);

  const activeFD = fdSchemes.find(s => s.id === fdSelectedSchemeId);
  const activeRD = rdSchemes.find(s => s.id === rdSelectedSchemeId);

  const todayISO = new Date().toISOString().split('T')[0];

  // Calculations
  let maturityAmount = 0;
  let investedAmount = 0;
  let interestEarned = 0;
  let maturityDateStr = '--';

  if (calcType === 'fd' && activeFD) {
    const { maturityAmount: ma, interestEarned: ie } = calculateFDMaturity(
      fdPrincipal, 
      activeFD.interestPct, 
      activeFD.durationYears
    );
    maturityAmount = ma;
    investedAmount = fdPrincipal;
    interestEarned = ie;
    maturityDateStr = formatDateReadable(addYearsToDate(todayISO, activeFD.durationYears));
  } else if (calcType === 'rd' && activeRD) {
    const { totalDeposited, maturityAmount: ma, interestEarned: ie } = calculateRDMaturity(
      rdMonthly, 
      activeRD.interestPct, 
      activeRD.durationYears
    );
    maturityAmount = ma;
    investedAmount = totalDeposited;
    interestEarned = ie;
    maturityDateStr = formatDateReadable(addYearsToDate(todayISO, activeRD.durationYears));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight">
          Yield &amp; Compound Calculator
        </h2>
        <p className="text-slate-500 mt-2 text-sm sm:text-base">
          Evaluate precise returns instantly. Gain full transparency of interest payouts and schedule-bound payouts.
        </p>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden grid md:grid-cols-5">
        <div className="md:col-span-3 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-slate-150">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              onClick={() => setCalcType('fd')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                calcType === 'fd'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Landmark size={14} />
              Fixed Deposit (FD)
            </button>
            <button
              onClick={() => setCalcType('rd')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                calcType === 'rd'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <RefreshCw size={14} />
              Recurring Deposit (RD)
            </button>
          </div>

          {calcType === 'fd' ? (
            <FDCalculator
              fdPrincipal={fdPrincipal}
              setFdPrincipal={setFdPrincipal}
              fdSelectedSchemeId={fdSelectedSchemeId}
              setFdSelectedSchemeId={setFdSelectedSchemeId}
              fdSchemes={fdSchemes}
            />
          ) : (
            <RDCalculator
              rdMonthly={rdMonthly}
              setRdMonthly={setRdMonthly}
              rdSelectedSchemeId={rdSelectedSchemeId}
              setRdSelectedSchemeId={setRdSelectedSchemeId}
              rdSchemes={rdSchemes}
            />
          )}
        </div>

        <ResultCard
          maturityAmount={maturityAmount}
          investedAmount={investedAmount}
          interestEarned={interestEarned}
          maturityDateStr={maturityDateStr}
        />
      </div>
    </div>
  );
}
