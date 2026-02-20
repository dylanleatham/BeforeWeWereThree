# Phase 7: Gender Reveal Ceremony - Research

**Researched:** 2026-02-20
**Domain:** Two-key unlock mechanism, ceremonial animation, secure server-side secret, real-time two-device coordination
**Confidence:** HIGH (built entirely on existing codebase patterns and established libraries already in use)

## Summary

Phase 7 builds the emotional climax of the app: a two-key gender reveal ceremony. The admin configures the gender value and two unique keys (stored only server-side). Each participant enters their assigned key. Only when both keys are validated does the server return the gender value. A full-screen ceremony animation plays on both devices simultaneously via SignalR.

This phase introduces no new libraries. Everything needed already exists in the codebase: `motion/react` (v12) for ceremony animations, SignalR/Socket.io for real-time coordination, Prisma for database, Zod for validation, and the established hook/service/route patterns. The primary technical challenge is the security model (gender value must never leak to the client until both keys validate) and the ceremony animation design (the most dramatic visual moment in the app).

**Primary recommendation:** Use a dedicated `GenderRevealConfig` Prisma model (not `AppConfig` key-value store) for structured storage of gender value, keys, and reveal state. Follow the existing two-participant coordination pattern from WYR/NameGame for SignalR events. Build the ceremony animation as a multi-stage CSS + motion/react sequence with Golden Hour color variants.

## Standard Stack

### Core

No new libraries needed. The entire phase builds on existing dependencies.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion/react | ^12.30.0 | Ceremony animation (glow, scale, fade) | Already installed, used in all activities |
| Prisma | (existing) | GenderRevealConfig model | All other activities use Prisma |
| Express | (existing) | API routes for admin config + key validation | Established routing pattern |
| Zod | (existing) | Request validation schemas | All shared types use Zod |
| SignalR/Socket.io | (existing) | Real-time key_validated + reveal_unlocked events | Dual transport already works |
| jose | (existing) | JWT session for auth middleware | Admin + participant auth in place |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (existing) | Icons in admin config UI | Admin content tab icons |
| CSS custom properties | (existing) | Golden Hour color variants for boy/girl | Already defined in variables.css |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated Prisma model | AppConfig key-value store | AppConfig could work for simple key-value pairs, but GenderRevealConfig needs structured fields (gender, key_a, key_b, revealed_at, envelope_id) with foreign keys and clear typing. Dedicated model is cleaner. |
| CSS keyframes + motion/react | Canvas/WebGL for ceremony | Canvas would allow particle effects but is overkill for a warm glow reveal. CSS radial-gradient animation + motion/react opacity/scale covers the decided "gentle bloom of color" aesthetic without added complexity. |
| Server-stored keys (plaintext) | Hashed keys (bcrypt) | Keys are 6-8 char admin-created strings. Hashing adds complexity for minimal security gain since the threat model is "don't leak gender to DevTools," not "protect keys against database breach." Plaintext is acceptable here. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

New files needed for this phase:

```
shared/types/
  genderReveal.ts              # Types, Zod schemas, SignalR messages

server/src/
  db/queries/genderReveal.ts   # Typed query functions
  services/genderReveal.ts     # Business logic (config, key validation, reveal)
  routes/genderReveal.ts       # API routes

client/src/
  hooks/useGenderReveal.ts     # State machine hook
  services/api.ts              # Add gender reveal API functions (existing file)
  constants/strings.ts         # Add REVEAL_* strings (existing file)
  constants/animation.ts       # Add REVEAL_* timing constants (existing file)
  components/
    activities/GenderReveal/
      GenderRevealActivity.tsx  # Main orchestrator
      KeyEntryPhase.tsx         # Segmented code input
      WaitingPhase.tsx          # Glowing anticipation
      CeremonyPhase.tsx         # Full-screen reveal animation
      KeepsakePhase.tsx         # Static result view
      GenderRevealActivity.css
      KeyEntryPhase.css
      WaitingPhase.css
      CeremonyPhase.css
      KeepsakePhase.css
    admin/
      GenderRevealContentTab.tsx  # Admin config UI
      GenderRevealContentTab.css
```

### Pattern 1: Dedicated Database Model (not AppConfig)

**What:** A structured Prisma model for gender reveal configuration, tied to an envelope.
**When to use:** When the data has multiple related fields with clear types (not just key-value pairs).

