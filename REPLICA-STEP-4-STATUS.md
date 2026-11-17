# Replica Step 4 — Movie, TV and episode details

**Status:** implemented and tested against offline fixtures on 11 November 2026. **Not a production release.**

## Design benchmark
User-supplied Trakt movie-detail, TV-detail and season/episode reference screenshots and HTML. This is a structural detail-page reconstruction using the user's **burgundy #960012**, **selected gold #FBD242**, and **ivory #F2F4F3** palette. Keep the Arctic icon set and preserve Trakt/AniList/TMDB integrations. No UI screenshots are being shared pending the requested high-fidelity acceptance milestone.

## Implemented

1. Compact circular back/share controls in the sticky detail header. Sharing uses the provider's public page for a known ID, and otherwise the existing app URL. No share occurs without interaction.
2. Compact Trakt-like hero hierarchy and responsive poster sizes: cinematic backdrop, title, byline, year, runtime, certification, genres and ratings. The mobile poster is centred, while desktop places poster and metadata side by side.
3. Simplified icon-first, accessible watched/watchlist/trailer/more action pill. Button labels are preserved for assistive technology and updated after verified provider state reads.
4. Functional, keyboard-accessible collapse/expand controls on information sections, leaving them expanded initially. Content state is changed in the DOM, not by modifying any provider data.
5. Extras rail populated only from genuine TMDB YouTube video metadata; no fabricated extras.
6. Read-only Trakt comments gateway (strict title ID, sort and limit validation), with spoiler-marked comments excluded, HTML-escaped content and account-aware cache. Reviews display a non-fabricated unavailable/connection state when data cannot be loaded.
7. Trakt-style season guides and landscape episode artwork, runtime badges, season/episode labels, compact watched controls, watched/remaining counts and completion percentage. **Episode mutation and Trakt confirmation semantics remain unchanged.**
8. Retained AniList tracking, characters, staff and franchise relation views inside the same detail shell.

## Test evidence

- Python unit suite: 117 passed.
- Node contract files: 26/26 passed, including 10 new Trakt review gateway allow/deny cases.
- Chromium browser suites passing: `browser_detail_step3.py`, `browser_mobile_interactions_step4.py`, `browser_detail_interactions.py`, `browser_tmdb_metadata_step6.py`, `browser_replica_detail_step4.py`, `browser_trakt_reviews_step4.py`, `browser_replica_main_pages_step3.py`, `browser_trakt_episode_step9.py`, `browser_anime_step8.py`, `browser_trakt_library_step7.py`.
- New Replica Step 4 browser tests verify extras, collapse controls, tracked episode labels and runtime artwork, responsive layout, spoiler rejection, escaping of untrusted comments, and closed/open More menu behaviour.
- Offline production package: 94 allowlisted runtime files passed integrity verification.
- Initial regression failures for poster width at 768px, mobile 44px control targets, and desktop/mobile More-menu accessibility were corrected before completion. An older interaction fixture was updated to open the More menu before choosing Not interested on desktop; that revised test passes at all three target widths.

## Not yet accepted

- This checkpoint is **not** claimed to be a pixel-identical Trakt recreation. Source differences remain in extras, layout details, community metadata richness, and complete interactive parity.
- Real authenticated Trakt reviews, Trakt episode writes, AniList progress and TMDB media have **not** been tested against the user's live accounts.
- No GitHub upload or Netlify deployment has been made.

## Next replica stages

5. Integrate AniList/anime features within final Trakt composition.
6. Mobile density, top-navigation constraint, Netlify badge clearance, and interaction parity.
7. Side-by-side visual-fidelity comparisons, regressions, and acceptance. Release preparation follows separately.

## Progress accounting

- Visual reconstruction: **4/7 = 57.1% of tracked milestones**. This is NOT a pixel-similarity score.
- v1.0.0 readiness: **14/20 = 70% of tracked acceptance milestones**. This does NOT demonstrate live authentication or readiness to deploy.
