# Phase 6: Trivia Activity - Research

**Researched:** 2026-02-19
**Domain:** Multiple-choice trivia activity + admin content management
**Confidence:** HIGH

## Summary

Phase 6 adds a solo trivia activity (multiple-choice quiz within the envelope framework) and a unified admin content management page with tabs for Trivia, WYR, and Letters. The trivia activity follows established patterns nearly identically to Would You Rather -- same multi-item-per-envelope flow, same phase state machine, same service/route/query layers -- but is dramatically simpler because it is a solo activity (no partner sync, no SignalR, no waiting phase).

The most novel pieces are: (1) a Prisma data model for questions with variable answer counts (2-4 options stored as JSON array), (2) the `Reorder` component from `motion/react` for drag-to-reorder in the admin UI (already a project dependency, no new library needed), and (3) an accessible tabbed admin interface for managing content across activity types.

**Primary recommendation:** Follow the WYR pattern exactly (shared types, Zod schemas, DB queries, service, route, hook, component phases) but strip out all SignalR/partner logic. Use `motion/react`'s built-in `Reorder.Group`/`Reorder.Item` for admin drag-to-reorder. Store answer options as a JSON array in Prisma rather than separate rows, since options are always fetched with their question.

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion/react | ^12.30.0 | Suspense reveal animation + admin drag-to-reorder | Already used for all animations; has built-in `Reorder` components |
| Prisma | (server) | Data model for trivia questions + answers | Already the ORM for all models |
| Zod | (shared) | Request validation schemas | Already used for all API validation |
| lucide-react | ^0.563.0 | Icons for admin UI (GripVertical, Plus, Edit2, Trash2, Check, X) | Already the icon library |
| clsx | ^2.1.1 | Conditional class names | Already used everywhere |

### Supporting (already in project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @use-gesture/react | ^10.3.1 | Not needed for trivia (no swipe) | Only if gesture interaction added later |
| use-debounce | ^10.1.0 | Not needed for trivia | Only if search/filter added to admin content library |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| motion/react `Reorder` | @dnd-kit/sortable | More features (multi-axis, between-containers) but adds a new dependency for a simple vertical reorder. Motion Reorder is sufficient for reordering questions within an envelope. |
| JSON array for options | Separate `TriviaOption` table | Normalized but adds query complexity. Options are never queried independently -- they always come with their question. JSON keeps it simple. |
| Custom tabs component | react-aria tabs / headless-ui | Adds dependency. Tabs are simple enough to build with proper ARIA attributes following the existing codebase pattern of vanilla HTML + CSS. |

**Installation:** No new dependencies needed. Everything is already in the project.

## Architecture Patterns

### Recommended Project Structure

```
shared/types/
  trivia.ts                    # Types + Zod schemas for trivia

server/src/
  routes/trivia.ts             # Express routes (GET state, POST answer, CRUD admin)
  services/trivia.ts           # Business logic (answer submission, completion)
  db/queries/trivia.ts         # Typed Prisma query functions

client/src/
  hooks/useTrivia.ts           # Solo trivia state machine hook
  components/activities/Trivia/
    TriviaActivity.tsx          # Main orchestrator (like WouldYouRatherActivity)
    QuestionPhase.tsx           # Shows question + multiple choice options
    RevealPhase.tsx             # Suspense animation -> correct/incorrect + explanation
    CompletePhase.tsx           # Warm completion screen
    ReviewPhase.tsx             # Read-only review for completed envelopes
    index.ts                    # Barrel export
  components/admin/
    ContentManager.tsx          # Tabbed container for all content types
    ContentTabs.tsx             # Accessible tab bar component
    TriviaContentTab.tsx        # Question library CRUD
    TriviaQuestionForm.tsx      # Create/edit question form
    WyrContentTab.tsx           # Existing WYR prompts CRUD (refactored from inline)
    LetterContentTab.tsx        # Existing letter prompts CRUD (refactored from inline)
    TriviaEnvelopeAssigner.tsx  # Assign questions to envelopes + reorder
```

### Pattern 1: Trivia Phase State Machine (Solo)

**What:** Simpler version of the WYR phase machine -- no waiting/partner phases.
**When to use:** Solo activities that have sequential steps with reveal animations.

