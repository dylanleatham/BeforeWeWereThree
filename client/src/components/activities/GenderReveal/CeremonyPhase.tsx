import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { GenderValue } from 'shared';
import { STRINGS } from '../../../constants/strings';
import {
  REVEAL_BUILDUP_DURATION_MS,
  REVEAL_TEXT_DELAY_MS,
  REVEAL_SETTLE_DELAY_MS,
  REVEAL_COMPLETE_DELAY_MS,
  REVEAL_GLOW_INITIAL_SCALE,
  REVEAL_GLOW_BLOOM_SCALE,
  REVEAL_GLOW_FINAL_SCALE,
  REVEAL_TEXT_INITIAL_SCALE,
} from '../../../constants/animation';
import './CeremonyPhase.css';

type CeremonyStage = 'buildup' | 'bloom' | 'text' | 'settle';

interface CeremonyPhaseProps {
  /** The revealed gender */
  gender: GenderValue;
  /** Called when the ceremony animation completes */
  onComplete: () => void;
}

/**
 * Full-screen ceremony reveal animation
 *
 * This is THE moment -- the emotional climax of the entire app.
 * The animation sequence:
 * 1. Buildup: screen dims, small glow begins at center
 * 2. Bloom: glow expands rapidly with gender-themed color
 * 3. Text: "It's a Boy!" / "It's a Girl!" fades in with scale
 * 4. Settle: animation calms, transitions to keepsake
 *
 * Uses CSS custom properties for gender-specific color themes:
 * - Boy: warm sky/sage (--reveal-boy-*)
 * - Girl: warm rose (--reveal-girl-*)
 */
export function CeremonyPhase({ gender, onComplete }: CeremonyPhaseProps) {
  const [stage, setStage] = useState<CeremonyStage>('buildup');
  const onCompleteRef = useRef(onComplete);

  // Keep ref fresh in effect, not during render
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage('bloom'), REVEAL_BUILDUP_DURATION_MS),
      setTimeout(() => setStage('text'), REVEAL_TEXT_DELAY_MS),
      setTimeout(() => setStage('settle'), REVEAL_SETTLE_DELAY_MS),
      setTimeout(() => onCompleteRef.current(), REVEAL_COMPLETE_DELAY_MS),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const themeClass = gender === 'boy' ? 'ceremony--boy' : 'ceremony--girl';
  const revealText =
    gender === 'boy' ? STRINGS.REVEAL_BOY_TEXT : STRINGS.REVEAL_GIRL_TEXT;

  // Compute glow animation targets based on stage
  const glowAnimation = (() => {
    switch (stage) {
      case 'buildup':
        return { scale: REVEAL_GLOW_INITIAL_SCALE, opacity: 0.2 };
      case 'bloom':
        return { scale: REVEAL_GLOW_BLOOM_SCALE, opacity: 0.8 };
      case 'text':
      case 'settle':
        return { scale: REVEAL_GLOW_FINAL_SCALE, opacity: 0.6 };
    }
  })();

  return (
    <div className={`ceremony ${themeClass}`} role="alert" aria-live="assertive">
      {/* Background glow -- radial gradient that expands */}
      <motion.div
        className="ceremony__glow"
        initial={{ scale: 0, opacity: 0 }}
        animate={glowAnimation}
        transition={{ duration: 2, ease: 'easeOut' }}
      />

      {/* Reveal text */}
      <AnimatePresence>
        {(stage === 'text' || stage === 'settle') && (
          <motion.h1
            className="ceremony__text"
            initial={{ opacity: 0, scale: REVEAL_TEXT_INITIAL_SCALE }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {revealText}
          </motion.h1>
        )}
      </AnimatePresence>
    </div>
  );
}
