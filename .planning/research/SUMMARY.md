# Project Research Summary

**Project:** Before We Were Three
**Domain:** Real-time collaborative PWA for two-device synchronization on Azure
**Researched:** 2026-02-01
**Confidence:** HIGH

## Executive Summary

"Before We Were Three" is a real-time collaborative couples app for a babymoon experience. Research shows this domain combines interactive couples apps (Paired, Between, Cupla), baby name matchers (NameHatch, BabyName App), and digital time capsules. The winning pattern is envelope-metaphor activities with synchronized two-player reveals - where both participants interact separately, then experience reveal moments together.

The recommended approach uses **Azure-native architecture** with App Service hosting both React frontend and Express backend, Azure SignalR Service for real-time sync, PostgreSQL Flexible Server for data, and Blob Storage for media. The stack is **TypeScript end-to-end** with React 19, Vite 6, Express 5, Prisma 7, and Zustand + TanStack Query for state management. This avoids deprecated technologies (CRA, Express 4, Redux) while leveraging modern patterns (React Compiler, native fetch, PWA-first).

The **critical risk** is treating SignalR as reliable messaging - it has no delivery guarantees. Mitigation: persist all critical state to database first, then broadcast via SignalR as notifications only. Clients recover from API if messages are missed. Secondary risks include iOS PWA limitations (test early, design fallbacks), service worker cache invalidation (controlled updates, not skipWaiting), and gender reveal secret leakage (server-authoritative, constant-time operations). The research flags Azure PostgreSQL Burstable tier as unsuitable for production (CPU credit throttling) and SignalR Free tier as insufficient (20 connection limit includes server connections).

## Key Findings

### Recommended Stack

The stack prioritizes type safety (TypeScript strict mode, Zod validation, Prisma), modern tooling (Vite 6 LTS, React 19 with compiler), and Azure-native services (SignalR, Key Vault with Managed Identity, PostgreSQL Flexible Server with built-in PgBouncer).

**Core technologies:**
- **React 19.2 + Vite 6.4**: Modern frontend with automatic optimization via React Compiler, 20-30x faster builds than webpack
- **Express 5.1 + Prisma 7.2**: Node 22 LTS backend with native async error handling, TypeScript-first ORM with migrations
- **Azure SignalR Service + @microsoft/signalr 9.0**: Managed real-time infrastructure, client connects directly after negotiate endpoint
- **Zustand 5.0 + TanStack Query 5.90**: Lightweight state management - Zustand for UI state, TanStack Query for server state caching
- **Zod 3.24 + react-hook-form 7.71**: Shared validation schemas between frontend/backend, performant forms with minimal re-renders
- **vite-plugin-pwa 1.1**: Zero-config PWA generation with Workbox, automatic manifest, service worker with caching strategies
- **Azure SDK (@azure/identity, @azure/keyvault-secrets, @azure/storage-blob)**: DefaultAzureCredential for local dev + managed identity in production
- **@anthropic-ai/sdk 0.71**: Official TypeScript SDK for Claude-powered baby name generation
- **sharp 0.34**: Fast image optimization before Blob Storage upload

**Anti-recommendations:** Avoid Create React App (deprecated), Express 4 (lacks async error handling), `signalr` package (legacy, use `@microsoft/signalr`), Redux/RTK (overkill for this app size), Axios (unnecessary over fetch), Moment.js (deprecated), TypeORM/Sequelize (weaker TypeScript), Jest (slower than Vitest for Vite), Node 18 (EOL April 2025), Zod 4 (stability concerns).

### Expected Features

Research reveals couples apps follow invite-link pairing (not traditional login), use real-time presence indicators, and emphasize "reveal moments" with celebration animations. Baby name apps universally use swipe-to-vote mechanics with "It's a match!" celebrations. Gender reveal apps use ceremonial unlock patterns (two-key validation).

**Must have (table stakes):**
- **Invite link/code pairing** - all couples apps use this pattern; users expect to share code, not create accounts
- **Optimistic updates with sync status** - immediate UI response with "Saving...Saved" indicators; research shows 40% reduction in perceived wait time
- **Partner presence indicator** - simple online/offline dot; critical for coordinated activities
- **Synchronized reveal mechanics** - both users submit answers, then reveal together prevents bias from seeing partner's choice first
- **PWA installation** - manifest.json, home screen icon, app-like feel expected for intimate apps
- **Basic offline access** - app shouldn't blank-screen offline; cache shell and show existing content

