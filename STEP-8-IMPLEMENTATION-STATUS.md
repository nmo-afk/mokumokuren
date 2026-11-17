# Mokumokuren — Step 8 of 12: AniList and Anime experience

**Date:** 11 November 2026. Development checkpoint, **not deployed**. Trakt and AniList live-account login/write/readback has **not** been independently tested; the checks below use offline fixtures.

## Completed in this step

1. **Dedicated AniList discovery:** searchable Anime page with combinable genre, format (TV, TV short, film, OVA, ONA, special, music), season, year, airing status and sort; clear/reset, keyboard Enter and explicit next-page loading. The year-only query uses date boundaries; a season/year combination uses AniList's required season+seasonYear arguments. The discover feed can show titles already on the connected user's AniList list rather than hiding them. List progress appears as a small overlay on those cards.
2. **AniList media details:** fetch Media by AniList ID, including banner/poster, studio, format, series status, next airing, characters, staff, tags and related/franchise anime. Rich overview, Characters & staff, Franchise & related and Anime tracking tabs use the existing Trakt-inspired modal. Title-level enrichment falls back to known metadata on a failed read; short-lived detail caches are account-revision scoped and rejected requests are not retained.
3. **List status segmentation:** In Progress defaults to currently watching or rewatching anime; separate status chips expose Paused and Dropped without misclassifying them as currently watching. Watchlist derives from AniList `PLANNING` and Completed from `COMPLETED`. No proprietary parallel-list database was introduced.
4. **Identity safety:** AniList media IDs remain distinct from Trakt and TMDB IDs. Removed the generic “Save to My Lists” Trakt action from Anime title pages because an AniList-only ID cannot safely be sent to a Trakt list. Movies/TV Shows still have that action.
5. **Responsive visual styling:** new compact filter grid, cards, badges, character/crew grids and related-title rails fit the existing desktop sidebar and sticky mobile top navigation. No bottom navigation was added; Netlify's mobile badge area remains unobstructed.

## Verified offline

- `python -m unittest discover -s tests -q`: **106 passing unit tests**.
- `python tests/run_release_regression.py --group core`: **34/34 checks passing**, including all existing Trakt/identity/session contracts.
- **9/9 media browser scripts** and **9/9 library browser scripts** passed across isolated runs. The attempted combined run timed out partway through; the remaining scripts were executed individually and passed. This was a runner/execution-time limitation, not a claim that the interrupted combined run passed.
- New `tests/browser_anime_step8.py`: passing at **320, 375, 768, 1440 px**, checking combined filters, season/year and year-only AniList parameters, pagination, personal-list badges, rich title details, characters/staff, related anime, empty/paused/dropped/planning/completed categories, identity separation, sticky header, no horizontal page overflow.
- `node scripts/build-release.mjs` and `node scripts/audit-release-bundle.mjs`: **53 allowlisted runtime files and SHA-256 integrity manifest**, zero live network calls.

## Still outstanding

- **Step 9:** polish +1-episode mutations, update confirmation, cache refresh, and progress synchronization across screens and devices.
- **Step 10:** final discovery/recommendation/list experience polish.
- **Step 11:** comprehensive offline acceptance and visual comparison against the user-supplied Trakt references across desktop/mobile; real-provider integration and live HTTPS tests remain separate release gates.
- **Step 12:** package the consolidated Windows v1.0.0 acceptance build and stage owner-controlled GitHub/Netlify deployment. Do not auto publish.
- No live authenticated AniList GraphQL call was made. The new query fields were selected from the AniList GraphQL API reference; schemas/responses require live verification before release.
