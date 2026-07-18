import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

const HEADLINE_PREFIX = 'Your trusted partner for ';
const HEADLINE_HIGHLIGHT = 'FD & RD';
const HEADLINE_SUFFIX = ' investments';
const HEADLINE_FULL = HEADLINE_PREFIX + HEADLINE_HIGHLIGHT + HEADLINE_SUFFIX;

const WORDS = ['Fixed Deposit', 'Recurring Deposit'];

const TYPING_SPEED = 35;
const DELETING_SPEED = 20;
const WORD_TYPING_SPEED = 90;
const WORD_DELETING_SPEED = 45;
const HOLD_HEADLINE = 2200;
const HOLD_WORD = 1400;
const PAUSE_BETWEEN_STAGES = 400;

function renderHeadline(len: number) {
  const shown = HEADLINE_FULL.slice(0, len);
  const prefix = shown.slice(0, HEADLINE_PREFIX.length);
  const highlight = shown.slice(HEADLINE_PREFIX.length, HEADLINE_PREFIX.length + HEADLINE_HIGHLIGHT.length);
  const suffix = shown.slice(HEADLINE_PREFIX.length + HEADLINE_HIGHLIGHT.length);
  return (
    <>
      {prefix}
      <span className="text-blue-400">{highlight}</span>
      {suffix}
    </>
  );
}

export default function HeroHeadlineLoop() {
  const [mode, setMode] = useState<'headline' | 'word'>('headline');
  const [headlineLen, setHeadlineLen] = useState(HEADLINE_FULL.length);
  const [wordText, setWordText] = useState('');

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const typeHeadline = (onDone: () => void) => {
      let len = 0;
      const tick = () => {
        if (cancelled) return;
        len += 1;
        setHeadlineLen(len);
        if (len >= HEADLINE_FULL.length) {
          timeoutId = setTimeout(onDone, HOLD_HEADLINE);
          return;
        }
        timeoutId = setTimeout(tick, TYPING_SPEED);
      };
      tick();
    };

    const deleteHeadline = (onDone: () => void) => {
      let len = HEADLINE_FULL.length;
      const tick = () => {
        if (cancelled) return;
        len -= 1;
        setHeadlineLen(len);
        if (len <= 0) {
          timeoutId = setTimeout(onDone, PAUSE_BETWEEN_STAGES);
          return;
        }
        timeoutId = setTimeout(tick, DELETING_SPEED);
      };
      tick();
    };

    const typeWord = (wordIndex: number, onDone: () => void) => {
      const current = WORDS[wordIndex];
      let charIndex = 0;
      let deleting = false;

      const tick = () => {
        if (cancelled) return;

        if (!deleting) {
          charIndex += 1;
          setWordText(current.slice(0, charIndex));
          if (charIndex === current.length) {
            deleting = true;
            timeoutId = setTimeout(tick, HOLD_WORD);
            return;
          }
        } else {
          charIndex -= 1;
          setWordText(current.slice(0, charIndex));
          if (charIndex === 0) {
            if (wordIndex + 1 < WORDS.length) {
              typeWord(wordIndex + 1, onDone);
            } else {
              onDone();
            }
            return;
          }
        }
        timeoutId = setTimeout(tick, deleting ? WORD_DELETING_SPEED : WORD_TYPING_SPEED);
      };

      tick();
    };

    const runCycle = () => {
      setMode('headline');
      setHeadlineLen(0);
      typeHeadline(() => {
        deleteHeadline(() => {
          setMode('word');
          setWordText('');
          typeWord(0, () => {
            timeoutId = setTimeout(() => {
              if (!cancelled) runCycle();
            }, PAUSE_BETWEEN_STAGES);
          });
        });
      });
    };

    runCycle();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="mb-6 max-w-4xl mx-auto min-h-[9rem] flex flex-col items-center justify-center">
      {mode === 'headline' ? (
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-white font-bold tracking-tight leading-tight min-h-[2.4em]">
          {renderHeadline(headlineLen)}
        </h1>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-lg sm:text-xl text-slate-400 font-serif mb-2">
            Securing your investments with
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-blue-400 tracking-tight leading-tight min-h-[1.2em]">
            {wordText}
            <span
              className="inline-block w-[3px] bg-blue-400 ml-1 animate-pulse"
              style={{ height: '0.9em', verticalAlign: 'middle' }}
            />
          </h1>
        </motion.div>
      )}
    </div>
  );
}