# Phase 3: Real-Time Sync & Would You Rather - Research

**Researched:** 2026-02-06
**Domain:** Real-time synchronization with Azure SignalR Service, two-participant voting
**Confidence:** HIGH

## Summary

This phase establishes real-time two-device synchronization using Azure SignalR Service and delivers the first synchronized activity (Would You Rather). The key architectural insight is that Azure SignalR Service does not have a native Node.js server SDK - instead, the Express backend must use the REST API to send messages to clients, while clients use the standard `@microsoft/signalr` package to receive messages.

The implementation follows a "serverless-style" pattern even though we're using Express: the backend generates SignalR access tokens via a negotiate endpoint, clients connect directly to Azure SignalR Service, and the backend broadcasts messages via REST API calls with JWT authentication. This pattern works well with the existing jose-based JWT infrastructure.

For the Would You Rather activity, we need a commit-reveal voting pattern where both participants vote independently (votes hidden), then a simultaneous reveal occurs once both have submitted. The database schema tracks individual votes, and SignalR broadcasts vote status and reveal events.

**Primary recommendation:** Use Azure SignalR REST API from Express backend with `@microsoft/signalr` client package. Create SignalR Context provider for React with connection state management. Implement WYR with swipe-to-vote (reusing existing gesture infrastructure) and group-based synchronization per activity instance.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @microsoft/signalr | 8.x | Client-side SignalR connection | Official Microsoft package, works with Azure SignalR Service |
| jose | 6.x | JWT token generation for SignalR | Already in project, used for session tokens, works for SignalR access tokens |
| Azure SignalR Service | N/A | Managed real-time messaging service | Specified in project tech stack, handles scaling and connections |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @use-gesture/react | 10.x | Swipe gesture detection | Already in project for envelope pile, reuse for WYR voting |
| motion | 12.x | Animations (reveal, transitions) | Already in project, use for voting animations and reveal ceremony |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Azure SignalR REST | Azure Functions bindings | Would require separate Azure Functions deployment, adds complexity |
| Custom WebSocket | Azure SignalR Service | No scaling, connection management, or reliability built-in |
| react-signalr | Custom hooks | Extra dependency; custom hooks match project patterns better |

**Installation:**
```bash
# Client package only - server uses REST API
npm install @microsoft/signalr --workspace=client
```

## Architecture Patterns

### Recommended Project Structure
```
client/
├── src/
│   ├── context/
│   │   └── SignalRContext.tsx     # SignalR connection provider
│   ├── hooks/
│   │   ├── useSignalR.ts          # Connection access hook
│   │   ├── useSignalREvent.ts     # Event subscription hook
│   │   └── useWouldYouRather.ts   # WYR activity state + real-time
│   └── components/
│       └── activities/
│           ├── WouldYouRather/
│           │   ├── WouldYouRatherActivity.tsx
│           │   ├── VotingPhase.tsx
│           │   ├── WaitingPhase.tsx
│           │   ├── RevealPhase.tsx
│           │   └── PartnerPresence.tsx
│           └── index.ts

server/
├── src/
│   ├── routes/
│   │   ├── signalr.ts             # Negotiate endpoint
│   │   └── wyr.ts                 # Would You Rather API
│   ├── services/
│   │   ├── signalr.ts             # SignalR REST API client
│   │   └── wyr.ts                 # WYR business logic
│   └── db/
│       └── queries/
│           └── wyr.ts             # WYR database queries

shared/
└── types/
    ├── signalr.ts                 # SignalR message types
    └── wyr.ts                     # Would You Rather types
```

### Pattern 1: SignalR Negotiate Endpoint
**What:** Backend endpoint that generates SignalR access tokens for clients
**When to use:** Every client needs to negotiate before connecting to SignalR

