## Domain Review: Client Activities

### Files Reviewed
- `client/src/components/activities/WouldYouRather/WouldYouRatherActivity.tsx`
- `client/src/components/activities/WouldYouRather/VotingPhase.tsx`
- `client/src/components/activities/WouldYouRather/WaitingPhase.tsx`
- `client/src/components/activities/WouldYouRather/RevealPhase.tsx`
- `client/src/components/activities/WouldYouRather/CompletePhase.tsx`
- `client/src/components/activities/WouldYouRather/SummaryPhase.tsx`
- `client/src/components/activities/WouldYouRather/PartnerPresence.tsx`
- `client/src/components/activities/WouldYouRather/index.ts`
- `client/src/components/activities/Trivia/TriviaActivity.tsx`
- `client/src/components/activities/Trivia/QuestionPhase.tsx`
- `client/src/components/activities/Trivia/RevealPhase.tsx`
- `client/src/components/activities/Trivia/ReviewPhase.tsx`
- `client/src/components/activities/Trivia/CompletePhase.tsx`
- `client/src/components/activities/Trivia/index.ts`
- `client/src/components/activities/Letter/LetterActivity.tsx`
- `client/src/components/activities/Letter/WritingPhase.tsx`
- `client/src/components/activities/Letter/WaitingPhase.tsx`
- `client/src/components/activities/Letter/RevealPhase.tsx`
- `client/src/components/activities/Letter/CompletePhase.tsx`
- `client/src/components/activities/NameGame/NameGameActivity.tsx`
- `client/src/components/activities/NameGame/GeneratingPhase.tsx`
- `client/src/components/activities/NameGame/VotingPhase.tsx`
- `client/src/components/activities/NameGame/WaitingPhase.tsx`
- `client/src/components/activities/NameGame/WaitingForGuidancePhase.tsx`
- `client/src/components/activities/NameGame/ResultsPhase.tsx`
- `client/src/components/activities/NameGame/NewRoundPhase.tsx`
- `client/src/components/activities/NameGame/NameCard.tsx`
- `client/src/components/activities/NameGame/index.ts`
- `client/src/components/activities/GenderReveal/GenderRevealActivity.tsx`
- `client/src/components/activities/GenderReveal/KeyEntryPhase.tsx`
- `client/src/components/activities/GenderReveal/WaitingPhase.tsx`
- `client/src/components/activities/GenderReveal/CeremonyPhase.tsx`
- `client/src/components/activities/GenderReveal/KeepsakePhase.tsx`
- `client/src/components/activities/MediaLibrary/MediaLibraryActivity.tsx`
- `client/src/components/activities/MediaLibrary/PhotoGrid.tsx`
- `client/src/components/activities/MediaLibrary/SlideshowViewer.tsx`
- `client/src/hooks/useWouldYouRather.ts`
- `client/src/hooks/useTrivia.ts`
- `client/src/hooks/useLetter.ts`
- `client/src/hooks/useNameGame.ts`
- `client/src/hooks/useGenderReveal.ts`
- `client/src/hooks/useMediaLibrary.ts`

### Issues Found

#### CRITICAL — Must Fix
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-activ-001 | `client/src/components/activities/GenderReveal/KeepsakePhase.tsx:27` | `new Date().toLocaleDateString(...)` captures render-time date, not the actual reveal date. When users revisit the keepsake on future dates, it shows today's date — breaking the permanent memory. | Pass `revealedAt: string` from `useGenderReveal` state and use that for the date display. |
| CR-activ-002 | `client/src/components/activities/MediaLibrary/SlideshowViewer.tsx:56-75` | When `shuffle=true`, `startIndex` points into the unshuffled array but `slides` is in shuffled order. Photo index 3 in the grid opens a different photo in the shuffled slides. | Map clicked photo by ID to its position in the shuffled array, or reset to index 0 when shuffled. |
| CR-activ-003 | `client/src/hooks/useLetter.ts:170-179` | Race condition in `letterRevealReady` handler: if SignalR event fires before `myLetter` is loaded, `mine` is `undefined` and the block is silently skipped. Both users stuck on `waiting` phase permanently. | Use a ref (`myLetterIdRef`) updated alongside state, or fall back to calling `loadLetterState()`. |

#### HIGH — Should Fix
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-activ-004 | `client/src/components/activities/WouldYouRather/WouldYouRatherActivity.tsx:105` | `myVote!` non-null assertion silences type safety. Phase desync could pass `null`. | Add runtime guard or remove unused `myChoice` prop (see CR-activ-007). |
| CR-activ-005 | `client/src/hooks/useLetter.ts:162` | `console.log('Partner submitted letter')` debug log left in production SignalR handler. | Remove it. |
| CR-activ-006 | `client/src/hooks/useWouldYouRather.ts:89`, `useLetter.ts:74`, `useNameGame.ts:150` | `loadedRef` declared and set but never read in three hooks. Dead code. | Remove from all three hooks. |
| CR-activ-007 | `client/src/components/activities/WouldYouRather/WaitingPhase.tsx:10-11` | `myChoice: WYRChoice` required prop never used — forces callers to provide a value for no benefit, causing the `!` assertion in CR-activ-004. | Remove `myChoice` from the interface. |
| CR-activ-008 | `NameGame/GeneratingPhase.tsx:32`, `WaitingPhase.tsx:24`, `WaitingForGuidancePhase.tsx:24` | `PULSE_OPACITY_RANGE as unknown as number[]` double type assertion used three times. Papers over the `as const` tuple vs `number[]` mismatch. | Change `PULSE_OPACITY_RANGE` in `animation.ts` from `as const` to `number[]` type. |

