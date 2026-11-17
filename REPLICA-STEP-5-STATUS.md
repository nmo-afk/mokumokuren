# Mokumokuren — Replica Step 5: Anime in Trakt-style UI

Date: 2026-11-11. Internal source checkpoint only; not a release and not deployed.

## Goal

Integrate AniList discovery, status, episodes, staff, characters and related series in the same Trakt-style UI grammar as movie and TV details. Preserve Anime's AniList-only account progress and Trakt-native list authority for movies and shows.

## Source changes

- `app.js`: Anime discovery uses shared dense-page wrapper and search/filter attributes. No change to AniList GraphQL queries or OAuth implementation.
- `app.js`: Anime overview now shows cast/characters, staff and franchise content as separate collapsible detail sections with landscape/portrait rails using the established detail controls.
- `app.js`: Anime's episode detail tab is called **Episodes**, making the tab navigation consistent with the show's detail pages.
- `app.js`: Compact progress component with confirmed `+1 episode`, `−1` and `Set progress` actions, accessible status chips, actual AniList episode-count progressbar, and explicit sync state.
- `app.js`: After AniList confirms an update, update the progressbar ARIA count and status-button pressed states. Preserve the existing fail-closed, in-flight lock and account-revision protections.
- `trakt-rebuild.css`: Same Trakt-like borders, pill geometry, typographic scale, rails, controls and gold highlights. No green surfaces added. Collapsible desktop sidebar and sticky mobile top navigation unchanged.
- `tests/browser_replica_anime_step5.py`: New offline Chromium contract at five widths (320, 375, 768, 1024, 1440). Tests confirmed +1, status mutation, progressbar, staff rail, no cross-provider list action and no horizontal overflow.

## Verified gates

- Python `unittest` suite: 117/117 pass.
- Node contract suite: 26/26 files pass.
- Chromium new Anime controls: five of five viewports pass.
- Chromium earlier AniList browse/detail: four of four viewports pass.
- Chromium media detail, main page and navigation suites: pass.
- Chromium palette audit: no unintended green UI surfaces.
- Chromium cross-feature: AniList +1, Trakt +1, Trakt classification, native lists, reviews, sidebar: six of six scripts pass.
- Release output: 94 allowlisted runtime files with verified integrity manifest; offline audit passes.

## Not yet proven

- Pixel-perfect layout comparison against every supplied Trakt page. Visual reconstruction checklist is 5/7, not an objective screenshot-similarity score.
- Real Trakt, AniList or TMDB authenticated integration and cross-device behavior against live provider accounts.
- Release deployment, end-to-end PWA installation, offline-update verification on the user's device and v1.0.0 acceptance.

## Next steps

Replica Step 6: mobile-density, scrolling and touch interactions, retaining **top** navigation to avoid the bottom Netlify badge. Step 7: comprehensive side-by-side visual acceptance plus full functional regression. Release preparation remains after visual and live-provider acceptance.
