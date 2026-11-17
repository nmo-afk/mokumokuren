# Mokumokuren — Step 3 implementation checkpoint

Date: 2026-11-11. Internal development only; not v1.0.0, not published, and not ready for user acceptance.

## Changes made
- Replaced the legacy small detail sheet with a full-height scrolling title view, a sticky back toolbar, 2-column desktop hero, and centered full-size poster on mobile. The app's own mobile navigation stays at the top and the detail view does not create a bottom navigation bar, leaving Netlify's badge clear.
- Kept the original Trakt/AniList state and mutation handlers and accessible detail tabs. Added a compact watched/watchlist row and an expandable auxiliary action row on mobile. Actions fail closed when an account is unavailable.
- Added metadata-enriched movie/TV overviews with cast and related-title horizontal rails, sensible fallbacks and compact fact columns.
- TV overview embeds the existing episode guide; the full guide retains season changing and watched/unwatched controls. Trakt supplies episode identities and watched status; TMDB supplies supplementary stills/descriptions if available.
- Anime overview embeds AniList progress and status controls, including +1 episode.
- Replaced broken detail poster and person/related artwork with local icon placeholders; corrected legacy modal `max-width:120px` image cap and enlarged icon artwork to counter its transparent padding.
- Preserved the Step 2 stylesheet and source-bound/allowlisted release build; no new external dependencies or credentials.

## Verification performed locally
- Python unit tests: 105/105 passed.
- Core regression: 28/28 passed (includes JS/Python/Netlify syntax, API contracts and release hardening).
- Media Chromium regression: 6/6 passed including authenticated Trakt mocks, watched confirmation, AniList exploration, keyboard/focus and episode tracking.
- Library Chromium regression: 9/9 passed including lists, discovery, home preferences, artwork failures, connectivity and service worker update mock.
- New full-CSS Chromium Step 3 detail check: movie, TV and anime at 320, 375, 768 and 1440px; checks poster sizing, image loading, cast/related rails, TV season switching, mobile more menu, account guards, page overflow and safe dismissal.
- Release build: 53 allowlisted runtime files plus manifest, synthetic-origin built-bundle Chromium check at 375 and 1440px passed. Repaired outdated tests that still assumed desktop hamburger navigation and 52 rather than 53 runtime files after Step 2 added `trakt-rebuild.css`.

## Gates still open
- No live authenticated Trakt/AniList/TMDB check; cannot assert those services work from offline fixtures alone.
- Sandbox blocks Chromium localhost network navigation (`ERR_BLOCKED_BY_ADMINISTRATOR`), so the browser_pwa_offline.py live-origin service worker install scenario could not be performed here. Offline service worker and bundled-asset static contract tests passed, but do not replace a real browser offline run.
- No screenshot-based pixel fidelity assertion to Trakt mobile originals; screenshots were inspected manually with synthetic test artwork. Additional mobile responsive and interaction polish is Step 4.
- Step 5 onward: accounts, TMDB metadata depth, exact synchronization, anime experience, recommendations, final release gate.

## How to resume
Start with this source directory or the archive `Mokumokuren-step3-internal-source-checkpoint.zip`. Continue Step 4; do not deploy to Netlify or GitHub or request user acceptance until the v1.0.0 release gate.
