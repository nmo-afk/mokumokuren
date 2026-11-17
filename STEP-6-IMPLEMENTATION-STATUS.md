# Mokumokuren — Step 6: TMDB metadata, images and detail enrichment

**Date:** 11 November 2026. Internal source checkpoint only. **Not deployed to GitHub or Netlify.** No credentials, account sessions or live-provider connections were used.

## Source changes

1. **Trakt/TMDB identity handoff:** When a Trakt record lacks a TMDB ID, metadata search now uses a title, media type and release-year-safe match. A successfully matched TMDB ID is carried forward for cast, crew, seasons, trailers, recommendations and imagery. No Trakt ID is treated as a TMDB ID.
2. **Cache correctness:** Metadata cache entries now identify the title, year and relevant ID namespace. This prevents two differently named titles with a coincidentally identical ID from borrowing each other's artwork. Successful detail reads are deduplicated for two minutes; failed reads are never cached. A single HTTP 400 no longer disables all other detail requests.
3. **Resilient metadata:** Poster and backdrop recovery on the detail page, runtime, UK certification when supplied, cast and key crew, official YouTube trailers, related-title fallback to `/similar`, and episode stills with a visible placeholder on image errors.
4. **Where to watch:** The allowlisted Netlify and local proxies now support `/movie/:id/watch/providers` and `/tv/:id/watch/providers`. The detail page uses the `GB` regional response with differentiated stream/rent/buy status, proper JustWatch attribution (required by TMDB), and the TMDB-supplied availability link when valid. It no longer treats production companies as streaming providers.
5. **Local configuration:** Missing `TMDB_READ_TOKEN` generates an explicit `503 TMDB_NOT_CONFIGURED` JSON response from the Windows server. No fallback to the live deployment or false report of successful enrichment.

## Verification

- **106 Python unit tests passing**, including explicit local Windows missing-token response and proxy parity checks.
- **31 core regression checks**, incorporating a new 11-case TMDB identity test and a 14-case TMDB proxy contract.
- **7 media browser regressions (including the new TMDB-specific Chromium regression) and 9 library/PWA browser regressions passing.** An additional TMDB-specific Chromium test at 375px and 1440px covers real DOM rendering of movie/show metadata, cast/crew, providers, Trakt-only TMDB ID recovery, season episodes, broken artwork, UK age rating and related fallback.
- **Production build includes 53 allowlisted static runtime files** and a SHA-256 inventory, with local testing helpers and credentials excluded.

## Not verified / future work

- No successful real TMDB requests on Netlify were performed. The previously observed 400 on the deployed proxy may still reflect a deployed route mismatch or provider configuration. This cannot be ruled out by offline tests.
- Real Trakt, AniList and TMDB account/API integration is not signed off. Trakt watched/completed/in-progress/list reconciliation is Step 7; Anime/AniList workflow is Steps 8–9.
- UI remains an internal visual candidate, not a user-approved pixel-accurate reproduction of the Trakt references; final visual acceptance occurs before v1.0.0.

## Final regression run and known limits

- Re-ran core checks independently: **31/31 passed**.
- Re-ran media browser group independently: **7/7 passed**.
- Re-ran library/PWA browser group independently: **9/9 passed**.
- Rebuilt runtime bundle and passed the zero-network prepublication integrity audit: **53 allowlisted files**.
- The deployment preflight script needs a canonical deployed origin as an argument; it was not run against a live deployment and should not be counted as a passed gate.
- Browser fixtures mock provider responses. No authorized external API or user-account sync verification has occurred.
