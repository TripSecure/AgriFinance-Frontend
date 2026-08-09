# TripSecure — Security & Attack-Surface Assessment

**Scope**: Code-level security review of the Angular frontend (`src/`) and the adjacent `Agri-Finance-Backend` (Next.js + Supabase) API. This is a static/source-level audit, not a live penetration test — no traffic was sent to any deployed environment. Findings are based on tracing how data actually flows through both codebases.

## Verdict

This backend is better built than most fintech MVPs — real HMAC-hashed sessions, bcrypt, AES-256-GCM envelope encryption, DB-backed rate limiting, strict CORS, a solid CSP, and file-upload validation that re-verifies the stored object. But there's one architectural contradiction that undermines a lot of that work, one confirmed data-at-rest gap on the highest-volume PII table, zero database-level access control (RLS), and 6 unpatched high-severity dependency CVEs.

---

## Critical Findings

### 1. The httpOnly session cookie is decorative — the same secret is also handed to JavaScript

**File**: `Agri-Finance-Backend/src/app/api/auth/login/route.ts:37-48`

The backend does the right thing — it issues an `HttpOnly; Secure; SameSite=Strict` session cookie (`Agri-Finance-Backend/src/lib/auth/session.ts:18-32`) that JavaScript cannot read. Then, in the same response, it **also returns the identical raw session token in the JSON body** as `accessToken`. `requireAuthenticatedUser` (`Agri-Finance-Backend/src/lib/supabase/server.ts:212-231`) explicitly accepts *either* the cookie *or* a `Bearer` header against the same session record — this is a deliberate dual-auth design, not a leftover bug.

The Angular frontend does exactly what you'd expect with a token handed to it: reads `response.data.accessToken`, stores it in `localStorage`/`sessionStorage` (`src/app/pages/auth/services/auth/auth.states.ts`), and replays it as `Authorization: Bearer` on every request (`src/app/interceptors/auth.interceptor.ts`).

**Attack**: one XSS anywhere in the SPA (a PrimeNG/Material component bug, a future `innerHTML`, a compromised npm package) reads `localStorage`, exfiltrates the token, and the attacker has a fully valid 7-day session (`APP_SESSION_DAYS=7`) — `httpOnly` never comes into play because the same secret was handed to JS on a silver platter. The defense was built and then bypassed in the same function.

**Fix**: pick one model.
- (a) Stop returning `accessToken` in the body — rely on the cookie alone, drop the Angular interceptor and localStorage/sessionStorage persistence entirely. Best option since the cookie infrastructure is already correct.
- (b) If a separate, non-browser API consumer genuinely needs bearer auth, issue *two different tokens* — a cookie-bound one for the SPA and a separate, shorter-lived bearer token for other clients. Never the same secret twice.

---

### 2. Farmer PII is stored in plaintext; KYC/registration PII is encrypted

Encryption at rest exists and is well built — `Agri-Finance-Backend/src/lib/security/data-protection.ts` implements AES-256-GCM envelope encryption with a separate SHA-256 lookup hash for uniqueness checks (so encrypted columns stay searchable). It's used correctly in `Agri-Finance-Backend/src/lib/services/kyc-record.service.ts` for officer/institution registration — `national_id`, `tin`, `business_registration_number`, `institution_license_number`, and the full `personal_details`/`organization_details` JSON blobs are all encrypted.

**But `createFarmer`** (`Agri-Finance-Backend/src/lib/services/farmers.service.ts:154-171`) inserts `national_id`, `phone`, `email`, `gps_location`, `farm_size_hectares`, `production_history` **as plain columns** — no call to `encryptStringAtRest`/`encryptJsonAtRest` anywhere in that file. The `farmers` table is the core beneficiary dataset of the whole program — every farmer's national ID, GPS location, and financial/production history — and it's the one table the encryption layer never touched.

**Attack**: a database dump (backup misconfiguration, a leaked `SUPABASE_SERVICE_ROLE_KEY`, an infra breach at the hosting provider) exposes every farmer's national ID and location in cleartext, while the KYC table right next to it is safely encrypted. Selective encryption like this usually means it was added late for one workflow and never backported to the others.

**Fix**: apply `encryptStringAtRest`/`hashLookupValue` to `farmers.national_id`/`phone`/`email` the same way `kyc-record.service.ts` does, with a migration to encrypt existing rows and add `_hash` uniqueness columns — the pattern already exists in `supabase/migrations/20260626113000_encryptable_kyc_hash_columns.sql`, it just needs to be applied to `farmers` too.

---

### 3. No Row Level Security — every query runs with service-role admin privileges

A search for `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` across all 7 migrations returns nothing, and `createAdminClient()` (service-role key, bypasses RLS entirely) is the *only* Supabase client used across all 16 files that talk to the database.

The per-record authorization that does exist is genuinely careful — `getFarmerDetail` and `getLoanApplication` correctly check portfolio-officer ownership, extension-officer assigned-farm membership, and bank loan association before returning data.

The problem is architectural: **that hand-written check is the only thing standing between "authenticated" and "the entire database."** There is no database-level backstop. One missed `assertRole`/ownership check in one service function — a new endpoint, a refactor, a future contributor unfamiliar with the convention — becomes a full IDOR/data-breach with zero defense in depth, because the Postgres connection itself has admin privileges regardless of what the calling code intended.

