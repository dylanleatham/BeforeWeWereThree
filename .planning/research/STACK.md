# Technology Stack

**Project:** Before We Were Three
**Researched:** 2026-02-01
**Overall Confidence:** HIGH (verified against npm registry and official documentation)

## Executive Summary

This stack is optimized for a real-time collaborative PWA deployed on Azure. The key decisions prioritize:
1. **Type safety end-to-end** with TypeScript strict mode, Zod validation, and Prisma
2. **Modern React 19** with its new compiler optimizations and server-centric patterns
3. **Lightweight state management** via Zustand + TanStack Query
4. **Azure-native real-time** using SignalR Service with the official client SDK
5. **PWA-first** with Vite + vite-plugin-pwa for offline shell support

---

## Recommended Stack

### Runtime & Build

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Node.js | 22 LTS | Server runtime | Azure App Service supports Node 22 LTS (announced Feb 2025). Node 18 EOL is April 2025. Node 22 is the stable middle LTS version. |
| TypeScript | ^5.8.x | Type system | Latest stable with strict mode. Supports `--erasableSyntaxOnly` for direct execution. TypeScript 5.8 brings performance optimizations. |
| Vite | ^6.4.x | Build tool | 20-30x faster than webpack. Native TypeScript transpilation via esbuild. Vite 6 is LTS with security patches. Vite 7 is too new for production. |

**Confidence:** HIGH - Versions verified via npm registry and official release announcements.

### Frontend Core

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| React | ^19.2.x | UI library | Stable since Dec 2024. React Compiler auto-optimizes without manual useMemo/useCallback. New hooks: `useActionState`, `useFormStatus`, `useOptimistic`. |
| React DOM | ^19.2.x | DOM rendering | Matches React version. |
| @types/react | ^19.x | TypeScript types | Match React 19 types. |
| @types/react-dom | ^19.x | TypeScript types | Match React DOM 19 types. |

**Confidence:** HIGH - React 19.2.3 is the current stable release verified on npm.

### Backend Core

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Express | ^5.1.x | Web framework | Express 5.1.0 is now the default on npm (March 2025). Native async error handling. Requires Node 18+. Express 4 is legacy. |
| @types/express | ^5.x | TypeScript types | Express 5 types. |
| tsx | ^4.x | Dev runner | Run TypeScript directly without compilation step during development. Faster iteration than ts-node. |

**Confidence:** HIGH - Express 5.1 is stable and tagged `latest` on npm.

### Database & ORM

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Prisma | ^7.2.x | ORM | TypeScript-first with generated types. Schema-first approach provides clear data modeling. Excellent PostgreSQL support. Migrations are best-in-class. |
| @prisma/client | ^7.2.x | Generated client | Auto-generated from schema. |
| @prisma/adapter-pg | ^7.x | PostgreSQL adapter | Recommended for Azure PostgreSQL Flexible Server. Better performance in serverless contexts. |
| pg | ^8.x | PostgreSQL driver | Native PostgreSQL driver required by Prisma adapter. |

**Rationale for Prisma over Drizzle:**
- **For this project:** Prisma is the better choice because:
  1. Two-person babymoon app is not edge/serverless-intensive (not using Azure Functions heavily)
  2. Prisma's migration tooling is more mature for schema evolution
  3. Better DX for developers who may not be SQL experts
  4. Prisma 7 moved to TypeScript-based engine (faster cold starts than Prisma 5/6)
- **When Drizzle would be better:** Edge deployments, serverless functions, or teams who prefer SQL-centric querying

**Confidence:** HIGH - Prisma 7.2.0 released Dec 2025, verified via GitHub releases.

### State Management

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Zustand | ^5.0.x | Client state | Minimal API, no boilerplate, no providers needed. Works seamlessly with SSR. 5.0 is stable since late 2024. |
| @tanstack/react-query | ^5.90.x | Server state | Caching, background refetch, optimistic updates. Pairs perfectly with Zustand (Zustand for UI state, TanStack Query for server state). |
| @tanstack/react-query-devtools | ^5.x | Dev tools | Visual debugging of cache state during development. |

