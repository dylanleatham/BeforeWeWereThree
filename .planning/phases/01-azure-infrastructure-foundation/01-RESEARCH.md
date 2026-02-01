# Phase 1: Azure Infrastructure & Foundation - Research

**Researched:** 2026-02-01
**Domain:** Azure cloud infrastructure, Node.js deployment, PIN-based authentication, session management
**Confidence:** HIGH (verified against official Microsoft docs, npm registry, and project documentation)

## Summary

Phase 1 establishes the foundational Azure infrastructure and authentication system for the babymoon application. The phase encompasses five major areas: (1) Azure App Service deployment via GitHub Actions, (2) Azure Front Door for CDN/SSL/custom domain, (3) Azure Key Vault for secrets management with managed identity, (4) PostgreSQL Flexible Server with Prisma ORM, and (5) PIN-based authentication with JWT sessions and device fingerprinting for participant identification.

The standard approach uses modern, well-supported technologies: Express 5 for the backend, React 19 for the frontend, Prisma 7 for database access, and jose (not jsonwebtoken) for JWT handling. Azure Front Door Standard/Premium tier is required since Classic is being retired. Device fingerprinting uses FingerprintJS for stable participant identification across sessions.

Key decisions from CONTEXT.md constrain implementation: PIN format is MMDDYYYY (8 digits), sessions last 30 days, device fingerprint determines participant A/B assignment, and third devices get read-only mode. The authentication flow must feel warm and intimate, not corporate.

**Primary recommendation:** Build infrastructure incrementally with deployment verification at each step. Use OpenID Connect (OIDC) for GitHub Actions authentication to Azure (not publish profiles). Store all secrets in Key Vault from day one. Mark all slot-specific settings correctly to prevent swap disasters.

## Standard Stack

### Core Infrastructure

| Library/Service | Version | Purpose | Why Standard |
|-----------------|---------|---------|--------------|
| Azure App Service | Node.js 22 LTS | Application hosting | Stable LTS, Azure native support, managed identity enabled |
| Azure Front Door | Standard/Premium | CDN, SSL, custom domain | Classic retiring March 2027, managed certs, WAF available |
| Azure Key Vault | Standard | Secrets management | Azure-native, managed identity access, audit trail |
| Azure PostgreSQL | Flexible Server | Primary database | Built-in PgBouncer, managed identity auth available |

### Backend

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express | ^5.1.x | Web framework | Native async error handling, latest stable |
| Prisma | ^7.2.x | ORM | TypeScript-first, excellent migrations, Azure PostgreSQL support |
| jose | ^5.x | JWT handling | Modern ESM, TypeScript native, no dependencies, actively maintained |
| zod | ^3.24.x | Validation | TypeScript-first, shared schemas, runtime validation |
| helmet | ^8.x | Security headers | 15 security headers by default |
| express-rate-limit | ^7.x | Rate limiting | Brute force protection for PIN endpoint |

### Frontend (Minimal for Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.x | UI framework | Stable, compiler optimizations |
| Vite | ^6.4.x | Build tool | Fast builds, TypeScript native |
| @fingerprintjs/fingerprintjs | ^4.x | Device fingerprinting | Most accurate open-source option, MIT licensed |

### DevOps

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| GitHub Actions | N/A | CI/CD | Native Azure integration, OIDC auth |
| azure/webapps-deploy | v3 | Deployment action | Official Microsoft action |
| azure/login | v2 | Azure auth | OIDC support, no secrets stored |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jose | jsonwebtoken | jsonwebtoken is callback-based, less maintained, no ESM |
| FingerprintJS | ThumbmarkJS | ThumbmarkJS newer but FingerprintJS more battle-tested |
| Prisma | Drizzle | Drizzle is lighter but Prisma migrations are superior |
| express-rate-limit | express-brute | express-brute has known bypass vulnerability |

**Installation:**

```bash
# Backend dependencies
npm install express@^5.1 @prisma/client@^7.2 jose@^5 zod@^3.24 helmet@^8 cors@^2.8 express-rate-limit@^7 cookie-parser@^1.4

# Frontend dependencies
npm install react@^19.2 react-dom@^19.2 @fingerprintjs/fingerprintjs@^4

# Dev dependencies
npm install -D typescript@^5.8 prisma@^7.2 vite@^6.4 @types/express@^5 @types/node@^22
```

## Architecture Patterns

