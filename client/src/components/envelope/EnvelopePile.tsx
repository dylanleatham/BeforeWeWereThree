import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import type { Envelope } from 'shared';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { pileCardVariants, springTransition } from '../../utils/motion';
import { hasCompletedView } from '../../utils/envelope';
import { EnvelopeCard } from './EnvelopeCard';
import { BaseEnvelope } from './BaseEnvelope';
import { STRINGS } from '../../constants/strings';
import { ENVELOPE_PILE_VISIBLE_COUNT } from '../../constants/config';
import { LIST_ITEM_STAGGER_S } from '../../constants/animation';
import './EnvelopePile.css';

export type PileViewMode = 'stack' | 'list' | 'detail';

interface EnvelopePileProps {
  envelopes: Envelope[];
  onStatusChange?: (id: string, status: Envelope['status']) => void;
  viewMode?: PileViewMode;
  onViewModeChange?: (mode: PileViewMode) => void;
}

/**
 * Stacked pile of envelopes with swipe navigation
 * Supports three view modes:
 * - stack: Stacked pile with swipe navigation (default)
 * - list: Flat scrollable list of all envelopes
 * - detail: Fullscreen envelope view
 */
export function EnvelopePile({
  envelopes,
  onStatusChange,
  viewMode = 'stack',
  onViewModeChange,
}: EnvelopePileProps) {
  const [selectedEnvelope, setSelectedEnvelope] = useState<Envelope | null>(null);
  const [tappedEnvelopeId, setTappedEnvelopeId] = useState<string | null>(null);

  const { currentIndex, dragX, isDragging, direction, bind, goTo } = useSwipeNavigation({
    itemCount: envelopes.length,
  });

  const handleOpenEnvelope = useCallback(
    (envelope: Envelope) => {
      if (envelope.status !== 'completed' || hasCompletedView(envelope.type)) {
        setSelectedEnvelope(envelope);
        onViewModeChange?.('detail');
      }
    },
    [onViewModeChange]
  );

  const handleCloseEnvelope = useCallback(() => {
    setSelectedEnvelope(null);
    onViewModeChange?.('list');
  }, [onViewModeChange]);

  const handleStatusChange = useCallback(
    (status: Envelope['status']) => {
      if (selectedEnvelope) {
        onStatusChange?.(selectedEnvelope.id, status);
      }
    },
    [selectedEnvelope, onStatusChange]
  );

  const handleStackTap = useCallback(
    (envelope: Envelope) => {
      setTappedEnvelopeId(envelope.id);
      onViewModeChange?.('list');
    },
    [onViewModeChange]
  );

  // Flat list: tapped envelope first, then the rest in original order
  const flatListEnvelopes = useMemo(() => {
    if (!tappedEnvelopeId) return envelopes;
    const tapped = envelopes.find((e) => e.id === tappedEnvelopeId);
    if (!tapped) return envelopes;
    const rest = envelopes.filter((e) => e.id !== tappedEnvelopeId);
    return [tapped, ...rest];
  }, [envelopes, tappedEnvelopeId]);

  // Visible envelopes for stack mode
  const visibleCount = Math.min(ENVELOPE_PILE_VISIBLE_COUNT, envelopes.length);
  const visibleEnvelopes: Envelope[] = [];
  for (let i = 0; i < visibleCount; i++) {
    visibleEnvelopes.push(envelopes[(currentIndex + i) % envelopes.length] as Envelope);
  }

  // Detail mode: fullscreen envelope view
  if (viewMode === 'detail' && selectedEnvelope) {
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

  // List mode: flat scrollable list
  if (viewMode === 'list') {
    return (
      <MotionConfig reducedMotion="user">
        <div className="envelope-pile envelope-pile--list">
          <div className="envelope-pile__list">
            {flatListEnvelopes.map((envelope, i) => (
              <motion.div
                key={envelope.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * LIST_ITEM_STAGGER_S }}
              >
                <EnvelopeCard
                  envelope={envelope}
                  onClick={() => handleOpenEnvelope(envelope)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </MotionConfig>
    );
  }

  // Stack mode: stacked pile with swipe navigation (default)
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
                  onClick={i === 0 ? () => handleStackTap(envelope) : undefined}
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