**Fix**: enable RLS on every table and add policies that mirror the existing app-level checks. Keep the app-level checks (they're good) — RLS becomes the backstop for the day one of them is missing.

---

## High Findings

### 4. Unpatched dependencies with known CVEs

`npm audit` on `Agri-Finance-Backend` reports **6 high-severity vulnerabilities**, all with fixes available:
- **Next.js**: SSRF via rewrites (attacker-controlled destination hostname), DoS via SVG image optimization, and **unauthenticated disclosure of internal Server Function endpoints**
- **postcss**: path traversal → arbitrary `.map` file disclosure
- **sharp / libvips**: multiple CVEs, inherited transitively via `wrangler`/`miniflare`

The Next.js "unauthenticated disclosure of internal Server Function endpoints" advisory is worth prioritizing given this app runs on Cloudflare Workers via `@opennextjs/cloudflare`.

**Fix**: run `npm audit fix` in `Agri-Finance-Backend`, then re-test the Cloudflare Workers deploy end to end.

### 5. Session/API contract mismatch between the two repos

The Angular app calls `${environment.api}/admin/users`, `/portfolio/farmers`, `/auth/login/request-otp` against `https://api.tripsecureagrifinanceltd.com/api`. This backend exposes `/api/farmers`, `/api/loan-applications`, `/api/auth/login/request-otp` — some paths line up, several don't (`/admin/users` doesn't exist here at all).

It's not possible to confirm from the code alone whether this backend is what's actually deployed at that production URL, or whether the Angular app is talking to a different, older system. If it's the latter, the good practices documented above (encryption, rate limiting, headers) may not be what's protecting production traffic today. **Confirm which backend is actually live before treating either audit as authoritative for current production exposure.**

---

## Medium Findings

- **Username/phone enumeration via timing side-channel** — `Agri-Finance-Backend/src/lib/services/authentication.service.ts:59-100`. When the identity doesn't exist, the function returns immediately; when it exists but the password is wrong, it runs a full `bcrypt.compare` first. That timing difference lets an attacker enumerate valid phone numbers/emails even though the returned error message is identical in both cases.
- **bcrypt cost factor floor is 8** — `Agri-Finance-Backend/src/lib/env.ts:39-42`, clamped to a minimum of 8 regardless of configuration. Below current OWASP guidance (10-12+); fine until the password hash table leaks, then meaningfully faster to crack than it should be.
- **PostgREST filter injection surface** — `Agri-Finance-Backend/src/lib/services/farmers.service.ts:235-240`. The `search` query parameter is interpolated into a `.or()` filter string with only commas escaped; PostgREST's filter DSL has other special characters (`.`, `(`, `)`, `%`) that aren't sanitized. Blast radius is limited today because the role-based `.eq()` ownership filter is ANDed on top, but the pattern becomes exploitable the moment it's reused somewhere without that ownership filter.
- **Public, unauthenticated `/api/openapi` + Swagger UI** — hands anyone the full API contract (every endpoint, every schema) with zero authentication. Reasonable for a public API product; questionable for an internal financial-services API where handing attackers a complete map isn't necessary.
- **Frontend token persistence** — the "Remember this device" split (`localStorage` vs `sessionStorage`) only reduces exposure window; it doesn't fix the root cause, since Finding #1 means the token ends up in browser storage either way once the backend hands it over in the response body.
- **No refresh-token rotation** — `refreshToken` is always returned as an empty string; there's no rotation mechanism, so the single 7-day session secret (`APP_SESSION_DAYS=7`) has to live that whole time with no way to shorten its blast radius short of a full logout revoking it.

---

## What's Actually Solid

- **Passwords**: bcrypt + timing-safe legacy-scrypt fallback + automatic rehash-on-login migration path.
- **Session/OTP secrets**: never stored raw — always HMAC-SHA256'd with a server-side pepper before hitting the database.
- **Rate limiting**: DB-backed, per-identity *and* per-IP, on login, OTP request, and KYC upload.
- **File uploads**: MIME allowlist per document type, per-role document-type allowlist, size limits enforced both pre- and post-upload by re-reading storage metadata, and path-prefix verification against the actually stored object.
- **Headers**: CSP, HSTS (prod-only), `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, COOP/CORP, and CORS is a strict origin allowlist with credentials — not a wildcard.
- **Production env guards**: the backend refuses to boot in production if `SECURITY_PEPPER`/`DATA_ENCRYPTION_KEY` are unset or left at their default values, and enforces HTTPS on configured URLs.

---

## Recommended Fix Order

1. Stop returning `accessToken` in the login response body (or migrate the Angular app off Bearer auth entirely) — closes the biggest gap for the least effort.
2. Encrypt `farmers.national_id` / `phone` / `email` at rest, matching the existing KYC pattern.
3. `npm audit fix` the backend and re-verify the Cloudflare Workers deploy.
4. Enable Row Level Security as a backstop on every table.
5. Confirm which backend is actually serving `api.tripsecureagrifinanceltd.com` before relying on either audit for current production exposure.