The build order doc suggests `gender_reveal_config` and `gender_reveal_unlocks` tables. The app should use a single `GenderRevealConfig` model (one per envelope) plus tracking fields for unlock state. A separate unlocks table is unnecessary given that there are exactly two keys and the app only needs to know which have been validated.

```prisma
// In schema.prisma
model GenderRevealConfig {
  id            String    @id @default(uuid())
  envelopeId    String    @unique @map("envelope_id")
  genderValue   String    @map("gender_value")  // 'boy' | 'girl'
  keyA          String    @map("key_a")          // 6-8 char alphanumeric
  keyB          String    @map("key_b")          // 6-8 char alphanumeric
  keyAValidated Boolean   @default(false) @map("key_a_validated")
  keyBValidated Boolean   @default(false) @map("key_b_validated")
  revealedAt    DateTime? @map("revealed_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  envelope Envelope @relation(fields: [envelopeId], references: [id], onDelete: Cascade)

  @@map("gender_reveal_configs")
}
```

**Why single model (not separate unlocks table):** The system has exactly 2 keys per reveal and exactly 2 participants. Tracking `keyAValidated`/`keyBValidated` booleans is simpler and avoids the complexity of a join table. The build order doc's `gender_reveal_unlocks` table was designed for a more generic system; for this specific use case, booleans on the config row are cleaner.

**Envelope relation:** Add `genderRevealConfig GenderRevealConfig?` to the Envelope model for the reverse relation.

### Pattern 2: Security Model — Server-Side Secret Gate

**What:** The gender value is stored only in the database and only sent to the client after both keys are validated in a single atomic transaction.
**When to use:** This is the critical security requirement (REVEAL-05).

```typescript
// server/src/services/genderReveal.ts

/**
 * Validate a key and potentially trigger the reveal.
 * Uses Serializable isolation to prevent race conditions.
 *
 * CRITICAL: Gender value is NEVER returned unless both keys are valid.
 */
export async function validateKey(
  envelopeId: string,
  participantId: string,
  key: string
): Promise<ValidateKeyResponse> {
  const result = await db.$transaction(async (tx) => {
    const config = await tx.genderRevealConfig.findUnique({
      where: { envelopeId },
    });
    if (!config) throw new Error('REVEAL_NOT_CONFIGURED');

    // Already fully revealed — return gender
    if (config.keyAValidated && config.keyBValidated) {
      return { status: 'already_revealed' as const, gender: config.genderValue };
    }

    // Check which key matches
    let keyField: 'keyAValidated' | 'keyBValidated' | null = null;
    if (key === config.keyA && !config.keyAValidated) {
      keyField = 'keyAValidated';
    } else if (key === config.keyB && !config.keyBValidated) {
      keyField = 'keyBValidated';
    } else if (key !== config.keyA && key !== config.keyB) {
      return { status: 'invalid_key' as const };
    } else {
      // Key already used
      return { status: 'key_already_used' as const };
    }

    // Mark key as validated
    const updated = await tx.genderRevealConfig.update({
      where: { envelopeId },
      data: {
        [keyField]: true,
        ...(keyField === 'keyAValidated' && config.keyBValidated
          ? { revealedAt: new Date() }
          : {}),
        ...(keyField === 'keyBValidated' && config.keyAValidated
          ? { revealedAt: new Date() }
          : {}),
      },
    });

    const bothValid = updated.keyAValidated && updated.keyBValidated;
    if (bothValid) {
      return { status: 'revealed' as const, gender: config.genderValue };
    }
    return { status: 'waiting_for_partner' as const };
  }, { isolationLevel: 'Serializable' });

  return result;
}
```

**Key security rules:**
1. `GET /api/gender-reveal/:envelopeId` returns ONLY the reveal state (not configured / waiting / revealed), NEVER the gender value unless `revealedAt` is set.
2. `POST /api/gender-reveal/:envelopeId/validate-key` returns gender ONLY when both keys are valid in the same transaction.
3. Admin endpoints that return the config for editing MUST be behind `adminMiddleware`.
4. The client never stores the gender value until the ceremony is triggered.

### Pattern 3: Two-Device Coordination via SignalR

**What:** SignalR events coordinate the ceremony experience between both devices.
**When to use:** Exactly the same pattern as WYR vote_submitted / reveal_ready.

