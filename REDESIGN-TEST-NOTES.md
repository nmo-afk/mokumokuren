# Mokumokuren redesign local test — 2026-11-11

This is a test checkpoint, not v1.0.0 signoff. No GitHub or Netlify publishing was performed.

Changes:
- Compact header, three always-visible media mode selectors, smaller icons, tighter page titles and actions, less intrusive modal close control, responsive mobile spacing.
- Anime list quick +1 episode writes through existing AniList mutation and waits for confirmation before showing Saved.
- TV In Progress now comes from watched show history and uses Trakt per-show progress; TV Completed requires Trakt's completed flag rather than simply appearing in watched history.
- TV In Progress cards can mark the next episode watched directly through Trakt when its next episode is known. This is a real Trakt write; test deliberately with a title you are watching.
- TMDB enrichment no longer disables all detail calls after one 400; retains fallback title search.

Limitations:
- Trakt and AniList authenticated calls were not exercised with the user's credentials. The local server requires a TMDB_READ_TOKEN for TMDB metadata; without it cast/related will remain unavailable.
- Full metadata availability and TV progress accuracy require live account validation.
- Trakt's watched-show history can be large, so per-show progress checks may be slow or hit rate limits. We do not claim full release readiness.
- AniList tracking and Trakt history remain distinct service-backed sources; anime +1 updates AniList and TV +1 updates Trakt.

Test commands executed: node --check app.js; Python unittest discover (102 tests passed); node --test tests/*.mjs (19 passed after rebuilding dist); Playwright browser_smoke.py, browser_library_interactions.py and browser_tv_anime.py passed at 375, 768, 1440px.

Windows: unzip, run START-MOKUMOKUREN-WINDOWS.bat, then visit http://127.0.0.1:8765/local-login.html. Never share access tokens in chat.
