# Mokumokuren v1.0.0 — account/session isolation and stale-response QA

**Status:** Implemented and regression-tested offline, 11 November 2026. Not a live OAuth/sync verification and not approval to publish.

## Problem addressed

An older Trakt or AniList library response could mutate the shared `state.items` before the final generation guard. A slower enrichment request could also permit previous account data to be staged after newer data had loaded. This could briefly present incorrect personalized results when switching tabs, accounts, or sessions. Likewise, `verifyAccounts()` and personalized dashboard requests had no safe distinction between a legitimate Trakt token rotation and a genuine account change.

## Code changes

- `load()` now collects results in request-local variables, and commits the items/recommendation pool only after checking the original section, view, request generation and account-session revision.
- Each successful explicit Trakt/AniList connection and disconnect advances its account revision. Automatic Trakt refresh rotation does **not** advance the revision; otherwise token renewal could leave the active screen permanently loading.
- `renderHomeDashboard()` and `verifyAccounts()` ignore stale results and stale error messages from a disconnected/replaced account while continuing to accept results from a valid refreshed token.
- No account writes are retried and no user credentials are exported by these tests.

## Focused regression evidence

`node tests/stale_load_isolation_contract.mjs` covers normal commits, out-of-order Trakt/AniList results, stale enrichment, stale recommendation pools, view navigation, stale verification, token rotation and preview fallback (**20 assertions passed**).

`node tests/trakt_refresh_contract.mjs` ensures normal login advances the revision, while refresh-token rotation does not (**6 scenarios passed**).

`python tests/run_release_regression.py --group core|media|library` and `node scripts/build-release.mjs && node scripts/audit-release-bundle.mjs` run before packaging. The synthetic browser tests use mocked account traffic; real account/cross-device verification is still required after the deliberate first deployment.

## Remaining release gates

1. Final offline source/configuration audit and clean GitHub source sign-off.
2. Owner-controlled single first GitHub/Netlify publication, production OAuth credentials, live Trakt/AniList readback and HTTPS PWA verification. Production defects discovered then may require further fixes/deployments.

No interim GitHub pushes or Netlify builds are authorized by this checkpoint.
