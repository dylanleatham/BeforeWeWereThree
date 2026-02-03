# Phase 2: UI Foundation & Envelope Model - Research

**Researched:** 2026-02-02
**Domain:** React UI components, CSS design systems, animations, touch gestures, mobile haptics
**Confidence:** HIGH

## Summary

Phase 2 establishes the visual foundation and interactive envelope system for the babymoon application. The phase covers four major areas: (1) implementing the Golden Hour design system using CSS variables from existing design docs, (2) building the BaseEnvelope component with sealed/opened/completed states, (3) creating satisfying envelope open animations with Motion (Framer Motion v12), and (4) enabling mobile-friendly interactions including touch gestures and haptic feedback.

The standard approach uses Motion for React (v12.x) for animations including the envelope open effect, CSS custom properties for the design token system, and the native Web Vibration API for haptic feedback. The stacked pile navigation with peek-and-flip uses a combination of Motion's layout animations and @use-gesture/react for swipe detection. lucide-react provides the icon set per the design foundation document.

Key decisions from CONTEXT.md constrain implementation: single tap to open (not hold or swipe), medium flourish animation (400-500ms), stacked pile layout (not grid), ribbon-tied sealed state visual, and partner presence indicators on envelopes.

**Primary recommendation:** Build the design system CSS variables first, then create atomic UI components (Button, Card), then BaseEnvelope with states, then animations. Use Motion for React for all animations - it handles prefers-reduced-motion automatically with the MotionConfig reducedMotion option.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion | ^12.29.x | Animation library | 14M+ weekly downloads, GPU-accelerated, built-in gesture support, layout animations, accessibility features |
| lucide-react | ^0.562.x | Icon library | 1,667 icons, tree-shakeable, matches design doc recommendation, consistent 1.5-2px stroke |
| @use-gesture/react | ^10.3.x | Touch gesture handling | Pairs with Motion, swipe detection, drag support, works on touch and mouse |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | ^2.x | Conditional CSS classes | Combining dynamic class names in components |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Motion (framer-motion) | react-spring | react-spring has steeper learning curve; Motion has better docs, gesture support, and layout animations |
| @use-gesture/react | react-swipeable | react-swipeable is simpler but @use-gesture integrates better with Motion |
| CSS variables | Tailwind CSS | CSS variables match existing design docs; Tailwind would require migration of existing token system |
| lucide-react | react-icons | lucide-react specifically recommended in design docs; consistent style |

**Installation:**

```bash
# From project root
npm install motion lucide-react @use-gesture/react clsx -w client
```

Note: `motion` is the new package name for framer-motion v12+. Import from `motion/react`.

## Architecture Patterns

### Recommended Project Structure

```
client/src/
├── components/
│   ├── common/              # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Typography.tsx   # Heading, Body, Caption
│   │   └── Icon.tsx         # Wrapper for lucide icons
│   ├── envelope/            # Envelope system
│   │   ├── BaseEnvelope.tsx # Main envelope component
│   │   ├── EnvelopeCard.tsx # Individual envelope in pile
│   │   ├── EnvelopePile.tsx # Stacked pile container
│   │   ├── EnvelopeHeader.tsx
│   │   ├── EnvelopeFooter.tsx
│   │   └── EnvelopeStates/  # State-specific visuals
│   │       ├── SealedEnvelope.tsx
│   │       ├── OpenedEnvelope.tsx
│   │       └── CompletedEnvelope.tsx
│   └── activities/          # (Later phases)
├── styles/
│   ├── variables.css        # CSS custom properties from design system
│   ├── typography.css       # Font loading and type scale
│   ├── animations.css       # Keyframe definitions
│   └── globals.css          # Reset and base styles
├── hooks/
│   ├── useEnvelope.ts       # Envelope state management
│   ├── useHaptics.ts        # Vibration API wrapper
│   └── useSwipeNavigation.ts # Pile navigation gestures
└── utils/
    └── motion.ts            # Motion variants and transitions
```

### Pattern 1: CSS Custom Properties from Design System

