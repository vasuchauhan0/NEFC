import React from 'react';
import Hero from '../components/Hero.tsx';
import StatsSection from '../components/StatsSection.tsx';
import HowItWorks from '../components/HowItWorks.tsx';
import TrustSection from '../components/TrustSection.tsx';
import { HeroContent, StatItem, StepItem, TrustItem } from '../../../shared/types/index.ts';

interface HomePageProps {
  hero: HeroContent;
  stats: StatItem[];
  steps: StepItem[];
  trust: TrustItem[];
  navigate: (page: string) => void;
}

export default function HomePage({ hero, stats, steps, trust, navigate }: HomePageProps) {
  return (
    <div className="bg-slate-50">
      <Hero hero={hero} navigate={navigate} />
      <StatsSection stats={stats} />
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight">
              Our Deposit Schemes
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto mt-3 text-sm sm:text-base">
              Secure your future with our trusted Fixed and Recurring Deposit plans.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200">
              <img src="/fd.jpg" alt="Fixed Deposit" className="w-full h-56 object-cover" />
              <div className="p-6">
                <h3 className="font-serif text-xl font-bold text-slate-900 mb-2">Fixed Deposit</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Deposit money for a fixed period and earn guaranteed interest. Safe, secure, and compliant with cooperative bylaws.
                </p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200">
              <img src="/rd.jpg" alt="Recurring Deposit" className="w-full h-56 object-cover" />
              <div className="p-6">
                <h3 className="font-serif text-xl font-bold text-slate-900 mb-2">Recurring Deposit</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Deposit periodically and build your savings over time. Flexible tenures with attractive maturity returns.
                </p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200">
              <img src="/loan.jpeg" alt="Loan Against Deposit" className="w-full h-56 object-cover" />
              <div className="p-6">
                <h3 className="font-serif text-xl font-bold text-slate-900 mb-2">Loan Against Deposit</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Get instant loan against your FD or RD without breaking your deposit. Quick approval with minimal documentation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <HowItWorks steps={steps} />
      <TrustSection trust={trust} />
    </div>
  );
}