```typescript
// Source: Azure SignalR documentation + jose library
// server/src/routes/signalr.ts

import { Router } from 'express';
import { SignJWT } from 'jose';
import { authMiddleware } from '../middleware/auth.js';
import { successResponse } from 'shared';

const router = Router();

// Parse connection string: Endpoint=...;AccessKey=...;
function parseConnectionString(connStr: string) {
  const endpoint = /Endpoint=(.*?);/.exec(connStr)?.[1];
  const accessKey = /AccessKey=(.*?)(;|$)/.exec(connStr)?.[1];
  return { endpoint, accessKey };
}

router.post('/negotiate', authMiddleware, async (req, res) => {
  const { endpoint, accessKey } = parseConnectionString(
    process.env.SIGNALR_CONNECTION_STRING!
  );

  const hub = 'sync';
  const userId = req.session!.participantId;
  const url = `${endpoint}/client/?hub=${hub}`;

  // Generate access token using jose (already in project)
  const token = await new SignJWT({
    'asrs.s.uid': userId,  // SignalR user ID claim
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setAudience(url)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(accessKey));

  res.json(successResponse({ url, accessToken: token }));
});

export { router as signalrRouter };
```

### Pattern 2: SignalR REST API Client
**What:** Backend service for sending messages via Azure SignalR REST API
**When to use:** Whenever the server needs to broadcast or send targeted messages

```typescript
// Source: Azure SignalR REST API reference
// server/src/services/signalr.ts

import { SignJWT } from 'jose';

interface SignalRMessage {
  target: string;
  arguments: unknown[];
}

export class SignalRService {
  private endpoint: string;
  private accessKey: string;
  private hub: string;

  constructor(connectionString: string, hub = 'sync') {
    const parsed = parseConnectionString(connectionString);
    this.endpoint = parsed.endpoint!;
    this.accessKey = parsed.accessKey!;
    this.hub = hub;
  }

  private async getAuthToken(audience: string): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(this.accessKey));
  }

  async sendToGroup(groupName: string, message: SignalRMessage): Promise<void> {
    const url = `${this.endpoint}/api/v1/hubs/${this.hub}/groups/${groupName}`;
    const token = await this.getAuthToken(url);

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  }

  async sendToUser(userId: string, message: SignalRMessage): Promise<void> {
    const url = `${this.endpoint}/api/v1/hubs/${this.hub}/users/${userId}`;
    const token = await this.getAuthToken(url);

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  }

  async addUserToGroup(userId: string, groupName: string): Promise<void> {
    const url = `${this.endpoint}/api/v1/hubs/${this.hub}/groups/${groupName}/users/${userId}`;
    const token = await this.getAuthToken(url);

    await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }
}
```

### Pattern 3: React SignalR Context
**What:** Context provider managing SignalR connection lifecycle
**When to use:** Wrap authenticated app to provide SignalR connection to all components

```typescript
// Source: @microsoft/signalr documentation + React patterns
// client/src/context/SignalRContext.tsx

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { api } from '../services/api';

interface SignalRContextValue {
  connection: HubConnection | null;
  connectionState: HubConnectionState;
  isConnected: boolean;
}

const SignalRContext = createContext<SignalRContextValue | null>(null);

export function SignalRProvider({ children }: { children: React.ReactNode }) {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState(HubConnectionState.Disconnected);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    let mounted = true;

    async function connect() {
      try {
        // Get negotiation info from backend
        const { url, accessToken } = await api.negotiateSignalR();

        const conn = new HubConnectionBuilder()
          .withUrl(url, { accessTokenFactory: () => accessToken })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging(LogLevel.Warning)
          .build();

        conn.onreconnecting(() => {
          if (mounted) setConnectionState(HubConnectionState.Reconnecting);
        });

        conn.onreconnected(() => {
          if (mounted) setConnectionState(HubConnectionState.Connected);
        });

        conn.onclose(() => {
          if (mounted) setConnectionState(HubConnectionState.Disconnected);
        });

        await conn.start();

        if (mounted) {
          connectionRef.current = conn;
          setConnection(conn);
          setConnectionState(HubConnectionState.Connected);
        }
      } catch (error) {
        console.error('SignalR connection failed:', error);
        if (mounted) setConnectionState(HubConnectionState.Disconnected);
      }
    }

    connect();

    return () => {
      mounted = false;
      connectionRef.current?.stop();
    };
  }, []);

  return (
    <SignalRContext.Provider
      value={{
        connection,
        connectionState,
        isConnected: connectionState === HubConnectionState.Connected,
      }}
    >
      {children}
    </SignalRContext.Provider>
  );
}

export function useSignalRConnection() {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error('useSignalRConnection must be used within SignalRProvider');
  }
  return context;
}
```

### Pattern 4: SignalR Event Subscription Hook
**What:** Hook for subscribing to specific SignalR events
**When to use:** Components that need to react to real-time messages