### Recommended Project Structure (Phase 1)

```
/
├── client/                    # React frontend
│   └── src/
│       ├── components/
│       │   └── auth/          # PinEntry, SessionProvider
│       ├── hooks/
│       │   └── useSession.ts  # Session management hook
│       └── services/
│           └── api.ts         # API client
│
├── server/                    # Express backend
│   └── src/
│       ├── routes/
│       │   ├── auth.ts        # PIN validation, session endpoints
│       │   └── health.ts      # Health check endpoint
│       ├── services/
│       │   ├── auth.ts        # PIN validation logic
│       │   └── session.ts     # JWT creation/validation
│       ├── db/
│       │   ├── queries/
│       │   │   └── config.ts  # App config queries (PINs)
│       │   └── migrations/    # Prisma migrations
│       └── middleware/
│           ├── auth.ts        # JWT validation middleware
│           └── rateLimit.ts   # Rate limiting for auth
│
├── shared/                    # Shared types
│   └── types/
│       ├── api.ts             # ApiResponse<T>, ApiError
│       └── auth.ts            # Session, Participant types
│
├── prisma/
│   └── schema.prisma          # Database schema
│
└── .github/
    └── workflows/
        └── deploy.yml         # GitHub Actions deployment
```

### Pattern 1: OIDC Authentication for GitHub Actions

**What:** Use OpenID Connect to authenticate GitHub Actions to Azure, eliminating stored credentials.

**When to use:** All GitHub Actions deployments to Azure.

**Example:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure

on:
  push:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Build
        run: |
          npm ci
          npm run build

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: bwwt-app
          package: ./dist
```

**Source:** [GitHub Docs - Deploying Node.js to Azure App Service](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/nodejs-to-azure-app-service)

### Pattern 2: Key Vault References in App Service

**What:** App Service reads secrets from Key Vault using managed identity, without storing secrets in configuration.

**When to use:** All secrets (database connection strings, API keys, JWT secrets).

**Example:**

```bash
# App Service configuration setting
DATABASE_URL=@Microsoft.KeyVault(VaultName=bwwt-kv;SecretName=postgresql-connection-string)
JWT_SECRET=@Microsoft.KeyVault(VaultName=bwwt-kv;SecretName=jwt-secret)
```

**Required Azure CLI setup:**

```bash
# Enable system-assigned managed identity on App Service
az webapp identity assign --name bwwt-app --resource-group bwwt-rg

# Grant Key Vault Secrets User role to the managed identity
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <managed-identity-principal-id> \
  --scope /subscriptions/<sub>/resourceGroups/bwwt-rg/providers/Microsoft.KeyVault/vaults/bwwt-kv
```

**Source:** [Microsoft Learn - Use Key Vault References as App Settings](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references)

### Pattern 3: JWT Session with HttpOnly Cookies

**What:** Issue JWT tokens stored in HttpOnly Secure cookies for session persistence.

**When to use:** All authenticated requests after PIN validation.

**Example:**

```typescript
// server/src/services/session.ts
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface SessionPayload {
  participantId: string;
  role: 'guest' | 'admin';
  deviceFingerprint: string;
  iat: number;
  exp: number;
}

export async function createSession(
  participantId: string,
  role: 'guest' | 'admin',
  deviceFingerprint: string
): Promise<string> {
  const token = await new SignJWT({ participantId, role, deviceFingerprint })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')  // Per CONTEXT.md: 30-day sessions
    .sign(secret);

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as SessionPayload;
}
```

```typescript
// server/src/routes/auth.ts
import { Router } from 'express';
import { createSession } from '../services/session';

const router = Router();

