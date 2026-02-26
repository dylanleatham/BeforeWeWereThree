# Wave 2: Error Handling Fixes

## Issues Fixed

### B-008: Silent error swallowing in admin mutation handlers (HIGH)

**Problem:** Three admin content tab components used `try/finally` with no `catch` block. When API calls failed, users received no error feedback — the UI simply stopped loading with no indication of what went wrong.

**Fix:** Added `error` state and catch blocks to all mutation handlers in each component. Errors display in a styled alert div following the project's established pattern from `EnvelopeForm.tsx`.

#### LetterContentTab.tsx
- Added `const [error, setError] = useState<string | null>(null)`
- `handleSave`: Added `setError(null)` at start, catch block sets error message
- `handleDelete`: Added `setError(null)` at start, catch block sets error message
- Added error display `<div role="alert">` in both form view and display view
- Added `.letter-content-tab__error` CSS class

#### TriviaContentTab.tsx
- Added `const [error, setError] = useState<string | null>(null)`
- `handleCreate`: Added `setError(null)` at start, catch block sets error message
- `handleUpdate`: Added `setError(null)` at start, catch block sets error message
- `handleDelete`: Added `setError(null)` at start, catch block sets error message
- `handleSaveOrder`: Added `setError(null)` at start, catch block sets error message
- Added error display `<div role="alert">` in list view (form view delegates to TriviaQuestionForm which has its own error handling)
- Added `.trivia-content-tab__error` CSS class

#### WyrContentTab.tsx
- Added `const [error, setError] = useState<string | null>(null)`
- `handleSave`: Added `setError(null)` at start, catch block sets error message
- `handleDelete`: Added `setError(null)` at start, catch block sets error message
- Added error display `<div role="alert">` in both form view and list view
- Added `.wyr-content-tab__error` CSS class

**Pattern followed:** All error CSS classes use the same design tokens as `EnvelopeForm`:
```css
background: var(--color-dusk-rose-10);
color: var(--color-dusk-rose);
padding: var(--space-3) var(--space-4);
border-radius: 0.5rem;
font-size: var(--text-sm);
margin-bottom: var(--space-4);
```

All catch blocks use: `err instanceof Error ? err.message : 'Descriptive fallback'`

---

### B-014: Floating promise in WritingPhase (HIGH)

**File:** `client/src/components/activities/Letter/WritingPhase.tsx`

**Problem:** `onSave(content, newPhotoUrl)` in `handlePhotoChange` returned a Promise that was neither awaited nor caught, creating a floating promise that could silently fail.

**Fix:** Added `.catch((err) => console.error('Photo save failed:', err))` to the `onSave()` call.

---

### B-029: Debug console.log in production code (HIGH)

**File:** `client/src/hooks/useLetter.ts`

**Problem:** `console.log('Partner submitted letter')` was left in the `letterSubmitted` SignalR event handler.

**Fix:** Removed the `console.log` and replaced the two comments with a single concise comment explaining the handler's purpose: the event is acknowledged but the actual reveal is handled by the separate `letterRevealReady` event.

---

## Verification

- TypeScript compilation passes with zero errors (`npx tsc --noEmit --project client/tsconfig.json`)
- All changes are additive error handling or removal of debug output; no behavioral changes
