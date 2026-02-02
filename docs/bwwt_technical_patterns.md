# Before We Were Three — Technical Implementation Patterns

This document defines the coding standards, architectural patterns, and testing requirements for the application. It is intended to ensure consistency, prevent regressions, and maximize code reuse.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (strict mode) |
| Frontend | React |
| Backend | Node.js with Express |
| Database | PostgreSQL |
| Testing | Jest (unit/integration), React Testing Library (components) |
| Real-time | Azure SignalR |

---

## Azure Resources

All infrastructure runs on Azure. This is the complete list of resources required, listed in the order they are provisioned.

### Resource Group

**Name:** `bwwt-rg` (or similar)

Container for all project resources. Created first in Phase 1.1.

### App Service

**Purpose:** Hosts the Node.js backend and serves the React frontend.

**Configuration:**
- Runtime: Node.js 20 LTS
- Plan: B1 or higher (Basic tier minimum for custom domains)
- System-assigned managed identity enabled (for Key Vault access)

**Introduced:** Phase 1.1

### Front Door

**Purpose:** CDN, global routing, custom domain, and SSL/TLS termination.

**Configuration:**
- Origin: App Service
- Custom domain: `beforewewerethree.com` (or your domain)
- HTTPS: Front Door managed certificate
- Caching: Static assets cached, API routes pass-through

**DNS (Porkbun):**
- CNAME record pointing to Front Door endpoint
- TXT record for domain verification

**Introduced:** Phase 1.2

### Key Vault

**Purpose:** Centralized secrets management. All sensitive configuration lives here.

**Secrets stored:**
| Secret Name | Description | Phase Added |
|-------------|-------------|-------------|
| `postgresql-connection-string` | Database connection string | 1.5 |
| `signalr-connection-string` | SignalR connection string | 2.1 |
| `blob-storage-connection-string` | Blob Storage connection string | 3.2 |
| `anthropic-api-key` | Anthropic API key for name generation | 4.1 |

**Access:**
- App Service reads secrets via Key Vault references
- App Service managed identity granted "Key Vault Secrets User" role

**Introduced:** Phase 1.3

### Database for PostgreSQL

**Purpose:** Primary data store for all application data.

**Configuration:**
- Type: Flexible Server
- Version: PostgreSQL 15 or 16
- SKU: Burstable B1ms (sufficient for this use case)
- Storage: 32 GB (expandable)
- Firewall: Allow App Service access

**Connection:** Connection string stored in Key Vault, accessed via Key Vault reference.

**Introduced:** Phase 1.5

### SignalR Service

**Purpose:** Real-time two-device synchronization for votes, reveals, and state updates.

**Configuration:**
- Tier: Free (up to 20 concurrent connections) or Standard
- Service Mode: Default

**Used for:**
- Vote submission notifications
- Reveal triggers (both WYR and gender reveal)
- Envelope completion sync
- Key validation events

**Connection:** Connection string stored in Key Vault.

**Introduced:** Phase 2.1

### Blob Storage

**Purpose:** Media storage for uploaded photos and videos.

**Configuration:**
- Account type: StorageV2 (general purpose v2)
- Replication: LRS (locally redundant) is sufficient
- Access tier: Hot
- Container: `media` (private access, SAS tokens for upload/download)

**CORS configuration:**
```json
{
  "allowedOrigins": ["https://beforewewerethree.com"],
  "allowedMethods": ["GET", "PUT"],
  "allowedHeaders": ["*"],
  "exposedHeaders": ["*"],
  "maxAgeInSeconds": 3600
}
```

**Connection:** Connection string stored in Key Vault.

**Introduced:** Phase 3.2

---

### Resource Naming Convention

Use consistent naming across all resources:

| Resource Type | Naming Pattern | Example |
|---------------|----------------|---------|
| Resource Group | `bwwt-rg` | `bwwt-rg` |
| App Service | `bwwt-app` | `bwwt-app` |
| App Service Plan | `bwwt-plan` | `bwwt-plan` |
| Front Door | `bwwt-fd` | `bwwt-fd` |
| Key Vault | `bwwt-kv` | `bwwt-kv` |
| PostgreSQL Server | `bwwt-db` | `bwwt-db` |
| SignalR | `bwwt-signalr` | `bwwt-signalr` |
| Storage Account | `bwwtstorage` | `bwwtstorage` (no hyphens allowed) |