router.post('/validate-pin', async (req, res) => {
  const { pin, deviceFingerprint } = req.body;

  // Validate PIN format (MMDDYYYY)
  if (!/^\d{8}$/.test(pin)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PIN_FORMAT', message: 'PIN must be 8 digits' }
    });
  }

  // Check against stored PINs
  const role = await validatePinAndGetRole(pin);
  if (!role) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_PIN', message: "Hmm, that's not it. Try again?" }
    });
  }

  // Determine participant identity based on fingerprint
  const participantId = await getOrCreateParticipant(deviceFingerprint, role);

  const token = await createSession(participantId, role, deviceFingerprint);

  res.cookie('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days
  });

  return res.json({
    success: true,
    data: { role, participantId }
  });
});
```

**Source:** [jose npm package](https://www.npmjs.com/package/jose), [Medium - Jose vs Jsonwebtoken](https://joodi.medium.com/jose-vs-jsonwebtoken-why-you-should-switch-4f50dfa3554c)

### Pattern 4: Device Fingerprinting for Participant Identity

**What:** Generate stable device fingerprint to identify participant A vs B across sessions.

**When to use:** On PIN entry, to determine which participant is which.

**Example:**

```typescript
// client/src/services/fingerprint.ts
import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedFingerprint: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint;

  const fp = await FingerprintJS.load();
  const result = await fp.get();
  cachedFingerprint = result.visitorId;

  return cachedFingerprint;
}
```

```typescript
// server/src/services/participant.ts
export async function getOrCreateParticipant(
  deviceFingerprint: string,
  role: 'guest' | 'admin'
): Promise<string> {
  // Admin mode doesn't need participant distinction
  if (role === 'admin') {
    return 'admin';
  }

  // Check if this fingerprint already has a participant assignment
  const existing = await db.participant.findUnique({
    where: { deviceFingerprint }
  });

  if (existing) {
    return existing.id;
  }

  // Count existing guest participants
  const participantCount = await db.participant.count({
    where: { role: 'guest' }
  });

  // Third device gets read-only (per CONTEXT.md)
  if (participantCount >= 2) {
    return 'readonly';
  }

  // Create new participant (A or B)
  const participant = await db.participant.create({
    data: {
      deviceFingerprint,
      role: 'guest',
      designation: participantCount === 0 ? 'A' : 'B'
    }
  });

  return participant.id;
}
```

**Source:** [FingerprintJS GitHub](https://github.com/fingerprintjs/fingerprintjs)

### Pattern 5: Rate Limiting for PIN Endpoint

**What:** Prevent brute force attacks on PIN authentication.

**When to use:** PIN validation endpoint.

**Example:**

```typescript
// server/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

// Strict limit for PIN validation
export const pinRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Please wait 15 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + fingerprint if available
    const fingerprint = req.body?.deviceFingerprint || '';
    return `${req.ip}:${fingerprint}`;
  }
});

