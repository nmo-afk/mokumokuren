# Mokumokuren — Step 7: Trakt watched progress, Continue Watching and native lists

Date: 11 November 2026. Internal development checkpoint only; **not deployed** to GitHub or Netlify. No user account tokens or live-provider credentials were used during verification.

## Changes made

1. **Accurate TV show status** — TV shows are classified by the response from `/shows/{trakt_id}/progress/watched`. Shows are In Progress when some episodes are watched but Trakt does not mark the series complete, and Completed only when Trakt reports completion. Watched history alone is not treated as completion. Missing/failed progress results are not silently classified as complete or in-progress; the page displays a warning and omits those entries pending verification.
2. **2026 Trakt pagination support** — `/sync/watched/movies`, `/sync/watched/shows`, watchlists and native list-item reads are paginated with explicit page and limit. After up to 30 full pages of 100 entries, reads fail with a clear message rather than misrepresenting partial history as complete. The Netlify and Windows Trakt gateways now validate permitted pagination query parameters while rejecting arbitrary API routes, unsafe query keys and queried writes.
3. **Continue Watching consistency** — The TV home rail derives watching activity from watched-episode history and the same show classification as the In Progress tab. It no longer depends solely on `/sync/playback` (paused/scrobbled sessions). Movies retain resumable playback as their In Progress definition, explicitly indicated in the UI. Duplicate show records are removed.
4. **Stable IDs and progress** — Trakt show identifiers remain distinct from TMDB identifiers. Normalized TV cards retain the percent watched and next episode. Show-progress lookups have a short-lived (60-second) account-scoped cache, concurrency limited to four; successful episode/history writes invalidate cached progress.
5. **Native Trakt lists** — A single list store, on Trakt. Lists, list items, add/remove and create/delete operations use Trakt directly, with paginated reads, Trakt-ID fallback for titles without TMDB IDs, account-revision guards on writes, partial-load messaging and manual refresh. No second local list system was introduced.
6. **Watched status checks** — Movie and show detail controls read paginated Trakt state and allow matching by the correct ID namespace. TV status is confirmed from episode progress, not mere appearance in watched history. Marking a whole show watched now checks Trakt's `added.episodes` response, which is the count reported by the watched-history endpoint.

## Verification completed

- 106 Python unit tests passed.
- 34/34 offline core checks passed, including new tests with 17 Trakt library pagination/progress/list scenarios, 18 allowlist proxy cases, 4 watched-history confirmation cases, and existing 20 stale-account/load assertions.
- 8/8 media browser checks passed, including new Step 7 TV in-progress/completed/Continue Watching DOM tests at 375px and 1440px.
- 9/9 library browser checks passed on the completed full run; in the final rerun, eight passed before the runner stalled on the ninth, and that final PWA-update check passed independently at 375px and 1440px plus another-tab consent.
- Production build and offline release integrity audit passed: 53 allowlisted files plus a SHA-256 manifest. No development helpers or test credentials appear in `dist`.

## Still not verified / release blockers

- Live Trakt authentication, pagination results, watched-progress semantics and list writes with the user's actual account are **not verified**. These checks use offline fixtures.
- Users with very large partially watched TV libraries may see slower initial loading because authoritative progress is checked per show; optimize or lazily load this in release polish.
- Movie In Progress means resumable Trakt playback, which is not the same as all movies previously marked watched.
- No Netlify deployment or GitHub publish was made. Do not call this v1.0.0 release approved.
- Next step is Step 8: integrate a fuller dedicated Anime/AniList experience, then Step 9: episode +1 and progress synchronization polish.