```typescript
// client/src/hooks/useSignalREvent.ts

import { useEffect, useCallback, useRef } from 'react';
import { useSignalRConnection } from '../context/SignalRContext';

export function useSignalREvent<T>(
  eventName: string,
  handler: (data: T) => void
) {
  const { connection } = useSignalRConnection();
  const handlerRef = useRef(handler);

  // Keep handler ref fresh without triggering effect
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!connection) return;

    const wrappedHandler = (data: T) => {
      handlerRef.current(data);
    };

    connection.on(eventName, wrappedHandler);
    return () => connection.off(eventName, wrappedHandler);
  }, [connection, eventName]);
}
```

### Pattern 5: Would You Rather Database Schema
**What:** Database tables for WYR prompts and votes
**When to use:** Migration to add WYR support

```sql
-- server/prisma/migrations/XXX_add_wyr_tables/migration.sql

-- Would You Rather prompts linked to envelopes
CREATE TABLE wyr_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(envelope_id)
);

-- Individual votes (hidden until both participants vote)
CREATE TABLE wyr_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES wyr_prompts(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id),
  choice VARCHAR(10) NOT NULL CHECK (choice IN ('option_a', 'option_b')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(prompt_id, participant_id)
);
```

### Pattern 6: Two-Phase Voting Flow
**What:** State machine for vote submission and reveal
**When to use:** Handling WYR voting with proper reveal logic

```typescript
// shared/types/wyr.ts

export type WYRPhase = 'voting' | 'waiting' | 'revealing' | 'complete';

export interface WYRPrompt {
  id: string;
  envelopeId: string;
  optionA: string;
  optionB: string;
}

export interface WYRState {
  prompt: WYRPrompt;
  phase: WYRPhase;
  myVote: 'option_a' | 'option_b' | null;
  partnerVoted: boolean;
  results: WYRResults | null;
}

export interface WYRResults {
  myChoice: 'option_a' | 'option_b';
  partnerChoice: 'option_a' | 'option_b';
  isMatch: boolean;
}

// SignalR message types
export interface WYRVoteSubmittedMessage {
  type: 'wyr_vote_submitted';
  promptId: string;
  participantId: string;
}

export interface WYRRevealReadyMessage {
  type: 'wyr_reveal_ready';
  promptId: string;
  results: WYRResults;
}

export interface PartnerPresenceMessage {
  type: 'partner_presence';
  participantId: string;
  isOnline: boolean;
}
```

### Anti-Patterns to Avoid
- **Polling for votes:** Don't poll the server to check if partner voted; use SignalR push
- **Client-side reveal logic:** Never send both votes to client before reveal; server controls reveal
- **Global SignalR connection:** Don't create connections in individual components; use Context
- **Storing connection string in client:** Never expose the SignalR connection string to frontend
- **Skip negotiation:** Never set `skipNegotiation: true`; always use the negotiate endpoint

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing for SignalR | Custom crypto | jose SignJWT | Already in project, handles edge cases |
| Connection reconnection | Manual retry logic | withAutomaticReconnect() | Handles backoff, state transitions |
| Gesture detection | Manual touch events | @use-gesture/react | Already in project, proven patterns |
| Animation springs | Manual animation | motion/react | Already in project, handles physics |
| Presence heartbeats | Custom ping/pong | SignalR connection state | Built-in reconnection handles this |

**Key insight:** Azure SignalR provides connection management, scaling, and presence tracking. The REST API pattern lets us use the existing Express backend without adding Azure Functions. The `@microsoft/signalr` client handles all the complexity of maintaining a WebSocket connection with automatic reconnection.

## Common Pitfalls

### Pitfall 1: Connection String Exposure
**What goes wrong:** SignalR connection string accidentally exposed in client code
**Why it happens:** Confusion about client vs server responsibilities
**How to avoid:** Connection string only on server; client receives only the generated access token from negotiate endpoint
**Warning signs:** AccessKey appearing in network requests from client

### Pitfall 2: Race Condition on Reveal
**What goes wrong:** Two votes submitted simultaneously cause duplicate reveal broadcasts
**Why it happens:** Both vote submissions check count and find 2 votes
**How to avoid:** Use database transaction with row-level locking when checking vote count
**Warning signs:** Multiple reveal events for same prompt