// Usage in routes
router.post('/validate-pin', pinRateLimiter, validatePinHandler);
```

**Source:** [MDN Blog - Securing APIs: Express rate limit](https://developer.mozilla.org/en-US/blog/securing-apis-express-rate-limit-and-slow-down/)

### Anti-Patterns to Avoid

- **Storing secrets in App Service config directly:** Always use Key Vault references
- **Using jsonwebtoken over jose:** jose is modern, TypeScript-native, actively maintained
- **Using publish profile for GitHub Actions:** Use OIDC for better security
- **Hardcoding PIN format:** Validate against Zod schema for flexibility
- **Trusting client-provided participant ID:** Always derive from server-side fingerprint lookup
- **Rate limiting by IP only:** Use IP + fingerprint to prevent shared network issues

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification | Custom crypto | jose library | Crypto is hard, jose handles all edge cases |
| Device fingerprinting | Custom canvas/audio hashing | FingerprintJS | Browser compatibility, stability across updates |
| Rate limiting | Custom counter with timestamp | express-rate-limit | Memory management, distributed support |
| Security headers | Manual header setting | helmet middleware | 15+ headers, kept up to date |
| Request validation | Manual if/else checks | Zod schemas | Type inference, composable, shared with client |
| Password hashing | bcrypt for PINs | Plain comparison (PINs are not passwords) | PINs are short; rate limiting is the protection |

**Key insight:** For authentication, the security comes from rate limiting brute force attempts, not from hashing 8-digit PINs. An 8-digit PIN has only 100 million combinations - without rate limiting, it's crackable in minutes. With rate limiting (5 attempts/15 minutes), it takes years.

## Common Pitfalls

### Pitfall 1: Key Vault Secret Caching (24 hours)

**What goes wrong:** You rotate a secret in Key Vault, restart App Service, but the app still uses the old secret. Azure caches Key Vault references for up to 24 hours.

**Why it happens:** Azure caches for performance and availability. A restart doesn't clear the cache.

**How to avoid:**
1. Use Stop + Start (not Restart) to clear cache more reliably
2. Use versioned secret references: `@Microsoft.KeyVault(SecretUri=https://vault.vault.azure.net/secrets/secret/VERSION)`
3. Plan rotation procedures knowing there's a delay

**Warning signs:** App still works after you deleted/changed a secret; "secret not found" errors appearing intermittently.

**Source:** [Microsoft Learn - Key Vault References](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references)

### Pitfall 2: Deployment Slot Swaps Don't Preserve All Settings

**What goes wrong:** Swap staging to production, and staging secrets end up in production, pointing to wrong database.

**Why it happens:** By default, most settings swap with the code. "Deployment slot setting" checkbox must be explicitly set.

**How to avoid:**
1. Mark ALL secrets as "Deployment slot setting" in BOTH slots
2. Use Key Vault references (the reference itself is slot-specific)
3. Use "Swap with Preview" to validate before completing
4. Document which settings are sticky

**Warning signs:** Different setting counts between slots; settings not marked as slot-specific.

**Source:** [Microsoft Learn - App Service Deployment Slots](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)

### Pitfall 3: Front Door Classic is Retiring

**What goes wrong:** You provision Front Door Classic, which is retiring March 31, 2027. Managed certificates for Classic stop working August 2025.

**Why it happens:** Following outdated tutorials or using Azure portal defaults.

**How to avoid:**
1. Always use Front Door Standard or Premium tier
2. Verify tier during provisioning
3. For apex domains, use BYOC (managed certs don't support apex)

**Warning signs:** "Classic" appears in resource name or configuration.

**Source:** [Microsoft Learn - Configure HTTPS for Azure Front Door](https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-configure-https-custom-domain)

### Pitfall 4: PostgreSQL Burstable Tier Causes Production Issues

**What goes wrong:** Development works fine on B1/B2, then production is erratic. CPU credits run out, queries slow 100x.

**Why it happens:** Burstable SKUs accumulate credits when idle, burn them when busy. Once exhausted, throttled to baseline.

**How to avoid:**
1. Use General Purpose (D-series) for production, Burstable for dev only
2. Enable PgBouncer (built-in connection pooler)
3. Monitor CPU credits in Azure Portal

**Warning signs:** "It was fast this morning but slow now"; sawtooth CPU utilization graph.

**Source:** [Microsoft Learn - PostgreSQL Flexible Server Troubleshooting](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-troubleshooting-guides)

### Pitfall 5: Browser Fingerprinting Instability

**What goes wrong:** Same device gets different fingerprints after browser update, incognito mode, or privacy settings change. User becomes "third device" unexpectedly.

**Why it happens:** Browsers increasingly randomize fingerprinting surfaces. Safari ITP and Firefox fingerprinting protection limit accuracy.

**How to avoid:**
1. Accept that fingerprinting is probabilistic, not deterministic
2. Provide admin override to reset participant assignments
3. Consider falling back to cookies as secondary identifier
4. Store fingerprint in session - don't recalculate on every request

**Warning signs:** User reports being locked out or assigned wrong participant role.

## Code Examples

### Complete Prisma Schema (Phase 1)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model AppConfig {
  key   String @id
  value String

  @@map("app_config")
}

model Participant {
  id                String   @id @default(uuid())
  deviceFingerprint String   @unique @map("device_fingerprint")
  designation       String   // 'A', 'B', or 'readonly'
  role              String   // 'guest' or 'admin'
  createdAt         DateTime @default(now()) @map("created_at")

  @@map("participants")
}
```

### Express App Setup with All Middleware

```typescript
// server/src/index.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://beforewewerethree.com',
  credentials: true
}));

// Parsing middleware
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/health', healthRouter);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Zod Validation Schemas

```typescript
// shared/types/auth.ts
import { z } from 'zod';

// PIN must be MMDDYYYY format
export const pinSchema = z.string()
  .length(8, 'PIN must be exactly 8 digits')
  .regex(/^\d{8}$/, 'PIN must contain only digits')
  .refine(
    (pin) => {
      const month = parseInt(pin.slice(0, 2));
      const day = parseInt(pin.slice(2, 4));
      return month >= 1 && month <= 12 && day >= 1 && day <= 31;
    },
    'PIN must be a valid date in MMDDYYYY format'
  );

export const validatePinRequestSchema = z.object({
  pin: pinSchema,
  deviceFingerprint: z.string().min(1, 'Device fingerprint required')
});

export type ValidatePinRequest = z.infer<typeof validatePinRequestSchema>;
```

