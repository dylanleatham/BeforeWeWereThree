## Domain Review: Client Admin & Friend System

### Files Reviewed
- `client/src/components/admin/ContentManager.tsx`
- `client/src/components/admin/EnvelopeForm.tsx`
- `client/src/components/admin/EnvelopeManager.tsx`
- `client/src/components/admin/FriendManager.tsx`
- `client/src/components/admin/GenderRevealContentTab.tsx`
- `client/src/components/admin/LetterContentTab.tsx`
- `client/src/components/admin/ThankYouNoteEditor.tsx`
- `client/src/components/admin/TriviaContentTab.tsx`
- `client/src/components/admin/TriviaQuestionForm.tsx`
- `client/src/components/admin/WyrContentTab.tsx`
- `client/src/components/admin/index.ts`
- `client/src/components/friend/FriendDashboard.tsx`
- `client/src/components/friend/FriendLetterActivity.tsx`
- `client/src/components/friend/FriendLetterCard.tsx`
- `client/src/components/friend/FriendLetterView.tsx`
- `client/src/components/friend/GenderInput.tsx`
- `client/src/components/friend/ThankYouNoteView.tsx`
- `client/src/hooks/useFriendDashboard.ts`
- `client/src/hooks/useFriendLetter.ts`
- `client/src/services/friendApi.ts`

### Issues Found

#### CRITICAL — Must Fix
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-admin-001 | `client/src/components/admin/FriendManager.tsx:265` | Friend PINs rendered in plaintext in the admin UI. The PIN is the sole authentication credential for friend login. Anyone seeing the admin screen gets all friend credentials. | Mask by default: render `PIN: ••••••••` with a toggle-to-reveal button. |
| CR-admin-002 | `client/src/components/admin/FriendManager.tsx:282-288` | Thank-you note editor always opens blank — `existingNote: null` is hardcoded. If admin wrote a note and clicks the button again, the editor opens empty. Saving overwrites the existing note. | Fetch existing thank-you note before opening the editor. Pass as `existingNote` prop. |
| CR-admin-003 | `client/src/components/admin/LetterContentTab.tsx`, `TriviaContentTab.tsx`, `WyrContentTab.tsx` | Errors from API calls are silently swallowed across all three content tabs. Every handler uses `try { ... } finally { setIsSaving(false) }` with no `catch`. Admin believes content was saved when it was not. | Add `catch` blocks with error state display, following the pattern in `EnvelopeManager.tsx`. |

#### HIGH — Should Fix
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-admin-004 | `client/src/components/admin/WyrContentTab.tsx:152` | Hardcoded string `'Edit Prompt'` violates centralized constants rule. | Add to `strings.ts`. |
| CR-admin-005 | `client/src/components/admin/TriviaQuestionForm.tsx:108,77,83,136` | Four hardcoded UI strings: `'Edit Question'`, `'New Question'`, `'Question text is required'`, `` `Option ${N} text is required` ``, `'Options'`. | Add all to `strings.ts`. |
| CR-admin-006 | `client/src/components/friend/FriendLetterView.tsx:58-59,103` | Three hardcoded strings: `'From '`, `'To '`, `'Close'`. `LETTER_CLOSE_DETAIL` already exists in `strings.ts` and is unused here. | Use existing `STRINGS.LETTER_CLOSE_DETAIL` and add new constants for From/To. |
| CR-admin-007 | `client/src/components/admin/LetterContentTab.tsx:234`, `TriviaContentTab.tsx:224`, `WyrContentTab.tsx:261`, `GenderRevealContentTab.tsx:387` | Four inline loading strings: `'Loading prompt...'`, `'Loading questions...'`, etc. | Add per-tab loading strings to `strings.ts`. |
| CR-admin-008 | `client/src/components/friend/FriendDashboard.tsx:57-69` | Manually-constructed `FriendLetter` object sets `createdAt: ''` and `updatedAt: ''`. Empty strings violate the ISO date string contract. | Refetch full `FriendLetter` after selecting, or include timestamps in dashboard card type. |
| CR-admin-009 | `client/src/components/admin/FriendManager.tsx:130,140` | Add-friend form inputs are inaccessible: labels have no `htmlFor` and inputs have no `id`. | Add matching `id` and `htmlFor` attributes. |
| CR-admin-010 | `client/src/components/admin/GenderRevealContentTab.tsx:137-148` | Three hardcoded validation error strings for date validation. | Add to `strings.ts`. |

