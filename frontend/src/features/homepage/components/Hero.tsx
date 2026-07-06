import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { HeroContent } from '../../../shared/types/index.ts';
import CoinShower from './CoinShower.tsx';
import HeroHeadlineLoop from './HeroHeadlineLoop.tsx';

interface HeroProps {
  hero: HeroContent;
  navigate: (page: string) => void;
}

export default function Hero({ hero, navigate }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-tr from-blue-50 via-slate-50 to-emerald-50/50 py-16 md:py-24 border-b border-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(59,130,246,0.04),transparent_50%)]" />

      {/* Floating background logo */}
      <motion.img
        src="/logo.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute top-1/2 left-1/2 w-[600px] max-w-none opacity-[0.06] -z-0"
        style={{ x: '-50%', y: '-50%' }}
        animate={{ y: ['-52%', '-48%', '-52%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-block bg-blue-100/80 border border-blue-200/50 text-blue-800 text-xs px-3.5 py-1.5 rounded-full font-semibold tracking-wide mb-6 uppercase"
        >
          {hero.tag}
        </motion.div>
        
        <HeroHeadlineLoop />

        <motion.p 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-sans"
        >
          {hero.subtitle}
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4"
        >
          <button
            onClick={() => navigate('schemes')}
            className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white font-medium px-8 py-3.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-colors duration-150"
            id="hero-schemes"
          >
            <TrendingUp size={18} />
            View Investment Schemes
          </button>
          <button
            onClick={() => navigate('calculator')}
            className="w-full sm:w-auto bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 font-medium px-8 py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors duration-150"
            id="hero-calculator"
          >
            Calculate Interest Rates
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    </section>
  );
}