### Health Check Endpoint

```typescript
// server/src/routes/health.ts
import { Router } from 'express';
import { db } from '../db/connection';

const router = Router();

router.get('/', async (req, res) => {
  try {
    // Verify database connection
    await db.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection failed'
      }
    });
  }
});

export { router as healthRouter };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jsonwebtoken | jose | 2024 | Better TypeScript support, ESM, no dependencies |
| Express 4 | Express 5 | March 2025 | Native async error handling |
| Node.js 18 | Node.js 22 | Feb 2025 | Azure LTS support, performance improvements |
| Front Door Classic | Front Door Standard/Premium | Aug 2025 (Classic sunset) | Managed certs, modern features |
| Publish profile auth | OIDC auth | 2024 | No stored credentials, better security |
| Prisma 5/6 | Prisma 7 | Dec 2025 | TypeScript-based engine, faster cold starts |

**Deprecated/outdated:**
- Azure Front Door Classic: Retiring March 2027, managed certs already deprecated
- Node.js 18: EOL April 2025, Azure SDK dropping support July 2025
- jsonwebtoken: Still works but callback-based, maintenance mode
- express-brute: Known rate limiting bypass vulnerability

## Open Questions

1. **DNS Provider Integration**
   - What we know: Porkbun is the DNS provider (per technical patterns doc)
   - What's unclear: Exact CNAME/TXT records needed for Front Door domain verification
   - Recommendation: Document exact DNS configuration during implementation; Front Door provides verification records

2. **Fingerprint Stability Across Browsers**
   - What we know: FingerprintJS is most stable open-source option
   - What's unclear: Exact collision rate for this user population (2 users, multiple devices)
   - Recommendation: Implement admin reset capability for participant assignments; monitor for issues

3. **Session Token Rotation Strategy**
   - What we know: 30-day sessions per CONTEXT.md
   - What's unclear: Whether to implement sliding expiration or fixed expiration
   - Recommendation: Use fixed 30-day expiration initially; add sliding if needed

## Sources

### Primary (HIGH confidence)

- [Microsoft Learn - Deploy by Using GitHub Actions](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions) - GitHub Actions deployment patterns
- [Microsoft Learn - Key Vault References in App Service](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references) - Managed identity and secret access
- [Microsoft Learn - Configure HTTPS for Azure Front Door](https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/how-to-configure-https-custom-domain) - SSL/TLS and custom domains
- [Microsoft Learn - App Service Deployment Slots](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots) - Slot configuration and swaps
- [Azure GitHub - Node 22 Support](https://azure.github.io/AppService/2025/02/18/Node-22.html) - Node.js 22 LTS availability
- [jose npm](https://www.npmjs.com/package/jose) - JWT library documentation
- [FingerprintJS GitHub](https://github.com/fingerprintjs/fingerprintjs) - Device fingerprinting library
- [MDN Blog - Express Rate Limiting](https://developer.mozilla.org/en-US/blog/securing-apis-express-rate-limit-and-slow-down/) - Rate limiting best practices

### Secondary (MEDIUM confidence)

- [GitHub Docs - Deploying Node.js to Azure](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/nodejs-to-azure-app-service) - OIDC authentication setup
- [Medium - Jose vs Jsonwebtoken](https://joodi.medium.com/jose-vs-jsonwebtoken-why-you-should-switch-4f50dfa3554c) - Library comparison
- [DEV Community - Prisma Azure Managed Identities](https://dev.to/magpys/how-to-connect-to-an-azure-hosted-managed-identities-postgres-server-from-a-node-app-using-the-4lpb) - Prisma PostgreSQL connection patterns

### Project Documentation (HIGH confidence - existing patterns)

- `.planning/research/STACK.md` - Technology stack decisions
- `.planning/research/ARCHITECTURE.md` - Architecture patterns
- `.planning/research/PITFALLS.md` - Domain-specific pitfalls
- `docs/bwwt_technical_patterns.md` - Technical standards
- `docs/babymoon_build_order.md` - Build sequence

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified against npm registry, official docs, and project research
- Architecture patterns: HIGH - Based on official Microsoft documentation and established patterns
- Pitfalls: HIGH - Documented in official troubleshooting guides and project PITFALLS.md
- Authentication flow: MEDIUM - Implementation details at Claude's discretion per CONTEXT.md

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable technologies, low rate of change)
