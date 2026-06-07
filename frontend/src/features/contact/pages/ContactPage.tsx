import React, { useState } from 'react';
import ContactForm from '../components/ContactForm.tsx';
import ContactInfo from '../components/ContactInfo.tsx';
import { Company } from '../../../shared/types/index.ts';

interface ContactPageProps {
  company: Company;
}

export default function ContactPage({ company }: ContactPageProps) {
  const [success, setSuccess] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight">
          Get in Touch
        </h2>
        <p className="text-slate-500 mt-2 max-w-lg mx-auto text-sm sm:text-base">
          Our branch representatives in Uttar Pradesh will respond to your queries within 24 working hours.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-12 items-start max-w-5xl mx-auto">
        <ContactInfo company={company} />
        <ContactForm success={success} onSuccess={() => setSuccess(true)} />
      </div>
    </div>
  );
}
