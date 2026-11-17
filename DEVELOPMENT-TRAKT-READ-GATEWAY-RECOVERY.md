# Mokumokuren — Trakt read gateway recovery, v1.0.0 candidate

11 November 2026. **Private use; source checkpoint only. Nothing published.**

## Change

Browser Trakt GET requests already fell back to the Netlify function when the browser network call threw (for example, CORS). A recognizable Cloudflare HTML rejection could instead arrive as a normal HTTP 403/502/503 response, so the read would fail without trying the available proxy.

The app now inspects only those explicit rejected GET responses. If the response is non-JSON and contains known gateway-challenge markers, it makes a single safe read through `/api/trakt`. Any following bounded retry remains on the proxy for that one request, rather than hitting the rejected browser route again.

The fallback **never** applies to Trakt mutations, JSON permission errors, 401 authorization failures, 429 rate limits, unrecognized HTML errors, or ambiguous HTTP 200 responses. Failed writes remain unknown-outcome and require rereading account data before user-initiated retry.

## Offline evidence

- `node tests/trakt_read_gateway_fallback.mjs` — 14/14 simulated success and fail-closed scenarios.
- `node scripts/build-release.mjs` — 52 allowlisted runtime files plus integrity manifest.
- `node scripts/audit-release-bundle.mjs` — all assets verified; test helpers excluded.
- `python tests/run_release_regression.py --group core` — 26/26 commands.
- `python tests/run_release_regression.py --group media` — 6/6 Chromium commands.
- `python tests/run_release_regression.py --group library` — 9/9 Chromium commands.

Total **41/41 command-level automated checks passed**. Tests are isolated and do not access personal Trakt/AniList accounts. The real provider and canonical HTTPS PWA behavior are not yet verified.

## Remaining work

Private OAuth configuration, provider callback registration, authenticated Trakt/AniList write-readback and cross-device verification, HTTPS PWA installation/update and owner-controlled first GitHub/Netlify publication. No intermediate deploys to conserve Netlify credits.
