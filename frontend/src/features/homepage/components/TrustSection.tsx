import React from 'react';
import { Shield, Clock, FileCheck, HeartHandshake, HelpCircle } from 'lucide-react';
import { TrustItem } from '../../../shared/types/index.ts';

interface TrustSectionProps {
  trust: TrustItem[];
}

export default function TrustSection({ trust }: TrustSectionProps) {
  const getTrustIcon = (name: string) => {
    switch (name) {
      case 'Shield': return <Shield size={28} className="text-blue-400" />;
      case 'Clock': return <Clock size={28} className="text-blue-400" />;
      case 'FileCheck': return <FileCheck size={28} className="text-blue-400" />;
      case 'HeartHandshake': return <HeartHandshake size={28} className="text-blue-400" />;
      default: return <HelpCircle size={28} className="text-blue-400" />;
    }
  };

  return (
    <section className="bg-[#0c0f16] border-t border-b border-white/10 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
            Why Members Solidly Trust NEFC
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto mt-3 text-sm sm:text-base">
            We operate strictly under microcredit principles, backed with fully compliant physical assets and paper receipts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trust.map((item, idx) => (
            <div key={idx} className="bg-[#12161f] border border-white/10 p-6 rounded-2xl shadow-xs hover:border-blue-500/40 transition-colors duration-300">
              <div className="bg-blue-500/10 p-3 rounded-xl inline-block mb-4">
                {getTrustIcon(item.icon)}
              </div>
              <h3 className="font-sans text-sm font-bold text-white mb-2">
                {item.title}
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}