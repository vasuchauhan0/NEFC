import React, { useMemo } from 'react';
import { motion } from 'motion/react';

const COIN_COUNT = 14;

function Coin({ left, delay, duration, size }: { left: number; delay: number; duration: number; size: number }) {
  return (
    <motion.svg
      viewBox="0 0 44 44"
      width={size}
      height={size}
      className="absolute pointer-events-none select-none"
      style={{ left: `${left}%`, top: '-60px' }}
      initial={{ y: 0, opacity: 0, rotate: 0 }}
      animate={{ y: 620, opacity: [0, 0.9, 0.9, 0], rotate: 360 }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <defs>
        <linearGradient id={`coinGrad-${left}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f6c445" />
          <stop offset="100%" stopColor="#d89b1e" />
        </linearGradient>
      </defs>
      <circle cx="22" cy="22" r="20" fill={`url(#coinGrad-${left})`} stroke="#b9791a" strokeWidth="2" />
      <text
        x="22"
        y="30"
        fontFamily="Georgia, serif"
        fontSize="20"
        fontWeight="bold"
        fill="#7a5410"
        textAnchor="middle"
      >
        $
      </text>
    </motion.svg>
  );
}

export default function CoinShower() {
  const coins = useMemo(
    () =>
      Array.from({ length: COIN_COUNT }).map((_, i) => ({
        left: (i / COIN_COUNT) * 90 + Math.random() * 8,
        delay: Math.random() * 6,
        duration: 7 + Math.random() * 4,
        size: 22 + Math.random() * 16,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[5]" aria-hidden="true">
      {coins.map((c, i) => (
        <Coin key={i} left={c.left} delay={c.delay} duration={c.duration} size={c.size} />
      ))}
    </div>
  );
}