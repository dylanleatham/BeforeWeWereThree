# Babymoon App — Build Order

This document defines the recommended order for building the Babymoon application. It is designed to minimize debugging complexity by establishing small, working end-to-ends in production before adding features.

---

## Guiding Principle

**Prove infrastructure with the simplest possible vertical, then layer complexity onto a foundation you trust.**

Agent-built software often works locally but breaks in production. The more features built before deploying, the more variables to debug when something fails. Therefore:

- Each phase should result in a working, deployed, testable checkpoint
- New complexity is added only after the previous layer is confirmed working in production
- When bugs occur, they are isolated to the most recently added layer

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Hosting | Azure App Service |
| CDN / Routing | Azure Front Door |
| Secrets | Azure Key Vault |
| Database | Azure Database for PostgreSQL |
| Real-time Sync | Azure SignalR Service |
| Media Storage | Azure Blob Storage |
| AI | Anthropic API (Claude) |
| Code Repository | GitHub |
| CI/CD | GitHub Actions |
| Domain | Porkbun |

---

## Phase 1: Trivia Envelope (Foundation)

Trivia is the simplest activity. It requires no two-device sync, no AI, no media uploads, and no multi-participant coordination. It proves the core infrastructure.

### 1.1 Azure Resource Group & App Service

**Build:**
- Create Azure Resource Group for the project
- Create Azure App Service (Node.js or Python runtime, depending on framework choice)
- Deploy a static "Hello World" page via GitHub Actions

**GitHub Actions checkpoint:**
- Push to `main` triggers deployment to App Service
- Deployment completes without errors

**Proves:**
- Azure account and permissions working
- App Service provisioned correctly
- GitHub Actions can authenticate and deploy to Azure

**Checkpoint:** Visit `https://<app-name>.azurewebsites.net`, see "Hello World" page.

---

### 1.2 Azure Front Door + Custom Domain

**Build:**
- Create Azure Front Door instance
- Configure origin to point to App Service
- Add custom domain in Front Door
- Configure Porkbun DNS:
  - CNAME record pointing to Front Door endpoint
  - TXT record for domain verification (if required)
- Enable HTTPS (Front Door managed certificate)

**Proves:**
- Front Door routing works
- DNS propagation successful
- SSL/TLS configured correctly

**Checkpoint:** Visit `https://yourdomain.com`, see the same "Hello World" page served via Front Door with valid HTTPS.

---

### 1.3 Azure Key Vault

**Build:**
- Provision Azure Key Vault
- Enable system-assigned managed identity on App Service
- Grant App Service identity "Key Vault Secrets User" role
- Store a test secret (e.g., `test-secret` = `hello-from-keyvault`)
- Configure App Service to use Key Vault references
- App reads test secret and displays it

**Key Vault reference format (for App Service config):**
```
@Microsoft.KeyVault(VaultName=your-vault;SecretName=test-secret)
```

**Proves:**
- Key Vault provisioned and accessible
- Managed identity configured correctly
- App Service can read secrets from Key Vault

**Checkpoint:** Production app displays the test secret value fetched from Key Vault.

---

### 1.4 Backend API Endpoint

**Build:**
- Add API route to the app (e.g., `/api/health`)
- Returns simple JSON: `{ "status": "ok", "timestamp": "..." }`
- Frontend calls this endpoint and displays the response

**Proves:**
- API routes work in App Service
- Frontend-to-backend communication works
- No CORS issues (same origin via Front Door)

**Checkpoint:** Production frontend displays response from `/api/health`.

---

### 1.5 Azure Database for PostgreSQL

**Build:**
- Provision Azure Database for PostgreSQL (Flexible Server)
- Configure firewall to allow App Service connection
- Store connection string in Key Vault
- Add Key Vault reference to App Service configuration
- Create initial schema:
  - `trivia_questions` table (id, question, answer, explanation)
- Seed one trivia question
- API endpoint to fetch trivia question
- Frontend displays the question and answer

**Database schema (minimal):**
```sql
CREATE TABLE trivia_questions (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT
);
```

