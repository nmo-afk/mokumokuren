# Mokumokuren — Step 9 of 12: Episode tracking & synchronization

**Checkpoint:** 11 November 2026. Development source only; no GitHub or Netlify deployment.

## Implemented

1. +1 episode quick actions beside **Continue Watching** cards on Anime (AniList) and TV Shows (Trakt); library cards and anime detail pages retain controls. Actions are separate from title-opening buttons (no nested buttons).
2. AniList mutations require confirmed media list ID, exact episode count, and status response before changing visible progress. A per-media, per-account in-flight guard prevents overlapping writes from detail, library and Home surfaces. Failures leave the existing progress unchanged.
3. Confirmed AniList mutations reconcile cached item/library references and trigger a readback for the current Home/library view. Planning/Paused/Dropped transitions to Watching are reflected only after provider confirmation. Reaching the final episode does **not** automatically force Completed.
4. Trakt next-episode writes use Trakt show IDs and season/episode numbers; successful response must confirm added episodes. Cached show progress is invalidated and the next episode is read back from Trakt, not fabricated locally.
5. **Refresh progress** button in library views and throttled provider refresh upon returning to the app after at least 90 seconds. This supports cross-device changes through provider readback; it does not claim push/instant sync or a proprietary list store.
6. Reused the existing account-bound API clients from Step 5. Account switches during writes fail closed. No credentials are embedded in fixtures or ZIP.

## Verification (offline / deterministic fixtures)

- Python `unittest discover`: **110 tests passing** (106 existing + 4 Step 9 guardrails).
- Core regression runner: **34/34 commands passing** after production build.
- Browser media regressions: **11/11 scripts passed across isolated runs**. The aggregate runner exceeded its outer execution limit; the remainder were run independently. One older AniList mock was updated to inspect the most recent mutation, rather than assuming that no post-write synchronization read would occur.
- Browser library/PWA regressions: **9/9 scripts passed**.
- New Step 9 browser tests: AniList confirmed write, duplicate lock, failed write, Home +1 and 90-second focus refresh, and Trakt confirmed write/next-episode readback/failure at **375px and 1440px**.
- `node scripts/build-release.mjs`, `node scripts/audit-release-bundle.mjs`: **53 runtime files** integrity-verified; no network calls.

## Release gates still open

- Live authenticated AniList/Trakt read-write-readback on owner-controlled deployment, TMDB connectivity, real multi-device resume, PWA install/offline, final screenshot comparison to supplied Trakt references.
- Step 10 discovery, recommendation and native-list UX polish; Step 11 acceptance; Step 12 consolidated user acceptance package.
- No intermediate test is requested of the user. No deployment or remote account modifications were made.
