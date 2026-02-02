---
phase: 01-azure-infrastructure-foundation
plan: 03
subsystem: database
tags: [prisma, postgresql, azure-key-vault, azure-flexible-server, github-actions]

# Dependency graph
requires:
  - phase: 01-01
    provides: Express server foundation and deployment workflow
provides:
  - Prisma ORM with AppConfig and Participant models
  - PostgreSQL Flexible Server with PgBouncer
  - Azure Key Vault for secrets management
  - Database migration automation via GitHub Actions
affects: [02-session-management, 03-auth, all-database-models]

# Tech tracking
tech-stack:
  added:
    - "@prisma/client@^7.2"
    - "prisma@^7.2"
    - Azure Key Vault
    - Azure PostgreSQL Flexible Server
  patterns:
    - Prisma Client singleton pattern with hot reload handling
    - Key Vault references for App Service configuration
    - Migration deployment via GitHub Actions

key-files:
  created:
    - server/prisma/schema.prisma
    - server/src/db/connection.ts
    - docs/infrastructure/key-vault-setup.md
    - docs/infrastructure/database-setup.md
  modified:
    - server/package.json
    - .github/workflows/deploy.yml

key-decisions:
  - "Prisma schema in server/prisma/ (monorepo workspace-specific)"
  - "General Purpose tier for production PostgreSQL (NOT Burstable - CPU credits)"
  - "PgBouncer enabled for connection pooling"
  - "Migrations run from GitHub Actions (not App Service startup)"
  - "DATABASE_URL via Key Vault reference using managed identity"

patterns-established:
  - "Database models use snake_case table names with @@map()"
  - "Prisma client exported as singleton 'db' from server/src/db/connection.ts"
  - "Migration commands in server/package.json: db:generate, db:migrate, db:push, db:deploy"

# Metrics
duration: 7min
completed: 2026-02-01
---

# Phase 01 Plan 03: Key Vault & PostgreSQL Summary

**Prisma ORM with AppConfig and Participant models, Azure Key Vault secrets management, and PostgreSQL Flexible Server with automated migrations**

## Performance

- **Duration:** 7 min (initial) + checkpoint approval + 2 min (completion)
- **Started:** 2026-02-01T21:44:55Z
- **Completed:** 2026-02-02T03:06:18Z
- **Tasks:** 4 (3 auto + 1 checkpoint)
- **Files created:** 4
- **Files modified:** 2

## Accomplishments

- Prisma schema with AppConfig and Participant models for Phase 1
- Database connection singleton with hot reload handling for development
- Key Vault and PostgreSQL setup documentation with Azure Portal + CLI instructions
- GitHub Actions workflow updated to run migrations automatically
- User successfully configured Azure Key Vault with managed identity
- User successfully configured PostgreSQL Flexible Server with PgBouncer
- Database migrations verified working in production environment

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Prisma schema with initial models** - `3b57107` (feat)
2. **Task 2: Create infrastructure setup documentation** - `9774db7` (docs)
3. **Task 3: Update deployment workflow for Prisma migrations** - `4a087ac` (chore)
4. **Task 4: Checkpoint - Human verification** - APPROVED by user

## Files Created/Modified

**Created:**
- `server/prisma/schema.prisma` - AppConfig and Participant models with PostgreSQL provider
- `server/src/db/connection.ts` - Prisma Client singleton export
- `docs/infrastructure/key-vault-setup.md` - RBAC authorization, managed identity, Key Vault references
- `docs/infrastructure/database-setup.md` - PostgreSQL Flexible Server, PgBouncer, networking, connection strings

**Modified:**
- `server/package.json` - Added Prisma dependencies and database scripts
- `.github/workflows/deploy.yml` - Added migration deployment step

## Decisions Made

1. **Prisma schema location: server/prisma/** - Keeps schema workspace-specific in monorepo, closer to server code
2. **General Purpose tier for production** - Avoids Burstable tier CPU credit issues identified in research
3. **PgBouncer enabled** - Connection pooling to handle concurrent requests efficiently
4. **GitHub Actions for migrations** - Runs migrations during deployment using DATABASE_URL secret, more reliable than App Service startup scripts
5. **Key Vault managed identity** - More secure than storing secrets in App Service configuration directly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Configured Prisma schema path for monorepo**
- **Found during:** Post-Task 1, during Prisma validation
- **Issue:** Prisma couldn't locate schema.prisma in workspace structure
- **Fix:** Added schema path configuration to server/package.json
- **Files modified:** server/package.json
- **Verification:** npx prisma validate passed
- **Commit:** `45e821c` (fix: configure Prisma schema path for server workspace)

**2. [Rule 3 - Blocking] Moved Prisma folder into server workspace**
- **Found during:** Deployment testing
- **Issue:** Azure deployment couldn't find prisma/ at root (not included in server build artifact)
- **Fix:** Moved prisma/ folder into server/ to bundle with deployment
- **Files modified:** prisma/schema.prisma → server/prisma/schema.prisma, server/package.json
- **Verification:** Deployment succeeded, migrations accessible
- **Commit:** `1482388` (fix: move prisma folder into server for deployment)

**3. [Rule 1 - Bug] Simplified migration strategy to GitHub Actions**
- **Found during:** Deployment workflow execution
- **Issue:** App Service SSH approach was complex and unreliable for running migrations
- **Fix:** Changed to run migrations directly in GitHub Actions using DATABASE_URL secret before deployment
- **Files modified:** .github/workflows/deploy.yml, server/esbuild.config.js
- **Verification:** Migrations run successfully in CI before App Service deployment
- **Commit:** `bf2c8cb` (fix: run migrations from GitHub Actions instead of App Service)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All auto-fixes necessary for correct operation in monorepo and Azure deployment environment. No scope creep - resolved technical blockers for deployment.

## User Setup Completed

User successfully completed Azure setup per documentation:

✅ **Key Vault (bwwt-kv):**
- Created with RBAC authorization
- Managed identity enabled on App Service
- "Key Vault Secrets User" role assigned
- Secrets stored: DATABASE_URL, JWT_SECRET
- App Service configured with Key Vault references

✅ **PostgreSQL Flexible Server (bwwt-db):**
- Created with PgBouncer enabled
- Database created: bwwt_db
- Networking configured for App Service access
- Connection string stored in Key Vault
- Migrations verified working

✅ **GitHub Actions:**
- DATABASE_URL secret added to repository
- Migrations run successfully during deployment

## Issues Encountered

None beyond the auto-fixed deviations. Checkpoint approval confirmed all infrastructure working correctly.

## Next Phase Readiness

**Ready:**
- Database connection established and verified
- Prisma models ready for session and auth data
- Secrets management pattern established for future environment variables
- Migration automation working for schema evolution

**Blockers:** None

**For future phases:**
- Session table can be added to Prisma schema (Phase 1, Plan 4)
- Authentication routes can use database for participant tracking
- All activity features will use this database foundation

---
*Phase: 01-azure-infrastructure-foundation*
*Completed: 2026-02-01*