The trivia state machine has these phases:
```typescript
type TriviaPhase = 'answering' | 'revealing' | 'complete' | 'review';
```

Flow: `answering -> revealing -> answering (next Q) -> ... -> complete`
Reopened completed envelope: `review`

**Example pattern (based on existing WYR hook):**
```typescript
// Hook state follows exact same pattern as useWouldYouRather
// but without SignalR, waiting phase, or partner state
interface UseTriviaReturn {
  questions: TriviaQuestionState[];
  currentQuestion: TriviaQuestionState | null;
  currentIndex: number;
  totalQuestions: number;
  phase: TriviaPhase;
  selectedAnswer: number | null;  // Index of selected option
  isCorrect: boolean | null;
  isLoading: boolean;
  error: string | null;
  submitAnswer: (optionIndex: number) => Promise<void>;
  advance: () => void;
  retry: () => void;
}
```

### Pattern 2: Content Library (Questions Independent of Envelopes)

**What:** Unlike WYR where prompts belong directly to envelopes (`envelopeId` on `WyrPrompt`), trivia questions exist in a standalone library and are assigned to envelopes via a join table.
**When to use:** When admin wants to create content once and assign it to envelopes flexibly.

```
TriviaQuestion (content library)
    |
    v
TriviaEnvelopeQuestion (join table with sortOrder)
    |
    v
Envelope
```

This is a key architectural difference from WYR: questions are not "owned" by envelopes.

### Pattern 3: Admin Tabbed Content Manager

**What:** Single admin page with tabs for each content type, replacing the need for separate admin pages.
**When to use:** When multiple content types need CRUD management.

**Accessible tab pattern (hand-rolled, no library):**
```typescript
// DOM structure
<div role="tablist" aria-label="Content management">
  <button role="tab" aria-selected={activeTab === 'trivia'}
          aria-controls="panel-trivia" id="tab-trivia"
          tabIndex={activeTab === 'trivia' ? 0 : -1}>
    Trivia
  </button>
  <button role="tab" aria-selected={activeTab === 'wyr'}
          aria-controls="panel-wyr" id="tab-wyr"
          tabIndex={activeTab === 'wyr' ? 0 : -1}>
    Would You Rather
  </button>
  <button role="tab" aria-selected={activeTab === 'letters'}
          aria-controls="panel-letters" id="tab-letters"
          tabIndex={activeTab === 'letters' ? 0 : -1}>
    Letters
  </button>
</div>
<div role="tabpanel" id="panel-trivia" aria-labelledby="tab-trivia">
  {/* Content */}
</div>
```

**Keyboard navigation requirements:**
- Left/Right arrow keys move between tabs
- Home/End jump to first/last tab
- Tab key moves focus into the panel content
- Only the active tab has `tabIndex={0}`, others have `tabIndex={-1}`

### Pattern 4: Drag-to-Reorder with motion/react Reorder

**What:** Motion's built-in `Reorder.Group` and `Reorder.Item` for drag-to-reorder.
**When to use:** Admin reordering questions within a trivia envelope.

```typescript
import { Reorder } from 'motion/react';

// State: array of assigned questions with their sortOrder
const [questions, setQuestions] = useState<AssignedQuestion[]>(initialQuestions);

<Reorder.Group
  axis="y"
  values={questions}
  onReorder={setQuestions}
  as="ul"
  className="trivia-assigner__list"
>
  {questions.map((q) => (
    <Reorder.Item
      key={q.id}
      value={q}
      as="li"
      className="trivia-assigner__item"
      whileDrag={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
    >
      <GripVertical size={16} />
      <span>{q.questionText}</span>
    </Reorder.Item>
  ))}
</Reorder.Group>
```

**Key details:**
- `values` must be the same array passed to state (referential identity on items matters)
- `onReorder` fires with the reordered array -- just call `setQuestions`
- `value` on each Item must be the same object reference from the `values` array
- `axis="y"` constrains drag to vertical only
- Items automatically get layout animations when order changes
- The `as` prop changes the rendered HTML element (default: `ul` for Group, `li` for Item)
- `whileDrag` prop adds visual feedback during drag

### Anti-Patterns to Avoid