**Should have (competitive):**
- **Envelope metaphor UX** - sealed state creates anticipation, animated open creates delight; differentiates from clinical survey apps
- **Swipe-based baby name voting** - Tinder-like interaction is industry standard (NameHatch, BabyName App); quick, intuitive, fun
- **Match detection & celebration** - "It's a match!" moment when both love same name; emotional payoff drives engagement
- **Two-key Gender Reveal ceremony** - both participants must "turn their key" within time window; participatory moment creates shared experience
- **Rich text letters with photo attachment** - letters deserve formatting and visual memories; plain text feels insufficient for emotional content
- **AI-generated name suggestions** - fresh, creative options beyond standard lists; differentiator from basic name apps
- **Celebration animations** - confetti, particles, subtle motion on reveals/matches; adds delight without overwhelming

**Defer (v2+):**
- **Real-time collaborative text editing** - massively complex (CRDTs, OT), overkill for 2 users writing separate letters
- **Chat/messaging system** - couples already have iMessage/WhatsApp; don't compete with established habits
- **Social sharing** - gender, names, letters are private; no public sharing features
- **Complex permissions/roles** - 2 equal participants don't need admin/viewer distinction
- **Live video/audio** - complex, bandwidth-heavy, couples likely in same room anyway
- **Sound design** - nice polish layer but not essential for MVP

### Architecture Approach

Single Azure App Service hosts both React build (static files) and Express API routes, eliminating CORS issues and simplifying deployment. All traffic enters through Azure Front Door (CDN, SSL, WAF). Azure SignalR Service handles real-time connections - backend provides negotiate endpoint with access token, clients connect directly to SignalR Service. Database uses built-in PgBouncer on PostgreSQL Flexible Server (port 6432, not 5432). Media uploads use Valet Key pattern - backend generates blob-scoped SAS token, client uploads directly to Blob Storage.

**Major components:**
1. **React PWA (client/)** - UI rendering with Zustand (UI state) + TanStack Query (server state), SignalR client for real-time events, service worker for offline caching
2. **Express backend (server/)** - Thin routes calling services for business logic, SignalR hub for message broadcasting, database query layer with typed functions
3. **Shared types (shared/)** - API contracts, domain types (Envelope, Vote, Letter), SignalR message types, Zod validation schemas - imported by both client and server
4. **Azure SignalR Service** - Runs in Default mode (not Serverless); app server maintains persistent connection to service and broadcasts messages through it
5. **PostgreSQL Flexible Server** - Built-in PgBouncer connection pooling, schema managed via Prisma migrations, typed query functions prevent SQL injection

**Key patterns:**
- **SignalR as notification only**: Persist to database first, then broadcast; clients recover via API if messages missed (no delivery guarantees)
- **Valet Key for uploads**: Generate short-lived (15-60 min) blob-scoped SAS tokens; client uploads directly to Blob Storage; confirmation endpoint persists metadata
- **Managed Identity for secrets**: App Service uses system-assigned identity to access Key Vault; environment variables use Key Vault references `@Microsoft.KeyVault(VaultName=...;SecretName=...)`
- **Monorepo with workspaces**: npm workspaces (built into npm 7+) for shared types; no Turborepo/Nx needed for this project size
- **App Shell caching**: Service worker caches HTML/CSS/JS at install, network-first for API, cache-first for static assets, stale-while-revalidate for non-critical

### Critical Pitfalls

1. **SignalR has NO message delivery guarantees** - Messages sent while client disconnecting are lost permanently. Developers assume reliable delivery, but SignalR is fire-and-forget. Prevention: persist to database first, then broadcast; implement client-side acknowledgment with server retry; use SignalR for notifications, API for state recovery; add sequence numbers to messages.

2. **Gender reveal secret can leak via timing/side-channel** - API response time differences, error message variations, payload size differences, or browser DevTools inspection can reveal boy/girl before ceremony. Prevention: constant-time operations (all responses take same time), fixed payload sizes (pad to identical byte lengths), server-side rendering of reveal (never send gender to client until both keys validated), two-party cryptographic key validation (neither party alone can trigger reveal).

