import React from 'react';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import { Company } from '../../../shared/types/index.ts';

interface ContactInfoProps {
  company: Company;
}

export default function ContactInfo({ company }: ContactInfoProps) {
  return (
    <div className="lg:col-span-2 bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800 text-white p-8 rounded-3xl shadow-xl ring-1 ring-blue-300/40 space-y-8 select-none">
      <div>
        <h3 className="font-serif text-2xl font-bold tracking-tight">Corporate Headquarters</h3>
        <p className="text-blue-200 text-xs mt-1">Visit or call us during direct office hours</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <MapPin className="text-blue-300 mt-1 flex-shrink-0" size={18} />
          <div>
            <h4 className="text-xs font-bold uppercase text-blue-300 tracking-wide">Registry Office</h4>
            <p className="text-sm text-slate-100 whitespace-pre-line mt-1 font-sans font-medium">
              {company.address}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <Phone className="text-blue-300 mt-1 flex-shrink-0" size={18} />
          <div>
            <h4 className="text-xs font-bold uppercase text-blue-300 tracking-wide">Branch Hotline</h4>
            <p className="text-sm font-semibold text-slate-100 font-mono mt-0.5">{company.phone}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <Mail className="text-blue-300 mt-1 flex-shrink-0" size={18} />
          <div>
            <h4 className="text-xs font-bold uppercase text-blue-300 tracking-wide">Support Email</h4>
            <p className="text-sm font-semibold text-slate-100 font-sans mt-0.5">{company.email}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <Globe className="text-blue-300 mt-1 flex-shrink-0" size={18} />
          <div>
            <h4 className="text-xs font-bold uppercase text-blue-300 tracking-wide">Domain Address</h4>
            <p className="text-sm font-semibold text-slate-100 font-mono mt-0.5">{company.website}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-blue-800/60 pt-6 text-[11px] text-blue-300 leading-normal">
        * Office operations: Monday — Saturday, 10:00 AM to 6:00 PM (except gazetted holidays).
      </div>
    </div>
  );
}
