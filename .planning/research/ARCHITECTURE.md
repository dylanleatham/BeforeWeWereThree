# Architecture Patterns

**Domain:** Real-time collaborative web app on Azure
**Researched:** 2026-02-01
**Overall Confidence:** HIGH (verified against official Azure documentation and existing project patterns)

---

## Recommended Architecture

```
                                    +------------------+
                                    |   Azure Front    |
                                    |      Door        |
                                    |  (CDN/SSL/WAF)   |
                                    +--------+---------+
                                             |
                                             | HTTPS
                                             v
+----------------+              +------------+------------+
|   Browser A    |              |    Azure App Service    |
|  (React PWA)   |<------------>|    (Node.js/Express)    |
+----------------+   SignalR    |                         |
                     WebSocket  |  +-------------------+  |
+----------------+              |  |  /api/* routes    |  |
|   Browser B    |<------------>|  +-------------------+  |
|  (React PWA)   |              |  |  /negotiate       |  |
+----------------+              |  +-------------------+  |
                                |  |  Static assets    |  |
                                +--+-------------------+--+
                                   |         |         |
                    +--------------+    +----+----+    +-------------+
                    |                   |         |                  |
                    v                   v         v                  v
          +--------+--------+   +------+------+  +--------+  +------+------+
          | Azure SignalR   |   |Azure Key    |  |Azure   |  |Azure Blob   |
          | Service         |   |Vault        |  |PostgreSQL| |Storage      |
          | (Real-time)     |   |(Secrets)    |  |Flexible|  |(Media)      |
          +-----------------+   +-------------+  +--------+  +-------------+
```

### Architecture Rationale

This architecture follows Azure best practices for real-time web applications:

1. **Single App Service Origin** - The Node.js backend serves both API routes and the built React static files. This simplifies deployment, eliminates CORS issues, and reduces infrastructure complexity.

2. **Azure Front Door as Entry Point** - All traffic enters through Front Door, which provides:
   - Global CDN for static asset caching
   - SSL/TLS termination with managed certificates
   - WAF protection
   - Custom domain routing

3. **Azure SignalR Service for Real-time** - Offloads WebSocket connection management to a managed service. Clients connect directly to SignalR Service after negotiating through the backend.

4. **Managed Identity for Secrets** - App Service uses system-assigned managed identity to access Key Vault, eliminating credential storage in code or environment variables.

---

## Component Boundaries

### Frontend (client/)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| React App | UI rendering, state management | Backend API, SignalR Service |
| Service Worker | Offline caching, PWA features | Cache API, Backend API |
| SignalR Client | Real-time event handling | Azure SignalR Service |
| API Client | HTTP requests to backend | Backend API |

**Boundary rule:** Frontend never directly accesses database, Blob Storage, or Key Vault. All access is proxied through the backend.

### Backend (server/)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Express Routes | HTTP request handling | Services, Middleware |
| Services | Business logic | Database queries, External APIs |
| Database Layer | SQL query execution | PostgreSQL |
| SignalR Hub | Message broadcasting | Azure SignalR Service |
| Middleware | Auth, validation, error handling | Routes |

**Boundary rule:** Routes are thin - they validate input, call services, and format responses. Business logic lives in services.

### Shared (shared/)

| Component | Responsibility | Used By |
|-----------|---------------|---------|
| API Types | Request/response contracts | Client, Server |
| Domain Types | Envelope, Activity, Vote types | Client, Server |
| SignalR Message Types | Real-time event shapes | Client, Server |
| Validation Schemas | Zod schemas for input validation | Client, Server |

**Boundary rule:** Shared contains only types and schemas - no runtime code with side effects.

### Azure Resources

| Resource | Responsibility | Accessed By |
|----------|---------------|-------------|
| App Service | Hosts application | Front Door |
| Front Door | CDN, routing, SSL | Public internet |
| Key Vault | Secret storage | App Service (managed identity) |
| PostgreSQL | Persistent data | Backend only |
| SignalR Service | Real-time messaging | Backend (hub), Frontend (client) |
| Blob Storage | Media files | Backend (SAS generation), Frontend (direct upload) |

---

## Data Flow Patterns

### Pattern 1: Standard API Request

```
Browser -> Front Door -> App Service -> Route -> Service -> Database
                                                    |
Browser <- Front Door <- App Service <- JSON Response
```

**Example:** Fetch envelope list