3. **Service worker cache invalidation creates "cached forever" users** - Users get stuck on old versions; service worker itself is cached; `skipWaiting()` causes mixed asset versions. Safari is particularly aggressive. Prevention: set `Cache-Control: max-age=0, no-cache` for service-worker.js; never call `skipWaiting()` in install handler (use controlled update flow: detect -> notify user -> user accepts -> then skipWaiting + reload); version cache names (`cache-v2`, `cache-v3`) and delete old caches in activate; add manual "check for updates" button.

4. **Two-device sync resolves data conflicts but not business logic conflicts** - CRDTs/Last-Write-Wins merge data perfectly but violate business rules (e.g., both vote offline, merge creates two votes per person). Prevention: server-authoritative for hard constraints (voting, reveals); optimistic UI with server confirmation; conflict detection surfaces violations to user; design for offline gap (what decisions on stale data are acceptable?).

5. **Key Vault secrets cached for 24 hours despite restart** - Rotating secret in Key Vault doesn't take effect immediately; Azure caches for performance. Prevention: Stop and Start (not Restart) clears cache more reliably; use versioned secrets (`@Microsoft.KeyVault(SecretUri=https://vault/secrets/name/VERSION)`) to force specific version; plan for cache lag in rotation procedures; prefer managed identity over secrets for Azure-to-Azure auth.

## Implications for Roadmap

Based on research, suggested phase structure follows dependency order: infrastructure foundation enables data layer, which enables core UI patterns, which enable real-time sync, which enable complex activities. Build order prioritizes proving Azure deployment pipeline, establishing reusable component patterns, then implementing activities from simplest (Trivia - single player) to most complex (Gender Reveal - two-key ceremony).

### Phase 1: Azure Infrastructure & Foundation
**Rationale:** All features depend on deployment pipeline, secrets management, and database access. Bugs in infrastructure affect everything. Establish Azure patterns before feature work.

**Delivers:** App Service with GitHub Actions CI/CD, Front Door with custom domain, Key Vault with Managed Identity, PostgreSQL with connection pooling, basic API route, PIN-based session management.

**Addresses:**
- Must-have: Invite link pairing (session management foundation)
- Stack: Azure SDK integration, Managed Identity, Express 5 backend, Prisma database layer