#### MEDIUM — Worth Fixing
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-activ-009 | `client/src/components/activities/Letter/RevealPhase.tsx:13` | `const PREVIEW_LENGTH = 60` inline magic number. | Move to `constants/config.ts` as `LETTER_PREVIEW_LENGTH`. |
| CR-activ-010 | `client/src/components/activities/NameGame/NewRoundPhase.tsx:8` | `const GUIDANCE_MAX_LENGTH = 500` inline magic number duplicating server Zod schema. | Move to `constants/config.ts` as `NAME_GAME_GUIDANCE_MAX_LENGTH`. |
| CR-activ-011 | `client/src/components/activities/Letter/RevealPhase.tsx:120` | `STRINGS.WYR_NEXT` used in Letter activity — cross-domain string coupling. | Add dedicated `LETTER_CONTINUE` string. |
| CR-activ-012 | `client/src/components/activities/NameGame/NameGameActivity.tsx:150` | `STRINGS.WYR_OFFLINE_NOTICE` used in NameGame — cross-domain string coupling. | Add `NAME_GAME_OFFLINE_NOTICE` or shared `APP_OFFLINE_NOTICE`. |
| CR-activ-013 | `client/src/hooks/useTrivia.ts:96` | Empty questions array from server misconfiguration shows blank UI with no message. | Add guard for `questions.length === 0` case. |
| CR-activ-014 | `client/src/components/activities/Letter/LetterActivity.tsx` | Trivial `useCallback` wrappers that only delegate to hook functions with zero transformation. | Replace with direct prop passing. |
| CR-activ-015 | `client/src/hooks/useMediaLibrary.ts` | No `mountedRef` guard. Async operations set state on unmounted component. | Add `mountedRef` pattern consistent with other hooks. |
| CR-activ-016 | `client/src/components/activities/NameGame/VotingPhase.tsx:54-58` | `setTimeout` for vote animation delay not cancelled on unmount. | Store in `useRef` and clear in `useEffect` cleanup. |
| CR-activ-017 | `client/src/components/activities/GenderReveal/GenderRevealActivity.tsx:76-87` | Error and not-configured states share same CSS class. | Give error case its own class: `gender-reveal__error`. |
| CR-activ-018 | `client/src/components/activities/Letter/RevealPhase.tsx:46` | `activeLetter` evaluates to `partnerLetter` when `selectedLetter === null`. Dead state that looks like a logic error. | Make derivation explicit with null case. |

#### LOW — Nice to Have
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-activ-019 | `NameGame/WaitingPhase.tsx`, `WaitingForGuidancePhase.tsx` | Two structurally identical components — same div, animation, CSS. Only string differs. | Extract shared `PulsingMessage` component. |
| CR-activ-020 | `GenderReveal/WaitingPhase.tsx:20` | `_keysValidated` prop accepted but never rendered. | Either render progress or remove prop. |
| CR-activ-021 | `NameGame/ResultsPhase.tsx:105` | "New Round" button reuses title string. | Add dedicated button string. |
| CR-activ-022 | `MediaLibrary/PhotoGrid.tsx:40-43` | `handleDelete` not memoized, recreated every render. | Wrap in `useCallback` or inline. |
| CR-activ-023 | `MediaLibrary/SlideshowViewer.tsx:57-63` | Shuffle order persists across open/close cycles. May be intentional but undocumented. | Add clarifying comment. |
| CR-activ-024 | `WouldYouRather/PartnerPresence.tsx` | Hard-coded `3000` ms toast duration; `PARTNER_TOAST_DURATION_MS` exists in `animation.ts`. | Use the constant. |
| CR-activ-025 | Multiple activity orchestrators | Six copies of identical loading spinner. | Extract shared `ActivitySpinner` component. |

### Positive Observations
- Exemplary async safety with `mountedRef` pattern applied consistently across all hooks.
- `useSignalREvent` ref pattern eliminates stale closures.
- Optimistic update + rollback is correct in both WYR and NameGame.
- Gender reveal security invariant is maintained — `gender` only set from server.
- Match results deduplicated across race conditions (API + SignalR).
- Strong constants discipline across the domain.
- `seededShuffle` in NameGame provides stable per-user ordering.

### Domain Health Score
8/10 — Well-structured hooks, correct phase machines, consistent async safety. Three correctness issues (wrong keepsake date, shuffled slideshow index, letter reveal race) prevent a higher score.