**What:** Convert the design tokens from `babymoon_design_foundation.md` into a CSS variables file that all components reference.

**When to use:** All styling that references colors, spacing, typography, or timing values.

**Example:**

```css
/* client/src/styles/variables.css */
:root {
  /* Primary Palette */
  --color-sunrise-gold: #F4A261;
  --color-warm-sand: #FAF3E8;
  --color-dusk-rose: #E07A5F;
  --color-deep-terracotta: #BC6C4A;
  --color-soft-sage: #9DB5A0;

  /* Neutrals */
  --color-warm-charcoal: #3D3A38;
  --color-soft-graphite: #6B6662;
  --color-muted-stone: #A8A29E;
  --color-cream: #FFFEF9;
  --color-light-linen: #F5F1EB;

  /* Semantic */
  --color-success: var(--color-soft-sage);
  --color-attention: var(--color-dusk-rose);
  --color-love: var(--color-sunrise-gold);

  /* Backgrounds */
  --bg-primary: var(--color-warm-sand);
  --bg-card: var(--color-cream);
  --bg-elevated: #FFFFFF;

  /* Text */
  --text-primary: var(--color-warm-charcoal);
  --text-secondary: var(--color-soft-graphite);
  --text-muted: var(--color-muted-stone);

  /* Typography */
  --font-display: "Fraunces", Georgia, serif;
  --font-body: "Source Sans 3", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Type Scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;

  /* Spacing (8px base grid) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Animation Timing */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-envelope: 450ms; /* Per CONTEXT.md: 400-500ms */

  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**Source:** `docs/babymoon_design_foundation.md` (project documentation)

### Pattern 2: Motion Variants for Envelope States

**What:** Define reusable animation variants for envelope state transitions.

**When to use:** All envelope animations (open, close, state changes).

**Example:**

```typescript
// client/src/utils/motion.ts
import { Variants, Transition } from 'motion/react';

// Envelope flap animation (ribbon untying effect)
export const envelopeFlapVariants: Variants = {
  sealed: {
    rotateX: 0,
    y: 0,
  },
  opening: {
    rotateX: -180,
    y: -10,
    transition: {
      duration: 0.45, // Per CONTEXT.md: 400-500ms
      ease: [0.34, 1.56, 0.64, 1], // bounce easing
    },
  },
  opened: {
    rotateX: -180,
    y: 0,
  },
};

// Content reveal animation
export const contentRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.3, // Wait for flap to open
      duration: 0.25,
      ease: 'easeOut',
    },
  },
};

// Ribbon animation (untying)
export const ribbonVariants: Variants = {
  tied: {
    scale: 1,
    rotate: 0,
    opacity: 1,
  },
  untying: {
    scale: [1, 1.1, 0.9],
    rotate: [0, 10, -5, 0],
    opacity: [1, 1, 0.7],
    transition: {
      duration: 0.35,
      ease: 'easeOut',
    },
  },
  untied: {
    scale: 0.9,
    rotate: -5,
    opacity: 0.6,
  },
};

// Pile stacking for navigation
export const pileCardVariants: Variants = {
  behind: (i: number) => ({
    scale: 1 - i * 0.05,
    y: i * 4,
    rotate: (i % 2 === 0 ? 1 : -1) * i * 1.5, // Slight rotation offset
    zIndex: 10 - i,
    opacity: 1 - i * 0.15,
  }),
  front: {
    scale: 1,
    y: 0,
    rotate: 0,
    zIndex: 10,
    opacity: 1,
  },
  exit: {
    x: -300,
    opacity: 0,
    transition: { duration: 0.3 },
  },
};

// Default spring for satisfying feel
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};
```

**Source:** [Motion Documentation - Variants](https://motion.dev/docs/react-animation)

### Pattern 3: BaseEnvelope Component with State Machine

**What:** Single component handling all envelope visual states through composition.

**When to use:** Rendering any envelope, regardless of activity type.

**Example:**

```typescript
// client/src/components/envelope/BaseEnvelope.tsx
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { useState, useCallback } from 'react';
import { useHaptics } from '../../hooks/useHaptics';
import { envelopeFlapVariants, contentRevealVariants } from '../../utils/motion';
import type { Envelope, EnvelopeStatus } from 'shared/types';