**Avoids:**
- Pitfall 5: Key Vault caching (use versioned secrets from start)
- Pitfall 8: PostgreSQL Burstable tier (use General Purpose/Memory Optimized for production, not B-series)
- Pitfall 11: SignalR Free tier (start with Standard - 1000 connections, not Free's 20)
- Pitfall 12: Deployment slot setting swaps (mark secrets as slot-specific in both slots)

**Research flag:** Standard Azure patterns, skip phase-specific research.

### Phase 2: PWA Foundation & Envelope Model
**Rationale:** PWA caching strategy and envelope abstraction are reusable across all activities. Service worker issues discovered late are expensive to fix. Establish UI component patterns before building activities.

**Delivers:** Service worker with controlled update flow, PWA manifest, BaseEnvelope component, envelope data model and API routes, sealed/open states, basic offline caching.

**Addresses:**
- Must-have: PWA installation, basic offline access
- Should-have: Envelope metaphor UX (sealed state, animated open)
- Stack: vite-plugin-pwa, Workbox caching strategies

**Avoids:**
- Pitfall 3: Service worker cache invalidation (controlled update flow, versioned caches, no skipWaiting in install)
- Pitfall 7: iOS PWA limitations (test on iOS from day one, no Background Sync API, handle aggressive storage eviction)
- Pitfall 14: IndexedDB quota errors (wrap writes in try/catch, check quota proactively, implement cache eviction)

**Research flag:** iOS PWA testing critical - standard patterns exist but iOS-specific quirks need validation during testing.

### Phase 3: Real-Time Sync & First Activity (Would You Rather)
**Rationale:** Real-time sync is foundational for all interactive activities. Would You Rather demonstrates synchronized two-player reveal (core mechanic) without match detection complexity. Proves SignalR integration before building more complex activities.

**Delivers:** Azure SignalR Service connection, presence indicators, synchronized vote submission and reveal, optimistic updates with server confirmation, SignalR reconnection handling.

**Addresses:**
- Must-have: Optimistic updates with sync status, partner presence indicator, synchronized reveal mechanics
- Should-have: Progressive envelope unlock (Would You Rather unlocks after pairing)
- Stack: @microsoft/signalr client, Zustand + TanStack Query state management

**Avoids:**
- Pitfall 1: SignalR no delivery guarantees (persist votes to database first, broadcast as notification, clients poll for recovery)
- Pitfall 4: Business logic conflicts (server validates "one vote per participant" rule, optimistic UI with server rejection)
- Pitfall 13: SignalR token expiration (implement withAutomaticReconnect, handle 401 for fresh token)
- Pitfall 15: Sticky sessions required (verify ARR Affinity enabled in App Service)

**Research flag:** SignalR acknowledgment pattern needs design validation - existing sources explain problem but not standard solution.

### Phase 4: Letters to Baby & Media Upload
**Rationale:** Letters introduce rich text editing and photo uploads but no real-time coordination (each person writes independently). Can parallelize testing with Phase 3 activities. Media upload establishes SAS token pattern reused later.

**Delivers:** Rich text editor (Tiptap or similar), photo upload via SAS tokens to Blob Storage, Valet Key pattern implementation, media metadata persistence, partner letter reveal after both submit.

**Addresses:**
- Should-have: Rich text editing, photo attachment, time capsule feeling, read partner's letter
- Stack: Sharp for image optimization, @azure/storage-blob for SAS token generation

**Avoids:**
- Pitfall 9: SAS token over-permissioning (User Delegation SAS, blob-scoped not container-scoped, 15-60 min expiry, HTTPS-only, never log tokens)

**Research flag:** Rich text editor selection needs research (Tiptap vs Slate vs Lexical - tradeoffs for React 19 compatibility and bundle size).

### Phase 5: Baby Name Swipe Game & AI Generation
**Rationale:** Introduces swipe interaction pattern and match detection (both love same name). AI name generation adds differentiator but is isolated - can build without blocking core voting mechanics.

**Delivers:** Swipe/tap UI for Love/Maybe/Nope voting, match detection ("It's a match!" when both love same name), match list view, Anthropic API integration for AI name generation with user preferences, rate limiting and caching.

**Addresses:**
- Should-have: Swipe-based voting, match detection & celebration, match list, AI-generated names
- Stack: @anthropic-ai/sdk for Claude, Zod schemas for AI structured outputs

**Avoids:**
- Pitfall 6: OpenAI Structured Outputs schema constraints (design Zod schemas with `additionalProperties: false`, all fields in `required`, nullable unions for optional like `["string", "null"]`)
- Pitfall 10: OpenAI rate limits and cost overruns (exponential backoff with jitter, client-side request pacing, aggressive caching of responses, usage alerts, `max_tokens` limits, monitor `x-ratelimit-remaining-*` headers)

**Research flag:** AI prompt engineering for name generation needs iteration - Context7 or phase research to explore effective prompts for style/origin/cultural preferences.

### Phase 6: Trivia Activity
**Rationale:** Simplest activity (single-player, server reveals correct answer) but lowest novelty. Defer to prove more interesting mechanics first. Demonstrates envelope pattern reuse.

**Delivers:** Trivia question delivery, answer submission, correct answer reveal (server-authoritative), score tracking, completion state.

**Addresses:**
- Activity completeness (all activities implemented)

**Avoids:** No unique pitfalls - reuses patterns from Phases 2-3.

**Research flag:** Standard patterns, skip phase-specific research.

### Phase 7: Gender Reveal Ceremony (Two-Key Unlock)
**Rationale:** Highest complexity and highest emotional stakes. Requires two-party validation, constant-time operations to prevent leakage, celebration sequence. Build last when all patterns proven.

**Delivers:** Admin configuration for gender value and keys, two-key validation (both participants submit key within time window), server-authoritative reveal trigger, constant-time API operations, celebration animation sequence.

**Addresses:**
- Should-have: Two-key Gender Reveal ceremony (most significant differentiator)
- Should-have: Celebration animations (peak emotional moment)

**Avoids:**
- Pitfall 2: Gender reveal secret leakage (constant-time operations, fixed payload sizes, server-side rendering, cryptographic two-party validation, no conditional UI before reveal)

**Research flag:** Cryptographic two-key validation pattern needs research - ensure neither party can unilaterally trigger reveal or probe gender value.

### Phase Ordering Rationale

- **Vertical slice approach**: Phase 1-3 delivers one complete activity (Would You Rather) end-to-end, proving all infrastructure before breadth.
- **Dependency order**: Infrastructure (Phase 1) -> UI patterns (Phase 2) -> Real-time (Phase 3) -> Independent features (Phases 4-6) -> Complex ceremony (Phase 7).
- **Risk reduction**: SignalR reliability patterns (Pitfall 1) designed in Phase 3 before building activities that depend on sync; PWA caching (Pitfall 3) established in Phase 2 before adding offline features; gender leakage prevention (Pitfall 2) addressed in final phase when architecture proven.
- **Parallel work opportunities**: Phase 4 (Letters) can be tested while Phase 3 (Would You Rather) is in production; Phase 5 (Names) and Phase 6 (Trivia) are independent and can be built in either order.
- **Complexity curve**: Simplest real-time activity (Would You Rather) before match detection (Names) before two-key ceremony (Gender Reveal).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Real-Time Sync):** SignalR acknowledgment/retry pattern design - sources explain problem but not canonical solution; needs architecture decision
- **Phase 4 (Letters):** Rich text editor selection (Tiptap vs Slate vs Lexical) - tradeoffs for React 19, TypeScript, bundle size
- **Phase 5 (AI):** Anthropic prompt engineering for name generation - effective prompt structure for style/origin/cultural constraints
- **Phase 7 (Gender Reveal):** Cryptographic two-key validation - ensure neither party can unilaterally trigger reveal