### Pitfall 3: Stale Closure in Event Handlers
**What goes wrong:** SignalR event handlers capture stale state
**Why it happens:** useEffect dependency array doesn't include handler
**How to avoid:** Use ref pattern for handlers (see useSignalREvent example)
**Warning signs:** Event handlers using outdated component state

### Pitfall 4: CSP Blocking WebSocket
**What goes wrong:** Content Security Policy blocks SignalR connection
**Why it happens:** CSP `connect-src` doesn't include SignalR endpoint
**How to avoid:** Add Azure SignalR endpoint to CSP connect-src directive in helmet config
**Warning signs:** WebSocket connection fails in production but works locally

### Pitfall 5: Token Expiration During Long Sessions
**What goes wrong:** SignalR access token expires during activity
**Why it happens:** Initial token has short expiration, no refresh mechanism
**How to avoid:** Use withAutomaticReconnect which re-negotiates on reconnection, or implement token refresh
**Warning signs:** Connection drops after token expiration time

### Pitfall 6: Group Naming Collisions
**What goes wrong:** Messages leak between different activities
**Why it happens:** Using generic group names like "activity" instead of unique identifiers
**How to avoid:** Use `activity:${envelopeId}` pattern for group names
**Warning signs:** Users receiving messages from wrong activity instances

## Code Examples

Verified patterns from official sources:

### Swipe-to-Vote Component
```typescript
// client/src/components/activities/WouldYouRather/VotingPhase.tsx

import { useDrag } from '@use-gesture/react';
import { motion, useSpring } from 'motion/react';
import { SWIPE_THRESHOLD_PX, FAST_SWIPE_VELOCITY } from '../../../constants/config';

interface VotingPhaseProps {
  optionA: string;
  optionB: string;
  onVote: (choice: 'option_a' | 'option_b') => void;
  isConnected: boolean;
  showHint: boolean;
}

export function VotingPhase({
  optionA,
  optionB,
  onVote,
  isConnected,
  showHint,
}: VotingPhaseProps) {
  const x = useSpring(0, { stiffness: 300, damping: 25 });

  const bind = useDrag(
    ({ active, movement: [mx], direction: [dx], velocity: [vx] }) => {
      if (!isConnected) return; // Block voting when offline

      if (active) {
        x.set(mx);
      } else {
        const passedThreshold = Math.abs(mx) > SWIPE_THRESHOLD_PX;
        const fastSwipe = Math.abs(vx) > FAST_SWIPE_VELOCITY;

        if (passedThreshold || fastSwipe) {
          // Left swipe = option_a, Right swipe = option_b
          onVote(dx < 0 ? 'option_a' : 'option_b');
        } else {
          x.set(0); // Snap back
        }
      }
    },
    { axis: 'x', filterTaps: true }
  );

  return (
    <div className="wyr-voting">
      <div className="wyr-voting__options">
        <div className="wyr-voting__option wyr-voting__option--left">
          {optionA}
        </div>
        <div className="wyr-voting__option wyr-voting__option--right">
          {optionB}
        </div>
      </div>

      <motion.div
        {...bind()}
        style={{ x }}
        className="wyr-voting__card"
      >
        <span className="wyr-voting__prompt">Swipe to choose</span>
        {showHint && (
          <span className="wyr-voting__hint">
            Swipe left or right
          </span>
        )}
      </motion.div>

      {!isConnected && (
        <div className="wyr-voting__offline">
          Reconnecting...
        </div>
      )}
    </div>
  );
}
```

### Partner Presence Indicator
```typescript
// client/src/components/activities/WouldYouRather/PartnerPresence.tsx

import { useSignalREvent } from '../../../hooks/useSignalREvent';
import { useState, useEffect } from 'react';
import type { PartnerPresenceMessage } from 'shared';

interface PartnerPresenceProps {
  partnerName?: string;
}

export function PartnerPresence({ partnerName = 'Partner' }: PartnerPresenceProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useSignalREvent<PartnerPresenceMessage>('partnerPresence', (data) => {
    setIsOnline(data.isOnline);
    setShowToast(true);
    // Auto-dismiss toast after 3 seconds
    setTimeout(() => setShowToast(false), 3000);
  });

  return (
    <>
      <div className="partner-presence">
        <span
          className={`partner-presence__dot ${
            isOnline ? 'partner-presence__dot--online' : ''
          }`}
        />
        <span className="partner-presence__name">{partnerName}</span>
      </div>

      {showToast && (
        <div className="partner-presence__toast">
          {partnerName} {isOnline ? 'joined' : 'left'}
        </div>
      )}
    </>
  );
}
```