- **Storing answer options as separate rows:** Options are never queried independently. A JSON array is simpler and avoids N+1 queries.
- **Using SignalR for trivia:** This is a solo activity. Adding real-time sync adds complexity with zero benefit.
- **Building a custom drag-and-drop from scratch:** Motion's Reorder handles this perfectly and is already a dependency.
- **Adding score tracking or timers:** Per CONTEXT.md, this is about fun/learning, not competition. No scores.
- **Using `role="radiogroup"` for answer options:** While quiz answers resemble radio buttons semantically, the options here are one-time-select buttons (not toggleable). Use `role="group"` with individual buttons, each with `aria-pressed` to indicate selection before submission, or a simple button list. The WYR VotingPhase pattern (plain buttons with `whileTap`) is the right model.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-to-reorder | Custom drag handlers with mouse/touch events | `Reorder.Group` + `Reorder.Item` from `motion/react` | Already a dependency; handles touch, mouse, accessibility, layout animation |
| Suspense animation | Custom setTimeout + CSS transitions | `motion/react` `animate` with `delay` prop | Consistent with WYR reveal pattern; declarative |
| Tab keyboard nav | Ad-hoc keyDown handler | Structured `onKeyDown` on tablist with arrow/Home/End handling | WCAG pattern is well-defined, ~20 lines of code |
| Sort order persistence | Manual index calculation | Send full ordered ID array to server, update sortOrder in transaction | Simpler, atomic, matches Prisma batch pattern |

**Key insight:** This phase introduces no fundamentally new technical challenges. Every piece has a direct analog in the existing codebase (WYR for activity flow, Motion for animations, Prisma for data modeling). The main work is assembly, not invention.

## Common Pitfalls

### Pitfall 1: JSON Column Type in Prisma/PostgreSQL

**What goes wrong:** Using `String` for the options array instead of Prisma's `Json` type, leading to manual JSON.parse/stringify everywhere.
**Why it happens:** Prisma's `Json` type maps to PostgreSQL's `jsonb` which handles serialization automatically.
**How to avoid:** Use Prisma's `Json` type for the options field. Define a TypeScript interface for the shape and cast on read.
**Warning signs:** `JSON.parse()` calls scattered in query functions.

**Recommended Prisma model:**
```prisma
model TriviaQuestion {
  id           String   @id @default(uuid())
  questionText String   @map("question_text")
  options      Json     // Array of { text: string, isCorrect: boolean }
  explanation  String?  // Optional "did you know" text
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  envelopeAssignments TriviaEnvelopeQuestion[]

  @@map("trivia_questions")
}

model TriviaEnvelopeQuestion {
  id         String @id @default(uuid())
  envelopeId String @map("envelope_id")
  questionId String @map("question_id")
  sortOrder  Int    @default(0) @map("sort_order")

  envelope Envelope        @relation(fields: [envelopeId], references: [id], onDelete: Cascade)
  question TriviaQuestion  @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([envelopeId, questionId])
  @@unique([envelopeId, sortOrder])
  @@index([envelopeId])
  @@index([questionId])
  @@map("trivia_envelope_questions")
}

model TriviaAnswer {
  id            String   @id @default(uuid())
  envelopeId    String   @map("envelope_id")
  questionId    String   @map("question_id")
  participantId String   @map("participant_id")
  selectedIndex Int      @map("selected_index")
  isCorrect     Boolean  @map("is_correct")
  createdAt     DateTime @default(now()) @map("created_at")

  participant Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@unique([envelopeId, questionId, participantId])
  @@index([envelopeId])
  @@index([participantId])
  @@map("trivia_answers")
}
```

### Pitfall 2: Forgetting to Add Trivia Relations to Existing Models

**What goes wrong:** Adding new models but not updating `Envelope` and `Participant` with the new relations, causing Prisma generate failures.
**Why it happens:** Easy to focus on new models and forget bidirectional relations.
**How to avoid:** Checklist: (1) Add `triviaEnvelopeQuestions TriviaEnvelopeQuestion[]` to `Envelope`, (2) Add `triviaAnswers TriviaAnswer[]` to `Participant`.
**Warning signs:** `prisma generate` errors about missing reverse relations.

### Pitfall 3: Forgetting Reset Logic