1. React calls `GET /api/envelopes`
2. Front Door routes to App Service origin
3. Express route handler invoked
4. EnvelopeService.getAll() called
5. Database query executed
6. Results mapped to API response type
7. JSON response sent to browser

### Pattern 2: Real-time Sync (Vote Submission)

```
Browser A                    App Service                 SignalR Service         Browser B
    |                            |                            |                      |
    |-- POST /api/wyr/vote ----->|                            |                      |
    |                            |-- save vote to DB          |                      |
    |                            |                            |                      |
    |                            |-- broadcast via SignalR -->|-- push to Browser B-->|
    |<-- 200 OK -----------------|                            |                      |
    |                            |                            |                      |
    |                         [Both voted?]                   |                      |
    |                            |                            |                      |
    |<-- SignalR: reveal_ready --|------ broadcast ---------->|-- reveal_ready ----->|
```

**Key insight:** Votes are persisted BEFORE broadcasting. SignalR is notification only - clients can always recover state from API if messages are missed.

### Pattern 3: SignalR Connection Establishment

```
Browser                      App Service                  Azure SignalR Service
    |                            |                               |
    |-- GET /negotiate --------->|                               |
    |                            |-- generate access token ----->|
    |                            |<-- connection info -----------|
    |<-- { url, accessToken } ---|                               |
    |                                                            |
    |---------------------- WebSocket connect ------------------>|
    |<--------------------- connection established --------------|
```

**Key insight:** The backend provides the negotiate endpoint which returns the SignalR Service URL and access token. The client then connects directly to SignalR Service - not through the backend.

### Pattern 4: Media Upload (Valet Key Pattern)

```
Browser                      App Service                  Blob Storage
    |                            |                            |
    |-- POST /api/media/token -->|                            |
    |                            |-- generate SAS token       |
    |<-- { sasUrl, blobName } ---|                            |
    |                                                         |
    |---------------------- PUT file with SAS --------------->|
    |<--------------------- 201 Created ----------------------|
    |                                                         |
    |-- POST /api/media/confirm ->|                           |
    |                            |-- save metadata to DB      |
    |<-- 200 OK -----------------|                            |
```

**Why this pattern:**
- Browser uploads directly to Blob Storage (doesn't consume App Service bandwidth)
- SAS token has limited scope (single blob) and duration (minutes)
- Backend never sees the file bytes, only metadata
- Confirmation step allows validation and database persistence

### Pattern 5: Secrets Access via Managed Identity

```
App Service                  Key Vault
    |                            |
    |-- (at startup) request managed identity token
    |                            |
    |-- GET secret (with MI token) -->|
    |<-- secret value -----------|
```

**Configuration approach:** App Service configuration uses Key Vault references:
```
DATABASE_URL=@Microsoft.KeyVault(VaultName=bwwt-kv;SecretName=postgresql-connection-string)
```

The App Service runtime automatically resolves these at startup using its managed identity.

---

## Monorepo Structure

```
/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # Button, Card, Modal, Typography
│   │   │   ├── envelope/      # BaseEnvelope, SealedEnvelope, EnvelopeHeader
│   │   │   └── activities/    # TriviaActivity, WYRActivity, LetterActivity, etc.
│   │   ├── hooks/             # useEnvelope, useVoting, useSignalR, useSession
│   │   ├── services/          # api.ts (fetch wrapper), signalr.ts
│   │   ├── context/           # SignalRProvider, SessionProvider
│   │   ├── pages/             # Route-level components
│   │   └── utils/             # Helpers
│   ├── public/                # Static assets, manifest.json
│   └── index.html
│
├── server/                    # Node.js backend (Express)
│   ├── src/
│   │   ├── routes/            # envelopes.ts, auth.ts, wyr.ts, names.ts, media.ts
│   │   ├── services/          # EnvelopeService, VoteService, NameService, etc.
│   │   ├── db/
│   │   │   ├── connection.ts  # PostgreSQL pool
│   │   │   ├── queries/       # Typed query functions
│   │   │   └── migrations/    # SQL migration files
│   │   ├── middleware/        # auth.ts, errorHandler.ts, validation.ts
│   │   ├── signalr/           # Hub configuration, message handlers
│   │   └── utils/             # Helpers
│   └── index.ts               # Entry point
│
├── shared/                    # Shared between client and server
│   └── types/
│       ├── api.ts             # ApiResponse<T>, ApiError
│       ├── envelope.ts        # Envelope, EnvelopeStatus, EnvelopeType
│       ├── activities.ts      # Vote, Letter, NameVote, etc.
│       └── signalr.ts         # SignalRMessage union type
│
├── package.json               # Workspace root
├── pnpm-workspace.yaml        # pnpm workspaces config
└── turbo.json                 # Turborepo build orchestration (optional)
```

### Type Sharing Pattern

Types defined in `shared/` are imported by both client and server:

```typescript
// shared/types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// server/src/routes/envelopes.ts
import type { Envelope, ApiResponse } from '@shared/types';

// client/src/services/api.ts
import type { Envelope, ApiResponse } from '@shared/types';
```

**Path alias configuration (tsconfig.json):**
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  }
}
```

---

## SignalR Architecture

### Service Configuration

Azure SignalR Service runs in **Default mode** (not Serverless), meaning the App Service maintains a persistent connection to the service and broadcasts messages through it.

### Hub Design

Single hub for all real-time events, with message type discrimination:

```typescript
// server/src/signalr/syncHub.ts
export const hubName = 'sync';

