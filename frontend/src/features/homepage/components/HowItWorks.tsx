import React from 'react';
import { StepItem } from '../../../shared/types/index.ts';

interface HowItWorksProps {
  steps: StepItem[];
}

export default function HowItWorks({ steps }: HowItWorksProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight">
            How Your Money Works With Us
          </h2>
          <p className="text-slate-550 max-w-lg mx-auto mt-3 text-sm sm:text-base text-slate-500">
            Simple, transparent, and compliant member growth frameworks. Let your ledger do the talking.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div 
              key={step.num}
              className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative"
            >
              <div className="h-10 w-10 text-xs font-bold rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-6">
                STEP {step.num}
              </div>
              <h3 className="font-serif text-lg font-bold text-slate-900 mb-2">
                {step.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