**What goes wrong:** Session reset fails with FK constraint violations because trivia answers reference participants.
**Why it happens:** New tables with FK to Participant need to be deleted before participants in the reset transaction.
**How to avoid:** Add `TriviaAnswer` deletion to `resetSession()` in `server/src/services/admin.ts` BEFORE participant deletion. Update `ResetSessionResult` in both `admin.ts` and `shared/types/api.ts`.
**Warning signs:** Reset button crashes with Prisma FK error.

### Pitfall 4: Reorder.Item Value Identity

**What goes wrong:** Drag-to-reorder appears to work but items snap back to original positions.
**Why it happens:** `value` on `Reorder.Item` must reference the same object from the `values` array, not a copy or derived value. If you map/transform the array between `values` and what you pass to `value`, Motion cannot track identity.
**How to avoid:** Pass the exact same object references. Use `key={item.id}` for React reconciliation but `value={item}` for Motion tracking.
**Warning signs:** Dragging works visually but `onReorder` fires with wrong order, or items snap back.

### Pitfall 5: Not Updating BaseEnvelope for Trivia Type

**What goes wrong:** Opening a trivia envelope shows the placeholder text instead of the trivia activity.
**Why it happens:** `BaseEnvelope.tsx` has a `switch (envelope.type)` that needs a `case 'trivia'` branch, and `shouldRenderActivity` may need updating.
**How to avoid:** Add trivia case to both `shouldRenderActivity` and `renderActivityContent` in `BaseEnvelope.tsx`. Follow the WYR pattern exactly.
**Warning signs:** Trivia envelope opens but shows "Activity content will appear here."

### Pitfall 6: Prisma Schema Change on Windows

**What goes wrong:** `prisma generate` fails with EPERM because dev server locks the query engine DLL.
**Why it happens:** Windows file locking (documented in CLAUDE.md).
**How to avoid:** Stop dev server BEFORE editing schema.prisma. Follow the exact order: stop server -> edit schema -> generate -> migrate -> rebuild shared -> restart.
**Warning signs:** EPERM error on `query_engine-windows.dll.node`.

## Code Examples

### Trivia Types (shared/types/trivia.ts)

```typescript
import { z } from 'zod';

// Answer option within a question
export interface TriviaOption {
  text: string;
  isCorrect: boolean;
}

// Phase state machine (solo - no waiting/partner phases)
export type TriviaPhase = 'answering' | 'revealing' | 'complete' | 'review';

// Question from content library
export interface TriviaQuestion {
  id: string;
  questionText: string;
  options: TriviaOption[];
  explanation: string | null;
  createdAt: string;
  updatedAt: string;
}

// Question assigned to an envelope (includes sort order)
export interface TriviaEnvelopeQuestion {
  id: string;
  envelopeId: string;
  questionId: string;
  sortOrder: number;
  question: TriviaQuestion;
}

// Per-question state within the activity
export interface TriviaQuestionState {
  question: TriviaQuestion;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  answered: boolean;
}

// GET /api/trivia/:envelopeId response
export interface TriviaEnvelopeResponse {
  questions: TriviaQuestionState[];
  currentQuestionIndex: number;
  allComplete: boolean;
}

// POST /api/trivia/:envelopeId/answer request
export interface TriviaAnswerRequest {
  questionId: string;
  selectedIndex: number;
}

// POST /api/trivia/:envelopeId/answer response
export interface TriviaAnswerResponse {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string | null;
  isLastQuestion: boolean;
  envelopeComplete: boolean;
}

// Zod validation schemas
export const triviaAnswerRequestSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(3),
});

const triviaOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required').max(500),
  isCorrect: z.boolean(),
});

export const createTriviaQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required').max(1000),
  options: z.array(triviaOptionSchema)
    .min(2, 'At least 2 options required')
    .max(4, 'At most 4 options')
    .refine(
      (opts) => opts.filter((o) => o.isCorrect).length === 1,
      'Exactly one option must be marked correct'
    ),
  explanation: z.string().max(2000).nullable().optional(),
});

export type CreateTriviaQuestionRequest = z.infer<typeof createTriviaQuestionSchema>;

export const updateTriviaQuestionSchema = createTriviaQuestionSchema.partial();
export type UpdateTriviaQuestionRequest = z.infer<typeof updateTriviaQuestionSchema>;

export const assignQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

export type AssignQuestionsRequest = z.infer<typeof assignQuestionsSchema>;

export const reorderQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

export type ReorderQuestionsRequest = z.infer<typeof reorderQuestionsSchema>;
```

