## Domain Review: Client Core & Shared Types

### Files Reviewed
- `client/src/App.tsx`
- `client/src/main.tsx`
- `client/src/components/auth/PinEntry.tsx`
- `client/src/components/common/Button.tsx`
- `client/src/components/common/Card.tsx`
- `client/src/components/common/ContentTabs.tsx`
- `client/src/components/common/ErrorBoundary.tsx`
- `client/src/components/common/MediaAttachment.tsx`
- `client/src/components/common/SpotifyButton.tsx`
- `client/src/components/common/Typography.tsx`
- `client/src/components/common/index.ts`
- `client/src/components/envelope/BaseEnvelope.tsx`
- `client/src/components/envelope/EnvelopeCard.tsx`
- `client/src/components/envelope/EnvelopePile.tsx`
- `client/src/components/envelope/index.ts`
- `client/src/context/SignalRContext.tsx`
- `client/src/services/api.ts`
- `client/src/services/fetchClient.ts`
- `client/src/services/fingerprint.ts`
- `client/src/services/blobUpload.ts`
- `client/src/constants/animation.ts`
- `client/src/constants/config.ts`
- `client/src/constants/strings.ts`
- `client/src/hooks/useSession.ts`
- `client/src/hooks/useConfig.ts`
- `client/src/hooks/useAutoSave.ts`
- `client/src/hooks/useEnvelopes.ts`
- `client/src/hooks/useSignalREvent.ts`
- `client/src/hooks/useSwipeNavigation.ts`
- `client/src/hooks/useHaptics.ts`
- `client/src/hooks/useMediaUpload.ts`
- `client/src/utils/motion.ts`
- `client/src/styles/globals.css`
- `client/src/styles/typography.css`
- `client/src/styles/variables.css`
- `shared/types/api.ts`
- `shared/types/auth.ts`
- `shared/types/config.ts`
- `shared/types/envelope.ts`
- `shared/types/friend.ts`
- `shared/types/genderReveal.ts`
- `shared/types/index.ts`
- `shared/types/letter.ts`
- `shared/types/media.ts`
- `shared/types/nameGame.ts`
- `shared/types/signalr.ts`
- `shared/types/trivia.ts`
- `shared/types/wyr.ts`
- `client/vite.config.ts`

### Issues Found

#### CRITICAL — Must Fix

None found.

#### HIGH — Should Fix
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-core-001 | `client/src/hooks/useSwipeNavigation.ts:83` | `FAST_SWIPE_MIN_DISTANCE_PX` is defined in `config.ts` (value: 20px) with an explicit comment "prevents accidental taps," but `useSwipeNavigation` never imports or uses it. A velocity above `FAST_SWIPE_VELOCITY` with near-zero actual movement (e.g., a firm stationary tap, minor phone shake) will trigger navigation. | Add distance guard: `const fastSwipe = Math.abs(vx) > FAST_SWIPE_VELOCITY && Math.abs(mx) >= FAST_SWIPE_MIN_DISTANCE_PX;` |
| CR-core-002 | `client/src/components/auth/PinEntry.tsx:42-46` | `setTimeout` that clears shake animation is not cancelled on unmount. If user enters correct PIN and component unmounts during 500ms window, the timeout fires on an unmounted component — `.focus()` call executes on a detached DOM node. | Store timer in `useRef<ReturnType<typeof setTimeout>>` and clear in `useEffect` cleanup. |
| CR-core-003 | `client/src/context/SignalRContext.tsx:207` | Azure SignalR transport accesses `accessToken!` with non-null assertion. If backend is misconfigured and returns transport `signalr` without a token, `accessTokenFactory` silently returns `undefined`, producing an opaque auth failure. | Add explicit guard: `if (!accessToken) throw new Error('SignalR transport requires an access token')` |
| CR-core-004 | `client/src/hooks/useSession.ts:25` | `logout` declared as `() => void` but implementation is `async`. The type hides the async nature, so callers cannot `await` it for sequencing post-logout actions. | Change interface to `logout: () => Promise<void>`. |