**Proves:**
- PostgreSQL provisioned and accessible
- Connection string stored securely in Key Vault
- App Service reads connection string via Key Vault reference
- Basic read query works

**Checkpoint:** Production app displays trivia question fetched from PostgreSQL (connection string from Key Vault).

---

### 1.6 PIN Gating

**Build:**
- `app_config` table to store Guest PIN and Admin PIN
- PIN entry screen as the app entry point
- Validation endpoint (`POST /api/auth/validate-pin`)
- Session token issued on success (JWT or secure cookie)
- Protected routes require valid session

**Database addition:**
```sql
CREATE TABLE app_config (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO app_config (key, value) VALUES ('guest_pin', '1234');
INSERT INTO app_config (key, value) VALUES ('admin_pin', '9999');
```

**Proves:**
- Auth flow works end-to-end
- Session handling in production
- Protected content is actually protected

**Checkpoint:** Cannot access trivia without correct PIN. Correct PIN grants access. Session persists across refresh.

---

### 1.7 Envelope Data Model & State Persistence

**Build:**
- `envelopes` table (id, type, title, subtitle, status, order_index)
- `envelope_completions` table (envelope_id, participant_id, completed_at)
- API endpoints:
  - `GET /api/envelopes` — list all envelopes with status
  - `POST /api/envelopes/:id/open` — mark as opened
  - `POST /api/envelopes/:id/complete` — mark as completed
- Trivia envelope appears as "sealed" initially
- Opening the envelope updates status to "opened"
- Completing the trivia updates status to "completed"
- State persists across page refresh and new sessions

**Database schema:**
```sql
CREATE TABLE envelopes (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  subtitle TEXT,
  status VARCHAR(20) DEFAULT 'sealed',
  order_index INTEGER
);

CREATE TABLE envelope_completions (
  id SERIAL PRIMARY KEY,
  envelope_id INTEGER REFERENCES envelopes(id),
  participant_id VARCHAR(50),
  completed_at TIMESTAMP DEFAULT NOW()
);
```

**Proves:**
- Write path to database
- State model is correct
- Data integrity across sessions

**Checkpoint:** Open envelope, refresh page, envelope still shows as opened. Complete trivia, close browser, return later, envelope shows completed.

---

### 1.8 PWA / Offline Shell

**Build:**
- Service worker caches app shell
- Web app manifest for installability
- App loads when offline (shows cached UI)
- Graceful reconnection behavior
- Offline indicator in UI

**Proves:**
- Service worker registered and functional
- Cache strategy works
- Offline-first architecture viable

**Checkpoint:** Load app, go offline, refresh — app shell still loads. Go online, data syncs.

---

## Phase 2: Would You Rather (Two-Device Sync)

With Trivia working end-to-end, add the first two-participant feature. This introduces real-time sync and vote coordination.

### 2.1 Azure SignalR Service

**Build:**
- Provision Azure SignalR Service
- Store connection string in Key Vault
- Add Key Vault reference to App Service configuration
- Backend hub for real-time messaging
- Frontend connects to SignalR on app load
- Test with simple "ping" message broadcast

**Proves:**
- SignalR provisioned and accessible
- Connection string stored securely in Key Vault
- Real-time connection established

**Checkpoint:** Open app on two devices, send test message, both receive it.

---

### 2.2 Two-Participant Model

**Build:**
- `participants` table (id, session_id, name, device_identifier)
- Participant identity established on PIN entry
- Session tracks which participant is which (A vs B)
- SignalR groups scoped to session

**Database addition:**
```sql
CREATE TABLE participants (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  name VARCHAR(100),
  device_identifier VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Proves:**
- Multi-user session model works
- Participants distinguishable

**Checkpoint:** Two devices logged in with same PIN, both see the app, identifiable as different participants.

---

### 2.3 Would You Rather: Voting Flow

**Build:**
- `would_you_rather_prompts` table (id, option_a, option_b, envelope_id)
- `votes` table (id, prompt_id, participant_id, choice, created_at)
- API endpoints:
  - `GET /api/wyr/:envelope_id/prompt` — get current prompt
  - `POST /api/wyr/:prompt_id/vote` — submit vote
- Each participant selects an option
- Selection saved to database, scoped to participant

**Database schema:**
```sql
CREATE TABLE would_you_rather_prompts (
  id SERIAL PRIMARY KEY,
  envelope_id INTEGER REFERENCES envelopes(id),
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL
);

CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  prompt_id INTEGER NOT NULL,
  participant_id INTEGER REFERENCES participants(id),
  choice VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Proves:**
- Per-participant data writes
- No cross-contamination of responses

**Checkpoint:** Participant A votes, Participant B votes independently, both votes stored correctly.

---

### 2.4 Real-Time Vote Reveal

**Build:**
- When vote is submitted, broadcast via SignalR
- When both participants have voted, trigger reveal
- UI updates on both devices simultaneously
- Reveal screen shows both choices side-by-side

**SignalR messages:**
- `vote_submitted` — notify other participant that a vote is in
- `reveal_ready` — trigger reveal on both devices

**Proves:**
- Real-time sync infrastructure
- Event-driven UI updates
- Two-device coordination

**Checkpoint:** A votes, B votes, both devices immediately show the reveal screen without refresh.

---

### 2.5 Envelope Completion (Two-Participant)

**Build:**
- Envelope marked complete only when both participants have finished
- Completion state broadcast via SignalR
- Completed envelope visual state on both devices

**Proves:**
- Two-participant completion logic
- State sync for envelope status

**Checkpoint:** Both complete the Would You Rather, envelope shows completed on both devices.

---

## Phase 3: Letters to Baby (Text Input + Media)

Adds user-generated content and media attachments.

### 3.1 Letter Writing & Persistence

**Build:**
- `letters` table (id, envelope_id, participant_id, prompt, content, created_at, updated_at)
- Letter writing interface with prompt
- Auto-save or explicit save
- Each participant writes their own letter

