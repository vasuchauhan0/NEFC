import React from 'react';
import { StatItem } from '../../../shared/types/index.ts';

interface StatsSectionProps {
  stats: StatItem[];
}

export default function StatsSection({ stats }: StatsSectionProps) {
  return (
    <section className="bg-black border-b border-white/10 py-10 shadow-xs relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-4 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center px-4 first:pt-0 pt-6 lg:pt-0">
              <div className="text-3xl sm:text-4xl font-serif text-blue-400 font-bold tracking-tight">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm font-medium text-slate-400 mt-2 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}