### Suspense Reveal Animation (motion/react)

Following the existing WYR reveal pattern but adapted for correct/incorrect:

```typescript
// Animation constants to add to client/src/constants/animation.ts
export const TRIVIA_SUSPENSE_DURATION_MS = 1200;  // 1.2 second suspense
export const TRIVIA_REVEAL_DURATION_MS = 400;
export const TRIVIA_EXPLANATION_DELAY_MS = 600;
export const TRIVIA_ADVANCE_BUTTON_DELAY_MS = 800;

// RevealPhase.tsx pattern
import { motion } from 'motion/react';

// Suspense animation: selected option pulses, then reveals
<motion.div
  className="trivia-reveal__result"
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{
    duration: TRIVIA_REVEAL_DURATION_MS / 1000,
    delay: TRIVIA_SUSPENSE_DURATION_MS / 1000,
    ease: 'easeOut'
  }}
>
  {isCorrect ? 'Correct!' : 'Not quite!'}
</motion.div>

// Explanation fades in after reveal
{explanation && (
  <motion.div
    className="trivia-reveal__explanation"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      duration: 0.3,
      delay: (TRIVIA_SUSPENSE_DURATION_MS + TRIVIA_EXPLANATION_DELAY_MS) / 1000
    }}
  >
    <p className="trivia-reveal__did-you-know">Did you know?</p>
    <p>{explanation}</p>
  </motion.div>
)}
```

### Multiple Choice Options Layout

Vertical list (not grid) -- consistent with the intimate, focused feel of the app:

```typescript
// QuestionPhase.tsx
<div className="trivia-question">
  <h3 className="trivia-question__text">{question.questionText}</h3>

  <div className="trivia-question__options" role="group" aria-label="Answer options">
    {question.options.map((option, index) => (
      <motion.button
        key={index}
        type="button"
        className={clsx(
          'trivia-question__option',
          selectedIndex === index && 'trivia-question__option--selected'
        )}
        onClick={() => onSelect(index)}
        whileTap={{ scale: 0.97 }}
        disabled={hasAnswered}
        aria-pressed={selectedIndex === index}
      >
        <span className="trivia-question__option-letter">
          {String.fromCharCode(65 + index)}
        </span>
        <span className="trivia-question__option-text">{option.text}</span>
      </motion.button>
    ))}
  </div>

  <Button
    variant="primary"
    onClick={onSubmit}
    disabled={selectedIndex === null}
    className="trivia-question__submit"
  >
    Submit Answer
  </Button>
</div>
```

CSS layout: full-width stacked buttons, letter label (A/B/C/D) on left, text fills remaining space. Touch target minimum 44px height.

### Admin Drag-to-Reorder (Complete Pattern)

```typescript
import { Reorder } from 'motion/react';
import { GripVertical, X } from 'lucide-react';

interface TriviaEnvelopeAssignerProps {
  envelopeId: string;
  assignedQuestions: AssignedQuestion[];
  onReorder: (questionIds: string[]) => Promise<void>;
  onRemove: (questionId: string) => Promise<void>;
}

function TriviaEnvelopeAssigner({
  envelopeId, assignedQuestions, onReorder, onRemove
}: TriviaEnvelopeAssignerProps) {
  const [items, setItems] = useState(assignedQuestions);
  const [isDirty, setIsDirty] = useState(false);

  const handleReorder = (newOrder: AssignedQuestion[]) => {
    setItems(newOrder);
    setIsDirty(true);
  };

  const handleSaveOrder = async () => {
    await onReorder(items.map((q) => q.questionId));
    setIsDirty(false);
  };

  return (
    <div className="trivia-assigner">
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={handleReorder}
        className="trivia-assigner__list"
      >
        {items.map((item) => (
          <Reorder.Item
            key={item.id}
            value={item}
            className="trivia-assigner__item"
            whileDrag={{
              scale: 1.02,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'grabbing'
            }}
          >
            <GripVertical size={16} className="trivia-assigner__grip" />
            <span className="trivia-assigner__text">
              {item.question.questionText}
            </span>
            <button
              onClick={() => onRemove(item.questionId)}
              aria-label={`Remove question: ${item.question.questionText}`}
            >
              <X size={16} />
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {isDirty && (
        <Button variant="primary" onClick={handleSaveOrder}>
          Save Order
        </Button>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion package | motion/react package | 2024 (v11+) | Import from `motion/react` not `framer-motion` -- already done in this project |
| react-beautiful-dnd | @dnd-kit or Motion Reorder | 2022+ (rbd deprecated) | Use Motion Reorder for simple lists, @dnd-kit for complex DnD |
| Separate admin pages per content type | Tabbed single page | N/A (architecture choice) | Per CONTEXT.md: unified content management |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Maintenance mode, not recommended for new projects.
- `framer-motion` package name: Now `motion`. This project already uses `motion/react`.
- Prisma `package.json#prisma` key: Deprecated per CLAUDE.md lessons learned.

