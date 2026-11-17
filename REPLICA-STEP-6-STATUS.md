# Mokumokuren — Replica Step 6 completed (mobile reconstruction)

Date: 2026-11-11. Internal source checkpoint only; not released or deployed.

## Acceptance intent
Replicate Trakt mobile anatomy and content density, while keeping Mokumokuren's user-required **top** navigation to avoid covering the mobile Netlify badge, with burgundy background #960012, gold active states #FBD242 and ivory body text #F2F4F3. Emerald remains exceptional tertiary only.

## Source changes
- `trakt-rebuild.css`: 2-row sticky mobile header (previously 3 rows); media selector and compact actions share first row; a single scrollable Home/In Progress/Watchlist/Watched/Discover tab bar uses second row.
- Active-tab gold underline; readable tab scrolling with no redundant second app navigation, no fixed bottom controls.
- Safe-area padding, responsive widths, 34–44px header controls, minimum 44px detail actions at phone/tablet breakpoints, accessible drawer with overflow containment.
- Denser Home rails, library cards and filters; mobile landscape episode and cast/reviews rails snap horizontally; full-screen title page maintains sticky Back/Share and detail tabs.
- Layout fixes scoped below 960px, with further phone styling below 600px. Existing desktop sidebar untouched.
- `tests/browser_replica_mobile_step6.py`: six-width synthetic-data interaction suite covering actual drawer open/Escape, selected-tab visibility, two-row header, page overflow, no bottom app controls, detail topbar, touch sizes, scrolling and close, plus phone-to-landscape rotation.
- `app.js` remains byte-for-byte identical to Replica Step 5; no API/OAuth/tracking/list mutation changes.

## Completed verification
- Chromium Step 6: PASS at 320, 375, 430, 600, 768, 959px.
- Prior mobile interactions: PASS.
- Replica Step 2 navigation, Step 3 main pages, Step 4 detail pages, Step 5 Anime: PASS.
- Trakt library classification, Trakt +1, AniList +1 and Step 10 discovery/list interactions: PASS.
- Palette computed-colour audit across Home, TV In Progress, Watchlist, Anime, Trakt Lists: PASS (zero unintended green UI surfaces).
- Browser connectivity, PWA update simulation, sidebar modes and spoiler-safe reviews: PASS.
- Python unit tests: 117/117 PASS; core regression gate: 35/35 PASS (including 26 Node contracts); JS syntax: PASS.
- `node scripts/build-release.mjs`: 94 allowlisted runtime files + integrity manifest; `node scripts/audit-release-bundle.mjs`: PASS.

## Important limitations
- This is not pixel-perfect Trakt visual acceptance. Step 7 must compare full real-reference screenshots internally and correct differences; passing mobile geometry tests is necessary but not sufficient.
- Live authenticated Trakt, AniList, TMDB API calls, on-device PWA installation and real multi-device synchronization were not independently verified.
- The screenshots for tests contain fake records and are not for user review until visual parity target is met.
- No GitHub/Netlify deployment or live account mutation.

## Milestones
- Visual replica work packages: 6/7 (85.7% of checklist, **not** measured visual similarity).
- v1.0.0 acceptance checklist: 16/20 (80%, checklist completion only); live providers, fidelity, on-device acceptance and release still gated.
