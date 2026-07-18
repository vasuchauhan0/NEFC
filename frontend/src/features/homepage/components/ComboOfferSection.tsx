import React from 'react';
import { PiggyBank } from 'lucide-react';

export default function ComboOfferSection() {
  return (
    <section className="py-16 md:py-24 bg-[#0c0f16] border-t border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs px-3.5 py-1.5 rounded-full font-semibold tracking-wide mb-4 uppercase">
            <PiggyBank size={14} />
            Combo Offer
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
            RD + FD Combo Plans
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto mt-3 text-sm sm:text-base">
            Build a recurring deposit habit while your matured amounts roll straight into fixed deposits for extra growth.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/40 transition-colors duration-300">
          <img
            src="/combo-offer.jpeg"
            alt="RD + FD Combo Offer details"
            className="w-full h-auto block"
          />
        </div>
      </div>
    </section>
  );
}