# Phase 2 Execution - Lessons Learned

## Environment & Configuration Issues

### 1. Server .env File Location
**Problem:** Server returning 500 errors on PIN validation - `DATABASE_URL` not found.
**Root Cause:** The `tsx watch` command runs from the server directory, but `.env` was only in project root.
**Solution:** Copy `.env` to `server/.env` AND update `server/package.json`:
```json
"dev": "tsx watch --env-file=.env src/index.ts"
```
The `--env-file=.env` flag (Node 20+) loads the env file automatically.

### 2. Azure PostgreSQL Firewall
**Problem:** `Can't reach database server at bwwt-db.postgres.database.azure.com:5432`
**Root Cause:** Azure PostgreSQL requires explicit IP allowlisting.
**Solution:** Add client IP to Azure Portal → PostgreSQL → Networking → Firewall rules.
**User's IP:** `<your public IP>` (changes based on network)

### 3. Prisma Schema Not Deployed
**Problem:** `The table 'public.envelopes' does not exist in the current database`
**Root Cause:** Migration for Envelope model wasn't deployed to Azure database.
**Solution:** Run `npx prisma db push --accept-data-loss` from server directory.
**Note:** `prisma migrate deploy` failed because database wasn't empty - use `db push` for existing databases.

### 4. Port Conflicts
**Problem:** Vite kept incrementing ports (5173, 5174, 5175...) due to zombie processes.
**Solution:** Kill all node processes before restart:
```bash
for port in 5173 5174 5175 5176 5177 5178 5179 5180 3000; do
  pid=$(netstat -ano 2>/dev/null | grep ":$port " | head -1 | awk '{print $5}')
  if [ -n "$pid" ] && [ "$pid" != "0" ]; then
    cmd //c "taskkill /F /PID $pid" 2>/dev/null
  fi
done
```

## React/Frontend Bugs

### 5. useEnvelopes Fetching Before Authentication
**Problem:** Guest login showed "Authentication required" error immediately after successful PIN entry.
**Root Cause:** `useEnvelopes` hook was called at top of `App` component, running its initial fetch BEFORE user authenticated. The 401 error persisted after login.
**Solution:** Split into two components:
```tsx
function App() {
  const { isAuthenticated, ... } = useSession();

  if (!isAuthenticated) {
    return <PinEntry ... />;
  }

  // Only render AuthenticatedApp when logged in
  return <AuthenticatedApp ... />;
}

function AuthenticatedApp({ ... }) {
  // useEnvelopes only called here, AFTER authentication
  const { envelopes, ... } = useEnvelopes();
  ...
}
```

### 6. Vite Proxy Cookie Handling
**Problem:** Session cookie set by backend not being sent in subsequent requests.
**Partial Fix:** Added to `vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    cookieDomainRewrite: 'localhost',
  },
},
```
**Note:** The main issue was #5 above, but this config helps with cookie domain rewriting.

## Backend/Database Bugs

### 7. Participant Fingerprint Role Conflict
**Problem:** User logs in as admin, then as guest → gets "readonly" designation instead of A/B.
**Root Cause:** `getOrCreateParticipant()` checked for ANY existing participant with fingerprint, regardless of role. Admin participant had designation "readonly" (placeholder), which was returned for guest login.
**Solution:** In `participant.ts`, check role matches:
```typescript
// If existing participant is a guest, return it
if (existing && existing.role === 'guest') {
  return { participantId: existing.id, designation: existing.designation };
}

// If existing is admin, delete it so guest can get proper designation
if (existing && existing.role === 'admin') {
  await db.participant.delete({ where: { id: existing.id } });
}
```

### 8. Reset Participants Only Deleted Guests
**Problem:** Reset didn't help when user's fingerprint was registered as admin.
**Root Cause:** `resetParticipants()` only deleted `role: 'guest'` participants.
**Solution:** Fixed by #7 above - guest login now properly handles admin fingerprints.

## PINs & Test Data

**Guest PIN:** `08202009`
**Admin PIN:** `02131993`

These are stored in `app_config` table with keys `guest_pin` and `admin_pin`.

## Commands Reference

```bash
# Start both servers
npm run dev:all

# Server only
npm run dev --workspace=server

# Client only
npm run dev --workspace=client

# Push schema changes to database
cd server && npx prisma db push

# Generate Prisma client
cd server && npx prisma generate

# Test PIN validation
curl -s http://localhost:3000/api/auth/validate-pin \
  -X POST -H "Content-Type: application/json" \
  -d '{"pin":"08202009","deviceFingerprint":"test123"}'

# Test with session cookie
curl -c cookies.txt -s http://localhost:3000/api/auth/validate-pin ...
curl -b cookies.txt -s http://localhost:3000/api/envelopes
```

## Files Modified During Debugging

1. `server/package.json` - Added `--env-file=.env` to dev script
2. `server/.env` - Created (copy of root .env)
3. `client/vite.config.ts` - Added `cookieDomainRewrite`
4. `client/src/App.tsx` - Split into App + AuthenticatedApp components
5. `server/src/services/participant.ts` - Fixed role conflict logic
6. `server/src/routes/auth.ts` - Added DELETE /participants endpoint
7. `client/src/services/api.ts` - Added resetParticipants() function
8. `client/src/components/admin/EnvelopeManager.tsx` - Added Reset Participants UI

## Architecture Insights

1. **Vite Dev Server**: Runs on 5173, proxies /api to Express on 3000
2. **Session Cookies**: HttpOnly, SameSite=Strict, 30-day expiry
3. **Device Fingerprint**: Generated client-side, stored with participant
4. **Participant Designation**: First guest = A, second = B, rest = readonly
5. **Admin Role**: Uses "readonly" as placeholder designation (null in response)

## Testing Checklist

- [ ] Guest login gets A or B designation (not readonly after fresh start)
- [ ] Admin login shows Envelope Management
- [ ] Reset Participants clears guest designations
- [ ] Empty envelopes shows "No envelopes yet" (not error)
- [ ] Create envelope works in admin
- [ ] Guest can see created envelopes
