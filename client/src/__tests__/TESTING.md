# Client Testing Guide

Lessons learned setting up Vitest with React Testing Library in this project.

## Configuration

### Vitest + React + TypeScript

This project uses Vite, so Vitest integrates naturally. Configuration lives in `vite.config.ts`:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  // ... other config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: true,
  },
});
```

### TypeScript Types

Create `src/vitest.d.ts` for global type support:

```ts
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />
```

### Test Setup File

The setup file (`src/__tests__/setup.ts`) handles:
- Jest-DOM matchers for Vitest
- Cleanup after each test
- Browser API mocks (matchMedia, ResizeObserver)

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock APIs not in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    // ... event listener mocks
  })),
});
```

## Mocking Patterns

### Module Mocking with vi.mock

For simple mocks that don't change between tests:

```ts
vi.mock('../../services/api', () => ({
  validatePin: vi.fn(),
  getSession: vi.fn(),
  logout: vi.fn(),
}));

import * as api from '../../services/api';

// In tests
vi.mocked(api.validatePin).mockResolvedValue({ success: true, data: {...} });
```

### Module Mocking with vi.doMock (Dynamic)

When you need different mock behavior per test AND the module has internal state:

```ts
beforeEach(() => {
  vi.resetModules();  // Critical: clears module cache
});

it('should handle error case', async () => {
  vi.doMock('@fingerprintjs/fingerprintjs', () => ({
    default: { load: vi.fn().mockRejectedValue(new Error('Failed')) },
  }));

  // Import AFTER mocking
  const { getDeviceFingerprint } = await import('../../services/fingerprint');
  const result = await getDeviceFingerprint();
  // ...
});
```

### Mocking Hooks

Mock hooks at the module level, then control return values per test:

```ts
vi.mock('../hooks/useSession', () => ({
  useSession: vi.fn(),
}));

import { useSession } from '../hooks/useSession';

it('should show guest view', () => {
  vi.mocked(useSession).mockReturnValue({
    isLoading: false,
    isAuthenticated: true,
    role: 'guest',
    // ... other return values
  });

  render(<App />);
});
```

### Mocking fetch

```ts
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

it('should call API', async () => {
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve({ success: true, data: {...} }),
  });

  const result = await validatePin('01152025', 'fp');
  expect(mockFetch).toHaveBeenCalledWith('/api/auth/validate-pin', {...});
});
```

## React Testing Library Patterns

### User Events

Always use `userEvent` over `fireEvent` for realistic interactions:

```ts
import userEvent from '@testing-library/user-event';

it('should handle input', async () => {
  const user = userEvent.setup();
  render(<PinEntry onSubmit={mockOnSubmit} />);

  const input = screen.getByPlaceholderText('MM/DD/YYYY');
  await user.type(input, '01152025');

  expect(input).toHaveValue('01/15/2025');
});
```

### Testing Hooks

Use `renderHook` from React Testing Library:

```ts
import { renderHook, waitFor, act } from '@testing-library/react';

it('should login successfully', async () => {
  const { result } = renderHook(() => useSession());

  // Wait for initial loading to complete
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  // Perform action
  await act(async () => {
    await result.current.login('01152025');
  });

  expect(result.current.isAuthenticated).toBe(true);
});
```

### Async Assertions

Use `waitFor` for async state changes:

```ts
await waitFor(() => {
  expect(screen.getByText('Error message')).toBeInTheDocument();
});
```

### Query Priorities

Prefer queries in this order:
1. `getByRole` - accessible to everyone
2. `getByLabelText` - form fields
3. `getByPlaceholderText` - when label isn't available
4. `getByText` - non-interactive elements
5. `getByTestId` - last resort

## Common Gotchas

### 1. Auto-Submit Triggers

Components with auto-submit behavior need mocks set up BEFORE typing triggers submission:

```ts
// ❌ WRONG - typing 8 digits triggers submit without mock
await user.type(input, '01152025');

// ✅ CORRECT - set up mock first
mockOnSubmit.mockResolvedValue({ success: true });
await user.type(input, '01152025');
```

Or avoid triggering the behavior:
```ts
// Only type 7 digits if testing formatting, not submission
await user.type(input, '0115202');
```

### 2. Module State Caching

Modules with internal state (like cached values) persist between tests:

```ts
// fingerprint.ts caches the fingerprint
let cachedFingerprint: string | null = null;

// In tests, reset modules to clear cache
beforeEach(() => {
  vi.resetModules();
});
```

### 3. Act Warnings

Wrap state-changing operations in `act`:

```ts
// ❌ Warning: An update was not wrapped in act(...)
result.current.logout();

// ✅ Correct
act(() => {
  result.current.logout();
});
```

### 4. Cleanup Between Tests

React Testing Library auto-cleans DOM, but you may need manual cleanup:

```ts
afterEach(() => {
  vi.clearAllMocks();  // Clear mock call history
  vi.restoreAllMocks(); // Restore spied functions
});
```

### 5. Console Error Suppression

Suppress expected errors to keep test output clean:

```ts
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

## Test Organization

```
client/src/__tests__/
├── setup.ts              # Global setup
├── TESTING.md            # This guide
├── components/
│   └── PinEntry.test.tsx # Component tests
├── hooks/
│   └── useSession.test.ts # Hook tests
├── services/
│   ├── api.test.ts       # API client tests
│   └── fingerprint.test.ts # Service tests
└── App.test.tsx          # App component tests
```

## Running Tests

```bash
npm run test --workspace=client        # Run once
npm run test:watch --workspace=client  # Watch mode
npm run test:coverage --workspace=client  # With coverage
```

## Dependencies

Required dev dependencies:
- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `jsdom`