```typescript
// SignalR events for gender reveal
interface GenderRevealKeyValidatedMessage {
  type: 'gender_reveal_key_validated';
  envelopeId: string;
  // Note: does NOT say which key or who — just that progress was made
  keysValidated: number; // 1 or 2
}

interface GenderRevealUnlockedMessage {
  type: 'gender_reveal_unlocked';
  envelopeId: string;
  gender: string; // 'boy' | 'girl' — only sent when both validated
}
```

The server broadcasts `key_validated` (with count, not identity) when one key is entered. When both are validated, it broadcasts `reveal_unlocked` with the gender value to the activity group. Both devices receive the gender at the same time and begin the ceremony animation.

### Pattern 4: Client State Machine (useGenderReveal hook)

**What:** A state machine hook following the established useWouldYouRather / useNameGame pattern.
**When to use:** This is the standard activity hook pattern.

```typescript
type GenderRevealPhase =
  | 'loading'         // Fetching state from server
  | 'not-configured'  // No config exists (show message)
  | 'key-entry'       // Waiting for this participant to enter key
  | 'waiting'         // Key entered, waiting for partner's key (glowing anticipation)
  | 'ceremony'        // Both keys valid, playing reveal animation
  | 'keepsake';       // Post-reveal static view

// Hook loads state from GET /api/gender-reveal/:envelopeId
// If already revealed: go straight to 'keepsake'
// If one key validated: depends on whether THIS participant entered it
// If no keys validated: 'key-entry'
```

### Pattern 5: Ceremony Animation Sequence

**What:** Multi-stage animation using motion/react and CSS custom properties.
**When to use:** The ceremony is the emotional climax — the most dramatic visual moment.

Per CONTEXT.md decisions:
- Visual build-up (no numeric countdown)
- Warm glow reveal (gentle bloom of color radiating outward)
- Text appears with the visual ("It's a Boy!" / "It's a Girl!")
- Golden Hour color variants (warm rose for girl, warm sky/sage for boy)

```typescript
// CeremonyPhase.tsx — animation stages
// Stage 1: Screen dims/fades (0-500ms)
// Stage 2: Center glow begins expanding (500-2000ms)
// Stage 3: Color bloom fills screen (2000-3500ms)
// Stage 4: Text fades in with scale (3500-4500ms)
// Stage 5: Settle into keepsake view (4500-5500ms)

// Implementation approach:
// - Use motion/react's `animate` with `transition.times` for sequenced keyframes
// - CSS radial-gradient with animated size for the glow bloom
// - CSS custom properties for boy/girl color themes
// - motion/react AnimatePresence for phase transitions
```

Color tokens for the ceremony (to add to variables.css):
```css
/* Boy reveal — warm sky/sage tones within Golden Hour palette */
--reveal-boy-primary: #7BA7BC;    /* Warm sky blue */
--reveal-boy-secondary: #9DB5A0;  /* Soft sage (existing) */
--reveal-boy-glow: #A8C8D8;      /* Light sky glow */

/* Girl reveal — warm rose tones within Golden Hour palette */
--reveal-girl-primary: #E07A5F;   /* Dusk rose (existing) */
--reveal-girl-secondary: #D4A0A0; /* Soft rose */
--reveal-girl-glow: #F0B8A8;     /* Warm rose glow */
```

### Pattern 6: Admin Configuration Tab

**What:** A new `GenderRevealContentTab` in the ContentManager, following the WyrContentTab pattern.
**When to use:** Admin sets gender value and two keys per ADMIN-04.

The admin tab:
1. Loads gender-reveal envelopes (filter by `type === 'gender-reveal'`)
2. Shows current config if exists (gender, key A, key B — visible to admin)
3. Allows create/update of config
4. Shows reveal status (not configured / configured / revealed)
5. Provides "Re-seal" button that clears keys and reveal state

### Anti-Patterns to Avoid