**Database schema:**
```sql
CREATE TABLE letters (
  id SERIAL PRIMARY KEY,
  envelope_id INTEGER REFERENCES envelopes(id),
  participant_id INTEGER REFERENCES participants(id),
  prompt TEXT,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Proves:**
- Text input persistence
- Per-participant content storage

**Checkpoint:** Write a letter, refresh, letter content persists.

---

### 3.2 Azure Blob Storage Setup

**Build:**
- Provision Azure Blob Storage account
- Create container for media uploads
- Configure CORS for direct browser uploads
- Store connection string in Key Vault
- Add Key Vault reference to App Service configuration
- Generate SAS tokens for secure uploads

**Proves:**
- Blob Storage provisioned and accessible
- Connection string stored securely in Key Vault
- CORS configured correctly
- SAS token generation works

**Checkpoint:** Can generate a SAS URL from the API.

---

### 3.3 Media Upload Flow

**Build:**
- `media` table (id, blob_url, thumbnail_url, uploaded_by, created_at)
- Upload endpoint returns SAS URL
- Frontend uploads directly to Blob Storage
- On upload complete, save record to database
- Associate media with letter

**Database schema:**
```sql
CREATE TABLE media (
  id SERIAL PRIMARY KEY,
  blob_url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploaded_by INTEGER REFERENCES participants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE letters ADD COLUMN media_id INTEGER REFERENCES media(id);
```

**Proves:**
- File upload pipeline works
- Blob Storage accessible from browser
- Media association with content

**Checkpoint:** Attach photo to letter, save, reload, photo still attached and displays.

---

### 3.4 Media Library

**Build:**
- API endpoint to list all uploaded media
- Media library UI component
- Can select from library or upload new when attaching to letter

**Proves:**
- Shared media pool works
- Selection from existing media

**Checkpoint:** Photo uploaded in letter appears in media library. Can attach library photo to different letter.

---

## Phase 4: Baby Name Game (AI Integration)

Adds AI-generated content following the locked prompt contract.

### 4.1 Anthropic API Integration

**Build:**
- Store Anthropic API key in Key Vault
- Add Key Vault reference to App Service configuration
- API endpoint (`POST /api/names/generate`) that calls Anthropic
- Simple test prompt, return raw response
- Frontend displays the response

**Proves:**
- Anthropic API reachable from App Service
- API key stored securely in Key Vault
- Response parsing works

**Checkpoint:** Hit endpoint, receive response from Claude, display in UI.

---

### 4.2 Prompt Contract Implementation

**Build:**
- System prompt per the locked contract (Section 10 of blueprint)
- Base context with cultural background and neutrality rules
- Structured JSON output parsing
- Validate response matches expected schema

**Expected response schema:**
```json
{
  "names": [
    {
      "name": "Amara",
      "origin": ["Igbo", "Latin"],
      "meaning": "Grace; eternal",
      "notes": "Soft vowel sounds with a confident rhythm."
    }
  ]
}
```

**Proves:**
- Prompt contract correctly implemented
- JSON parsing reliable

**Checkpoint:** Generate names, response matches schema, names display with origin/meaning/notes.

---

### 4.3 Session State Tracking

**Build:**
- `name_game_sessions` table (id, envelope_id, created_at)
- `name_game_names` table (id, session_id, name, origin, meaning, notes, shown_at)
- `name_game_votes` table (id, name_id, participant_id, vote)
- Track names shown in session
- Track names declined by both participants
- Include exclusion list in prompt

**Database schema:**
```sql
CREATE TABLE name_game_sessions (
  id SERIAL PRIMARY KEY,
  envelope_id INTEGER REFERENCES envelopes(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE name_game_names (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES name_game_sessions(id),
  name VARCHAR(100) NOT NULL,
  origin TEXT,
  meaning TEXT,
  notes TEXT,
  shown_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE name_game_votes (
  id SERIAL PRIMARY KEY,
  name_id INTEGER REFERENCES name_game_names(id),
  participant_id INTEGER REFERENCES participants(id),
  vote VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Proves:**
- Session state maintained across rounds
- No-repeat constraint enforced

**Checkpoint:** Generate names, decline some, generate again, declined names don't reappear.

---

### 4.4 Two-Participant Voting on Names

**Build:**
- Each participant votes Love/Maybe/Nope independently
- Votes synced via SignalR
- Results revealed when both complete voting
- Matches, conflicts, and shortlist views

**Proves:**
- Vote coordination (builds on Phase 2 patterns)
- Results aggregation logic

**Checkpoint:** Both vote on names, see matches and conflicts correctly categorized.

---

### 4.5 Multi-Round Flow with Tweaks

**Build:**
- "Start new round" with optional tweak input
- Tweak text normalized and included in prompt
- Shortlist persists across rounds
- Multiple rounds within single envelope

**Proves:**
- Round progression
- Tweak input affects results
- Cumulative state (shortlist)

**Checkpoint:** Complete multiple rounds with different tweaks, shortlist accumulates favorites.

---

## Phase 5: Gender Reveal (Two-Key Ceremony)

The most complex activity. Only build after all other systems are proven.

### 5.1 Admin Mode & Secret Configuration

**Build:**
- Admin PIN unlocks configuration mode
- `gender_reveal_config` table (gender_value, key_a, key_b, available_from, available_until)
- Gender value stored server-side only, never sent to client until reveal
- UI to set gender and generate/set keys

**Database schema:**
```sql
CREATE TABLE gender_reveal_config (
  id SERIAL PRIMARY KEY,
  gender_value VARCHAR(20) NOT NULL,
  key_a VARCHAR(50) NOT NULL,
  key_b VARCHAR(50) NOT NULL,
  available_from TIMESTAMP,
  available_until TIMESTAMP,
  revealed_at TIMESTAMP
);
```

**Proves:**
- Admin mode separation
- Secure server-side secret storage

**Checkpoint:** Configure reveal in admin mode. Gender value not exposed in any client API response.

---

### 5.2 Two-Key Validation

**Build:**
- `gender_reveal_unlocks` table (config_id, participant_id, key_entered, validated_at)
- Each participant enters their key
- Keys validated server-side
- Track which keys have been validated
- Reveal only triggers when both keys validated

**Database schema:**
```sql
CREATE TABLE gender_reveal_unlocks (
  id SERIAL PRIMARY KEY,
  config_id INTEGER REFERENCES gender_reveal_config(id),
  participant_id INTEGER REFERENCES participants(id),
  key_entered VARCHAR(50) NOT NULL,
  valid BOOLEAN NOT NULL,
  validated_at TIMESTAMP DEFAULT NOW()
);
```

**SignalR messages:**
- `key_validated` — notify that one key is in
- `reveal_unlocked` — trigger reveal sequence on both devices

**Proves:**
- Two-key unlock logic
- Server-side validation prevents spoofing
- Cannot reveal with only one key

**Checkpoint:** One key entered — nothing revealed. Both keys entered — reveal triggers.

---

### 5.3 Dramatic Reveal Sequence

**Build:**
- Full-screen transition (fade out UI chrome)
- Countdown or breathing animation
- Gender value fetched only after both keys validated
- Final reveal screen with celebratory effects
- Activity marked complete
- Replayable (shows completed state, can replay animation)

**Proves:**
- Ceremony UX works
- State transitions correctly
- Replayability

**Checkpoint:** Complete reveal, experience the full ceremony, close and reopen — can replay.

---

## Phase 6: Polish & Remaining Features

With all core activities working, complete the experience.

### 6.1 Slideshow / Media Shuffle

**Build:**
- Shuffle mode for media library
- Full-screen slideshow view
- Random "memory cards" surface between activities (optional ambient mode)

---

### 6.2 Spotify Integration

**Build:**
- `app_config` entry for Spotify playlist URL
- Admin UI to set playlist
- Persistent header button to open playlist
- Opens in Spotify app or web player

---

### 6.3 Full Envelope Catalog

**Build:**
- Seed all 13 initial envelopes per Section 9 of blueprint:
  1. The Big Reveal (Gender Reveal)
  2-4. Would You Rather #1-3
  5-7. Baby Trivia #1-3
  8-10. Letter to Baby (3 prompts)
  11-12. Relationship & Reflection (2 prompts)
  13. Baby Name Game
- Seed Would You Rather prompts for each envelope
- Seed Trivia questions for each envelope
- Seed Letter prompts

---

### 6.4 Visual Polish

**Build:**
- Envelope open/sealed/completed visual states
- Opening animation transitions
- Celebratory effects (confetti, reveals)
- Warm color palette per blueprint
- Large touch targets, minimal text density

---

### 6.5 Offline Robustness

**Build:**
- Queued writes while offline
- Conflict resolution on reconnect (append-only model)
- Offline indicator
- Full offline activity support for single-participant activities

---

## Summary: Build Order at a Glance

| Phase | Step | Key Proof |
|-------|------|-----------|
| 1.1 | App Service + GitHub Actions | Deployment pipeline works |
| 1.2 | Front Door + Porkbun DNS | Custom domain + HTTPS works |
| 1.3 | Key Vault | Secrets management works |
| 1.4 | API endpoint | Backend routing works |
| 1.5 | PostgreSQL | Database works |
| 1.6 | PIN gating | Auth works |
| 1.7 | Envelope state | Persistence works |
| 1.8 | PWA/Offline | Offline shell works |
| 2.1 | SignalR | Real-time connection works |
| 2.2 | Two-participant model | Multi-user session works |
| 2.3 | WYR voting | Per-participant writes work |
| 2.4 | Real-time reveal | Two-device sync works |
| 2.5 | Two-participant completion | Completion logic works |
| 3.1 | Letter writing | Text persistence works |
| 3.2 | Blob Storage setup | Storage provisioned |
| 3.3 | Media upload | Upload pipeline works |
| 3.4 | Media library | Shared media works |
| 4.1 | Anthropic API | AI integration works |
| 4.2 | Prompt contract | Structured output works |
| 4.3 | Session state | No-repeat constraint works |
| 4.4 | Name voting | Vote coordination works |
| 4.5 | Multi-round + tweaks | Round progression works |
| 5.1 | Admin config | Secret storage works |
| 5.2 | Two-key validation | Two-key unlock works |
| 5.3 | Reveal sequence | Ceremony works |
| 6.x | Polish | Full experience complete |

**Each phase checkpoint must pass in production before proceeding to the next.**
