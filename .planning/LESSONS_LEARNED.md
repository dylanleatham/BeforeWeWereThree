# Lessons Learned - Before We Were Three

This document captures issues encountered and solutions discovered during development. Reference this when resuming work or troubleshooting similar problems.

---

## Azure Infrastructure

### GitHub Actions OIDC Authentication

**Issue:** AADSTS700213 - "No matching federated identity record found"

**Cause:** The workflow uses `environment: production`, which changes the subject claim from `repo:OWNER/REPO:ref:refs/heads/main` to `repo:OWNER/REPO:environment:production`.

**Solution:** Create a federated credential with:
- Entity type: **Environment** (not Branch)
- Environment name: `production`

### Front Door Cache Purge

**Issue:** Cache purge step hangs for 15+ minutes in GitHub Actions.

**Cause:** `az afd endpoint purge` runs synchronously by default, waiting for global propagation.

**Solution:** Add `--no-wait` flag to return immediately:
```yaml
az afd endpoint purge ... --no-wait
```

Also add `timeout-minutes: 1` and `continue-on-error: true` for resilience.

### PostgreSQL Connection

**Issue:** Connection refused on port 6432 (PgBouncer).

**Cause:** PgBouncer may not be enabled, or firewall blocking connections.

**Solution:**
1. Use port **5432** (direct connection) instead of 6432
2. Enable "Allow public access from any Azure service" in PostgreSQL Networking settings

**Issue:** Database "bwwt_db" does not exist.

**Cause:** Database must be created manually - it's not auto-created.

**Solution:** Connect to `postgres` database first, then create:
```sql
CREATE DATABASE bwwt_db;
```

### Key Vault Secret Caching

**Note:** Azure caches Key Vault references for up to 24 hours. Use **Stop + Start** (not Restart) to clear cache more reliably.

### Region Consistency

All Azure resources should be in the same region (e.g., `centralus`). The setup guide defaulted to `eastus` - update as needed.

---

## Build Configuration

### npm Workspaces - Shared Package Resolution

**Issue:** `Cannot find module 'shared'` errors in both client and server.

**Cause:**
1. Client and server didn't list `shared` as a dependency
2. Build ran all workspaces in parallel, but shared needs to build first

**Solution:**
1. Add `"shared": "*"` to dependencies in both `client/package.json` and `server/package.json`
2. Change root build script to sequential:
```json
"build": "npm run build --workspace=shared && npm run build --workspace=client && npm run build --workspace=server"
```

### Prisma Schema Location

**Issue:** `Could not find Prisma Schema` during build.

**Cause:** Prisma schema was at root `/prisma/schema.prisma` but server runs from `/server/`.

**Solution:**
1. Move prisma folder inside server: `server/prisma/schema.prisma`
2. Update `server/package.json`:
```json
"prisma": {
  "schema": "./prisma/schema.prisma"
}
```
3. Update `server/esbuild.config.js` to use correct path:
```js
const prismaDir = join(__dirname, 'prisma');  // Not '../prisma'
```

### esbuild Configuration for Deployment

**Key settings in `server/esbuild.config.js`:**
- `external: ['@prisma/client']` - Prisma has native binaries, can't be bundled
- Creates minimal `package.json` in deploy folder with only runtime dependencies
- Copies `prisma/schema.prisma` to deploy folder for Prisma Client

### Prisma Version Mismatch

**Issue:** Prisma CLI errors on App Service.

**Cause:** esbuild config had hardcoded older Prisma version.

**Solution:** Run migrations from GitHub Actions instead of App Service:
```yaml
- name: Run database migrations
  working-directory: ./server
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    if [ -n "$DATABASE_URL" ]; then
      npx prisma migrate deploy
    fi
```

This avoids needing Prisma CLI on App Service entirely.

---

## Deployment Pipeline

### What Gets Deployed

The deployment deploys `./server/deploy/` (not `./server/`), which contains:
- `index.js` - Bundled server code
- `package.json` - Minimal production dependencies
- `prisma/schema.prisma` - For Prisma Client

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | App Registration client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `DATABASE_URL` | PostgreSQL connection string (for migrations) |

### GitHub Secrets Limitation

**Issue:** `Unrecognized named-value: 'secrets'` in workflow `if` condition.

**Cause:** Secrets cannot be accessed in `if:` conditions for security reasons.

**Solution:** Check inside the shell script instead:
```yaml
run: |
  if [ -n "$DATABASE_URL" ]; then
    npx prisma migrate deploy
  fi
```

---

## Database Schema

### Initial Tables Required

```sql
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint TEXT UNIQUE NOT NULL,
  designation TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Initial Data Required

```sql
INSERT INTO app_config (key, value) VALUES ('guest_pin', 'MMDDYYYY');
INSERT INTO app_config (key, value) VALUES ('admin_pin', 'MMDDYYYY');
```

---

## Windows Development Environment

### OpenSSL Not Available

**Issue:** `openssl rand -base64 32` doesn't work in PowerShell/CMD.

**Solution:** Use PowerShell native:
```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

---

## Project Structure

```
/
├── client/                 # React frontend (Vite)
├── server/                 # Express backend (esbuild bundled)
│   ├── prisma/            # Database schema (moved here for deployment)
│   ├── deploy/            # Build output (deployed to Azure)
│   └── esbuild.config.js  # Build configuration
├── shared/                 # Shared types (built first)
│   ├── types/             # Source TypeScript
│   └── dist/              # Compiled output
└── .planning/             # GSD workflow artifacts
```

---

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| npm workspaces | Simpler than turborepo for project size |
| Express 5 | Native async error handling |
| Azure OIDC | More secure than publish profiles |
| Front Door Standard tier | Classic retiring March 2027 |
| PostgreSQL General Purpose | Burstable has CPU credit issues |
| Migrations via GitHub Actions | More reliable than App Service startup |
| Prisma in server folder | Ensures deployment includes schema |

---

## Troubleshooting Checklist

### Build Fails
1. Is shared built before client/server?
2. Do client/server have `"shared": "*"` in dependencies?
3. Is Prisma schema path correct in `server/package.json`?

### Deployment Fails
1. Are all GitHub secrets set?
2. Is the OIDC federated credential configured for `environment:production`?
3. Is Front Door actually provisioned (if cache purge fails)?

### Database Connection Fails
1. Is PostgreSQL firewall allowing Azure services?
2. Is the database created (`bwwt_db`)?
3. Is the connection string using port 5432 (not 6432)?
4. Is `DATABASE_URL` in Key Vault and referenced in App Service?

### Authentication Fails
1. Are PINs inserted in `app_config` table?
2. Is `JWT_SECRET` set in Key Vault and App Service?
3. Is the session cookie being set (check browser dev tools)?

---

*Last updated: 2026-02-02*