Phases with standard patterns (skip research-phase):
- **Phase 1 (Infrastructure):** Azure App Service, Front Door, Key Vault, PostgreSQL - all well-documented official patterns
- **Phase 2 (PWA):** Service worker caching strategies, manifest.json - MDN standard patterns (but needs iOS testing)
- **Phase 6 (Trivia):** Simple Q&A submission/reveal - reuses Phase 2-3 patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm registry and official release announcements; Node 22 LTS, React 19.2, Vite 6.4, Express 5.1, Prisma 7.2 are current stable releases |
| Features | MEDIUM | Patterns verified across multiple couples apps (Paired, Between, Cupla), baby name apps (NameHatch, BabyName App), and gender reveal apps; some patterns extrapolated from adjacent domains |
| Architecture | HIGH | Verified against official Azure documentation (SignalR Service, App Service, PostgreSQL Flexible Server, Key Vault); monorepo patterns from community examples; SignalR Default mode and connection flow confirmed |
| Pitfalls | HIGH | SignalR delivery guarantees verified in official docs + GitHub issues; service worker caching issues from MDN + community war stories; Key Vault caching behavior from official docs + support threads; PostgreSQL Burstable tier issues from Azure troubleshooting guides |

**Overall confidence:** HIGH

### Gaps to Address

- **SignalR acknowledgment pattern**: Sources identify that SignalR has no delivery guarantees, but no canonical acknowledgment/retry pattern emerges. Options: (1) client sends ack message, server retries if timeout, (2) client polls API after action to confirm, (3) sequence numbers + client requests missing messages. Decision needed in Phase 3 planning based on acceptable latency vs complexity tradeoffs.

- **iOS PWA testing infrastructure**: Research identifies severe iOS limitations (no Background Sync, aggressive storage eviction, 7-day cap), but real-world behavior needs validation. Set up iOS Simulator + physical device testing in Phase 2 to quantify storage limits and eviction timing. May need fallback strategies beyond research recommendations.

- **Rich text editor selection**: Research doesn't prioritize among Tiptap, Slate, Lexical. Decision criteria: React 19 compatibility (hooks, concurrent features), TypeScript quality, bundle size, extensibility for future features (e.g., mentions, embeds). Needs Phase 4 pre-planning research or spike to compare.

- **Gender reveal cryptographic validation**: Research recommends two-party validation but doesn't specify cryptographic primitive. Options: (1) both parties contribute to HMAC key construction, (2) threshold signature scheme, (3) simple server-side "both submitted within window" check with constant-time validation. Security vs complexity tradeoff needs expert consultation or Phase 7 research.