#### MEDIUM — Worth Fixing
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-admin-011 | `client/src/components/admin/FriendManager.tsx:109-121` | `handleViewLetters` has no loading state — no spinner, no disabled button. Duplicate requests possible on slow connections. | Add `isLoadingLetters` state. |
| CR-admin-012 | `client/src/components/admin/LetterContentTab.tsx:222`, `TriviaContentTab.tsx:198`, `WyrContentTab.tsx:235`, `GenderRevealContentTab.tsx:387` | `'Choose an envelope...'` placeholder copy-pasted across four tabs. | Extract to `strings.ts` as `ADMIN_SELECT_ENVELOPE_PLACEHOLDER`. |
| CR-admin-013 | `client/src/components/admin/EnvelopeManager.tsx:57,73,89` | Three hardcoded fallback `alert()` error strings. `strings.ts` already has matching constants (`API_ERROR_CREATE_ENVELOPE`, etc.) that are unused. | Use the existing STRINGS constants. |
| CR-admin-014 | `client/src/components/admin/index.ts` | `FriendManager` and `ThankYouNoteEditor` not exported from barrel file. No `friend/index.ts` exists. | Add missing exports. Create `friend/index.ts`. |
| CR-admin-015 | `client/src/components/admin/FriendManager.tsx:319-327` | Friend delete icon button has no `aria-label`. Compare with `EnvelopeManager` which correctly uses `STRINGS.MANAGER_ARIA_DELETE`. | Add `aria-label={STRINGS.MANAGER_ARIA_DELETE(friend.name)}`. |
| CR-admin-016 | `client/src/components/friend/FriendLetterCard.tsx:31` | Submitted letters become non-interactive with no accessible signal. No `aria-disabled`, no keyboard indication. | Add `aria-disabled="true"` for submitted cards. |
| CR-admin-017 | `client/src/constants/strings.ts:275-279` | `RECIPIENT_NAMES` contains hardcoded personal names (`'Dylan'`, `'Wife'`, `'Baby'`). Changing requires code change + redeploy. | Move to admin-configurable session metadata or a dedicated config section. |

#### LOW — Nice to Have
| ID | File | Issue | Suggested Fix |
|----|------|-------|---------------|
| CR-admin-018 | `client/src/components/admin/ContentManager.tsx:33` | `ariaLabel="Content management"` is hardcoded. | Add to `strings.ts`. |
| CR-admin-019 | `client/src/components/admin/GenderRevealContentTab.tsx:220-226` | `getStatus()` inner function called once — unnecessary indirection. | Inline as a simple ternary. |
| CR-admin-020 | `client/src/components/admin/TriviaQuestionForm.tsx:140` | `key={index}` for dynamic option list with remove-at-index. Can cause React state issues. | Use `crypto.randomUUID()` as stable key. |
| CR-admin-021 | `client/src/components/friend/FriendLetterActivity.tsx:153` | Submit button shows `STRINGS.LETTER_SAVING` ("Saving...") during submit — semantically misleading for a one-way action. | Add `FRIEND_LETTER_SENDING: 'Sending...'` to `strings.ts`. |
| CR-admin-022 | `client/src/hooks/useFriendLetter.ts` | `letter` is exposed in hook return type but never consumed by `FriendLetterActivity`. Dead surface area. | Remove from return type or document as reserved. |

### Positive Observations
- `mountedRef` discipline is impeccable across all async components.
- Discriminated union view-state management is clean and makes invalid states unrepresentable.
- `useFriendLetter` correctly flushes auto-save before submit, preventing race conditions.
- `friendApi.ts` is clean, fully-typed, with correct response unwrapping.
- `GenderRevealContentTab` is security-conscious — keys are never returned from the API.
- `EnvelopeForm` prevents duplicate gender-reveal envelopes client-side.

### Domain Health Score
6/10 — Sound architecture with good async patterns, but three actionable production issues: plaintext credential display, silent data overwrite, and pervasive error swallowing. Seven centralized-constants violations add polish debt.
