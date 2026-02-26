# Codebase Domain Map — 2026-02-25

## Tech Stack
- **Language:** TypeScript (strict mode)
- **Frontend:** React 19, Vite 6, Motion 12, Socket.io-client, SignalR
- **Backend:** Express 5, Prisma 6, Socket.io, Zod 4
- **Database:** PostgreSQL via Prisma ORM
- **Testing:** Vitest (client), Jest 30 (server), Testing Library, Supertest
- **AI:** Anthropic SDK (Claude for name generation)
- **Linting:** ESLint 9 with typescript-eslint, react-hooks, react-refresh
- **Infra:** Azure (Blob Storage, App Service), Husky + lint-staged

## Domains (8)

### Domain 1: Client Core & UI
Common components, envelope system, auth, constants, context, styles, utilities.
- `client/src/App.tsx`
- `client/src/main.tsx`
- `client/src/vitest.d.ts`
- `client/src/components/common/` (Button, Card, ContentTabs, ErrorBoundary, MediaAttachment, SpotifyButton, Typography, index)
- `client/src/components/auth/` (PinEntry)
- `client/src/components/envelope/` (BaseEnvelope, EnvelopeCard, EnvelopePile, index)
- `client/src/constants/` (animation, config, strings)
- `client/src/context/` (SignalRContext)
- `client/src/styles/` (globals, typography, variables)
- `client/src/utils/` (motion)

### Domain 2: Client Activities A
GenderReveal, Letter, MediaLibrary activity components.
- `client/src/components/activities/GenderReveal/` (CeremonyPhase, GenderRevealActivity, KeepsakePhase, KeyEntryPhase, WaitingPhase)
- `client/src/components/activities/Letter/` (CompletePhase, LetterActivity, RevealPhase, WaitingPhase, WritingPhase)
- `client/src/components/activities/MediaLibrary/` (MediaLibraryActivity, PhotoGrid, SlideshowViewer)

### Domain 3: Client Activities B
NameGame, Trivia, WouldYouRather activity components.
- `client/src/components/activities/NameGame/` (GeneratingPhase, NameCard, NameGameActivity, NewRoundPhase, ResultsPhase, VotingPhase, WaitingForGuidancePhase, WaitingPhase, index)
- `client/src/components/activities/Trivia/` (CompletePhase, QuestionPhase, RevealPhase, ReviewPhase, TriviaActivity, index)
- `client/src/components/activities/WouldYouRather/` (CompletePhase, PartnerPresence, RevealPhase, SummaryPhase, VotingPhase, WaitingPhase, WouldYouRatherActivity, index)

### Domain 4: Client Admin & Friends
Admin dashboard components and friend-facing components.
- `client/src/components/admin/` (ContentManager, EnvelopeForm, EnvelopeManager, FriendManager, GenderRevealContentTab, LetterContentTab, ThankYouNoteEditor, TriviaContentTab, TriviaQuestionForm, WyrContentTab, index)
- `client/src/components/friend/` (FriendDashboard, FriendLetterActivity, FriendLetterCard, FriendLetterView, GenderInput, ThankYouNoteView)

### Domain 5: Client Hooks & Services
All custom hooks, API services, and client-side tests.
- `client/src/hooks/` (useAutoSave, useConfig, useEnvelopes, useFriendDashboard, useFriendLetter, useGenderReveal, useHaptics, useLetter, useMediaLibrary, useMediaUpload, useNameGame, useSession, useSignalREvent, useSwipeNavigation, useTrivia, useWouldYouRather)
- `client/src/services/` (api, blobUpload, fetchClient, fingerprint, friendApi)
- `client/src/__tests__/` (all client test files)

### Domain 6: Server API Layer
Express routes, middleware, and server entry point.
- `server/src/index.ts`
- `server/src/routes/` (admin, auth, config, envelopes, friend, genderReveal, health, letter, media, nameGame, signalr, trivia, wyr)
- `server/src/middleware/` (auth, rateLimit)
- `server/src/__tests__/routes/` (all route tests)
- `server/src/__tests__/middleware/` (all middleware tests)

### Domain 7: Server Services
Business logic, AI integration, realtime, utilities.
- `server/src/services/` (admin, anthropic, friend, genderReveal, letter, media, nameGame, participant, realtime, session, trivia, wyr)
- `server/src/utils/` (keyHash, logger)
- `server/src/__tests__/services/` (all service tests)

### Domain 8: Database & Shared Types
Prisma schema, DB queries, connection, shared types, seed, migrations, config.
- `server/prisma/schema.prisma`
- `server/prisma.config.ts`
- `server/prisma/seed.ts`
- `server/prisma/migrations/` (all migration SQL)
- `server/src/db/connection.ts`
- `server/src/db/queries/` (config, envelopes, friend, genderReveal, letter, media, nameGame, trivia, wyr)
- `server/src/__tests__/db/` (query tests)
- `shared/types/` (api, auth, config, envelope, friend, genderReveal, index, letter, media, nameGame, signalr, trivia, wyr)
- `shared/package.json`, `shared/tsconfig.json`
