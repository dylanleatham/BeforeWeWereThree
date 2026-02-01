# Domain Pitfalls

**Project:** Before We Were Three - Interactive Babymoon Web App
**Domain:** Azure-hosted real-time PWA with two-device sync
**Researched:** 2026-02-01
**Confidence:** HIGH (verified against official Microsoft docs, OpenAI docs, MDN)

---

## Critical Pitfalls

Mistakes that cause rewrites, security breaches, or major architectural problems.

---

### Pitfall 1: SignalR Has NO Message Delivery Guarantees

**What goes wrong:**
Developers assume SignalR guarantees message delivery. It does not. Azure SignalR Service has no message acknowledgment, no retry mechanism, and no built-in persistence. Messages sent while a client is disconnecting are lost permanently.

**Why it happens:**
SignalR feels like a message queue but is architecturally different. The "real-time" framing obscures that it's fire-and-forget.

**Consequences:**
- Vote submissions lost during network blips
- Reveal signals fail to reach one device
- "Both voted" state becomes inconsistent between devices

**Prevention:**
1. **Never rely on SignalR alone for critical state changes.** Persist to database first, then broadcast.
2. **Implement client-side acknowledgment:** Client sends ack message; server retries if no ack within timeout.
3. **Use hybrid approach:** SignalR for real-time notifications, but clients poll/fetch authoritative state from API.
4. **Add sequence numbers to messages** and handle reordering on client.

**Detection (warning signs):**
- Tests pass locally but fail under network throttling
- "It worked on my machine" for real-time features
- Intermittent "out of sync" user reports

**Which phase should address:**
Phase 1 (Infrastructure) - Design the acknowledgment pattern before building features.

