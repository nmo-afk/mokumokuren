# Mokumokuren — Step 5: account and API session hardening

**2026-11-11 — Internal checkpoint only.** No deployment, no account credentials used, no user acceptance test requested.

## Source changes

- Trakt and AniList API calls now validate the initiating account revision before retrying, after network returns, and after response-body parsing. When an account is explicitly disconnected/reconnected mid-request, an old read or write may not be returned to the new account's screen. A normal Trakt access-token rotation remains valid for the same account.
- Read fallback no longer crosses account boundaries: an old Trakt direct request cannot be resent through the proxy under the new session. AniList read retries use the original token only and are canceled after an account switch. Mutations remain single-attempt; uncertain writes are never automatically replayed.
- AniList HTTP 403 authorization errors are distinguished from a 502 proxy response reporting an upstream 403 gateway block. Neither is automatically misreported as an expired login.
- Trakt and AniList identity verification now run independently, so a slow AniList call does not hold up Trakt's account display (and vice versa).
- Concurrent AniList library reads use one in-flight request per active token, reducing unnecessary authenticated API calls and rate-limit exposure. Old account collection fetches cannot replace the current account's cache.
- An OAuth rejection, incomplete callback or state mismatch now clears unconsumed pending OAuth state/PKCE material. The successful Trakt PKCE and AniList code-exchange flows were preserved.

## Offline acceptance gates

- Python unit tests: **105 passing**.
- Core gate: **30/30 checks passing** (including JavaScript/Python syntax, Netlify API contracts, Trakt token-refresh contracts, 10 new account/session race tests, and five AniList OAuth callback scenarios).
- Chromium media regressions: **6/6 passing**.
- Chromium library/PWA regressions: **9/9 passing**.
- Production bundle: **53 allowlisted runtime files**, release-integrity manifest verified, zero network calls in offline audit.

## Explicitly not complete

- **No live Trakt or AniList OAuth or API round trip** was attempted. Synthetic/offline tests cannot establish whether actual provider credentials, callback allowlists, Netlify environment variables, current provider availability or provider-side quotas are correct.
- Local Windows login still supports entering provider tokens into the user's own browser session; it does not secretly transfer sessions from the deployed site.
- Real TMDB metadata and streaming enrichments are Step 6; authoritative lists and progress reconciliation remain Step 7. No deployment to Netlify/GitHub.
