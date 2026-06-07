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
      <HowItWorks steps={steps} />
      <TrustSection trust={trust} />
    </div>
  );
}