// Message types (shared/types/signalr.ts)
export type SignalRMessage =
  | { type: 'vote_submitted'; participantId: number; promptId: number }
  | { type: 'reveal_ready'; promptId: number }
  | { type: 'envelope_completed'; envelopeId: number }
  | { type: 'key_validated'; participantId: number }
  | { type: 'reveal_unlocked' }
  | { type: 'sync_request'; timestamp: number };
```

### Connection Groups

Clients are grouped by session. All messages are broadcast to the session group:

```typescript
// On connection, add to session group
connection.on('connected', async (sessionId: string) => {
  await groups.addToGroup(connection.id, `session:${sessionId}`);
});

// Broadcast to session
await hubContext.clients.group(`session:${sessionId}`).send('message', payload);
```

### Client-Side Integration

SignalR connection managed via React Context:

```typescript
// client/src/context/SignalRContext.tsx
export function SignalRProvider({ children }: { children: React.ReactNode }) {
  const connection = useRef<HubConnection | null>(null);

  useEffect(() => {
    const conn = new HubConnectionBuilder()
      .withUrl('/negotiate')  // Backend provides negotiate endpoint
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    conn.start();
    connection.current = conn;

    return () => { conn.stop(); };
  }, []);

  return (
    <SignalRContext.Provider value={connection.current}>
      {children}
    </SignalRContext.Provider>
  );
}
```

### Reconnection Strategy

SignalR client handles reconnection automatically. On reconnect:
1. Re-join session group
2. Fetch current state from API (single source of truth)
3. UI updates to current state

**Anti-pattern:** Don't rely on SignalR message history. If client misses messages, it recovers via API poll, not replay.

---

## Database Architecture

### Connection Pooling

Use built-in PgBouncer on Azure PostgreSQL Flexible Server:

```typescript
// Connection string format (stored in Key Vault)
// Note: Port 6432 for PgBouncer, not 5432
const connectionString = `postgresql://user:pass@bwwt-db.postgres.database.azure.com:6432/bwwt?sslmode=require&pgbouncer=true`;
```

### Query Layer Pattern

Typed query functions prevent SQL injection and ensure type safety:

```typescript
// server/src/db/queries/envelopes.ts
import { pool } from '../connection';
import type { Envelope } from '@shared/types';