interface BaseEnvelopeProps {
  envelope: Envelope;
  children: React.ReactNode;
  onOpen?: () => void;
  onComplete?: () => void;
  partnerPresent?: boolean;
}

export function BaseEnvelope({
  envelope,
  children,
  onOpen,
  onComplete,
  partnerPresent = false,
}: BaseEnvelopeProps) {
  const [localStatus, setLocalStatus] = useState<EnvelopeStatus>(envelope.status);
  const { triggerTap } = useHaptics();

  const handleOpen = useCallback(() => {
    if (localStatus !== 'sealed') return;

    // Haptic feedback on open
    triggerTap();

    setLocalStatus('opened');
    onOpen?.();
  }, [localStatus, onOpen, triggerTap]);

  return (
    <MotionConfig reducedMotion="user">
      <motion.article
        className="envelope"
        data-status={localStatus}
        onClick={localStatus === 'sealed' ? handleOpen : undefined}
        role={localStatus === 'sealed' ? 'button' : undefined}
        tabIndex={localStatus === 'sealed' ? 0 : undefined}
        aria-label={localStatus === 'sealed' ? `Open ${envelope.title}` : undefined}
        whileTap={localStatus === 'sealed' ? { scale: 0.98 } : undefined}
      >
        {/* Partner presence indicator */}
        {partnerPresent && (
          <div className="envelope__partner-indicator" aria-label="Partner is viewing">
            <span className="envelope__partner-dot" />
          </div>
        )}

        {/* Envelope flap (animated on open) */}
        <motion.div
          className="envelope__flap"
          variants={envelopeFlapVariants}
          initial="sealed"
          animate={localStatus === 'sealed' ? 'sealed' : 'opened'}
          style={{ transformOrigin: 'top center' }}
        />

        {/* Ribbon (only on sealed) */}
        <AnimatePresence>
          {localStatus === 'sealed' && (
            <motion.div
              className="envelope__ribbon"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        {/* Content (revealed on open) */}
        <AnimatePresence mode="wait">
          {localStatus !== 'sealed' && (
            <motion.div
              className="envelope__content"
              variants={contentRevealVariants}
              initial="hidden"
              animate="visible"
            >
              <EnvelopeHeader envelope={envelope} status={localStatus} />
              {children}
              <EnvelopeFooter
                status={localStatus}
                onComplete={() => {
                  setLocalStatus('completed');
                  onComplete?.();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion badge */}
        {localStatus === 'completed' && (
          <div className="envelope__badge">
            <Heart size={20} fill="currentColor" />
          </div>
        )}
      </motion.article>
    </MotionConfig>
  );
}
```

**Source:** [Motion AnimatePresence](https://motion.dev/docs/react-animate-presence), `docs/bwwt_technical_patterns.md`

### Pattern 4: Haptic Feedback Hook

**What:** React hook wrapping the Web Vibration API for mobile haptics.

**When to use:** Envelope open, button taps, significant interactions.

**Example:**

```typescript
// client/src/hooks/useHaptics.ts
import { useCallback } from 'react';

interface HapticsHook {
  isSupported: boolean;
  triggerTap: () => void;
  triggerSuccess: () => void;
  triggerPattern: (pattern: number | number[]) => void;
}

export function useHaptics(): HapticsHook {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const triggerPattern = useCallback((pattern: number | number[]) => {
    if (!isSupported) return;

    try {
      navigator.vibrate(pattern);
    } catch {
      // Silently fail - haptics are enhancement, not critical
    }
  }, [isSupported]);

  // Short tap feedback (~50ms)
  const triggerTap = useCallback(() => {
    triggerPattern(50);
  }, [triggerPattern]);

  // Success pattern (tap-pause-tap)
  const triggerSuccess = useCallback(() => {
    triggerPattern([50, 30, 50]);
  }, [triggerPattern]);

  return {
    isSupported,
    triggerTap,
    triggerSuccess,
    triggerPattern,
  };
}
```

**Note:** The Vibration API requires user gesture to trigger. Always tie vibration to click/touch events. Some browsers (iOS Safari) have limited support.

**Source:** [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API), [OpenReplay - Haptic Feedback](https://blog.openreplay.com/haptic-feedback-for-web-apps-with-the-vibration-api/)

### Pattern 5: Stacked Pile Navigation with Gestures

**What:** Envelope pile with swipe-to-navigate using @use-gesture and Motion.

**When to use:** Main envelope navigation view.

**Example:**

```typescript
// client/src/components/envelope/EnvelopePile.tsx
import { motion, AnimatePresence } from 'motion/react';
import { useDrag } from '@use-gesture/react';
import { useState, useCallback } from 'react';
import { pileCardVariants, springTransition } from '../../utils/motion';
import type { Envelope } from 'shared/types';

interface EnvelopePileProps {
  envelopes: Envelope[];
  onSelectEnvelope: (envelope: Envelope) => void;
}

const SWIPE_THRESHOLD = 100; // px to trigger swipe

export function EnvelopePile({ envelopes, onSelectEnvelope }: EnvelopePileProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);

  const bind = useDrag(
    ({ active, movement: [mx], direction: [dx], cancel }) => {
      if (active) {
        setDragX(mx);
      } else {
        // Check if swipe threshold exceeded
        if (Math.abs(mx) > SWIPE_THRESHOLD) {
          if (dx < 0 && currentIndex < envelopes.length - 1) {
            // Swipe left - next envelope
            setCurrentIndex((i) => i + 1);
          } else if (dx > 0 && currentIndex > 0) {
            // Swipe right - previous envelope
            setCurrentIndex((i) => i - 1);
          }
        }
        setDragX(0);
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      rubberband: true,
    }
  );

  // Show 3 cards: current + 2 behind
  const visibleEnvelopes = envelopes.slice(currentIndex, currentIndex + 3);

  return (
    <div className="envelope-pile" style={{ touchAction: 'pan-y' }}>
      <AnimatePresence mode="popLayout">
        {visibleEnvelopes.map((envelope, i) => (
          <motion.div
            key={envelope.id}
            className="envelope-pile__card"
            custom={i}
            variants={pileCardVariants}
            initial="behind"
            animate={i === 0 ? 'front' : 'behind'}
            exit="exit"
            transition={springTransition}
            style={{
              x: i === 0 ? dragX : 0,
              position: 'absolute',
            }}
            {...(i === 0 ? bind() : {})}
            onClick={i === 0 ? () => onSelectEnvelope(envelope) : undefined}
          >
            <EnvelopeCard envelope={envelope} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Navigation indicators */}
      <div className="envelope-pile__indicators">
        {envelopes.map((_, i) => (
          <span
            key={i}
            className={`envelope-pile__dot ${i === currentIndex ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
```

**Source:** [@use-gesture documentation](https://use-gesture.netlify.app/), [Motion Layout Animations](https://motion.dev/docs/react-layout-animations)

### Anti-Patterns to Avoid

- **Hardcoded hex colors:** Always use CSS variables (`var(--color-sunrise-gold)`, not `#F4A261`)
- **Animations without reduced motion support:** Use Motion's `MotionConfig reducedMotion="user"` or check `useReducedMotion()`
- **Touch targets under 44x44px:** Design system requires minimum 48px (3rem) for touch targets
- **Swipe-to-open envelopes:** Per CONTEXT.md, envelopes open on single tap, not swipe (swipe is for pile navigation)
- **Grid layout for envelopes:** Per CONTEXT.md, use stacked pile layout, not grid
- **Separate completed area:** Completed envelopes stay in pile but look visually distinct

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animation orchestration | Custom setTimeout chains | Motion AnimatePresence + variants | Handles mount/unmount, interruptions, layout shifts |
| Swipe gesture detection | Custom touch event math | @use-gesture/react useDrag | Handles velocity, direction, touch vs mouse, edge cases |
| Reduced motion detection | Manual matchMedia listener | Motion useReducedMotion() hook | Auto-subscribes to changes, SSR-safe |
| Icon rendering | Custom SVG components | lucide-react | 1,667 icons, consistent styling, tree-shakeable |
| CSS class composition | String concatenation | clsx library | Handles falsy values, arrays, objects cleanly |
| Card flip animation | Custom CSS keyframes | Motion variants with rotateX | Handles interruptions, spring physics, exit animations |

**Key insight:** Motion for React handles animation interruptions gracefully. If a user taps an envelope while another animation is playing, Motion smoothly interpolates to the new state. Custom CSS animations would snap or break.

## Common Pitfalls

### Pitfall 1: Forgetting `touchAction` on Draggable Elements

**What goes wrong:** Swipe gestures conflict with browser scroll, causing janky behavior or preventing swipes entirely.

**Why it happens:** Browser tries to scroll the page while you're trying to drag an element.

**How to avoid:** Always set `touchAction: 'pan-y'` (allow vertical scroll, capture horizontal) or `touchAction: 'none'` (capture all) on draggable containers.

```tsx
<div {...bind()} style={{ touchAction: 'pan-y' }}>
```

**Warning signs:** Swipes not registering on mobile, page scrolling instead of swiping.

### Pitfall 2: AnimatePresence Children Without Keys

**What goes wrong:** Exit animations don't play. Components just disappear instantly.

**Why it happens:** AnimatePresence needs unique keys to track which children are entering/exiting.

**How to avoid:** Always provide unique `key` prop to direct children of AnimatePresence.

```tsx
<AnimatePresence>
  {isVisible && (
    <motion.div key="modal" exit={{ opacity: 0 }}>
      {/* ... */}
    </motion.div>
  )}
</AnimatePresence>
```

**Warning signs:** `exit` prop has no effect, elements vanish immediately.

### Pitfall 3: CSS Variables Not Available in JavaScript

**What goes wrong:** Trying to read CSS variable values in JavaScript returns empty string.

**Why it happens:** CSS variables need to be read from computed styles, not directly.

**How to avoid:** Read via `getComputedStyle`:

```typescript
const root = document.documentElement;
const gold = getComputedStyle(root).getPropertyValue('--color-sunrise-gold').trim();
```

Or define shared constants in both CSS and JS:

```typescript
// constants/colors.ts
export const colors = {
  sunriseGold: '#F4A261',
  // ...
};

// Use in CSS variable definitions AND JS where needed
```

**Warning signs:** Animations using CSS variable colors showing as transparent or wrong color.

### Pitfall 4: iOS Safari Vibration API Not Supported

**What goes wrong:** `navigator.vibrate()` throws error or does nothing on iOS.

**Why it happens:** iOS Safari does not support the Web Vibration API. Only Android Chrome/Firefox support it reliably.

**How to avoid:** Always check support and fail gracefully:

```typescript
const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
if (canVibrate) {
  navigator.vibrate(50);
}
// iOS users just don't get haptic feedback - acceptable degradation
```

**Warning signs:** Console errors on iOS, or expecting haptics that never fire.

### Pitfall 5: Font Loading Flash (FOUT)

**What goes wrong:** Page loads with system fonts, then flashes to Fraunces/Source Sans 3.

**Why it happens:** Web fonts load asynchronously; content renders before fonts are ready.

**How to avoid:** Use `font-display: swap` in @font-face and preload critical fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet">
```

**Warning signs:** Text briefly appears in wrong font on page load.

### Pitfall 6: Animation Performance on Low-End Devices

**What goes wrong:** Envelope animations are janky, drop frames, feel sluggish.

**Why it happens:** Animating properties that trigger layout (width, height, top, left) instead of compositor-only properties.

**How to avoid:** Only animate `transform` and `opacity`. Motion does this by default for x/y/scale/rotate:

```tsx
// Good - compositor only
<motion.div animate={{ x: 100, opacity: 0.5 }} />

// Bad - triggers layout
<motion.div animate={{ left: 100, width: 200 }} />
```

For complex animations, add `willChange`:

```tsx
<motion.div style={{ willChange: 'transform' }} />
```

**Warning signs:** Low FPS, visible stuttering, device getting warm.

## Code Examples

### Complete Button Component

```typescript
// client/src/components/common/Button.tsx
import { motion } from 'motion/react';
import clsx from 'clsx';
import './Button.css';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className,
  type = 'button',
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      className={clsx('btn', `btn--${variant}`, `btn--${size}`, className)}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
}
```

```css
/* client/src/components/common/Button.css */
.btn {
  font-family: var(--font-body);
  font-weight: 500;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-default);
  min-height: 3rem; /* 48px touch target */
}

.btn--primary {
  background-color: var(--color-sunrise-gold);
  color: var(--color-warm-charcoal);
}

.btn--primary:hover:not(:disabled) {
  background-color: var(--color-deep-terracotta);
}

.btn--secondary {
  background-color: transparent;
  color: var(--color-warm-charcoal);
  border: 2px solid var(--color-light-linen);
}

.btn--secondary:hover:not(:disabled) {
  border-color: var(--color-muted-stone);
  background-color: var(--color-light-linen);
}

.btn--sm { padding: 0.5rem 1rem; font-size: var(--text-sm); }
.btn--md { padding: 1rem 2rem; font-size: var(--text-base); }
.btn--lg { padding: 1.25rem 2.5rem; font-size: var(--text-lg); }

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Typography Component

```typescript
// client/src/components/common/Typography.tsx
import clsx from 'clsx';
import './Typography.css';

interface HeadingProps {
  level: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export function Heading({ level, children, className }: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag className={clsx('heading', `heading--${level}`, className)}>
      {children}
    </Tag>
  );
}

interface TextProps {
  variant?: 'body' | 'small' | 'caption';
  color?: 'primary' | 'secondary' | 'muted';
  children: React.ReactNode;
  className?: string;
}

export function Text({
  variant = 'body',
  color = 'primary',
  children,
  className,
}: TextProps) {
  return (
    <p className={clsx('text', `text--${variant}`, `text--${color}`, className)}>
      {children}
    </p>
  );
}
```

### Envelope Card with State Indicators

```typescript
// client/src/components/envelope/EnvelopeCard.tsx
import { motion } from 'motion/react';
import { Mail, MailOpen, Heart, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import type { Envelope } from 'shared/types';
import './EnvelopeCard.css';

interface EnvelopeCardProps {
  envelope: Envelope;
  partnerPresent?: boolean;
}

export function EnvelopeCard({ envelope, partnerPresent }: EnvelopeCardProps) {
  const { status, title, type } = envelope;

  const StatusIcon = status === 'sealed' ? Mail : MailOpen;
  const statusIconColor = status === 'sealed'
    ? 'var(--color-sunrise-gold)'
    : 'var(--color-soft-graphite)';

  return (
    <div className={clsx('envelope-card', `envelope-card--${status}`)}>
      {/* Partner indicator */}
      {partnerPresent && (
        <span className="envelope-card__partner" aria-label="Partner viewing" />
      )}

      {/* Completion badge */}
      {status === 'completed' && (
        <motion.span
          className="envelope-card__badge"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          <Heart size={16} fill="currentColor" />
        </motion.span>
      )}

      {/* Ribbon (sealed only) */}
      {status === 'sealed' && <div className="envelope-card__ribbon" />}

      {/* Icon and content */}
      <StatusIcon size={28} color={statusIconColor} strokeWidth={1.5} />

      <h3 className="envelope-card__title">{title}</h3>
      <span className="envelope-card__type">{type.replace('-', ' ')}</span>
    </div>
  );
}
```

### Reduced Motion Configuration

```typescript
// client/src/App.tsx (wrapped at root)
import { MotionConfig } from 'motion/react';

function App() {
  return (
    <MotionConfig reducedMotion="user">
      {/* All motion components inside respect prefers-reduced-motion */}
      <AppContent />
    </MotionConfig>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion package | motion package | 2024 | New package name, import from `motion/react` |
| CSS Animations | Motion for complex, CSS for simple | Current | Use Motion for orchestrated/interactive, CSS for hover states |
| styled-components | CSS Modules / CSS Variables | 2024-2025 | Runtime CSS-in-JS fell out of favor; CSS variables preferred |
| react-spring for gestures | @use-gesture/react | Current | Same maintainers (pmndrs), cleaner API separation |
| Custom reduced-motion hooks | Motion useReducedMotion | Current | Built-in, auto-subscribing, SSR-safe |

**Deprecated/outdated:**

- `framer-motion` import path: Use `motion/react` instead
- `react-use-gesture` package: Renamed to `@use-gesture/react`
- Class components for animation: Function components with hooks only
- Web Animations API directly: Motion provides better DX and features

## Open Questions

1. **Ribbon Visual Implementation**
   - What we know: Design calls for "ribbon tied around envelope - gift-like, romantic feel"
   - What's unclear: Whether to use SVG illustration, CSS pseudo-elements, or image assets
   - Recommendation: Start with CSS-based approach (gradient, pseudo-elements), iterate based on visual review. Claude has discretion per CONTEXT.md.

2. **Pile Stacking Offsets**
   - What we know: Stacked pile layout required, completed envelopes stay in pile
   - What's unclear: Exact pixel/rotation offsets for the most pleasing visual
   - Recommendation: Per CONTEXT.md, Claude has discretion. Start with scale 0.95, y-offset 4px, rotation 1.5deg alternating per card.

3. **Admin Envelope CRUD**
   - What we know: ADMIN-05 requires admin can create/edit envelopes
   - What's unclear: Full admin UI scope for Phase 2 vs later phases
   - Recommendation: Implement basic create/edit forms in Phase 2; complex admin features can extend in later phases.

## Sources

### Primary (HIGH confidence)

- [Motion Documentation](https://motion.dev/docs) - Animation library docs (version 12.29.x)
- [Motion Accessibility Guide](https://motion.dev/docs/react-accessibility) - useReducedMotion, MotionConfig
- [Motion AnimatePresence](https://motion.dev/docs/react-animate-presence) - Exit animations
- [lucide-react Guide](https://lucide.dev/guide/packages/lucide-react) - Icon library (version 0.562.x)
- [@use-gesture Documentation](https://use-gesture.netlify.app/) - Gesture handling (version 10.3.x)
- `docs/babymoon_design_foundation.md` - Project design system (colors, typography, spacing)
- `docs/bwwt_technical_patterns.md` - Project architecture patterns

### Secondary (MEDIUM confidence)

- [LogRocket - Best React Animation Libraries 2026](https://blog.logrocket.com/best-react-animation-libraries/) - Library comparison
- [OpenReplay - Haptic Feedback for Web Apps](https://blog.openreplay.com/haptic-feedback-for-web-apps-with-the-vibration-api/) - Vibration API patterns
- [Josh Comeau - Accessible Animations](https://www.joshwcomeau.com/react/prefers-reduced-motion/) - Reduced motion best practices
- [Josh Comeau - CSS Variables for React](https://www.joshwcomeau.com/css/css-variables-for-react-devs/) - CSS custom properties patterns

### Tertiary (LOW confidence - verify before using)

- Various CodeSandbox examples for stacked card patterns
- npm download statistics (change over time)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Verified against npm registry, official docs, and project design docs
- Architecture patterns: HIGH - Based on Motion documentation and established project patterns
- Pitfalls: HIGH - Documented in official docs, MDN, and community best practices
- Animation implementation: MEDIUM - Specific envelope animations at Claude's discretion per CONTEXT.md

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable technologies, low rate of change)