- **Sending gender in state endpoint:** The `GET /api/gender-reveal/:envelopeId` endpoint must NEVER include the gender value unless it has been revealed (revealedAt is set). Even for the admin, use a separate admin-only endpoint.
- **Client-side key validation:** Never validate keys on the client. Always send to server and let the server decide.
- **Storing gender in AppConfig:** AppConfig is key-value strings. GenderRevealConfig needs structured fields with FK to envelope. Use a dedicated model.
- **Separate unlocks table:** The build order doc suggests a `gender_reveal_unlocks` table, but this adds unnecessary complexity for a 2-key system. Booleans on the config row are simpler and avoid FK management.
- **Replaying ceremony animation on revisit:** Per CONTEXT.md, post-reveal shows a static keepsake, not the animation. The ceremony plays exactly once.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Segmented code input | Custom character-by-character input handler | A focused approach: single hidden input + visual character boxes | Browser compatibility, copy-paste support, accessibility. The visual boxes are display-only; the real input is a standard text field underneath. |
| Animation sequencing | Manual setTimeout chains | motion/react `animate` with keyframe arrays and `transition.times` | Handles cancellation, respects reduced motion, composable with other animations |
| Real-time coordination | Custom WebSocket protocol | Existing SignalR/Socket.io adapter pattern | Already proven in WYR and NameGame, handles both transports |
| Race condition prevention | Optimistic locking or manual mutex | Prisma `$transaction` with Serializable isolation | Same pattern used in WYR voting and NameGame guidance — proven to work |

**Key insight:** This phase introduces no new technical problems. Every challenge (two-device coordination, server-side secrets, ceremonial animation, admin configuration) maps directly to patterns already proven in the codebase. The novelty is in the emotional design and ceremony experience, not the architecture.

## Common Pitfalls

### Pitfall 1: Gender Value Leak via DevTools
**What goes wrong:** Gender value appears in a network response before both keys are validated.
**Why it happens:** A GET endpoint includes the gender in the state response "for convenience" or an error message reveals it.
**How to avoid:** The gender value ONLY leaves the server in two scenarios: (1) the `POST /validate-key` response when both keys are now valid, or (2) the `GET /state` response when `revealedAt` is already set. No other endpoint, error message, or SignalR event ever includes the gender value. Admin-only config endpoint is separate and behind adminMiddleware.
**Warning signs:** Any API response containing `genderValue` that doesn't also have `revealedAt` set.

### Pitfall 2: Race Condition on Simultaneous Key Entry
**What goes wrong:** Both participants submit keys at the exact same moment. Without proper isolation, both transactions read `keyAValidated=false, keyBValidated=false`, both update their respective key, but neither sees the other's update, so the reveal never triggers.
**Why it happens:** Default READ COMMITTED isolation allows concurrent reads of the same row.
**How to avoid:** Use `{ isolationLevel: 'Serializable' }` on the validate-key transaction, exactly like WYR voting and NameGame guidance. The second transaction will retry after the first commits.
**Warning signs:** Both participants enter valid keys but nothing happens. One key shows as validated, the other doesn't.

### Pitfall 3: Ceremony Plays on Only One Device
**What goes wrong:** The participant who enters the second key sees the ceremony, but the first participant's device stays in the waiting state.
**Why it happens:** The reveal response only goes to the HTTP caller. The first participant's device doesn't know both keys are valid.
**How to avoid:** After the transaction succeeds with both keys valid, broadcast `gender_reveal_unlocked` via SignalR to the activity group. BOTH devices receive the event and transition to the ceremony phase. The HTTP response to the second participant also contains the gender (for immediate display without waiting for SignalR).
**Warning signs:** First participant stuck in "waiting" phase after second enters their key.

### Pitfall 4: Envelope Status Behavior
**What goes wrong:** The gender reveal envelope gets marked as "completed" after the ceremony, preventing reopening.
**Why it happens:** Following the WYR pattern of marking envelopes completed after both participate.
**How to avoid:** Per CONTEXT.md: "Envelope stays opened (never completes) — always accessible, users can return to the keepsake anytime." The gender reveal envelope transitions from `sealed` to `opened` when first accessed, and NEVER transitions to `completed`. The keepsake view is the permanent state.
**Warning signs:** Gender reveal envelope showing "completed" badge, or being inaccessible after viewing.

### Pitfall 5: Reset Logic Missing Gender Reveal Data
**What goes wrong:** Admin resets session but gender reveal config persists, causing stale state.
**Why it happens:** New table not added to `resetSession()` in admin.ts.
**How to avoid:** Gender reveal reset is nuanced. Per CONTEXT.md, admin can "re-seal" the reveal envelope specifically. In the general session reset, the gender reveal config should reset `keyAValidated`, `keyBValidated`, and `revealedAt` (clearing the reveal state) but preserve the gender value and keys (admin-created content). The envelope status resets to `sealed` with all other envelopes. Add this to `resetSession()` in `server/src/services/admin.ts`.
**Warning signs:** After reset, opening the gender reveal shows the keepsake instead of key entry.