export async function getEnvelopeById(id: number): Promise<Envelope | null> {
  const result = await pool.query<Envelope>(
    `SELECT id, type, title, subtitle, status, order_index as "orderIndex"
     FROM envelopes WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}
```

**Rule:** No raw SQL in route handlers. All queries go through typed functions.

### Schema Overview

```sql
-- Core tables (Phase 1)
CREATE TABLE app_config (key VARCHAR(50) PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE envelopes (id SERIAL PRIMARY KEY, type VARCHAR(50), title VARCHAR(200), ...);
CREATE TABLE participants (id SERIAL PRIMARY KEY, session_id VARCHAR(100), name VARCHAR(100), ...);

-- Activity tables (Phases 2-5)
CREATE TABLE trivia_questions (id SERIAL PRIMARY KEY, envelope_id INTEGER REFERENCES envelopes(id), ...);
CREATE TABLE would_you_rather_prompts (id SERIAL PRIMARY KEY, envelope_id INTEGER REFERENCES envelopes(id), ...);
CREATE TABLE votes (id SERIAL PRIMARY KEY, prompt_id INTEGER, participant_id INTEGER, choice VARCHAR(10), ...);
CREATE TABLE letters (id SERIAL PRIMARY KEY, envelope_id INTEGER, participant_id INTEGER, content TEXT, ...);
CREATE TABLE media (id SERIAL PRIMARY KEY, blob_url TEXT, uploaded_by INTEGER, ...);
CREATE TABLE name_game_sessions (id SERIAL PRIMARY KEY, envelope_id INTEGER, ...);
CREATE TABLE name_game_names (id SERIAL PRIMARY KEY, session_id INTEGER, name VARCHAR(100), ...);
CREATE TABLE name_game_votes (id SERIAL PRIMARY KEY, name_id INTEGER, participant_id INTEGER, vote VARCHAR(20), ...);
CREATE TABLE gender_reveal_config (id SERIAL PRIMARY KEY, gender_value VARCHAR(20), key_a VARCHAR(50), key_b VARCHAR(50), ...);
CREATE TABLE gender_reveal_unlocks (id SERIAL PRIMARY KEY, config_id INTEGER, participant_id INTEGER, ...);
```

---

## PWA and Service Worker Architecture

### Caching Strategy

**App Shell Model:**
- Cache HTML shell, CSS, JS bundles, fonts at install
- Network-first for API requests
- Cache-first for static assets (images, fonts)
- Stale-while-revalidate for non-critical resources

```typescript
// service-worker.ts caching strategies
const CACHE_NAME = 'bwwt-v1';

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/assets/main.js',
        '/assets/main.css',
        // fonts, critical images
      ]);
    })
  );
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(networkFirst(event.request));
  } else {
    event.respondWith(cacheFirst(event.request));
  }
});
```

### Offline Behavior

| Feature | Offline Capability |
|---------|-------------------|
| View envelope list | Yes (cached) |
| Open sealed envelope | No (requires API) |
| Vote on WYR | Queue for sync |
| Write letter | Yes (local storage, sync on reconnect) |
| Upload photo | Queue for sync |
| Generate names | No (requires AI API) |
| Gender reveal | No (requires both participants online) |

### Reconnection Flow

1. Service worker detects online event
2. Process queued writes (votes, letters)
3. SignalR reconnects automatically
4. UI shows "synced" indicator

---

## Azure Resource Provisioning Order

Based on dependencies, provision resources in this order:

### Phase 1: Foundation

```
1. Resource Group (bwwt-rg)
   └── All resources created within this group

2. App Service Plan (bwwt-plan)
   └── Required before App Service

3. App Service (bwwt-app)
   └── Enable system-assigned managed identity
   └── Configure Node.js 20 runtime

4. Key Vault (bwwt-kv)
   └── Grant App Service managed identity "Key Vault Secrets User" role
   └── Store initial test secret

5. Front Door (bwwt-fd)
   └── Origin: App Service
   └── Custom domain + managed certificate
   └── Caching rules for static assets
```

### Phase 2: Database

```
6. PostgreSQL Flexible Server (bwwt-db)
   └── Enable built-in PgBouncer
   └── Configure firewall for App Service
   └── Store connection string in Key Vault
```

### Phase 3: Real-time

```
7. SignalR Service (bwwt-signalr)
   └── Default mode (not Serverless)
   └── Store connection string in Key Vault
```

### Phase 4: Storage

```
8. Storage Account (bwwtstorage)
   └── Create "media" container
   └── Configure CORS for browser uploads
   └── Store connection string in Key Vault
```

---

## Build Order Implications

Based on component dependencies, here's the recommended build sequence:

### Layer 1: Infrastructure Proof (Build First)

1. **App Service + GitHub Actions** - Prove deployment pipeline
2. **Front Door + DNS** - Prove custom domain and SSL
3. **Key Vault + Managed Identity** - Prove secrets access
4. **Basic API route** - Prove backend routing

**Why first:** These components underpin everything else. Bugs here affect all features.

### Layer 2: Data Layer

5. **PostgreSQL connection** - Prove database access
6. **Query layer with types** - Establish data access patterns
7. **PIN auth flow** - Prove session management

**Why second:** Data persistence is required before any feature work.

### Layer 3: Core UI

8. **Envelope data model** - Define central abstraction
9. **BaseEnvelope component** - Build reusable container
10. **First activity (Trivia)** - Prove component composition

**Why third:** Establishes UI patterns used by all activities.

### Layer 4: Real-time

11. **SignalR Service + connection** - Prove real-time infrastructure
12. **Two-participant model** - Establish multi-user patterns
13. **Vote sync (WYR)** - Prove real-time coordination

**Why fourth:** Real-time is complex. Build on proven foundation.

### Layer 5: Media

14. **Blob Storage + SAS tokens** - Prove upload infrastructure
15. **Media upload flow** - Prove file handling
16. **Media library** - Prove shared media access

**Why fifth:** Media is independent of real-time; can parallelize with Phase 4 testing.

### Layer 6: AI Integration

17. **Anthropic API integration** - Prove external API access
18. **Name generation flow** - Prove prompt contract
19. **Multi-round voting** - Prove complex state management

**Why sixth:** AI features are isolated; don't block core functionality.

### Layer 7: Ceremony

20. **Admin configuration** - Prove privileged access
21. **Two-key validation** - Prove ceremony logic
22. **Reveal sequence** - Prove UX flow

**Why last:** Most complex activity. Builds on all previous patterns.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Frontend-Direct Database Access

**What:** Exposing database credentials to browser or allowing direct SQL.

**Why bad:** Security breach, SQL injection risk.

**Instead:** All database access through backend API.

### Anti-Pattern 2: SignalR as Source of Truth

**What:** Relying on SignalR messages as the only record of events.

**Why bad:** Messages can be lost, connections drop.

**Instead:** Persist to database first, then broadcast. Clients recover via API.

### Anti-Pattern 3: Storing Secrets in Environment Variables

**What:** Putting connection strings in App Service > Configuration directly.

**Why bad:** Secrets visible in portal, not audited.

**Instead:** Use Key Vault references: `@Microsoft.KeyVault(VaultName=...;SecretName=...)`

### Anti-Pattern 4: Monolithic Route Handlers

**What:** All business logic in route handlers.

**Why bad:** Hard to test, hard to reuse.

**Instead:** Thin routes that call services. Test services directly.

### Anti-Pattern 5: Untyped API Boundaries

**What:** Different types on client and server for same data.

**Why bad:** Runtime errors, drift between systems.

**Instead:** Shared types in `shared/types/`, imported by both.

### Anti-Pattern 6: Polling for Real-time Updates

**What:** `setInterval` to fetch data instead of SignalR.

**Why bad:** Wasteful, delayed updates, poor UX.

**Instead:** Use SignalR for push notifications, API for recovery.

### Anti-Pattern 7: Large File Uploads Through API

**What:** POST file bytes to Express route.

**Why bad:** Consumes App Service bandwidth and memory.

**Instead:** Valet Key pattern - get SAS URL, upload directly to Blob Storage.

---

## Scalability Considerations

| Concern | At 2 users (target) | At 100 users | At 10K users |
|---------|---------------------|--------------|--------------|
| App Service | B1 sufficient | B1 sufficient | Scale to S1 or P1 |
| SignalR | Free tier (20 connections) | Standard tier | Premium with units |
| PostgreSQL | B1ms sufficient | B1ms sufficient | Scale up or replicas |
| Blob Storage | Minimal | Minimal | Consider CDN integration |
| Front Door | Standard | Standard | Premium if WAF needed |

**For this project:** The app targets exactly 2 concurrent users. All resource choices are optimized for minimal cost while maintaining production quality patterns that would scale if needed.

---

## Sources

### Azure Official Documentation (HIGH confidence)
- [Azure SignalR Service documentation](https://learn.microsoft.com/en-us/azure/azure-signalr/)
- [Azure App Service Node.js deployment](https://learn.microsoft.com/en-us/azure/app-service/)
- [Azure Key Vault secrets best practices](https://learn.microsoft.com/en-us/azure/key-vault/secrets/secrets-best-practices)
- [Azure PostgreSQL connection pooling](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-connection-pooling-best-practices)
- [Azure Front Door architecture](https://learn.microsoft.com/en-us/azure/well-architected/service-guides/azure-front-door)
- [Azure Blob Storage SAS tokens](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-account-delegation-sas-create-javascript)

### Community Resources (MEDIUM confidence)
- [Azure SignalR + Node + React example](https://github.com/ryanpfalz/azure-signalr-node-react)
- [Vite + Express monorepo pattern](https://github.com/john-smilga/monorepo-typescript-vite-express)
- [bhvr full-stack TypeScript monorepo](https://github.com/stevedylandev/bhvr)

### Project Documentation (HIGH confidence - existing patterns)
- `docs/bwwt_technical_patterns.md` - Established project patterns
- `docs/babymoon_build_order.md` - Phase structure and dependencies
- `.planning/PROJECT.md` - Project requirements and constraints