**Confidence:** HIGH - Both verified on npm with active maintenance.

### Real-Time Synchronization

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| @microsoft/signalr | ^9.0.x | SignalR client | Official Microsoft client for Azure SignalR Service. Required for real-time two-device sync. Version 9.x aligns with ASP.NET Core 9. |

**Important:** Azure SignalR Service is a managed service - you don't run a SignalR server. Instead:
1. Client connects via negotiate endpoint to get SignalR Service URL + token
2. Client connects directly to Azure SignalR Service
3. Backend publishes messages via REST API or SDK

**Backend publishing options:**
- REST API (recommended for Express): Use `@azure/web-pubsub` or raw REST calls
- Azure Functions bindings (if using Functions)

**Confidence:** HIGH - Official Microsoft package, version 9.0.6 verified.

### Forms & Validation

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Zod | ^3.24.x | Schema validation | TypeScript-first validation. Shared schemas between frontend and backend. Runtime type checking for API boundaries. |
| react-hook-form | ^7.71.x | Form state | Performant forms with minimal re-renders. Uncontrolled inputs by default. |
| @hookform/resolvers | ^3.x | RHF + Zod bridge | Integrates Zod schemas with react-hook-form validation. |

**Note on Zod 4:** Zod 4 is available but caused breaking changes for some projects. Stick with Zod 3.24.x for stability. Import from `zod` (not `zod/v4`).

**Confidence:** HIGH - All packages verified on npm.

### PWA & Offline

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| vite-plugin-pwa | ^1.1.x | PWA generation | Zero-config service worker generation. Workbox under the hood. Automatic manifest generation. |
| workbox-window | ^7.x | Service worker runtime | Comes with vite-plugin-pwa. Handles SW registration, updates, caching strategies. |

**PWA Configuration Strategy:**
- Use `generateSW` strategy for simplicity (auto-generates service worker)
- Configure `runtimeCaching` for API responses
- Enable `registerType: 'autoUpdate'` for seamless updates

**Confidence:** HIGH - vite-plugin-pwa 1.1.0 verified.

### Azure SDKs

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| @azure/identity | ^4.13.x | Authentication | DefaultAzureCredential for local dev + managed identity in production. |
| @azure/keyvault-secrets | ^4.10.x | Secret management | Retrieve secrets from Azure Key Vault. Never hardcode secrets. |
| @azure/storage-blob | ^12.30.x | Blob storage | Media uploads for photos/videos. Supports SAS tokens for direct upload. |

**Confidence:** HIGH - All packages verified on npm within last 7 months.

### AI Integration

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| @anthropic-ai/sdk | ^0.71.x | Anthropic API | Official TypeScript SDK for Claude. Baby name generation feature. |

**Confidence:** HIGH - Version 0.71.2 verified on npm.

### Image Processing

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| sharp | ^0.34.x | Image optimization | Fastest Node.js image processor. Resize, compress, convert formats before uploading to Blob Storage. |

**Confidence:** HIGH - sharp 0.34.5 is current stable.

### Security Middleware

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| helmet | ^8.x | Security headers | Sets 15 security headers by default (CSP, HSTS, X-Frame-Options, etc.). Essential for production. |
| cors | ^2.8.x | CORS middleware | Configurable CORS for API. Lock down to specific origins in production. |
| express-rate-limit | ^7.x | Rate limiting | Prevent abuse. Essential for PIN authentication endpoint. |

**Confidence:** HIGH - All packages are stable and widely used.

### Testing

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Vitest | ^3.x | Test runner | Vite-native testing. 10x faster than Jest for Vite projects. Compatible with Jest API. |
| @testing-library/react | ^16.x | React testing | DOM testing utilities. Matches React 19. |
| @testing-library/jest-dom | ^6.x | DOM matchers | Extended DOM assertions. |
| @testing-library/user-event | ^14.x | User interactions | Realistic user event simulation. |
| msw | ^2.x | API mocking | Mock Service Worker for API testing without backend. |

