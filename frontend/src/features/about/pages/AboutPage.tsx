import React from 'react';
import { ShieldCheck, Users, Landmark, Award } from 'lucide-react';
import { Company } from '../../../shared/types/index.ts';

interface AboutPageProps {
  company: Company;
}

export default function AboutPage({ company }: AboutPageProps) {
  const paragraphs = (company.about || '').split('\n\n');

  return (
    <div className="bg-slate-50 animate-fade-in">
      {/* Editorial Header */}
      <section className="bg-white border-b border-slate-150 py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-slate-900 tracking-tight">
            About {company.short}
          </h2>
          <p className="text-slate-500 mt-2 font-serif text-sm sm:text-base capitalize">
            {company.name}
          </p>
          <div className="h-1 w-12 bg-blue-700 mx-auto mt-6 rounded-full" />
        </div>
      </section>

      {/* Main Narrative Narrative Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6">
          {paragraphs.map((para, idx) => (
            <p 
              key={idx} 
              className="text-slate-700 text-sm sm:text-base leading-relaxed font-sans"
            >
              {para}
            </p>
          ))}
          {paragraphs.length === 0 && (
            <p className="text-slate-400 text-center italic py-4">Company biography loading...</p>
          )}
        </div>
      </section>

      {/* Core Institutional Value Anchors */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200/80 p-6 rounded-2xl">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl inline-block mb-4">
              <ShieldCheck size={24} />
            </div>
            <h4 className="font-sans font-bold text-slate-900 text-sm mb-2">Legal Compliance</h4>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Operating fully within credit cooperative guidelines and certified microcredit regulatory bylaws.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 p-6 rounded-2xl">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl inline-block mb-4">
              <Landmark size={24} />
            </div>
            <h4 className="font-sans font-bold text-slate-900 text-sm mb-2">Branch-Office Security</h4>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Based in our physical office in Ghaziabad, Uttar Pradesh, with physical records vault security.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 p-6 rounded-2xl">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl inline-block mb-4">
              <Users size={24} />
            </div>
            <h4 className="font-sans font-bold text-slate-900 text-sm mb-2">Active Audit Ledger</h4>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Fully transparent ledgers, stamped receipt bonds, and regular independent accountant audits.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 p-6 rounded-2xl">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl inline-block mb-4">
              <Award size={24} />
            </div>
            <h4 className="font-sans font-bold text-slate-900 text-sm mb-2">Zero Default Standard</h4>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              History of zero mature bond defaults. Remittances paid out precisely on the calendar maturity date.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
