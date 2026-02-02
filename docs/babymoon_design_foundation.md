# Babymoon App — Design Foundation

This document defines the visual identity, design language, and aesthetic principles for the Babymoon application. It serves as the authoritative reference for all UI development and should be loaded as context in every Claude Code session.

---

## 1. Aesthetic Direction

### Core Concept: "Golden Hour Intimacy"

The visual language draws from the soft, warm light of golden hour — that magical moment when everything feels suspended in time, gentle, and meaningful. This is the visual metaphor for the babymoon itself: a pause before transformation, filled with warmth and anticipation.

### Tone Keywords
- **Warm** — not cool, clinical, or sterile
- **Intimate** — designed for two people, not a crowd
- **Celebratory** — joyful without being childish
- **Sincere** — heartfelt without being saccharine
- **Timeless** — will feel appropriate when revisited in 20 years

### What This Is NOT
- Baby shower aesthetic (no rubber ducks, rattles, or nursery tropes)
- Generic "tech app" minimalism
- Pastel overload or gender-reveal clichés (pink/blue binary)
- Overly playful or cartoon-like
- Cold, corporate, or clinical

---

## 2. Color Palette

### Primary Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Sunrise Gold** | `#F4A261` | 244, 162, 97 | Primary accent, CTAs, highlights |
| **Warm Sand** | `#FAF3E8` | 250, 243, 232 | Primary background |
| **Dusk Rose** | `#E07A5F` | 224, 122, 95 | Secondary accent, warmth |
| **Deep Terracotta** | `#BC6C4A` | 188, 108, 74 | Hover states, depth |
| **Soft Sage** | `#9DB5A0` | 157, 181, 160 | Calm accents, success states |

### Neutral Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Warm Charcoal** | `#3D3A38` | 61, 58, 56 | Primary text |
| **Soft Graphite** | `#6B6662` | 107, 102, 98 | Secondary text |
| **Muted Stone** | `#A8A29E` | 168, 162, 158 | Disabled states, hints |
| **Cream** | `#FFFEF9` | 255, 254, 249 | Card backgrounds |
| **Light Linen** | `#F5F1EB` | 245, 241, 235 | Subtle borders, dividers |

### Semantic Colors

| Purpose | Color | Hex |
|---------|-------|-----|
| Success / Match | Soft Sage | `#9DB5A0` |
| Conflict / Attention | Dusk Rose | `#E07A5F` |
| Neutral / Maybe | Muted Stone | `#A8A29E` |
| Love (name voting) | Sunrise Gold | `#F4A261` |

### CSS Variables

```css
:root {
  /* Primary */
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
}
```

---

## 3. Typography

### Font Stack

**Display / Headlines:** `"Fraunces", Georgia, serif`
- Fraunces is a variable font with optical sizing and "wonk" axis
- Use for envelope titles, reveal text, emotional moments
- Weight range: 400 (regular) to 700 (bold)
- Enable optical sizing: `font-optical-sizing: auto;`

**Body / UI:** `"Source Sans 3", -apple-system, BlinkMacSystemFont, sans-serif`
- Clean, warm, highly readable
- Weight range: 300 (light) to 600 (semibold)
- Use for all body text, buttons, labels, inputs

**Monospace (if needed):** `"JetBrains Mono", monospace`
- PIN entry, codes, keys

### Type Scale

```css
:root {
  /* Font families */
  --font-display: "Fraunces", Georgia, serif;
  --font-body: "Source Sans 3", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  
  /* Font sizes */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 3rem;       /* 48px */
  --text-6xl: 3.75rem;    /* 60px - reveals only */
  
  /* Line heights */
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  
  /* Letter spacing */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.02em;
}
```

### Typography Usage

| Element | Font | Size | Weight | Notes |
|---------|------|------|--------|-------|
| Page title | Display | 3xl-4xl | 600 | Tight leading |
| Envelope title | Display | 2xl | 500 | Optical sizing on |
| Section header | Display | xl | 500 | — |
| Body text | Body | base | 400 | Relaxed leading |
| Button label | Body | base | 500 | Wide tracking |
| Small label | Body | sm | 400 | Muted color |
| PIN digits | Mono | 3xl | 400 | Letter spacing wide |

### Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Source+Sans+3:wght@300;400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
```

---

## 4. Spacing System

Use an 8px base grid with a harmonious scale:

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
}
```

### Content Width

```css
:root {
  --content-width-narrow: 24rem;   /* 384px - PIN entry, modals */
  --content-width-default: 32rem;  /* 512px - main content */
  --content-width-wide: 40rem;     /* 640px - letter writing */
}
```

---

## 5. Component Patterns

### Cards

Envelopes and content cards share a common language:

```css
.card {
  background: var(--bg-card);
  border-radius: 1rem;
  padding: var(--space-6);
  box-shadow: 
    0 1px 3px rgba(61, 58, 56, 0.04),
    0 4px 12px rgba(61, 58, 56, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 2px 6px rgba(61, 58, 56, 0.06),
    0 8px 24px rgba(61, 58, 56, 0.1);
}

.card--elevated {
  background: var(--bg-elevated);
  box-shadow: 
    0 4px 12px rgba(61, 58, 56, 0.08),
    0 12px 32px rgba(61, 58, 56, 0.12);
}
```

### Buttons

**Primary Button:**
```css
.btn-primary {
  background: var(--color-sunrise-gold);
  color: var(--color-warm-charcoal);
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--text-base);
  letter-spacing: var(--tracking-wide);
  padding: var(--space-4) var(--space-8);
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
  min-height: 3rem; /* 48px touch target */
}

.btn-primary:hover {
  background: var(--color-deep-terracotta);
}

.btn-primary:active {
  transform: scale(0.98);
}
```

**Secondary Button:**
```css
.btn-secondary {
  background: transparent;
  color: var(--color-warm-charcoal);
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--text-base);
  padding: var(--space-4) var(--space-8);
  border-radius: 0.75rem;
  border: 2px solid var(--color-light-linen);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
  min-height: 3rem;
}

.btn-secondary:hover {
  border-color: var(--color-muted-stone);
  background: var(--color-light-linen);
}
```

### Form Inputs

```css
.input {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  padding: var(--space-4);
  border: 2px solid var(--color-light-linen);
  border-radius: 0.75rem;
  background: var(--bg-elevated);
  color: var(--text-primary);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  min-height: 3rem;
}

.input:focus {
  outline: none;
  border-color: var(--color-sunrise-gold);
  box-shadow: 0 0 0 3px rgba(244, 162, 97, 0.2);
}

.input::placeholder {
  color: var(--text-muted);
}
```

---

## 6. Iconography

### Style Guidelines
- Line icons, not filled
- Stroke width: 1.5px-2px
- Rounded caps and joins
- Warm, friendly feel
- Recommend: Lucide icons (React: `lucide-react`)

### Key Icons Needed

| Use Case | Suggested Icon |
|----------|----------------|
| Envelope (sealed) | `mail` |
| Envelope (opened) | `mail-open` |
| Complete/Done | `check-circle` |
| Music/Playlist | `music` |
| Camera/Photo | `camera` |
| Heart/Love | `heart` |
| Maybe | `minus-circle` |
| Nope | `x-circle` |
| Settings/Admin | `settings` |
| Lock | `lock` |
| Key | `key` |
| Back | `arrow-left` |
| Refresh/Retry | `refresh-cw` |

---

## 7. Motion & Animation

### Principles
- **Purposeful:** Motion communicates state change, not decoration
- **Gentle:** Ease curves, never jarring
- **Celebratory:** Key moments (reveals, matches) deserve delight

### Timing

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-reveal: 800ms;
  
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Key Animations

**Envelope Open:**
```css
@keyframes envelope-open {
  0% {
    transform: rotateX(0deg);
    transform-origin: top center;
  }
  100% {
    transform: rotateX(-180deg);
    transform-origin: top center;
  }
}
```