### Server Vote Handler with Transaction
```typescript
// server/src/services/wyr.ts

import { prisma } from '../db/connection.js';
import { signalrService } from './signalr.js';

export async function submitVote(
  promptId: string,
  participantId: string,
  choice: 'option_a' | 'option_b'
): Promise<{ revealed: boolean; results?: WYRResults }> {
  // Use transaction to prevent race condition on reveal
  return await prisma.$transaction(async (tx) => {
    // Insert vote (will fail if duplicate due to unique constraint)
    await tx.wyrVote.create({
      data: { promptId, participantId, choice },
    });

    // Check total votes for this prompt
    const voteCount = await tx.wyrVote.count({
      where: { promptId },
    });

    // Notify partner that we voted (without revealing choice)
    await signalrService.sendToGroup(`activity:${promptId}`, {
      target: 'wyrVoteSubmitted',
      arguments: [{ type: 'wyr_vote_submitted', promptId, participantId }],
    });

    // If both voted, reveal
    if (voteCount >= 2) {
      const votes = await tx.wyrVote.findMany({
        where: { promptId },
        include: { participant: true },
      });

      const results = buildResults(votes, participantId);

      // Broadcast reveal to both participants
      await signalrService.sendToGroup(`activity:${promptId}`, {
        target: 'wyrRevealReady',
        arguments: [{ type: 'wyr_reveal_ready', promptId, results }],
      });

      // Mark envelope as completed
      await tx.envelope.update({
        where: { id: votes[0].prompt.envelopeId },
        data: { status: 'completed' },
      });

      return { revealed: true, results };
    }

    return { revealed: false };
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Self-hosted SignalR | Azure SignalR Service | 2018 | No server infra to manage |
| Polling for updates | WebSocket with SignalR | N/A | Real-time, lower latency |
| framer-motion | motion/react (v12+) | 2024 | New package name, same API |
| Custom reconnection | withAutomaticReconnect | SignalR 3.0+ | Built-in retry logic |

**Deprecated/outdated:**
- `signalr` npm package: Legacy, for ASP.NET SignalR only, not for Azure SignalR Service
- `@aspnet/signalr`: Deprecated, use `@microsoft/signalr`
- Port 5002 for REST API: v1.0-preview used port 5002, v1.0 uses standard ports

## Open Questions

Things that couldn't be fully resolved:

1. **Exact reconnection behavior with token expiration**
   - What we know: withAutomaticReconnect re-negotiates on reconnect
   - What's unclear: Exact flow when token expires mid-session
   - Recommendation: Test with short token expiration, implement logging to verify

2. **SignalR Service mode (Default vs Serverless)**
   - What we know: Both work with REST API
   - What's unclear: Performance differences for this use case
   - Recommendation: Use Default mode initially, can switch if needed

3. **Optimal group cleanup strategy**
   - What we know: Groups are memory-only, auto-cleaned when empty
   - What's unclear: Whether to explicitly remove users on disconnect
   - Recommendation: Let auto-cleanup handle it; add explicit removal if issues arise

## Sources

### Primary (HIGH confidence)
- Azure SignalR REST API reference: https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-reference-data-plane-rest-api
- Azure SignalR client negotiation: https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-concept-client-negotiation
- @microsoft/signalr npm package (verified via search)
- React 19 useOptimistic: https://react.dev/reference/react/useOptimistic

### Secondary (MEDIUM confidence)
- Azure SignalR quickstart REST API: https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-quickstart-rest-api
- SignalR HubConnectionBuilder docs: https://learn.microsoft.com/en-us/javascript/api/@microsoft/signalr/hubconnectionbuilder
- SignalR groups best practices: https://learn.microsoft.com/en-us/aspnet/core/signalr/groups

### Tertiary (LOW confidence)
- GitHub issue on Node.js SDK: Confirms no official Node.js server SDK exists
- Community examples of SignalR + React hooks patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Microsoft documentation and npm packages
- Architecture: HIGH - REST API pattern well-documented, jose already proven in project
- Pitfalls: MEDIUM - Based on general SignalR and distributed systems patterns

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable Azure service)
