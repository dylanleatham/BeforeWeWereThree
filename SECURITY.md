# Security policy

Before We Were Three is a personal project built for one couple's trip. Its Azure deployment has
been retired and there are no published releases, so the only supported version is `main`, run
locally.

## Reporting a vulnerability

Please report security issues privately through GitHub's
[private vulnerability reporting](https://github.com/dylanleatham/BeforeWeWereThree/security/advisories/new)
rather than in a public issue. I'll acknowledge the report and follow up there.

## Scope and threat model

- **Access is PIN-gated, not account-based.** Guests, the admin and contributing friends each
  enter an 8-digit PIN. PINs live in the database (never in the repo), are compared in constant
  time, and the endpoint is rate-limited. A successful entry issues an HS256 JWT in an
  `httpOnly`, `sameSite=strict` cookie (`secure` in production); the server refuses to start without
  `JWT_SECRET` outside development.
- **The gender reveal is the one real secret.** The value is set by a trusted friend, is never
  returned to either participant or the admin, and is only released when both partners' keys
  validate. Keys are stored as salted scrypt hashes and checked with `timingSafeEqual` inside a
  `Serializable` transaction.
- **Photo uploads go straight to Azure Blob Storage** via 10-minute, create/write-only SAS URLs minted
  by the server; the storage key never reaches the browser.
- **Credentials** (database, storage, Anthropic, JWT secret) come from environment variables —
  Azure Key Vault references when it was deployed, a gitignored `.env` locally. `.env.example`
  holds placeholders only. Deploys used OpenID Connect, so no long-lived cloud credential was
  stored in GitHub.