- **AI name generation prompt engineering**: Research confirms Anthropic SDK and Structured Outputs constraints, but effective prompt structure for culturally diverse, style-aware name generation needs iteration. Potential failure modes: biased suggestions, names that don't meet cultural criteria, names that match existing relatives. Needs Phase 5 prompt experimentation with diverse test cases.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [React 19 Release](https://react.dev/blog/2024/12/05/react-19) - React 19 features, React Compiler
- [React 19.2 Release](https://react.dev/blog/2025/10/01/react-19-2) - Latest stable version
- [Express 5.1.0 Announcement](https://expressjs.com/2025/03/31/v5-1-latest-release.html) - Express 5 native async error handling
- [Vite Releases](https://vite.dev/releases) - Vite 6 LTS release notes
- [TypeScript 5.8 Release](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html) - Latest TypeScript features
- [Prisma Changelog](https://www.prisma.io/changelog) - Prisma 7 TypeScript engine, releases
- [Azure Node.js 22 Support](https://azure.github.io/AppService/2025/02/18/Node-22.html) - Node 22 LTS availability
- [Azure SignalR Service documentation](https://learn.microsoft.com/en-us/azure/azure-signalr/) - Default vs Serverless mode, connection management
- [Azure SignalR Troubleshooting Guide](https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-howto-troubleshoot-guide) - Common issues, diagnostics
- [Azure App Service Node.js deployment](https://learn.microsoft.com/en-us/azure/app-service/) - Deployment patterns, managed identity
- [Azure Key Vault References in App Service](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references) - Secret caching behavior (24 hours)
- [Azure PostgreSQL Flexible Server Troubleshooting](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-troubleshooting-guides) - Burstable tier issues, PgBouncer
- [Azure Front Door architecture](https://learn.microsoft.com/en-us/azure/well-architected/service-guides/azure-front-door) - CDN, WAF, routing
- [Azure Blob Storage SAS tokens](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-account-delegation-sas-create-javascript) - User Delegation SAS, valet key pattern
- [MDN: PWA Offline](https://developer.mozilla.org/en-us/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) - Service worker caching strategies
- [MDN: Storage Quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) - IndexedDB limits, eviction criteria
- [MDN: Caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching) - Cache API, strategies
- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs) - Schema constraints, additionalProperties requirement
- [OpenAI Rate Limits](https://platform.openai.com/docs/guides/rate-limits) - RPM, RPD, TPM limits

**npm Packages (versions verified):**
- [@microsoft/signalr 9.0.6](https://www.npmjs.com/package/@microsoft/signalr) - Official Microsoft SignalR client
- [@azure/identity 4.13.0](https://www.npmjs.com/package/@azure/identity) - DefaultAzureCredential, managed identity
- [@azure/keyvault-secrets 4.10.0](https://www.npmjs.com/package/@azure/keyvault-secrets) - Key Vault secret retrieval
- [@azure/storage-blob 12.30.0](https://www.npmjs.com/package/@azure/storage-blob) - Blob Storage SAS generation
- [@anthropic-ai/sdk 0.71.2](https://www.npmjs.com/package/@anthropic-ai/sdk) - Official Anthropic TypeScript SDK
- [sharp 0.34.5](https://www.npmjs.com/package/sharp) - Image optimization
- [zustand 5.0.10](https://www.npmjs.com/package/zustand) - State management
- [react-hook-form 7.71.1](https://www.npmjs.com/package/react-hook-form) - Form state
- [@tanstack/react-query 5.90.19](https://www.npmjs.com/package/@tanstack/react-query) - Server state caching
- [vite-plugin-pwa 1.1.0](https://www.npmjs.com/package/vite-plugin-pwa) - PWA generation

### Secondary (MEDIUM confidence)

**Couples & Baby Apps:**
- [Paired Support - Partner Pairing](https://support.paired.com/en/articles/164636-how-do-i-pair-with-my-partner) - Invite link pattern
- [Cupla - Invite Partner](https://help.cupla.app/article/9-how-do-i-invite-my-partner) - Code-based pairing
- [Flo for Partners](https://help.flo.health/hc/en-us/articles/19871976024596-How-do-I-set-up-Flo-for-Partners) - Partner connection
- [Between App](https://help.between.us/hc/en-us/articles/115006216408-I-signed-up-but-don-t-know-how-to-connect-with-my-partner) - Pairing flow
- [NameHatch - Tinder for Baby Names](https://www.namehatchapp.com/blog/is-namehatch-the-new-tinder-for-baby-names/) - Swipe interaction pattern
- [BabyName App](https://babyname-app.com/) - Match detection pattern
- [The Bump - Baby Name Matcher](https://www.thebump.com/b/baby-name-matcher) - Voting UI
- [GenderReveal.app](https://genderreveal.app/) - Digital reveal patterns
- [GenderReveal.live](https://www.genderreveal.live/) - Ceremony timing

**Real-Time Sync:**
- [InstantDB - Presence and Topics](https://www.instantdb.com/docs/presence-and-topics) - Presence patterns
- [Liveblocks - Presence](https://liveblocks.io/presence) - Real-time awareness
- [OpenReplay - Optimistic Updates](https://blog.openreplay.com/optimistic-updates-make-apps-faster/) - 40% perceived performance improvement
- [Adalo - Offline vs Real-Time Sync](https://www.adalo.com/posts/offline-vs-real-time-sync-managing-data-conflicts) - Conflict resolution patterns
- [PubNub - Typing Indicators](https://www.pubnub.com/guides/how-a-typing-indicator-enables-chat-engagement/) - Presence debouncing

**PWA & Offline:**
- [LogRocket - Offline-First Frontend Apps](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) - IndexedDB patterns
- [MagicBell - Service Worker Caching](https://www.magicbell.com/blog/offline-first-pwas-service-worker-caching-strategies) - Caching strategies
- [Taming PWA Cache Behavior](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior) - Cache invalidation patterns
- [PWA iOS Limitations Guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) - Safari restrictions, EU DMA
- [skipWaiting Race Conditions](https://allanchain.github.io/blog/post/pwa-skipwaiting/) - skipWaiting() dangers

**Azure & Architecture:**
- [SignalR Message Deliverability](https://consultwithgriff.com/signalr-message-guarantee-deliverability/) - No guarantees analysis
- [GitHub Issue #42874](https://github.com/dotnet/aspnetcore/issues/42874) - SignalR reliability discussion
- [Azure SAS Token Risks](https://www.cyera.com/blog/understanding-the-risks-of-azure-sas-tokens) - Security concerns
- [Azure Blob SAS Guidelines](https://markheath.net/post/azure-blob-sas-guidelines) - Best practices
- [Azure SignalR + Node + React example](https://github.com/ryanpfalz/azure-signalr-node-react) - Community implementation
- [Vite + Express monorepo pattern](https://github.com/john-smilga/monorepo-typescript-vite-express) - Project structure
- [bhvr full-stack TypeScript monorepo](https://github.com/stevedylandev/bhvr) - npm workspaces example

**ORM & Database:**
- [Drizzle vs Prisma Comparison](https://www.bytebase.com/blog/drizzle-vs-prisma/) - ORM tradeoffs
- [Node.js ORMs in 2025](https://thedataguy.pro/blog/2025/12/nodejs-orm-comparison-2025/) - ORM landscape
- [PostgreSQL Flexible Server Performance Issues](https://learn.microsoft.com/en-us/answers/questions/2119423/flexible-server-performance) - Burstable tier problems

**State Management & AI:**
- [React State Management in 2025](https://makersden.io/blog/react-state-management-in-2025) - Zustand vs Redux comparison
- [Structured Outputs Breaking Pydantic](https://medium.com/@aviadr1/how-to-fix-openai-structured-outputs-breaking-your-pydantic-models-bdcd896d43bd) - Schema constraints
- [How to Handle Rate Limits](https://cookbook.openai.com/examples/how_to_handle_rate_limits) - Exponential backoff patterns

### Tertiary (LOW confidence)

**UI Patterns & Media:**
- [Figma - Animated Envelope](https://www.figma.com/community/file/1074361732617613961/animated-envelope-card) - Animation reference
- [Envato - Opening Envelope Animation](https://elements.envato.com/opening-envelope-animation-DTCSSCZ) - Animation templates
- [Uploadcare - File Uploader UX](https://uploadcare.com/blog/file-uploader-ux-best-practices/) - Upload patterns
- [UI Patterns - Anti-Patterns](https://ui-patterns.com/blog/User-Interface-AntiPatterns) - UX mistakes
- [IndexedDB Max Storage Limit](https://rxdb.info/articles/indexeddb-max-storage-limit.html) - Browser limits

**Couples Apps Analysis:**
- [AppMakers - Apps for Couples](https://appmakersla.com/blog/popular-apps/apps-for-couples/) - Market overview
- [Cupla - Relationship Management Apps 2026](https://cupla.app/blog/the-ultimate-guide-to-relationship-management-apps-in-2026/) - Trends
- [MobileAppDaily - Best Apps for Couples](https://www.mobileappdaily.com/products/best-apps-for-couple) - Feature comparison

---
*Research completed: 2026-02-01*
*Ready for roadmap: yes*