**Sources:**
- [SignalR Message Deliverability](https://consultwithgriff.com/signalr-message-guarantee-deliverability/)
- [GitHub Issue #42874](https://github.com/dotnet/aspnetcore/issues/42874)
- [Azure SignalR Troubleshooting Guide](https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-howto-troubleshoot-guide)

---

### Pitfall 2: Gender Reveal Secret Can Leak via Timing/Side-Channel

**What goes wrong:**
The gender value (boy/girl) leaks to the client before the reveal through:
- API response time differences (timing attack)
- Error message variations
- Payload size differences
- Browser DevTools network inspection

**Why it happens:**
Developers focus on access control ("don't return the secret") but forget information can leak through metadata.

**Consequences:**
- Reveal is spoiled for curious/technical users
- Entire product premise is undermined

**Prevention:**
1. **Constant-time operations:** All API responses should take the same time regardless of gender value.
2. **Fixed payload sizes:** Pad responses so boy/girl responses are identical byte lengths.
3. **Server-side rendering of reveal:** Never send gender to client until both keys validated; render reveal content server-side or use encrypted payload that client decrypts only with combined key.
4. **No conditional UI based on gender until reveal:** Don't load different assets, colors, or content.
5. **Two-party key validation:** Neither party alone can trigger reveal; require cryptographic proof both keys were submitted.

**Detection (warning signs):**
- Different API endpoints for different genders
- Client-side logic that branches on gender
- Assets named "boy.png" / "girl.png" in build output

**Which phase should address:**
Phase 1 (Infrastructure) - Design the secret storage architecture before any reveal logic.

**Confidence:** HIGH (logical security analysis + cryptographic principles)

---

### Pitfall 3: Service Worker Cache Invalidation Creates "Cached Forever" Users

**What goes wrong:**
Users get stuck on old versions of the app. The service worker itself is cached, preventing updates from deploying. Safari is particularly aggressive, and users report seeing content that's days or weeks old.

**Why it happens:**
- `skipWaiting()` used incorrectly, causing mixed asset versions
- Service worker file itself is cached with long TTL
- No user-facing "update available" mechanism
- Cache-first strategy applied too broadly

**Consequences:**
- Bug fixes don't reach users
- New features appear broken (JS expects API changes that haven't arrived)
- Support tickets about "old content"
- Safari users hit aggressive cache eviction and lose offline data

**Prevention:**
1. **Set `Cache-Control: max-age=0, no-cache` for service-worker.js** - browsers re-check every 24 hours maximum, but this ensures immediate checks.
2. **Never call `skipWaiting()` in install handler.** Use controlled update flow: detect update -> notify user -> user accepts -> then skipWaiting + reload.
3. **Version your cache names:** `cache-v2`, `cache-v3`. Delete old caches in activate event.
4. **Keep service worker focused:** Cache static assets only. Let API requests go to network.
5. **Add manual "check for updates" button** as escape hatch.
6. **Use `stale-while-revalidate` cautiously** - good for performance, but can serve stale content.

**Detection (warning signs):**
- "Just refresh the page" doesn't fix user issues
- Users report seeing old version numbers
- Deployment doesn't seem to reach users for 24+ hours

**Which phase should address:**
Phase 2 (PWA Foundation) - Get caching strategy right before adding offline features.

**Sources:**
- [Taming PWA Cache Behavior](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior)
- [MDN: Caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)
- [skipWaiting Race Conditions](https://allanchain.github.io/blog/post/pwa-skipwaiting/)

---

### Pitfall 4: Two-Device Sync Resolves Data Conflicts But Not Business Logic Conflicts

**What goes wrong:**
CRDTs or last-write-wins merge algorithms work perfectly at the data level, but violate business rules. Example: Both devices "vote" offline, CRDT merges both votes, but business rule says each person gets ONE vote.

**Why it happens:**
Developers conflate "data consistency" with "business rule enforcement." CRDTs solve the former, not the latter.

**Consequences:**
- Double-voting, over-allocation, impossible states
- "The system let me vote twice"
- Eventual consistency arrives too late for business needs

**Prevention:**
1. **Server-authoritative for hard constraints:** Voting, reveal triggers, anything with business rules must be validated server-side.
2. **Optimistic UI with server confirmation:** Show the vote locally, but don't consider it "real" until server confirms.
3. **Conflict detection, not just resolution:** When sync happens, detect business rule violations and surface to user.
4. **Design for the offline gap:** What if someone is offline for 20 minutes? What decisions made on stale data are acceptable?

**Detection (warning signs):**
- Business rules only enforced in client-side validation
- "It's fine, CRDT handles conflicts" without specifying which conflicts
- No server-side validation for critical operations

**Which phase should address:**
Phase 3 (Real-time Sync) - Design the voting system with server authority from day one.

**Sources:**
- [CRDTs Alone Aren't Enough](https://dev.to/biozal/the-cascading-complexity-of-offline-first-sync-why-crdts-alone-arent-enough-2gf)
- [CRDT.tech](https://crdt.tech/)

---

### Pitfall 5: Key Vault Secrets Cached for 24 Hours Despite Restart

**What goes wrong:**
Developer rotates a secret in Key Vault, restarts App Service, but the app still uses the old secret. Azure caches Key Vault references for up to 24 hours.

**Why it happens:**
Azure caches for performance and availability. A restart doesn't clear the cache - it's platform-level caching, not in-app caching.

**Consequences:**
- Emergency credential rotation doesn't take effect immediately
- Confusion during incident response
- "But I restarted the app!" debugging sessions

**Prevention:**
1. **Stop and Start (not Restart):** Stopping the app and starting it again clears the cache more reliably than restart.
2. **Use versioned secrets:** Reference `@Microsoft.KeyVault(SecretUri=https://vault.vault.azure.net/secrets/secret/VERSION)` to force a specific version.
3. **Plan for cache lag:** Design rotation procedures knowing there's a delay.
4. **Toggle managed identity:** As a last resort, disabling and re-enabling system-assigned identity forces credential refresh.
5. **Prefer managed identity over secrets where possible:** For Azure-to-Azure auth (e.g., to PostgreSQL), use managed identity directly instead of storing connection strings.

**Detection (warning signs):**
- App still works after you deleted or changed a secret
- "Secret not found" errors appearing intermittently
- Rotation procedures that say "wait 24 hours"

**Which phase should address:**
Phase 1 (Infrastructure) - Set up Key Vault correctly from the start.

**Sources:**
- [Key Vault References in App Service](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references)
- [App Service Not Refreshing Secrets](https://learn.microsoft.com/en-my/answers/questions/5727297/azure-app-service-not-refreshing-key-vault-secret)

---

### Pitfall 6: OpenAI Structured Outputs Schema Constraints Break Existing Models

**What goes wrong:**
Your Pydantic/TypeScript schema works fine with regular JSON mode but fails with Structured Outputs. The API returns 400 errors or unexpected validation failures.

**Why it happens:**
OpenAI's Structured Outputs requires a strict subset of JSON Schema:
- `additionalProperties: false` required at every level
- ALL fields must be in `required` array (no optional fields)
- Optional fields must use union types: `["string", "null"]`
- No `minimum`, `maximum`, `default` constraints
- Root must be object (no `anyOf` at root)
- First request with new schema has latency penalty

**Consequences:**
- Existing schemas need rewriting
- Optional fields silently become required (breaking changes)
- Intermittent failures if schema validation is strict

**Prevention:**
1. **Design schemas for Structured Outputs from the start:** All fields required, use nullable unions for optional.
2. **Test with strict mode early:** Don't wait until production to discover schema issues.
3. **Add schema transformation layer:** If using existing Pydantic models, transform them before sending to API.
4. **Handle first-request latency:** The first request with a new schema is slower; warm up schemas at startup.
5. **Validate AI output server-side anyway:** Even with Structured Outputs, validate business rules.

**Example schema pattern:**
```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "nickname": { "type": ["string", "null"] }
  },
  "required": ["name", "nickname"],
  "additionalProperties": false
}
```

**Detection (warning signs):**
- 400 errors mentioning "additionalProperties" or "required"
- Schema works in JSON mode but fails in Structured Outputs
- First API call is much slower than subsequent calls

**Which phase should address:**
Phase 4 (AI Integration) - Design name generation schemas with these constraints.

**Sources:**
- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)
- [Structured Outputs Breaking Pydantic](https://medium.com/@aviadr1/how-to-fix-openai-structured-outputs-breaking-your-pydantic-models-bdcd896d43bd)

---

## Moderate Pitfalls

Mistakes that cause delays, performance issues, or significant technical debt.

---

### Pitfall 7: iOS PWA Limitations Cripple Offline Features

**What goes wrong:**
Features that work on Android/Chrome fail silently on iOS Safari:
- Background Sync API not supported
- Periodic Background Sync not supported
- Push notifications unreliable or require different implementation
- Storage evicted aggressively (7-day cap, ~50MB limit)
- EU users hit additional restrictions (DMA compliance)

**Why it happens:**
Apple has historically limited PWA capabilities on iOS. Safari is always 1-3 years behind Chrome.

**Consequences:**
- "Works on Android" but iOS users have degraded experience
- Offline data mysteriously disappears after a week of non-use
- Background sync queues never process on iOS

**Prevention:**
1. **Test on iOS from day one.** Not just Safari desktop - actual iOS device or simulator.
2. **Don't rely on Background Sync:** Use foreground sync with retry when app opens.
3. **Request persistent storage:** Call `navigator.storage.persist()` to reduce eviction risk.
4. **Design for storage limits:** Keep IndexedDB small; don't cache large media offline.
5. **Handle EU restrictions:** Detect region and adjust PWA behavior accordingly.
6. **Provide manual sync button:** Users can trigger sync when Background Sync fails.

**Detection (warning signs):**
- QA only tests on Chrome/Android
- "Background sync" appears in architecture docs without iOS fallback
- User reports from iOS are different than Android

**Which phase should address:**
Phase 2 (PWA Foundation) - Establish iOS baseline before building offline features.

**Sources:**
- [PWA iOS Limitations Guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [MDN: Storage Quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

---

### Pitfall 8: PostgreSQL Burstable Tier Causes Production Performance Issues

**What goes wrong:**
Development works fine on B1/B2 tier, then production performance is erratic - sometimes fast, sometimes very slow. CPU credits run out, and queries that took 50ms now take 5 seconds.

**Why it happens:**
Burstable (B-series) SKUs accumulate CPU credits when idle and burn them when busy. Once credits exhaust, you're throttled to baseline.

**Consequences:**
- Intermittent slowdowns under load
- Query Store can't even be enabled (causes performance issues on Burstable)
- Autovacuum gets starved, making problems worse over time

**Prevention:**
1. **Never use Burstable for production.** Use General Purpose (D-series) or Memory Optimized.
2. **Enable PgBouncer:** Built-in connection pooler reduces connection overhead.
3. **Monitor CPU credits in Azure Portal:** Watch for credit exhaustion patterns.
4. **Run ANALYZE after failover:** Statistics reset; optimizer makes bad decisions without fresh stats.
5. **Configure autovacuum:** Default settings may be too conservative for your workload.

**Detection (warning signs):**
- "It was fast this morning but slow now"
- CPU utilization graph shows sawtooth pattern
- Connection count spikes correlating with slowdowns

**Which phase should address:**
Phase 1 (Infrastructure) - Choose the right tier from the start; migration is disruptive.

**Sources:**
- [PostgreSQL Flexible Server Troubleshooting](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-troubleshooting-guides)
- [Flexible Server Performance Issues](https://learn.microsoft.com/en-us/answers/questions/2119423/flexible-server-performance)

---

### Pitfall 9: SAS Token Over-Permissioning and Untraceability

**What goes wrong:**
A SAS token leaks (in logs, error messages, or client-side code). You can't revoke it. You can't trace who used it. You realize the token grants write access to the entire container, not just one blob.

**Why it happens:**
- SAS generation is easy; secure SAS generation is hard
- Default is account-level SAS with broad permissions
- No built-in audit trail for token usage
- Ad-hoc SAS tokens cannot be revoked short of rotating storage keys

**Consequences:**
- Data breach with no forensics
- Can't revoke access without rotating storage account keys (breaks everything)
- Malicious upload/deletion possible if write permissions included

**Prevention:**
1. **Use User Delegation SAS:** Secured with Microsoft Entra credentials; more auditable.
2. **Use Stored Access Policies:** Can be modified/revoked without key rotation.
3. **Minimum permissions:** `Read` only if that's all you need. Never `Write` + `Delete` together unless required.
4. **Short expiration:** 15-60 minutes for upload tokens. Regenerate as needed.
5. **Never log SAS tokens:** Strip query string before logging URLs.
6. **Per-blob, not per-container:** Generate SAS for specific blob paths, not container-level.
7. **HTTPS only:** Set `spr=https` to prevent interception.

**Detection (warning signs):**
- SAS tokens visible in frontend code
- Tokens with multi-day or no expiration
- Container-level permissions when blob-level suffice
- No stored access policy in use

**Which phase should address:**
Phase 3 (Media Upload) - Design secure upload flow before implementing.

**Sources:**
- [Azure SAS Token Risks](https://www.cyera.com/blog/understanding-the-risks-of-azure-sas-tokens)
- [Azure Blob SAS Guidelines](https://markheath.net/post/azure-blob-sas-guidelines)

---

### Pitfall 10: OpenAI Rate Limits and Cost Overruns

**What goes wrong:**
API returns 429 errors, breaking user experience. Or worse, no errors but a $500 bill at the end of the month.

**Why it happens:**
- Rate limits are per-minute AND per-day AND per-organization
- Failed requests still count against limits
- Aggressive retries burn request budget
- No cost visibility until billing cycle

**Consequences:**
- Service degradation during peak usage
- Unexpected bills
- Organization-wide rate limit affects all team projects

**Prevention:**
1. **Implement exponential backoff with jitter:** Don't hammer the API after a 429.
2. **Add client-side request pacing:** If your rate limit is 60 RPM, add 1-second delay between requests.
3. **Cache AI responses:** Name suggestions don't change; cache aggressively.
4. **Set usage alerts in OpenAI dashboard:** Get notified before hitting limits.
5. **Use `max_tokens` wisely:** Reduce from default to expected output size.
6. **Batch requests when possible:** Multiple prompts in one request reduces RPM usage.
7. **Monitor `x-ratelimit-remaining-*` headers:** Track consumption in real-time.

**Detection (warning signs):**
- 429 errors in logs
- AI features "sometimes work"
- No cost monitoring set up
- Default `max_tokens` values in code

**Which phase should address:**
Phase 4 (AI Integration) - Build rate limiting and caching from the start.

**Sources:**
- [OpenAI Rate Limits Guide](https://platform.openai.com/docs/guides/rate-limits)
- [How to Handle Rate Limits](https://cookbook.openai.com/examples/how_to_handle_rate_limits)

---

### Pitfall 11: SignalR Connection Limit on Free Tier

**What goes wrong:**
App works in development. Deploy to Azure SignalR Free tier. Third connection fails mysteriously.

**Why it happens:**
- Free tier: **20 concurrent connections** maximum
- This includes BOTH client connections AND server connections
- Each app server instance creates 5 connections per hub by default

**Consequences:**
- 2 app servers + 1 hub = 10 server connections. Only 10 left for clients.
- Works during solo testing, fails when partner connects

**Prevention:**
1. **Use Standard tier for production:** 1,000 connections per unit.
2. **Calculate server connection consumption:** (app servers) * (hubs) * 5 = server connections.
3. **Monitor connection count in Azure Portal:** Free tier quota exhausts silently.
4. **Use Serverless mode if applicable:** Different billing, may be more cost-effective.

**Detection (warning signs):**
- "SignalR connection failed" errors when second device connects
- Works with one device, fails with two
- Free tier selected in Azure resource

**Which phase should address:**
Phase 1 (Infrastructure) - Select appropriate tier before building features.

**Sources:**
- [Azure SignalR Messages and Connections](https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-concept-messages-and-connections)
- [SignalR Performance Guide](https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-concept-performance)

---

### Pitfall 12: Deployment Slot Swaps Don't Preserve All Settings

**What goes wrong:**
Swap staging to production. Secrets or connection strings from staging are now in production, pointing to the wrong database.

**Why it happens:**
- By default, most settings swap with the code
- "Deployment slot setting" checkbox must be explicitly set for sticky settings
- Settings that exist in only one slot behave unpredictably

**Consequences:**
- Production connects to staging database
- API keys swap between environments
- "It worked in staging" because it had staging secrets

**Prevention:**
1. **Mark all secrets as "Deployment slot setting":** Do this in BOTH slots.
2. **Use Key Vault references:** Secrets in Key Vault, references in app settings - the reference itself is slot-specific.
3. **Use "Swap with Preview":** Validate what will move before completing swap.
4. **Ensure settings exist in both slots:** A setting only in staging has unpredictable swap behavior.
5. **Document which settings are sticky:** Maintain a config manifest.

**Detection (warning signs):**
- Different setting counts between slots
- Settings not marked as slot-specific
- No Swap with Preview in deployment procedure

**Which phase should address:**
Phase 1 (Infrastructure) - Set up slot configuration correctly in initial deployment.

**Sources:**
- [App Service Deployment Slots](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)
- [Slot Settings Not Preserved](https://learn.microsoft.com/en-us/answers/questions/5534787/deployment-slot-settings-copied-during-swap-and-no)

---

## Minor Pitfalls

Mistakes that cause annoyance or minor rework but are fixable.

---

### Pitfall 13: SignalR Token Lifetime Causes Hourly Disconnects

**What goes wrong:**
Connections drop exactly 1 hour after connecting. Users must refresh.

**Why it happens:**
Default JWT token lifetime for SignalR is 1 hour. Token expires, connection closes, no auto-reconnect.

**Prevention:**
1. **Implement reconnection logic in client:** Use `withAutomaticReconnect()` in SignalR client.
2. **Handle 401 specifically:** On 401, trigger full reconnect with fresh token.
3. **Don't extend token lifetime for security:** Instead, handle expiration gracefully.

**Sources:**
- [Azure SignalR FAQ](https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-resource-faq)

---

### Pitfall 14: IndexedDB Quota Errors Crash Offline Features

**What goes wrong:**
`QuotaExceededError` thrown when storing offline data. App crashes or silently fails to save.

**Why it happens:**
- Browser storage limits (33% of disk on Chrome, 10GB on Firefox, stricter on Safari)
- Large media files fill quota quickly
- No proactive quota checking

**Prevention:**
1. **Wrap all IndexedDB writes in try/catch:** Handle `QuotaExceededError` gracefully.
2. **Check quota before large writes:** Use `navigator.storage.estimate()`.
3. **Implement cache eviction:** LRU policy for large cached items.
4. **Request persistent storage:** `navigator.storage.persist()` reduces surprise eviction.

**Sources:**
- [IndexedDB Max Storage Limit](https://rxdb.info/articles/indexeddb-max-storage-limit.html)

---

### Pitfall 15: Sticky Sessions Required Even with Azure SignalR

**What goes wrong:**
Random disconnects and 404s when load balancer routes requests to different app servers.

**Why it happens:**
SignalR negotiation happens on one server; subsequent requests must go to the same server unless using WebSocket-only with SkipNegotiation.

**Prevention:**
1. **Configure sticky sessions (ARR Affinity) in App Service:** Enabled by default but can be disabled.
2. **Or use WebSocket-only with SkipNegotiation:** Removes server affinity requirement but sacrifices fallback transports.

**Sources:**
- [SignalR Scale-out Hosting](https://learn.microsoft.com/en-us/aspnet/core/signalr/scale?view=aspnetcore-9.0)

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|----------------|------------|
| 1 - Infrastructure | Azure SignalR | Free tier limits (Pitfall 11) | Start with Standard tier |
| 1 - Infrastructure | Key Vault | Secret caching (Pitfall 5) | Use versioned secrets, document rotation |
| 1 - Infrastructure | PostgreSQL | Wrong tier (Pitfall 8) | Never use Burstable for production |
| 1 - Infrastructure | Deployment Slots | Settings swap (Pitfall 12) | Mark secrets as slot-specific |
| 2 - PWA | Service Worker | Cache invalidation (Pitfall 3) | Controlled update flow, not skipWaiting |
| 2 - PWA | iOS | Limited APIs (Pitfall 7) | Test on iOS early, design fallbacks |
| 2 - PWA | IndexedDB | Quota errors (Pitfall 14) | Proactive quota management |
| 3 - Real-time | SignalR | No delivery guarantee (Pitfall 1) | Server-authoritative with ack pattern |
| 3 - Real-time | Two-device sync | Business logic conflicts (Pitfall 4) | Server validates all business rules |
| 3 - Media | SAS Tokens | Over-permissioning (Pitfall 9) | User Delegation SAS, short expiry |
| 4 - AI | OpenAI | Schema constraints (Pitfall 6) | Design for Structured Outputs from start |
| 4 - AI | OpenAI | Rate limits/cost (Pitfall 10) | Caching, pacing, monitoring |
| 5 - Reveal | Secret Storage | Information leakage (Pitfall 2) | Constant-time ops, server-side rendering |

---

## Project-Specific High-Risk Checklist

For "Before We Were Three" specifically:

- [ ] **Gender secret never sent to client** until both keys validated (Pitfall 2)
- [ ] **Voting is server-authoritative** with client-side optimistic UI (Pitfall 4)
- [ ] **SignalR broadcasts supplemented** with database persistence (Pitfall 1)
- [ ] **iOS tested** for every offline feature (Pitfall 7)
- [ ] **Service worker update flow** notifies user before activating (Pitfall 3)
- [ ] **SAS tokens scoped to single blob**, 15-minute expiry (Pitfall 9)
- [ ] **AI responses cached** to reduce API calls (Pitfall 10)
- [ ] **Standard tier** for both Azure SignalR and PostgreSQL (Pitfalls 8, 11)

---

## Sources Summary

### Official Microsoft Documentation
- [Azure SignalR Troubleshooting Guide](https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-howto-troubleshoot-guide)
- [Key Vault References in App Service](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references)
- [PostgreSQL Flexible Server Troubleshooting](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-troubleshooting-guides)
- [App Service Deployment Slots](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)
- [SignalR Scale-out Hosting](https://learn.microsoft.com/en-us/aspnet/core/signalr/scale?view=aspnetcore-9.0)

### OpenAI Documentation
- [OpenAI Rate Limits](https://platform.openai.com/docs/guides/rate-limits)
- [How to Handle Rate Limits](https://cookbook.openai.com/examples/how_to_handle_rate_limits)
- [Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)

### MDN Web Docs
- [Storage Quotas and Eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [PWA Caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)

### Community/Analysis
- [SignalR Message Deliverability](https://consultwithgriff.com/signalr-message-guarantee-deliverability/)
- [Azure SAS Token Risks](https://www.cyera.com/blog/understanding-the-risks-of-azure-sas-tokens)
- [CRDTs Alone Aren't Enough](https://dev.to/biozal/the-cascading-complexity-of-offline-first-sync-why-crdts-alone-arent-enough-2gf)
- [PWA iOS Limitations](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Taming PWA Cache Behavior](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior)