#### MEDIUM — Worth Fixing
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-core-005 | `client/src/components/envelope/EnvelopePile.tsx:36-43`, `EnvelopeCard.tsx:32-37` | `hasCompletedView` type set is duplicated verbatim in both files. Adding a new activity type with a completed-state view requires two identical edits. Violates CLAUDE.md rule #11. | Extract to `constants/config.ts` as `COMPLETED_VIEW_TYPES: ReadonlySet<string>`. |
| CR-core-006 | `client/src/components/envelope/BaseEnvelope.tsx:63-66` | `setTimeout` for `onStatusChange?.('opened')` is not cancelled on unmount. If user closes overlay during 500ms animation, callback fires against the closed view, issuing a ghost `updateStatus('opened')` API call. | Store timer in `useRef` and cancel in `useEffect` cleanup. |
| CR-core-007 | `client/src/components/envelope/BaseEnvelope.tsx:85-92` | `shouldRenderActivity` has overlapping special-cases for `name-game` and `gender-reveal` that duplicate `EVERGREEN_ENVELOPE_TYPES` and `COMPLETED_VIEW_TYPES`. | Refactor to use `EVERGREEN_ENVELOPE_TYPES.has()` and `COMPLETED_VIEW_TYPES.has()` sets. |
| CR-core-008 | `client/src/utils/motion.ts:136-139` | `tapScale` is exported but has zero import sites. Dead code. | Remove the export. |
| CR-core-009 | `client/src/components/common/Button.tsx:73` | `transition={{ duration: 0.15 }}` is a hardcoded animation duration. Every other animation duration uses a named constant. | Add `BUTTON_TRANSITION_DURATION_S = 0.15` to `constants/animation.ts`. |
| CR-core-010 | `client/src/App.tsx:141` | Error-state retry button is raw HTML `<button>` without design system `<Button>` component. Doesn't inherit 48px touch target, motion feedback, or focus-visible styles. | Replace with `<Button variant="ghost" size="sm" onClick={refetch}>`. |
| CR-core-011 | `shared/types/nameGame.ts:96-102` | `generateNamesRequestSchema` and `GenerateNamesRequest` are marked `@deprecated` but still re-exported from `shared/types/index.ts`. | Remove if unused, or annotate the consuming route with migration path. |

#### LOW — Nice to Have
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-core-012 | `client/src/components/envelope/BaseEnvelope.tsx:189` | Cross-namespace CSS class `envelope-card--type-${envelope.type}` used on the `BaseEnvelope` root element. | Rename to `base-envelope--type-${envelope.type}`. |
| CR-core-013 | `client/src/components/envelope/BaseEnvelope.tsx:96-103` | `children` prop fallback in `renderActivityContent` is unreachable. | Remove `children` prop from `BaseEnvelopeProps`. |
| CR-core-014 | `client/src/services/fetchClient.ts:17-24` | `Content-Type: application/json` sent on every request including GET/DELETE, possibly triggering unnecessary CORS preflights. | Set header conditionally based on `options.body`. |
| CR-core-015 | `client/src/services/fingerprint.ts:9-10` | Module-level mutable state persists across test runs unless explicitly cleared. | Add `clearCachedFingerprint()` to test setup. |
| CR-core-016 | `shared/types/signalr.ts:28-32` | `SignalRNegotiateResponse` is `@deprecated` and still exported. | Remove if unused. |
| CR-core-017 | `client/vite.config.ts:1` | `/// <reference types="vitest" />` is redundant with `globals: true` config. | Remove triple-slash directive. |

### Positive Observations
- Strong real-time transport abstraction — activities never know which transport is active.
- Exceptional constants discipline — magic numbers nearly absent.
- Shared types package uses Zod as single source of truth for runtime validation and TypeScript types.
- `useAutoSave` is carefully engineered with stable callback refs and flush mechanism.
- `useMediaUpload` correctly handles React Strict Mode `mountedRef` pattern.
- Full WAI-ARIA Tabs keyboard pattern in `ContentTabs`.
- Two-layer error containment (root + per-activity `ErrorBoundary`).

### Domain Health Score
8/10 — Well-engineered, type-safe, and architecturally coherent. The high-priority issues (accidental fast-swipe trigger, two unmounted-component timer leaks) are real bugs in commonly exercised paths but none are catastrophic.