---

### Cost Estimate (Development/Low Traffic)

| Resource | SKU | Estimated Monthly Cost |
|----------|-----|------------------------|
| App Service | B1 | ~$13 |
| Front Door | Standard | ~$35 (includes 1M requests) |
| Key Vault | Standard | ~$0.03/10K operations |
| PostgreSQL | B1ms | ~$15 |
| SignalR | Free | $0 (or ~$50 for Standard) |
| Blob Storage | LRS Hot | ~$2 (minimal usage) |
| **Total** | | **~$65-115/month** |

*Costs vary by region and usage. This estimate assumes West US 2 region and light usage.*

---

## Project Structure

```
/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # Shared UI components (Button, Card, Modal)
│   │   │   ├── envelope/      # Envelope system components
│   │   │   └── activities/    # Activity-specific components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API client functions
│   │   ├── types/             # Frontend-specific types
│   │   ├── context/           # React context providers
│   │   └── utils/             # Helper functions
│   └── __tests__/             # Frontend tests (mirrors src/ structure)
│
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── routes/            # Express route handlers
│   │   ├── services/          # Business logic
│   │   ├── db/                # Database access layer
│   │   │   ├── queries/       # SQL query functions
│   │   │   └── migrations/    # Schema migrations
│   │   ├── middleware/        # Express middleware
│   │   ├── types/             # Backend-specific types
│   │   └── utils/             # Helper functions
│   └── __tests__/             # Backend tests (mirrors src/ structure)
│
├── shared/                    # Shared between client and server
│   └── types/                 # API contracts, shared interfaces
│
└── package.json               # Monorepo root (workspaces)
```

---

## TypeScript Standards

### Strict Mode

All TypeScript must compile with strict mode enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Shared Types

API request/response types live in `/shared/types/` and are imported by both client and server. This ensures type safety across the boundary.

```typescript
// shared/types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// shared/types/envelope.ts
export type EnvelopeStatus = 'sealed' | 'opened' | 'completed';
export type EnvelopeType = 'trivia' | 'would-you-rather' | 'letter' | 'name-game' | 'gender-reveal';

export interface Envelope {
  id: number;
  type: EnvelopeType;
  title: string;
  subtitle?: string;
  status: EnvelopeStatus;
  orderIndex: number;
}
```

### Naming Conventions