### Pitfall 6: Segmented Input Accessibility
**What goes wrong:** Screen readers can't navigate the segmented input, or keyboard users can't type/paste.
**Why it happens:** Individual `<input>` elements per character without proper ARIA linkage.
**How to avoid:** Use a single hidden `<input>` element for actual text entry (handles keyboard, paste, autofill) with visual-only character boxes that display the input value. The hidden input gets focus; the boxes are purely presentational. This is the standard pattern for verification code inputs.
**Warning signs:** Can't paste a code, can't use backspace naturally, screen reader announces each box separately.

### Pitfall 7: Admin Can See Gender After Re-seal
**What goes wrong:** After admin re-seals the reveal, participants open the envelope and the GET state endpoint returns the gender because `genderValue` exists in the config even though `revealedAt` is null.
**Why it happens:** The state endpoint checks for config existence rather than reveal status.
**How to avoid:** The GET state endpoint returns gender ONLY when `revealedAt` is set. The flow is: config exists + revealedAt null = "configured, awaiting keys." Config exists + revealedAt set = "revealed, here's the gender."
**Warning signs:** Gender showing in DevTools network tab before both keys are entered.

## Code Examples

### Example 1: Shared Types (genderReveal.ts)

```typescript
// shared/types/genderReveal.ts
import { z } from 'zod';

export type GenderValue = 'boy' | 'girl';

export type GenderRevealPhase =
  | 'loading'
  | 'not-configured'
  | 'key-entry'
  | 'waiting'
  | 'ceremony'
  | 'keepsake';

// Admin config request
export const configureGenderRevealSchema = z.object({
  genderValue: z.enum(['boy', 'girl']),
  keyA: z.string()
    .min(6, 'Key must be at least 6 characters')
    .max(8, 'Key must be at most 8 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'Key must be alphanumeric'),
  keyB: z.string()
    .min(6, 'Key must be at least 6 characters')
    .max(8, 'Key must be at most 8 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'Key must be alphanumeric'),
});
export type ConfigureGenderRevealRequest = z.infer<typeof configureGenderRevealSchema>;

// Key validation request
export const validateRevealKeySchema = z.object({
  key: z.string()
    .min(1, 'Key is required')
    .max(8, 'Key is too long'),
});
export type ValidateRevealKeyRequest = z.infer<typeof validateRevealKeySchema>;

// State response (participant-facing — never includes gender unless revealed)
export interface GenderRevealStateResponse {
  configured: boolean;
  keysValidated: number;  // 0, 1, or 2
  myKeyValidated: boolean;
  revealed: boolean;
  gender?: GenderValue;   // ONLY present when revealed === true
}

// Key validation response
export type ValidateKeyResponse =
  | { status: 'invalid_key' }
  | { status: 'key_already_used' }
  | { status: 'waiting_for_partner'; keysValidated: number }
  | { status: 'revealed'; gender: GenderValue }
  | { status: 'already_revealed'; gender: GenderValue };

// Admin config response (includes full config for editing)
export interface GenderRevealAdminResponse {
  configured: boolean;
  genderValue?: GenderValue;
  keyA?: string;
  keyB?: string;
  keyAValidated: boolean;
  keyBValidated: boolean;
  revealedAt?: string;
}

// SignalR messages
export interface GenderRevealKeyValidatedMessage {
  type: 'gender_reveal_key_validated';
  envelopeId: string;
  keysValidated: number;
}

export interface GenderRevealUnlockedMessage {
  type: 'gender_reveal_unlocked';
  envelopeId: string;
  gender: GenderValue;
}
```

### Example 2: Segmented Input Component Pattern

