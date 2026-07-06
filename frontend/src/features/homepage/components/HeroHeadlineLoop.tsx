import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const WORDS = ['Fixed Deposit', 'Recurring Deposit'];
const TYPING_SPEED = 90;
const DELETING_SPEED = 45;
const HOLD_TIME = 1400;
const STAGE1_HOLD = 2800;
const STAGE2_HOLD = 600;

type Stage = 'static' | 'typing';

export default function HeroHeadlineLoop() {
  const [stage, setStage] = useState<Stage>('static');
  const [typed, setTyped] = useState('');

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const typeWord = (wordIndex: number, onDone: () => void) => {
      const current = WORDS[wordIndex];
      let charIndex = 0;
      let deleting = false;

      const tick = () => {
        if (cancelled) return;

        if (!deleting) {
          charIndex += 1;
          setTyped(current.slice(0, charIndex));
          if (charIndex === current.length) {
            deleting = true;
            timeoutId = setTimeout(tick, HOLD_TIME);
            return;
          }
        } else {
          charIndex -= 1;
          setTyped(current.slice(0, charIndex));
          if (charIndex === 0) {
            if (wordIndex + 1 < WORDS.length) {
              typeWord(wordIndex + 1, onDone);
            } else {
              onDone();
            }
            return;
          }
        }
        timeoutId = setTimeout(tick, deleting ? DELETING_SPEED : TYPING_SPEED);
      };

      tick();
    };

    const runCycle = () => {
      setStage('static');
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        setStage('typing');
        setTyped('');
        typeWord(0, () => {
          timeoutId = setTimeout(() => {
            if (!cancelled) runCycle();
          }, STAGE2_HOLD);
        });
      }, STAGE1_HOLD);
    };

    runCycle();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="mb-6 max-w-4xl mx-auto min-h-[9rem] flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {stage === 'static' ? (
          <motion.h1
            key="static"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl md:text-6xl font-serif text-slate-900 font-bold tracking-tight leading-tight"
          >
            Your trusted partner for <span className="text-blue-700">FD &amp; RD</span> investments
          </motion.h1>
        ) : (
          <motion.div
            key="typing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-lg sm:text-xl text-slate-500 font-serif mb-2">
              Securing your investments with
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-blue-700 tracking-tight leading-tight min-h-[1.2em]">
              {typed}
              <span
                className="inline-block w-[3px] bg-blue-700 ml-1 animate-pulse"
                style={{ height: '0.9em', verticalAlign: 'middle' }}
              />
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}