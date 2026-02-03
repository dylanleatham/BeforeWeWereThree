# Server Testing Guide

Lessons learned setting up Jest with ESM TypeScript in this project.

## Configuration

### ESM + TypeScript + Jest

This project uses ESM (`"type": "module"` in package.json). Jest requires special configuration:

```js
// jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  injectGlobals: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',  // Handle .js imports in TS
    '^shared$': '<rootDir>/../shared/dist/index.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'bundler',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: false,  // Relaxed for tests - see "Mock Typing" below
        },
      },
    ],
  },
};
```

### Cross-Platform Scripts

Use `cross-env` for Windows compatibility:

```json
"test": "cross-env NODE_OPTIONS=--experimental-vm-modules jest"
```

## Mocking Patterns

### ESM Module Mocking

**Critical:** In ESM, `jest.mock()` does NOT hoist. Use `jest.unstable_mockModule()` instead, and import AFTER mocking:

```typescript
// ❌ WRONG - doesn't work in ESM
jest.mock('../../db/connection.js', () => ({ db: mockDb }));
import { someFunction } from '../../services/myService.js';

// ✅ CORRECT - ESM pattern
jest.unstable_mockModule('../../db/connection.js', () => ({
  db: mockDb,
}));

// Import AFTER the mock is set up
const { someFunction } = await import('../../services/myService.js');
```

### Mock Typing Strategy

TypeScript strict mode conflicts with Jest mocks. Use `any` for mock functions:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<any>;

const mockParticipant = {
  findUnique: jest.fn() as AnyMock,
  count: jest.fn() as AnyMock,
  create: jest.fn() as AnyMock,
};
```

This allows `.mockResolvedValue()` with any argument type.

### Express Request/Response Mocking

Use `Record<string, unknown>` and cast to avoid type conflicts:

```typescript
function createMockResponse() {
  const res: Record<string, unknown> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);  // If rate limiting
  return res;
}

function createMockNext() {
  return jest.fn();
}

// Usage
const req = { cookies: { session: token } } as unknown as Request;
const res = createMockResponse();
await middleware(req, res as unknown as Response, createMockNext());
```

### Prisma Transaction Mocking

```typescript
const mockTransaction = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/connection.js', () => ({
  db: {
    participant: mockParticipant,
    $transaction: mockTransaction,
  },
}));

// In beforeEach, set up the transaction behavior
beforeEach(() => {
  mockTransaction.mockImplementation((callback) => {
    return callback({ participant: mockParticipant });
  });
});
```

## Test Organization

```
server/src/__tests__/
├── setup.ts              # Global setup (env vars, timeouts)
├── middleware/
│   ├── auth.test.ts      # Auth middleware tests
│   └── rateLimit.test.ts # Rate limiting tests
├── routes/
│   └── auth.test.ts      # Integration tests with supertest
└── services/
    ├── session.test.ts   # JWT/session logic
    └── participant.test.ts # Business logic
```

## Common Gotchas

### 1. Import Order Matters

Always set up mocks before importing the module under test:

```typescript
// Mocks first
jest.unstable_mockModule('../../db/connection.js', () => ({ ... }));

// Then import
const { myFunction } = await import('../../myModule.js');
```

### 2. @jest/globals Imports

In ESM, import Jest globals explicitly:

```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
```

### 3. Supertest Cookie Handling

When testing authenticated routes:

```typescript
const loginResponse = await request(app)
  .post('/api/auth/validate-pin')
  .send({ pin: '01152025', deviceFingerprint: 'fp' });

const cookies = loginResponse.headers['set-cookie'] as string[] | undefined;
expect(cookies).toBeDefined();

const response = await request(app)
  .get('/api/auth/session')
  .set('Cookie', cookies!);
```

### 4. Module Cache Reset

For middleware with internal state (like rate limiters), reset modules between tests:

```typescript
beforeEach(async () => {
  jest.resetModules();
  const module = await import('../../middleware/rateLimit.js');
  pinRateLimiter = module.pinRateLimiter;
});
```

### 5. Check Actual Error Codes

Read the implementation to verify error codes match:

```typescript
// Rate limiter uses 'TOO_MANY_REQUESTS', not 'RATE_LIMITED'
expect(res.json).toHaveBeenCalledWith(
  expect.objectContaining({
    error: expect.objectContaining({
      code: 'TOO_MANY_REQUESTS',  // Check the actual code!
    }),
  })
);
```

## Running Tests

```bash
npm run test --workspace=server        # Run all tests
npm run test:watch --workspace=server  # Watch mode
npm run test:coverage --workspace=server  # With coverage
```

## Dependencies

Required dev dependencies:
- `jest`
- `@types/jest`
- `ts-jest`
- `supertest` (for route integration tests)
- `@types/supertest`
- `cross-env` (Windows compatibility)
