import { useCallback, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import type { Envelope } from 'shared';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { pileCardVariants, springTransition } from '../../utils/motion';
import { EnvelopeCard } from './EnvelopeCard';
import { BaseEnvelope } from './BaseEnvelope';
import { STRINGS } from '../../constants/strings';
import { ENVELOPE_PILE_VISIBLE_COUNT } from '../../constants/config';
import './EnvelopePile.css';

interface EnvelopePileProps {
  envelopes: Envelope[];
  onStatusChange?: (id: string, status: Envelope['status']) => void;
}

/**
 * Stacked pile of envelopes with swipe navigation
 * Per CONTEXT.md:
 * - Stacked pile layout (not grid)
 * - Peek-and-flip navigation: swipe to move through stack
 * - Tap to open front envelope
 */
export function EnvelopePile({ envelopes, onStatusChange }: EnvelopePileProps) {
  const [selectedEnvelope, setSelectedEnvelope] = useState<Envelope | null>(null);

  const { currentIndex, dragX, isDragging, direction, bind, goTo } = useSwipeNavigation({
    itemCount: envelopes.length,
  });

  const handleOpenEnvelope = useCallback(
    (envelope: Envelope) => {
      // Allow opening sealed and opened envelopes (not completed)
      if (envelope.status !== 'completed') {
        setSelectedEnvelope(envelope);
      }
    },
    []
  );

  const handleCloseEnvelope = useCallback(() => {
    setSelectedEnvelope(null);
  }, []);

  const handleStatusChange = useCallback(
    (status: Envelope['status']) => {
      if (selectedEnvelope) {
        onStatusChange?.(selectedEnvelope.id, status);
      }
    },
    [selectedEnvelope, onStatusChange]
  );

  // Visible envelopes: current + cards behind (wraps for looping)
  const visibleCount = Math.min(ENVELOPE_PILE_VISIBLE_COUNT, envelopes.length);
  const visibleEnvelopes: Envelope[] = [];
  for (let i = 0; i < visibleCount; i++) {
    visibleEnvelopes.push(envelopes[(currentIndex + i) % envelopes.length] as Envelope);
  }

  // If an envelope is open, show it fullscreen
  if (selectedEnvelope) {
    const currentEnvData = envelopes.find((e) => e.id === selectedEnvelope.id) || selectedEnvelope;
    return (
      <div className="envelope-pile envelope-pile--expanded">
        <AnimatePresence mode="wait">
          <BaseEnvelope
            key={selectedEnvelope.id}
            envelope={currentEnvData}
            onStatusChange={handleStatusChange}
            onClose={handleCloseEnvelope}
          />
        </AnimatePresence>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="envelope-pile">
        <div className="envelope-pile__stack" {...bind()}>
          <AnimatePresence mode="popLayout">
            {visibleEnvelopes.map((envelope, i) => (
              <motion.div
                key={envelope.id}
                className="envelope-pile__card"
                custom={{ i, direction }}
                variants={pileCardVariants}
                initial="enter"
                animate={i === 0 ? 'front' : 'behind'}
                exit="exit"
                transition={springTransition}
                style={{
                  x: i === 0 ? dragX : 0,
                  position: 'absolute',
                  width: '100%',
                  cursor: i === 0 ? 'grab' : 'default',
                }}
              >
                <EnvelopeCard
                  envelope={envelope}
                  onClick={i === 0 ? () => handleOpenEnvelope(envelope) : undefined}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Navigation indicators */}
        {envelopes.length > 1 && (
          <nav className="envelope-pile__nav" aria-label={STRINGS.PILE_NAV_ARIA}>
            <div className="envelope-pile__dots">
              {envelopes.map((_, i) => (
                <button
                  key={i}
                  className={`envelope-pile__dot ${i === currentIndex ? 'envelope-pile__dot--active' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={STRINGS.PILE_ARIA_GO_TO(i + 1)}
                  aria-current={i === currentIndex ? 'true' : undefined}
                />
              ))}
            </div>
            <p className="envelope-pile__count">
              {STRINGS.PILE_COUNT(currentIndex + 1, envelopes.length)}
            </p>
          </nav>
        )}

        {/* Swipe hint (shown briefly) */}
        {!isDragging && currentIndex === 0 && envelopes.length > 1 && (
          <p className="envelope-pile__hint">{STRINGS.PILE_HINT}</p>
        )}
      </div>
    </MotionConfig>
  );
}
