import React from 'react';
import { StepItem } from '../../../shared/types/index.ts';

interface HowItWorksProps {
  steps: StepItem[];
}

export default function HowItWorks({ steps }: HowItWorksProps) {
  return (
    <section className="py-16 md:py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
            How Your Money Works With Us
          </h2>
          <p className="max-w-lg mx-auto mt-3 text-sm sm:text-base text-slate-400">
            Simple, transparent, and compliant member growth frameworks. Let your ledger do the talking.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div 
              key={step.num}
              className="bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-xs hover:shadow-md hover:shadow-blue-900/20 hover:-translate-y-1 hover:border-blue-500/30 transition-all duration-300 relative"
            >
              <div className="h-10 w-10 text-xs font-bold rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center mb-6">
                STEP {step.num}
              </div>
              <h3 className="font-serif text-lg font-bold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}