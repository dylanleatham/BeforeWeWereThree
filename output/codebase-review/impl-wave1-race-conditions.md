# Wave 1: Race Condition Fixes

**Date:** 2026-02-25
**Issues:** B-004, B-005, B-023, B-026

---

## B-004: Rate limiter TOCTOU race condition (CRITICAL) — FIXED

**File:** `server/src/middleware/rateLimit.ts`

**Problem:** `InMemoryRateLimitStore.increment()` did not check whether an entry had expired. If an entry expired between the `get()` call (which returns `null` for expired entries) and the `increment()` call (which did not check expiry), the expired entry's count was incremented instead of being reset. The caller then used `newCount || entry.count + 1` which used stale `entry.count` when `newCount` was 0.

**Fix (two parts):**

1. **`increment()` now checks expiry.** If the entry exists but has expired, it deletes the stale entry and returns 0 (same as "not found"). If the entry is valid, it increments and returns the new count.

2. **Callers handle the 0 return explicitly.** Both `pinRateLimiter` and `createRateLimiter` now check `if (newCount === 0)` and create a fresh entry with `count: 1` instead of using the `newCount || entry.count + 1` fallback expression.

**Before:**
```typescript
async increment(key: string): Promise<number> {
  const entry = this.store.get(key);
  if (entry) {
    entry.count++;
    return entry.count;
  }
  return 0;
}

// Caller:
const newCount = await store.increment(key);
entry.count = newCount || entry.count + 1;  // stale fallback
```

**After:**
```typescript
async increment(key: string): Promise<number> {
  const entry = this.store.get(key);
  if (entry && entry.resetAt > Date.now()) {
    entry.count++;
    return entry.count;
  }
  if (entry) {
    this.store.delete(key);
  }
  return 0;
}

// Caller:
const newCount = await store.increment(key);
if (newCount === 0) {
  entry = { count: 1, resetAt: now + WINDOW_MS };
  await store.set(key, entry, WINDOW_MS);
  next();
  return;
}
entry.count = newCount;
```

---

## B-005: Gender-reveal singleton check race condition (CRITICAL) — FIXED

**File:** `server/src/routes/envelopes.ts`

**Problem:** The POST handler read all envelopes, checked for an existing gender-reveal, then created a new one — all outside any transaction. Two concurrent requests could both pass the existence check and create duplicate gender-reveal envelopes.

**Fix:** Wrapped the existence check and creation in a Prisma `$transaction` with `{ isolationLevel: 'Serializable' }`. The transaction uses `tx.envelope.count()` (more efficient than fetching all envelopes) and `tx.envelope.create()` atomically. Non-gender-reveal envelope creation is unchanged and still uses the `createEnvelope` query helper.

**Before:**
```typescript
if (parsed.data.type === 'gender-reveal') {
  const existing = await getAllEnvelopes();
  if (existing.some((e) => e.type === 'gender-reveal')) {
    res.status(409).json(/* ... */);
    return;
  }
}
const envelope = await createEnvelope(parsed.data);
```

**After:**
```typescript
if (parsed.data.type === 'gender-reveal') {
  const result = await db.$transaction(async (tx) => {
    const existingCount = await tx.envelope.count({
      where: { type: 'gender-reveal' },
    });
    if (existingCount > 0) {
      return { conflict: true as const };
    }
    const created = await tx.envelope.create({ /* ... */ });
    return { conflict: false as const, envelope: created };
  }, { isolationLevel: 'Serializable' });

  if (result.conflict) {
    res.status(409).json(/* ... */);
    return;
  }
  res.status(201).json(successResponse({ envelope: /* transformed */ }));
  return;
}
const envelope = await createEnvelope(parsed.data);
```

Added `import { db } from '../db/connection.js'` to support direct transaction use.

---

## B-023: safeCompare leaks PIN length (HIGH) — FIXED

**File:** `server/src/routes/auth.ts`

**Problem:** `safeCompare` returned `false` immediately when the two strings had different lengths, before calling `timingSafeEqual`. This created a measurable timing difference that leaked whether the submitted PIN had the correct length.

**Fix:** Always allocate zero-filled buffers of the maximum length, write both strings into their respective buffers, and run `timingSafeEqual` unconditionally. The length equality check happens after `timingSafeEqual` completes, so the timing is constant regardless of input lengths.

**Before:**
```typescript
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

**After:**
```typescript
function safeCompare(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(maxLen);
  const bufB = Buffer.alloc(maxLen);
  bufA.write(a);
  bufB.write(b);
  const contentsMatch = timingSafeEqual(bufA, bufB);
  return contentsMatch && a.length === b.length;
}
```

Key detail: `contentsMatch` is evaluated first (not short-circuited) so `timingSafeEqual` always runs regardless of length mismatch.

---

## B-026: Participant role-conversion race condition (HIGH) — ALREADY RESOLVED

**File:** `server/src/services/participant.ts`

**Problem (as reported):** Count-then-assign without Serializable isolation for the role-conversion branch.

**Finding:** The code at lines 104-131 already uses `{ isolationLevel: 'Serializable' }` on the `$transaction` call. This was fixed in a prior commit. No changes needed.

---

## Files Modified

| File | Change |
|------|--------|
| `server/src/middleware/rateLimit.ts` | Fixed TOCTOU race in `increment()` and both caller sites |
| `server/src/routes/envelopes.ts` | Wrapped gender-reveal singleton check in Serializable transaction |
| `server/src/routes/auth.ts` | Made `safeCompare` constant-time regardless of length mismatch |
| `server/src/services/participant.ts` | No changes needed (already fixed) |