```typescript
// KeyEntryPhase.tsx — segmented code input using hidden input technique
import { useState, useRef } from 'react';
import { motion } from 'motion/react';

interface KeyEntryPhaseProps {
  onSubmit: (key: string) => void;
  isSubmitting: boolean;
  error: string | null;
  keyLength: number; // 6 or 8 depending on config
}

export function KeyEntryPhase({ onSubmit, isSubmitting, error, keyLength }: KeyEntryPhaseProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, keyLength);
    setValue(cleaned);
    if (cleaned.length === keyLength) {
      onSubmit(cleaned);
    }
  };

  const handleBoxClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="key-entry">
      {/* Hidden input for actual text entry */}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoComplete="one-time-code"
        value={value}
        onChange={handleChange}
        className="key-entry__hidden-input"
        aria-label="Enter your reveal key"
        disabled={isSubmitting}
        autoFocus
      />

      {/* Visual character boxes */}
      <div className="key-entry__boxes" onClick={handleBoxClick} aria-hidden="true">
        {Array.from({ length: keyLength }).map((_, i) => (
          <motion.div
            key={i}
            className={`key-entry__box ${value[i] ? 'key-entry__box--filled' : ''} ${
              i === value.length ? 'key-entry__box--active' : ''
            }`}
            animate={value[i] ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.2 }}
          >
            {value[i] ?? ''}
          </motion.div>
        ))}
      </div>

      {/* Error with shake animation */}
      {error && (
        <motion.p
          className="key-entry__error"
          initial={{ x: 0 }}
          animate={{ x: [0, -8, 8, -8, 8, 0] }}
          transition={{ duration: 0.4 }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
```

### Example 3: Ceremony Animation Approach

```typescript
// CeremonyPhase.tsx — simplified ceremony animation
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { GenderValue } from 'shared';

interface CeremonyPhaseProps {
  gender: GenderValue;
  onComplete: () => void;
}

export function CeremonyPhase({ gender, onComplete }: CeremonyPhaseProps) {
  const [stage, setStage] = useState<'buildup' | 'bloom' | 'text' | 'settle'>('buildup');

  useEffect(() => {
    // Sequence: buildup -> bloom -> text -> settle
    const timers = [
      setTimeout(() => setStage('bloom'), 1500),
      setTimeout(() => setStage('text'), 3500),
      setTimeout(() => setStage('settle'), 5500),
      setTimeout(() => onComplete(), 6500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const themeClass = gender === 'boy' ? 'ceremony--boy' : 'ceremony--girl';
  const revealText = gender === 'boy' ? "It's a Boy!" : "It's a Girl!";

  return (
    <div className={`ceremony ${themeClass}`}>
      {/* Background glow — radial gradient that expands */}
      <motion.div
        className="ceremony__glow"
        initial={{ scale: 0, opacity: 0 }}
        animate={
          stage === 'buildup'
            ? { scale: 0.3, opacity: 0.2 }
            : stage === 'bloom'
            ? { scale: 2.5, opacity: 0.8 }
            : { scale: 3, opacity: 0.6 }
        }
        transition={{ duration: 2, ease: 'easeOut' }}
      />

      {/* Reveal text */}
      <AnimatePresence>
        {(stage === 'text' || stage === 'settle') && (
          <motion.h1
            className="ceremony__text"
            initial={{ opacity: 0, scale: 0.8 }}
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
```

### Example 4: API Routes Pattern

```typescript
// server/src/routes/genderReveal.ts
const router = Router();

// GET /gender-reveal/:envelopeId — participant state (NO gender unless revealed)
router.get('/:envelopeId', authMiddleware, async (req, res) => {
  const state = await getRevealState(req.params.envelopeId, req.session!.participantId);
  res.json(successResponse(state));
});

// POST /gender-reveal/:envelopeId/validate-key — submit a key
router.post('/:envelopeId/validate-key', authMiddleware, async (req, res) => {
  const parsed = validateRevealKeySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid key'));
  }

  const result = await validateKey(
    req.params.envelopeId,
    req.session!.participantId,
    parsed.data.key
  );

  // If revealed, broadcast to both devices
  if (result.status === 'revealed') {
    const realtime = getRealtimeService();
    if (realtime) {
      await realtime.sendToGroup(`activity:${req.params.envelopeId}`, {
        target: 'genderRevealUnlocked',
        arguments: [{ type: 'gender_reveal_unlocked', envelopeId: req.params.envelopeId, gender: result.gender }],
      });
    }
  }

  res.json(successResponse(result));
});

// Admin routes — behind adminMiddleware
// GET /gender-reveal/:envelopeId/admin — full config (admin only)
// POST /gender-reveal/:envelopeId/configure — set/update config (admin only)
// POST /gender-reveal/:envelopeId/re-seal — reset reveal state (admin only)
```

### Example 5: Reset Logic

