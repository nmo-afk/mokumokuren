# Mokumokuren — v1.0.0 release hardening (Step 5/6)

11 November 2026. Development source only; **not deployed**. No user testing required now.

## Completed in source

- Replaced Netlify's `publish = "."` with an explicit Node-based production build and `publish = "dist"`. `scripts/build-release.mjs` copies an allowlisted set of 52 runtime assets, checks the PWA manifest and service-worker precache paths, and writes an SHA-256 inventory. The published directory has **no** local token-entry page, local server, source tests, debugging documentation, or Netlify functions code.
- Added release headers: CSP limiting scripts to the app's own origin, HTTPS images, restricted API connections, clickjacking/frame denial, MIME-sniffing prevention, no-referrer, and disabled unnecessary device permissions. Unversioned HTML/JS/CSS/SW files receive cache revalidation headers.
- Added `netlify/lib/oauth-origin.mjs` to bind Trakt and AniList authorization code exchanges to an explicit HTTPS callback origin. `MOKUMOKUREN_ORIGIN` can override the known canonical deployment origin; arbitrary incoming `redirect_uri` and unsafe origins are rejected.
- Added 12-second upstream timeout signals to all five Netlify API functions and client deadlines to normal TMDB, AniList, Trakt and Trakt-refresh calls. Safe reads remain bounded-retry, while writes and refresh-token exchanges are not silently replayed after unknown outcomes.
- Added accessible names to discovery search, genre/sort/year filters, balance slider, and season selection; kept keyboard/focus styles and mobile layout tests intact.
- Advanced versioned static PWA cache from the previous stage so new app assets are not accidentally served from an older worker.
- Included the available Arctic Fuse CC BY-NC-SA licence in the production build, plus a discoverable licence link in Settings.

## Verified in this isolated environment

- `node scripts/build-release.mjs`: produced the expected 52 allowlisted runtime files and 1 integrity manifest.
- `tests/release_hardening_contract.mjs`: 37 isolated checks, plus 52 SHA-256 file verifications (rerun for current final build).
- `tests/release_deadline_contract.mjs`: 7 API deadline scenarios.
- `tests/run_release_regression.py --group core`: full unit, syntax, and Node API contract suite.
- `tests/run_release_regression.py --group media`: simulated Chromium media UX.
- `tests/run_release_regression.py --group library`: simulated Chromium library, Trakt lists and responsive UX.
- A real local HTTP PWA reload and a mocked-HTTPS browser navigation remain **blocked by this environment's ERR_BLOCKED_BY_ADMINISTRATOR**. Neither is counted as passed.

## Before first public publication (Step 6)

1. Confirm the intended production HTTPS origin. `https://mokumokuren.netlify.app` is the current default; set `MOKUMOKUREN_ORIGIN` to the canonical origin **without a trailing slash, query or path** if changed. Register `<origin>/callback` identically in both OAuth application settings.
2. Set the private server-side Netlify environment variables: `TMDB_READ_TOKEN`, `ANILIST_CLIENT_SECRET` and public IDs `TRAKT_CLIENT_ID` / `ANILIST_CLIENT_ID`. Verify IDs match the app's current public client IDs; do not commit secrets.
3. Verify TMDB reads/artwork, Trakt PKCE/refresh/list writes/readback from a real session, AniList login and saved progress. Uncertain writes need fresh reads before any manual repeat.
4. Verify installability, HTTP headers, offline startup/recovery and staged PWA update on an actual HTTPS origin, along with essential mobile and desktop UX/accessibility checks.
5. Review the Arctic Fuse source attribution, CC BY-NC-SA permissions and intended distribution; current licence is noncommercial and share-alike, so commercial deployments require a separate rights assessment.
6. Perform final owner acceptance and publish version `v1.0.0` once; do not publish intermediate checkpoints to GitHub or Netlify.

Automated unit, mocked proxy and browser checks do **not** establish production integration correctness. The build and configuration improvements make the source *more ready* for release but do not certify v1.0.0.
