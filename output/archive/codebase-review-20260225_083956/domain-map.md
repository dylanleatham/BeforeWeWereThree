# Codebase Domain Map — 2026-02-25

## Project Shape
- **~14,000 lines** of TypeScript source code (excluding tests, deploy, docs)
- **Stack:** React 18 + Vite (client), Express + Prisma + PostgreSQL (server), Socket.io/SignalR (realtime), shared types package
- **Feature areas:** 6 activities (WouldYouRather, Trivia, Letter, NameGame, GenderReveal, MediaLibrary), envelope system, admin panel, friend system
- **Existing quality gates:** ESLint (typescript-eslint + react-hooks), TypeScript strict mode, Vitest (client), Jest (server), Husky pre-commit

## Domain Assignments (6 Domains)

### Domain 1: Server Infrastructure
**Scope:** Entry point, middleware, auth, admin, config, health, SignalR negotiate, realtime service, session/participant management, DB connection, utilities, Prisma schema
**Files:**
- `server/src/index.ts` (main Express app setup, CSP, CORS)
- `server/src/middleware/auth.ts` (168 lines)
- `server/src/middleware/rateLimit.ts` (338 lines)
- `server/src/routes/admin.ts`, `auth.ts`, `config.ts`, `health.ts`, `signalr.ts`
- `server/src/services/admin.ts`, `participant.ts`, `session.ts`, `realtime.ts`
- `server/src/db/connection.ts`, `db/queries/config.ts`
- `server/src/utils/keyHash.ts`, `utils/logger.ts`
- `server/prisma.config.ts`, `server/prisma/schema.prisma`, `server/prisma/seed.ts`
- `eslint.config.js`, `package.json`, `tsconfig.json`

### Domain 2: Server Activities
**Scope:** All activity-specific routes, services, and DB queries
**Files:**
- `server/src/routes/envelopes.ts`, `letter.ts`, `wyr.ts`, `trivia.ts`, `nameGame.ts`, `genderReveal.ts`, `media.ts`, `friend.ts`
- `server/src/services/letter.ts`, `wyr.ts`, `trivia.ts`, `nameGame.ts`, `genderReveal.ts`, `media.ts`, `anthropic.ts`, `friend.ts`
- `server/src/db/queries/envelopes.ts`, `letter.ts`, `wyr.ts`, `trivia.ts`, `nameGame.ts`, `genderReveal.ts`, `media.ts`, `friend.ts`

### Domain 3: Client Core & Shared Types
**Scope:** App shell, auth, common UI components, envelope system, SignalR context, API services, constants, core hooks, shared type definitions
**Files:**
- `client/src/App.tsx`, `client/src/main.tsx`
- `client/src/components/auth/PinEntry.tsx`
- `client/src/components/common/` (Button, Card, ContentTabs, ErrorBoundary, MediaAttachment, SpotifyButton, Typography)
- `client/src/components/envelope/` (BaseEnvelope, EnvelopeCard, EnvelopePile)
- `client/src/context/SignalRContext.tsx`
- `client/src/services/` (api.ts, fetchClient.ts, fingerprint.ts, blobUpload.ts)
- `client/src/constants/` (animation.ts, config.ts, strings.ts)
- `client/src/hooks/` (useSession, useConfig, useAutoSave, useEnvelopes, useSignalREvent, useSwipeNavigation, useHaptics, useMediaUpload)
- `client/src/utils/motion.ts`
- `client/src/styles/` (globals.css, typography.css, variables.css)
- `shared/types/` (all 13 type files)
- `client/vite.config.ts`

### Domain 4: Client Activities
**Scope:** All 6 activity component trees and their dedicated hooks
**Files:**
- `client/src/components/activities/WouldYouRather/` (7 components)
- `client/src/components/activities/Trivia/` (5 components + index)
- `client/src/components/activities/Letter/` (5 components)
- `client/src/components/activities/NameGame/` (8 components + index)
- `client/src/components/activities/GenderReveal/` (5 components)
- `client/src/components/activities/MediaLibrary/` (3 components)
- `client/src/hooks/useWouldYouRather.ts`, `useTrivia.ts`, `useLetter.ts`, `useNameGame.ts`, `useGenderReveal.ts`, `useMediaLibrary.ts`

### Domain 5: Client Admin & Friend System
**Scope:** Admin panel components and friend portal components/hooks/API
**Files:**
- `client/src/components/admin/` (ContentManager, EnvelopeForm, EnvelopeManager, FriendManager, GenderRevealContentTab, LetterContentTab, ThankYouNoteEditor, TriviaContentTab, TriviaQuestionForm, WyrContentTab)
- `client/src/components/friend/` (FriendDashboard, FriendLetterActivity, FriendLetterCard, FriendLetterView, GenderInput, ThankYouNoteView)
- `client/src/hooks/useFriendDashboard.ts`, `useFriendLetter.ts`
- `client/src/services/friendApi.ts`

### Domain 6: Test Suite
**Scope:** All test files, test setup, test configuration — evaluate coverage, test quality, missing tests
**Files:**
- `client/src/__tests__/` (App.test, PinEntry.test, 15 hook tests, 2 service tests, setup.ts)
- `server/src/__tests__/` (1 DB query test, 2 middleware tests, 13 route tests, 11 service tests, setup.ts)
- `client/vitest.d.ts`