- Interfaces: PascalCase, no `I` prefix (`Envelope`, not `IEnvelope`)
- Types: PascalCase (`EnvelopeStatus`)
- Functions: camelCase (`getEnvelopeById`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- Files: kebab-case (`envelope-service.ts`)
- React components: PascalCase files (`EnvelopeCard.tsx`)

---

## Testing Requirements

### The Rule

**No phase checkpoint is complete until tests pass.**

Tests are not optional or "nice to have." They are the mechanism that prevents regressions. When functionality breaks after an iterative change, it means a test was missing.

### Test Coverage Requirements

| Layer | Requirement |
|-------|-------------|
| API routes | Every route has at least one happy-path and one error-path test |
| Services | Every public function has unit tests |
| Database queries | Every query function has integration tests against a test database |
| React components | Every component has rendering tests; interactive components have interaction tests |
| Hooks | Every custom hook has tests |
| Utilities | Every utility function has unit tests |

### Test File Naming

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- Test files live in `__tests__/` directories mirroring source structure

### Test Structure

Use the Arrange-Act-Assert pattern:

```typescript
describe('EnvelopeService', () => {
  describe('openEnvelope', () => {
    it('updates envelope status to opened', async () => {
      // Arrange
      const envelope = await createTestEnvelope({ status: 'sealed' });
      
      // Act
      const result = await envelopeService.openEnvelope(envelope.id);
      
      // Assert
      expect(result.status).toBe('opened');
    });

    it('throws if envelope is already completed', async () => {
      // Arrange
      const envelope = await createTestEnvelope({ status: 'completed' });
      
      // Act & Assert
      await expect(envelopeService.openEnvelope(envelope.id))
        .rejects.toThrow('Cannot open a completed envelope');
    });
  });
});
```

### What to Test

**Do test:**
- Business logic and state transitions
- API request/response contracts
- Error handling paths
- Component rendering based on props
- User interactions (clicks, form submissions)
- Edge cases (empty states, max limits, invalid input)

**Don't test:**
- Implementation details (private functions, internal state shape)
- Third-party libraries
- Exact CSS styling

### Test Database

Integration tests run against a separate PostgreSQL database (not production, not development). Use environment variable `DATABASE_URL_TEST`.

```typescript
// jest.setup.ts
beforeAll(async () => {
  await resetTestDatabase();
});

afterEach(async () => {
  await cleanupTestData();
});
```

---

## API Design Conventions

### RESTful Endpoints

```
GET    /api/envelopes           # List all envelopes
GET    /api/envelopes/:id       # Get single envelope
POST   /api/envelopes/:id/open  # Action: open envelope
POST   /api/envelopes/:id/complete  # Action: complete envelope

GET    /api/wyr/:envelopeId/prompt  # Get Would You Rather prompt
POST   /api/wyr/:promptId/vote      # Submit vote

POST   /api/names/generate      # Generate name batch
POST   /api/names/:nameId/vote  # Submit name vote
```

### Consistent Response Format

All API responses use the same envelope:

```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "ENVELOPE_NOT_FOUND",
    "message": "Envelope with ID 42 not found"
  }
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET, successful action |
| 201 | Resource created |
| 400 | Validation error, bad request |
| 401 | Not authenticated (no valid session) |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 500 | Server error (unexpected) |

### Error Codes

Use consistent, machine-readable error codes:

```typescript
// errors.ts
export const ErrorCodes = {
  // Auth
  INVALID_PIN: 'INVALID_PIN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Envelopes
  ENVELOPE_NOT_FOUND: 'ENVELOPE_NOT_FOUND',
  ENVELOPE_ALREADY_OPENED: 'ENVELOPE_ALREADY_OPENED',
  ENVELOPE_ALREADY_COMPLETED: 'ENVELOPE_ALREADY_COMPLETED',
  
  // Voting
  ALREADY_VOTED: 'ALREADY_VOTED',
  VOTE_NOT_FOUND: 'VOTE_NOT_FOUND',
  
  // General
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

### Request Validation

Validate all incoming requests at the route level using a validation library (e.g., Zod):

```typescript
import { z } from 'zod';

const voteSchema = z.object({
  choice: z.enum(['option_a', 'option_b']),
});

router.post('/wyr/:promptId/vote', async (req, res) => {
  const validation = voteSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid request body',
        details: validation.error.flatten(),
      },
    });
  }
  // ... proceed with validated data
});
```

---

## Component Architecture

### The Envelope Pattern

The envelope system uses composition, not duplication. There is ONE base envelope component that handles:

- Visual states (sealed, opened, completed)
- Open animation
- Status persistence
- Common UI chrome (title, subtitle, completion indicator)

Activity-specific components plug into the base envelope as children.

```
┌─────────────────────────────────────┐
│ BaseEnvelope                        │
│ ┌─────────────────────────────────┐ │
│ │ EnvelopeHeader (title, status)  │ │
│ ├─────────────────────────────────┤ │
│ │                                 │ │
│ │   {children} ← Activity goes   │ │
│ │               here             │ │
│ │                                 │ │
│ ├─────────────────────────────────┤ │
│ │ EnvelopeFooter (completion)    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Base Envelope Component

```typescript
// components/envelope/BaseEnvelope.tsx
interface BaseEnvelopeProps {
  envelope: Envelope;
  children: React.ReactNode;
  onComplete?: () => void;
}

export function BaseEnvelope({ envelope, children, onComplete }: BaseEnvelopeProps) {
  const { status, openEnvelope, completeEnvelope } = useEnvelope(envelope.id);
  
  if (status === 'sealed') {
    return (
      <SealedEnvelope 
        envelope={envelope} 
        onOpen={() => openEnvelope()} 
      />
    );
  }
  
  return (
    <div className="envelope envelope--open">
      <EnvelopeHeader envelope={envelope} />
      <div className="envelope__content">
        {children}
      </div>
      <EnvelopeFooter 
        status={status}
        onComplete={() => {
          completeEnvelope();
          onComplete?.();
        }} 
      />
    </div>
  );
}
```

### Activity Components

Activity components are pure — they receive data and callbacks, they don't manage envelope state:

```typescript
// components/activities/TriviaActivity.tsx
interface TriviaActivityProps {
  question: TriviaQuestion;
  onAnswer: (correct: boolean) => void;
}

export function TriviaActivity({ question, onAnswer }: TriviaActivityProps) {
  const [revealed, setRevealed] = useState(false);
  
  // ... render question, handle answer reveal
}
```

### Composing Envelope + Activity

Pages compose the base envelope with the appropriate activity:

```typescript
// pages/TriviaEnvelopePage.tsx
export function TriviaEnvelopePage({ envelopeId }: { envelopeId: number }) {
  const { envelope } = useEnvelope(envelopeId);
  const { question, submitAnswer } = useTrivia(envelopeId);
  
  return (
    <BaseEnvelope envelope={envelope}>
      <TriviaActivity 
        question={question}
        onAnswer={submitAnswer}
      />
    </BaseEnvelope>
  );
}
```

### Activity Type Registry

Use a registry pattern to map envelope types to their activity components:

```typescript
// components/activities/index.ts
import { TriviaActivity } from './TriviaActivity';
import { WouldYouRatherActivity } from './WouldYouRatherActivity';
import { LetterActivity } from './LetterActivity';
import { NameGameActivity } from './NameGameActivity';
import { GenderRevealActivity } from './GenderRevealActivity';

export const activityComponents: Record<EnvelopeType, React.ComponentType<any>> = {
  'trivia': TriviaActivity,
  'would-you-rather': WouldYouRatherActivity,
  'letter': LetterActivity,
  'name-game': NameGameActivity,
  'gender-reveal': GenderRevealActivity,
};
```

This allows rendering any envelope generically:

```typescript
// pages/EnvelopePage.tsx
export function EnvelopePage({ envelopeId }: { envelopeId: number }) {
  const { envelope } = useEnvelope(envelopeId);
  const ActivityComponent = activityComponents[envelope.type];
  
  return (
    <BaseEnvelope envelope={envelope}>
      <ActivityComponent envelopeId={envelopeId} />
    </BaseEnvelope>
  );
}
```

---

## Custom Hooks

### Naming

All custom hooks start with `use` and describe what they provide:

- `useEnvelope(id)` — envelope state and actions
- `useTrivia(envelopeId)` — trivia question and answer logic
- `useVoting(promptId)` — voting state and submission
- `useSignalR()` — SignalR connection and message handling
- `useSession()` — current participant session

### Hook Structure

Hooks encapsulate data fetching, state, and actions:

```typescript
// hooks/useEnvelope.ts
export function useEnvelope(envelopeId: number) {
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchEnvelope(envelopeId)
      .then(setEnvelope)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [envelopeId]);
  
  const openEnvelope = useCallback(async () => {
    const updated = await api.openEnvelope(envelopeId);
    setEnvelope(updated);
  }, [envelopeId]);
  
  const completeEnvelope = useCallback(async () => {
    const updated = await api.completeEnvelope(envelopeId);
    setEnvelope(updated);
  }, [envelopeId]);
  
  return {
    envelope,
    loading,
    error,
    status: envelope?.status ?? 'sealed',
    openEnvelope,
    completeEnvelope,
  };
}
```

### Hook Testing

Test hooks with `@testing-library/react-hooks`:

```typescript
// __tests__/hooks/useEnvelope.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useEnvelope } from '../useEnvelope';

describe('useEnvelope', () => {
  it('fetches envelope on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useEnvelope(1)
    );
    
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.loading).toBe(false);
    expect(result.current.envelope).toBeDefined();
  });
  
  it('updates status when opened', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useEnvelope(1)
    );
    await waitForNextUpdate();
    
    await act(async () => {
      await result.current.openEnvelope();
    });
    
    expect(result.current.status).toBe('opened');
  });
});
```

---

## Database Access

### Query Functions

Database access is wrapped in typed functions, not scattered SQL strings:

```typescript
// server/src/db/queries/envelopes.ts
import { db } from '../connection';
import { Envelope } from '@shared/types';

