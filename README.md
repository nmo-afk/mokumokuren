# Mokumokuren v0.2 — first deployable development build

A mobile-first PWA for Movies (Trakt), TV Shows (Trakt), and Anime (AniList).

## Deploy correctly

**Recommended: connect a GitHub repository to Netlify.** Upload the entire source tree, including `netlify/functions` and `netlify.toml`, to GitHub. In Netlify choose Import a Git repository, set publish directory to `.` and leave build command blank. This ensures Netlify Functions are deployed. A manual static ZIP upload will **not** install the serverless functions and therefore will not provide working TMDB/Trakt/AniList proxy APIs.

Under Netlify > Project configuration > Environment variables add:

- `TMDB_READ_TOKEN` = a **new/rotated** TMDB API Read Access Token (secret; never commit it)
- `TRAKT_CLIENT_ID` = your Trakt public client ID

No AniList secret is needed for the current implicit OAuth approach.

After the site is deployed, get its real HTTPS URL, then register **exactly** `https://YOUR-SITE.netlify.app/callback` as the OAuth redirect for both Trakt and AniList, and `https://YOUR-SITE.netlify.app` as Trakt's allowed origin. Ensure your Trakt development application permits the chosen PKCE flow.

## What works in this build

- Three primary sections and five sub-tabs each, responsive cinematic UI, swipe navigation, last-used section, grid/list toggle, Discovery Balance preferences, PWA manifest.
- TMDB movie/TV trending, discovery and search **when the function is deployed and token configured**.
- AniList public anime discovery/search, private list retrieval and planning/completed mutations **when login and proxy work**.
- Trakt PKCE login attempt, watchlist/watched/playback reads **when login and proxy work**.
- Local Not Interested / More Like This preferences, and fictional preview data toggle.

## Known gaps (do not represent as complete)

- Trakt writes are **disabled** pending robust TMDB↔Trakt ID matching and testing. UI reports this rather than pretending to sync.
- Recommendation ranking is basic trending/public discovery, not yet personalised from both accounts. Discovery Balance is a saved setting, not yet wired to ranking.
- Mood search is keyword-based, not AI. No free inference service is connected.
- No episode-level editing, bulk editing, offline data cache, rewatches, notifications, advanced streaming-provider filters, community similarity ranking, or cross-source ratings yet.
- Trakt OAuth implementation needs end-to-end validation; a future update should add OAuth state verification, refresh-token support, secure server-side session handling and a fully tested PKCE exchange.
- AniList implicit tokens are held in sessionStorage; consider replacing with an appropriate more secure session architecture for public release.
- Search year/genre/sort are limited for AniList; TV/movie discovery filtering needs further integration.
- Some Trakt library records lack artwork until TMDB enrichment is implemented.
- Fictional preview titles are placeholders, not real catalogue data.

## Security

Previously shared TMDB token/key and AniList secret were exposed in screenshots. Rotate/recreate them. Never paste secrets into chat, source code or a public GitHub repo. The app deliberately does not include those secrets.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. Follow TMDB's current logo/attribution requirements before publication. AniList and Trakt trademarks and API terms also apply.