## Open Questions

1. **Should trivia question options be stored as Prisma `Json` or as separate columns?**
   - What we know: `Json` type maps to PostgreSQL `jsonb`, works well for small structured data. Options are always read/written together with the question.
   - What's unclear: Whether Prisma's Json type has good TypeScript inference (it doesn't -- returns `Prisma.JsonValue`).
   - Recommendation: Use `Json` type but cast in the `toApi` transform function (same pattern as the WYR `choice` field cast). Define a TypeScript `TriviaOption[]` type and cast `question.options as TriviaOption[]` in the query layer. The validation layer (Zod) ensures the shape is correct on write.

2. **Should the admin content manager be a new top-level route or replace the existing admin page?**
   - What we know: Currently the admin view is just `EnvelopeManager` directly in `App.tsx`. There is no router.
   - What's unclear: Whether adding content management should be a tab within the existing admin view or a separate section.
   - Recommendation: Add the `ContentManager` as a new section below `EnvelopeManager` in the admin view, or add a simple tab/toggle between "Envelopes" and "Content" at the top of the admin page. No need for a router library -- a simple state-based tab switch is sufficient given the app has no URL routing today.

3. **Exact data sent when admin saves reorder:**
   - What we know: After dragging, admin clicks "Save Order" which sends the new order to the server.
   - Recommendation: Send `{ questionIds: [id1, id2, id3] }` where the array order IS the sort order. Server updates `sortOrder` = array index for each in a transaction. This is simpler and more atomic than sending individual sortOrder values.

## Sources

### Primary (HIGH confidence)
- **Existing codebase** - WYR activity (route/service/hook/component patterns), Prisma schema, shared types, admin components, BaseEnvelope integration. This is the primary reference for all architectural decisions.
- **[Motion Reorder docs](https://motion.dev/docs/react-reorder)** - Reorder.Group and Reorder.Item API, props, usage pattern.
- **[Egghead.io: Drag-to-Reorder with Framer Motion](https://egghead.io/blog/drag-to-reorder-list-items-with-framer-motion)** - Complete code examples for Reorder components with state management.

### Secondary (MEDIUM confidence)
- **[Accessible Web: Radio Button Keyboard Nav](https://accessibleweb.com/question-answer/how-should-keyboard-navigation-work-in-a-group-of-radio-buttons/)** - WCAG keyboard navigation patterns for choice groups.
- **[USWDS Radio Buttons Accessibility](https://designsystem.digital.gov/components/radio-buttons/accessibility-tests/)** - Fieldset/legend pattern for grouped choices.
- **[Top 5 DnD Libraries for React 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)** - Ecosystem comparison confirming Motion Reorder and dnd-kit as top choices.

### Tertiary (LOW confidence)
- **[dnd-kit GitHub issues](https://github.com/clauderic/dnd-kit/issues/1564)** - Known bugs in newer @dnd-kit/react package (reinforces using Motion Reorder instead).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Everything uses existing project dependencies, no new libraries needed
- Architecture: HIGH - Direct analog to WYR activity, which is fully implemented and working
- Data model: HIGH - Follows established Prisma patterns, JSON for options is standard PostgreSQL
- Drag-to-reorder: HIGH - Motion Reorder is well-documented and already a dependency
- Admin tabs: MEDIUM - Hand-rolled accessible tabs pattern is straightforward but requires careful ARIA implementation
- Pitfalls: HIGH - Most pitfalls are codebase-specific and verified by examining existing code

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable -- no fast-moving dependencies)