**Fade Up (content reveal):**
```css
@keyframes fade-up {
  0% {
    opacity: 0;
    transform: translateY(16px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-up {
  animation: fade-up var(--duration-normal) var(--ease-out) forwards;
}
```

**Pulse (waiting states):**
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.pulse {
  animation: pulse 2s var(--ease-default) infinite;
}
```

**Confetti burst** — use a lightweight library like `canvas-confetti` for reveals.

---

## 8. Envelope Visual States

Envelopes are central to the experience. Their visual states must be immediately clear:

### Sealed (Unopened)
- Full opacity
- Subtle paper texture or grain overlay
- Sealed flap visible (decorative)
- Shadow suggests depth/lift

### Opened (In Progress)
- Flap "open" visual treatment
- Slightly muted compared to sealed
- Progress indicator if applicable

### Completed
- Subtle "stamp" or checkmark overlay
- Reduced shadow (settled)
- Warm tint or glow indicating completion

---

## 9. Screen-Specific Guidelines

### PIN Entry
- Centered, focused layout
- Large PIN input with clear digit separation
- Warm, welcoming message
- Subtle background texture or gradient
- No visible UI chrome until authenticated

### Envelope Grid
- 2-column grid on mobile, 3 on tablet+
- Generous spacing between envelopes
- Visual hierarchy: sealed envelopes prominent, completed recede
- Smooth scroll, no pagination

### Activity Screens
- Full-bleed content area
- Minimal navigation (back arrow only)
- Large touch targets for all actions
- Clear visual hierarchy: prompt → options → action

### Gender Reveal Sequence
- Full-screen takeover (no UI chrome)
- Black or deep warm background during countdown
- Slow, breathing animation
- Final reveal: large display type, celebratory effects
- Duration: 6-8 seconds from unlock to reveal

### Letter Writing
- Distraction-free writing area
- Warm paper-like background for text area
- Auto-save indicator (subtle)
- Optional photo attachment clearly indicated

---

## 10. Background Treatments

Avoid flat, solid backgrounds. Layer subtle depth:

### Primary Background
```css
.bg-primary {
  background: var(--color-warm-sand);
  background-image: 
    radial-gradient(
      ellipse at top right,
      rgba(244, 162, 97, 0.08) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at bottom left,
      rgba(224, 122, 95, 0.06) 0%,
      transparent 50%
    );
}
```

### Subtle Grain Overlay
```css
.grain-overlay::after {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* noise texture */
  opacity: 0.03;
  pointer-events: none;
  z-index: 9999;
}
```

---

## 11. Accessibility

- Minimum touch target: 48x48px
- Color contrast: WCAG AA minimum (4.5:1 for text)
- Focus states: visible and styled (not default outline)
- Reduced motion: respect `prefers-reduced-motion`
- Screen reader: meaningful labels, ARIA where needed

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 12. Implementation Checklist

When building any UI component, verify:

- [ ] Uses design tokens (CSS variables), not hardcoded values
- [ ] Typography from defined scale and font stack
- [ ] Colors from defined palette
- [ ] Spacing from 8px grid
- [ ] Touch targets ≥ 48px
- [ ] Hover/focus/active states defined
- [ ] Respects reduced motion preference
- [ ] Warm, not clinical
- [ ] Celebratory where appropriate

---

## 13. Reference: Quick Copy

**Font imports:**
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Source+Sans+3:wght@300;400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
```

**Tailwind config extension (if using Tailwind):**
```js
module.exports = {
  theme: {
    extend: {
      colors: {
        'sunrise-gold': '#F4A261',
        'warm-sand': '#FAF3E8',
        'dusk-rose': '#E07A5F',
        'deep-terracotta': '#BC6C4A',
        'soft-sage': '#9DB5A0',
        'warm-charcoal': '#3D3A38',
        'soft-graphite': '#6B6662',
        'muted-stone': '#A8A29E',
        'cream': '#FFFEF9',
        'light-linen': '#F5F1EB',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body: ['"Source Sans 3"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
}
```

---

*This document is the source of truth for visual design decisions. When in doubt, refer here. When building, load this as context.*