```typescript
// In server/src/services/admin.ts, add to resetSession():

// Reset gender reveal state (preserve config, clear validation state)
const genderRevealReset = await tx.genderRevealConfig.updateMany({
  data: {
    keyAValidated: false,
    keyBValidated: false,
    revealedAt: null,
  },
});

// Add to ResetSessionResult interface:
// genderRevealReset: number;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion (package) | motion/react (v12+) | 2024 | Already migrated in this codebase; use `motion/react` imports |
| Separate unlocks table | Boolean flags on config row | Design simplification | Reduces FK complexity for a fixed 2-key system |

**Deprecated/outdated:**
- The build order doc references `gender_reveal_config` and `gender_reveal_unlocks` as separate SQL tables. The Prisma-based approach uses a single model with boolean validation flags. This is a simplification, not a departure from the design intent.

## Open Questions

1. **Key assignment to participants (A/B)**
   - What we know: Admin creates two keys (keyA and keyB) and shares them manually.
   - What's unclear: Should the server enforce that participant A uses keyA and participant B uses keyB? Or can either participant enter either key? The CONTEXT.md says "Each participant enters their assigned key" but doesn't specify enforcement.
   - Recommendation: Accept either key from either participant. The admin tells each person which key is theirs, but the server validates both keys as equivalent unlock tokens. This is simpler and avoids edge cases where participants mix up which key was "theirs." The important thing is that two different valid keys are entered, not who entered which.

2. **Determining key length for segmented input**
   - What we know: Keys are 6-8 characters, admin-chosen.
   - What's unclear: The segmented input needs to know how many boxes to display.
   - Recommendation: The GET state endpoint should return `keyLength` (derived from the actual key lengths in the config). Since admin creates both keys, they should be the same length. The validation schema can enforce matching lengths.

3. **Simultaneous presence enforcement**
   - What we know: CONTEXT.md says "Simultaneous presence required — both participants must be online."
   - What's unclear: How strictly to enforce this. Should the key entry be blocked until both are online? Or just encouraged?
   - Recommendation: Soft enforcement. Show partner presence indicator (reuse PartnerPresence component). Allow key entry even if partner appears offline (they may be on a slight network delay). The real gate is that both keys must be entered — if partner isn't there, the reveal simply won't trigger. Show a warm message like "Your partner needs to enter their key too" rather than blocking input.

4. **Re-seal behavior vs full reset**
   - What we know: Admin can re-seal the reveal envelope, and session reset also clears state.
   - What's unclear: Should re-seal clear the keys themselves or just the validation state?
   - Recommendation: Re-seal clears `keyAValidated`, `keyBValidated`, and `revealedAt` but preserves `genderValue`, `keyA`, and `keyB`. This lets admin test the ceremony multiple times without re-entering the config. A separate "Delete config" action on the admin tab can fully remove the config if needed.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `server/prisma/schema.prisma` — all existing models and patterns
- Codebase analysis: `server/src/services/wyr.ts` — two-participant voting pattern with Serializable isolation
- Codebase analysis: `server/src/services/nameGame.ts` — coordinated round generation with SignalR broadcast
- Codebase analysis: `server/src/services/realtime.ts` — dual transport pattern (Socket.io/SignalR)
- Codebase analysis: `server/src/services/admin.ts` — reset session pattern with FK ordering
- Codebase analysis: `client/src/hooks/useWouldYouRather.ts` — activity state machine hook pattern
- Codebase analysis: `client/src/components/admin/WyrContentTab.tsx` — admin content tab CRUD pattern
- Codebase analysis: `client/src/styles/variables.css` — full design token inventory
- Codebase analysis: `shared/types/wyr.ts` — shared types + Zod schemas + SignalR message types pattern

### Secondary (MEDIUM confidence)
- `docs/babymoon_build_order.md` — original build plan for Phase 5 (gender reveal) with schema suggestions
- `docs/bwwt_technical_patterns.md` — SignalR message types including key_validated and reveal_unlocked
- `.planning/phases/07-gender-reveal-ceremony/07-CONTEXT.md` — user decisions for ceremony design

### Tertiary (LOW confidence)
- None. All findings derived from direct codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, everything already installed and proven
- Architecture: HIGH — every pattern (models, services, routes, hooks, admin tabs, SignalR events) directly maps to existing proven patterns in the codebase
- Pitfalls: HIGH — all pitfalls derived from known patterns (Serializable isolation, SignalR broadcast, reset FK ordering) that have been encountered and documented in CLAUDE.md lessons learned

**Research date:** 2026-02-20
**Valid until:** 2026-03-22 (stable — no external dependencies, all patterns internal)