**Note:** While Jest was mentioned in project context, Vitest is recommended for Vite projects. Vitest 3 is the first version supporting Vite 6 and provides Jest-compatible API.

**Confidence:** MEDIUM - Vitest is the modern choice, but Jest is still valid if preferred.

### Development Tools

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| ESLint | ^9.x | Linting | Flat config format (new standard). TypeScript-aware. |
| @eslint/js | ^9.x | ESLint base rules | Core JavaScript rules for ESLint 9. |
| typescript-eslint | ^8.x | TS linting | ESLint rules for TypeScript. |
| Prettier | ^3.x | Formatting | Consistent code style. Integrates with ESLint. |
| husky | ^9.x | Git hooks | Pre-commit hooks for linting/formatting. |
| lint-staged | ^15.x | Staged file linting | Only lint changed files. |

**Confidence:** HIGH - All tools are stable and widely adopted.

---

## Installation Commands

### Frontend Dependencies

```bash
# Core React
npm install react@^19.2 react-dom@^19.2

# State Management
npm install zustand@^5.0 @tanstack/react-query@^5.90

# Forms & Validation
npm install react-hook-form@^7.71 @hookform/resolvers@^3 zod@^3.24

# Real-time
npm install @microsoft/signalr@^9.0
```

### Backend Dependencies

```bash
# Core Express
npm install express@^5.1

# Database
npm install @prisma/client@^7.2 @prisma/adapter-pg@^7 pg@^8

# Azure SDKs
npm install @azure/identity@^4.13 @azure/keyvault-secrets@^4.10 @azure/storage-blob@^12.30

# AI
npm install @anthropic-ai/sdk@^0.71

# Image Processing
npm install sharp@^0.34

# Security
npm install helmet@^8 cors@^2.8 express-rate-limit@^7

# Validation (shared)
npm install zod@^3.24
```

### Dev Dependencies

```bash
# TypeScript
npm install -D typescript@^5.8 @types/node@^22 @types/react@^19 @types/react-dom@^19 @types/express@^5

# Build Tools
npm install -D vite@^6.4 tsx@^4 vite-plugin-pwa@^1.1

# ORM CLI
npm install -D prisma@^7.2

# Testing
npm install -D vitest@^3 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14 msw@^2

# Linting & Formatting
npm install -D eslint@^9 @eslint/js@^9 typescript-eslint@^8 prettier@^3 eslint-config-prettier@^10

# Git Hooks
npm install -D husky@^9 lint-staged@^15
```

---

## What NOT to Use (Anti-Recommendations)

### Avoid These Patterns

| Don't Use | Why | Use Instead |
|-----------|-----|-------------|
| Create React App (CRA) | Deprecated, no maintenance since 2023 | Vite |
| Express 4.x | Legacy, lacks native async error handling | Express 5.x |
| `signalr` npm package | Legacy ASP.NET SignalR, not for ASP.NET Core or Azure SignalR Service | `@microsoft/signalr` |
| Redux | Overkill for this app size, excessive boilerplate | Zustand + TanStack Query |
| Redux Toolkit | Still overkill, Zustand is simpler | Zustand |
| Axios | Unnecessary abstraction over fetch | Native fetch (built into Node 18+) |
| Moment.js | Deprecated, huge bundle size | date-fns or Temporal API |
| TypeORM | Weaker TypeScript support than Prisma, decorator-heavy | Prisma |
| Sequelize | JavaScript-first, poor TypeScript experience | Prisma |
| Jest | Slower than Vitest for Vite projects, requires separate config | Vitest |
| Node.js 18.x | EOL April 2025, Azure SDK dropping support July 2025 | Node.js 22 LTS |
| Zod 4.x | Breaking changes, stability concerns in some projects | Zod 3.24.x |