export async function getEnvelopeById(id: number): Promise<Envelope | null> {
  const result = await db.query<Envelope>(
    'SELECT id, type, title, subtitle, status, order_index as "orderIndex" FROM envelopes WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}

export async function updateEnvelopeStatus(
  id: number, 
  status: EnvelopeStatus
): Promise<Envelope> {
  const result = await db.query<Envelope>(
    'UPDATE envelopes SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  if (result.rows.length === 0) {
    throw new Error(`Envelope ${id} not found`);
  }
  return result.rows[0];
}
```

### Migrations

Schema changes use numbered migration files:

```
server/src/db/migrations/
├── 001_create_trivia_questions.sql
├── 002_create_app_config.sql
├── 003_create_envelopes.sql
├── 004_create_participants.sql
└── ...
```

Each migration is idempotent (can be run multiple times safely):

```sql
-- 003_create_envelopes.sql
CREATE TABLE IF NOT EXISTS envelopes (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  subtitle TEXT,
  status VARCHAR(20) DEFAULT 'sealed',
  order_index INTEGER
);
```

### Transaction Handling

Multi-step operations use transactions:

```typescript
export async function completeEnvelopeWithRecord(
  envelopeId: number,
  participantId: number
): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    await client.query(
      'INSERT INTO envelope_completions (envelope_id, participant_id) VALUES ($1, $2)',
      [envelopeId, participantId]
    );
    
    // Check if both participants have completed
    const completions = await client.query(
      'SELECT COUNT(*) FROM envelope_completions WHERE envelope_id = $1',
      [envelopeId]
    );
    
    if (parseInt(completions.rows[0].count) >= 2) {
      await client.query(
        'UPDATE envelopes SET status = $1 WHERE id = $2',
        ['completed', envelopeId]
      );
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

---

## Error Handling

### Backend Errors

Use a custom error class that maps to API responses:

```typescript
// server/src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

// Usage
throw new AppError(
  ErrorCodes.ENVELOPE_NOT_FOUND,
  `Envelope with ID ${id} not found`,
  404
);
```

### Global Error Handler

Express middleware catches all errors and formats consistently:

```typescript
// server/src/middleware/errorHandler.ts
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }
  
  // Unexpected error — log and return generic message
  console.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
  });
}
```

### Frontend Error Handling

API client wraps all calls and handles errors consistently:

```typescript
// client/src/services/api.ts
async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data: ApiResponse<T> = await response.json();
  
  if (!data.success) {
    throw new ApiError(data.error!);
  }
  
  return data.data!;
}
```

---

## SignalR Patterns

### Connection Management

Single connection instance managed via context:

```typescript
// client/src/context/SignalRContext.tsx
export function SignalRProvider({ children }: { children: React.ReactNode }) {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  
  useEffect(() => {
    const conn = new HubConnectionBuilder()
      .withUrl('/hubs/sync')
      .withAutomaticReconnect()
      .build();
    
    conn.start().then(() => setConnection(conn));
    
    return () => { conn.stop(); };
  }, []);
  
  return (
    <SignalRContext.Provider value={connection}>
      {children}
    </SignalRContext.Provider>
  );
}
```

### Message Types

Define all message types in shared types:

```typescript
// shared/types/signalr.ts
export type SignalRMessage =
  | { type: 'vote_submitted'; participantId: number; promptId: number }
  | { type: 'reveal_ready'; promptId: number }
  | { type: 'envelope_completed'; envelopeId: number }
  | { type: 'key_validated'; participantId: number }
  | { type: 'reveal_unlocked' };
```

### Hook for Subscriptions

```typescript
// client/src/hooks/useSignalREvent.ts
export function useSignalREvent<T>(
  eventName: string,
  handler: (message: T) => void
) {
  const connection = useContext(SignalRContext);
  
  useEffect(() => {
    if (!connection) return;
    
    connection.on(eventName, handler);
    return () => connection.off(eventName, handler);
  }, [connection, eventName, handler]);
}
```

---

## Design & Style

### The Rule

**All UI must reference the established style guide.** Do not invent colors, typography, spacing, or component styles ad-hoc. The style guide exists to ensure visual consistency and to avoid generic "AI-generated" aesthetics.

### Design System Documents

Before implementing any UI, consult:

- **Style Guide** — color palette, typography, spacing scale, visual principles
- **Component Specifications** — button styles, card patterns, form elements, envelope states
- **Design Context File** — the "Golden Hour Intimacy" aesthetic, emotional design goals

These documents are the source of truth. When in doubt, reference them.

### Golden Hour Intimacy Aesthetic

The app's visual identity is warm, intimate, and celebratory — not clinical, not cutesy. Key principles:

| Do | Don't |
|----|-------|
| Warm, sunrise-inspired colors | Generic pastels or harsh primaries |
| Soft, organic shapes | Sharp corners everywhere |
| Celebratory but sincere | Goofy baby clip-art |
| Generous whitespace | Cramped, dense layouts |
| Intentional motion | Gratuitous animations |

### Typography

| Usage | Font | Notes |
|-------|------|-------|
| Display / Headlines | Fraunces | Warm, slightly playful serifs |
| Body / UI | Source Sans 3 | Clean, readable, pairs well with Fraunces |

Do not introduce other fonts without updating the style guide.

### Color Usage

Colors are defined in the style guide with semantic names. Use the semantic tokens, not raw hex values:

```typescript
// ✓ Correct — uses semantic token
<Button variant="primary" />
className="bg-primary text-on-primary"

// ✗ Wrong — hardcoded color
<Button style={{ backgroundColor: '#E07A5F' }} />
className="bg-[#E07A5F]"
```

This ensures colors can be updated in one place and remain consistent.

### Component Library

Reusable UI components live in `/client/src/components/common/`:

```
common/
├── Button.tsx
├── Card.tsx
├── Modal.tsx
├── Input.tsx
├── Typography.tsx      # Heading, Body, Caption components
├── EnvelopeCard.tsx    # Sealed/opened envelope visual
├── LoadingSpinner.tsx
└── Icon.tsx
```

**Before creating a new component**, check if it exists or if an existing component can be extended. Duplicate components lead to visual drift.

### Component Styling Pattern

Components accept a `className` prop for layout concerns (margin, positioning) but handle their own visual styling internally:

```typescript
// Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;  // For layout only
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant, size = 'md', className, children, onClick }: ButtonProps) {
  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className  // Layout overrides only
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Touch Targets & Mobile

Per the feature blueprint:

- Large touch targets (minimum 44x44px)
- Minimal text density
- One-handed use considered
- Test on mobile viewport

### Animation & Motion

Motion should feel intentional and celebratory:

- **Envelope open**: satisfying reveal, not instant
- **Reveals** (votes, gender): build anticipation with timing
- **Transitions**: gentle fades, not jarring cuts
- **Loading states**: subtle, not distracting

Avoid motion for motion's sake. Every animation should serve the emotional experience.

### Visual QA Checklist

Before marking any UI work complete:

- [ ] Colors match style guide tokens
- [ ] Typography uses Fraunces/Source Sans 3 correctly
- [ ] Spacing follows the defined scale
- [ ] Touch targets meet minimum size
- [ ] Component matches existing patterns (or style guide is updated)
- [ ] Tested on mobile viewport
- [ ] Animations feel intentional, not gratuitous

---

## Summary: Non-Negotiables

1. **TypeScript strict mode** — no `any`, no implicit nulls
2. **Tests before checkpoint** — functionality isn't done until tests pass
3. **Shared types** — API contracts defined once, used everywhere
4. **Base envelope pattern** — one component, many activities
5. **Consistent API responses** — same shape for success and error
6. **Typed database queries** — no raw SQL scattered in route handlers
7. **Custom hooks for state** — components stay pure, hooks manage complexity
8. **Style guide adherence** — all UI references the design system, no ad-hoc styling

These patterns exist to prevent regressions, reduce debugging time, and maintain visual consistency. Follow them.
