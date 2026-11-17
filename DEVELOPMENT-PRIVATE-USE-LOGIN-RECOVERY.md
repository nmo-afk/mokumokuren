# Mokumokuren v1.0.0 — private-use login resilience checkpoint

11 November 2026. **Not published.** No GitHub push or Netlify deployment.

## Implemented

- Trakt PKCE login attempts the browser token exchange first, preserving the existing ability to bypass server-origin gateway blocks.
- If the browser request fails to start, the existing server-side exchange remains available.
- If the browser receives a recognizable edge/gateway block (403, 502, or 503 with non-JSON Cloudflare/challenge markup), the app can try the server exchange once.
- It does **not** retry after a successful response, JSON OAuth rejection, HTTP 429 throttling, ambiguous HTML 200, or an unrecognized error.
- Authorization state and PKCE verifier are still removed after handling the response.

## Evidence

- `node tests/trakt_oauth_gateway_fallback.mjs` runs nine isolated gateway, success, and fail-closed scenarios without external network calls.
- `node scripts/build-release.mjs` produces the same allowlisted output structure and changes the generated offline cache revision when app.js changes.
- `node scripts/audit-release-bundle.mjs` verifies the public bundle integrity and exclusions.
- `python tests/run_release_regression.py --group core`, `--group media`, and `--group library` all passed in this checkpoint (25 + 6 + 9 command-level checks).

## Owner release policy

Private personal use only. Focus development on functionality, reliability, security, and clean manual GitHub/Netlify publication. Do not spend additional development cycles on per-file icon-licence research. Existing credits and attribution stay in place; rights would need revisiting if the use or distribution changes.

## Remaining release gate

The first production HTTPS host, securely stored environment settings, live Trakt and AniList OAuth/sync, and HTTPS PWA installation/update behavior have not yet been verified. Do not call this artifact final v1.0.0 or upload it just for testing. The owner will upload to GitHub and deploy on Netlify manually after final source acceptance, keeping credit-consuming deployments to a minimum.
