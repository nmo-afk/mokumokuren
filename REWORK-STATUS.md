# Rework status — 11 November 2026

This is an **interim source checkpoint**, NOT a finished redesign or a launch candidate.

Changes made and statically tested:
- Added an independent, persistent desktop sidebar for Home, Continue Watching, Discover, Watchlist, Watched, My Lists and Settings.
- Reduced some oversized typography, icons and controls; adjusted dialog sizing.
- Fixed local Trakt route validation to allow query-bearing routes such as `/sync/watched/shows?extended=full`.
- Removed the misleading local TMDB fallback to a deployed proxy when `TMDB_READ_TOKEN` is missing; it now reports a specific configuration error.

Outstanding and NOT verified:
- AniList 403 / correct local OAuth flow.
- Full TMDB credits and recommendations with an actual TMDB token.
- Visual/browser verification of the new sidebar.
- Real-account Trakt progress correctness, full pagination, and episode writes.
- Full Trakt-inspired detail-page redesign and responsive polish.

Do not deploy this checkpoint.