### Avoid These Azure Patterns

| Don't Do | Why | Do Instead |
|----------|-----|------------|
| Store secrets in code/config | Security risk | Use Azure Key Vault |
| Use connection strings in production | Security risk | Use Managed Identity with DefaultAzureCredential |
| Deploy uncompiled TypeScript | Runtime overhead | Compile to JavaScript, deploy `dist/` |
| Use Azure Functions for everything | Unnecessary complexity for this app | Azure App Service with Express |
| Skip Front Door | No CDN, no WAF, higher latency | Use Azure Front Door |

---

## Architecture Notes

### Monorepo Structure Recommendation

```
BeforeWeWereThree/
├── apps/
│   ├── web/           # React frontend (Vite)
│   └── api/           # Express backend
├── packages/
│   └── shared/        # Shared types, Zod schemas
├── prisma/
│   └── schema.prisma  # Database schema
└── package.json       # Workspace root
```

**Why Monorepo:**
- Shared Zod schemas ensure frontend/backend validation consistency
- Shared TypeScript types prevent drift
- Single `npm install` for all packages
- Easier CI/CD configuration

**Tooling:** Use npm workspaces (built into npm 7+). No need for Turborepo or Nx for this project size.

### Environment Configuration

```typescript
// apps/api/src/config.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().url(),
  AZURE_KEY_VAULT_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().min(1),
  SIGNALR_CONNECTION_STRING: z.string().min(1),
});

export const env = envSchema.parse(process.env);
```

---

## Sources

### Official Documentation (HIGH confidence)
- [React 19 Release](https://react.dev/blog/2024/12/05/react-19)
- [React 19.2 Release](https://react.dev/blog/2025/10/01/react-19-2)
- [Express 5.1.0 Announcement](https://expressjs.com/2025/03/31/v5-1-latest-release.html)
- [Vite Releases](https://vite.dev/releases)
- [TypeScript 5.8 Release](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html)
- [Prisma Changelog](https://www.prisma.io/changelog)
- [Azure Node.js 22 Support](https://azure.github.io/AppService/2025/02/18/Node-22.html)
- [Azure SDK TypeScript Guidelines](https://azure.github.io/azure-sdk/typescript_implementation.html)
- [vite-plugin-pwa Documentation](https://vite-pwa-org.netlify.app/)
- [Zod Documentation](https://zod.dev/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand.docs.pmnd.rs/)

### npm Packages (HIGH confidence - version verified)
- [@microsoft/signalr](https://www.npmjs.com/package/@microsoft/signalr) - v9.0.6
- [@azure/identity](https://www.npmjs.com/package/@azure/identity) - v4.13.0
- [@azure/keyvault-secrets](https://www.npmjs.com/package/@azure/keyvault-secrets) - v4.10.0
- [@azure/storage-blob](https://www.npmjs.com/package/@azure/storage-blob) - v12.30.0
- [@anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk) - v0.71.2
- [sharp](https://www.npmjs.com/package/sharp) - v0.34.5
- [zustand](https://www.npmjs.com/package/zustand) - v5.0.10
- [react-hook-form](https://www.npmjs.com/package/react-hook-form) - v7.71.1
- [@tanstack/react-query](https://www.npmjs.com/package/@tanstack/react-query) - v5.90.19
- [vite-plugin-pwa](https://www.npmjs.com/package/vite-plugin-pwa) - v1.1.0

### Community Research (MEDIUM confidence)
- [Drizzle vs Prisma Comparison](https://www.bytebase.com/blog/drizzle-vs-prisma/)
- [Node.js ORMs in 2025](https://thedataguy.pro/blog/2025/12/nodejs-orm-comparison-2025/)
- [React State Management in 2025](https://makersden.io/blog/react-state-management-in-2025)
- [Express 5 Setup Guide](https://www.reactsquad.io/blog/how-to-set-up-express-5-in-2025)
