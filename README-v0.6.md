# Mokumokuren v0.6 — OAuth and library integration test

Based on v0.4 (approved visual design). This release does not intentionally change the UI styling.

## Install
Upload **all files and folders inside this package** to the root of the GitHub repository `nmo-afk/mokumokuren`, replacing the old versions. Do not upload the containing folder as an extra directory. Commit to `main`, and check the Netlify deploy log for successful Functions bundling.

## Netlify environment variables
- `TMDB_READ_TOKEN` — existing TMDB read token
- `TRAKT_CLIENT_ID` — Trakt app client ID, **required**
- `TRAKT_CLIENT_SECRET` — Trakt app secret, recommended for authorization-code exchange
- `ANILIST_CLIENT_ID` — AniList app client ID
- `ANILIST_CLIENT_SECRET` — AniList app secret, **required**

Variables must be available to Netlify Functions. Trigger a fresh deployment after changing them. Do not put secrets in `app.js`, public files or GitHub.

Register exactly `https://mokumokuren.netlify.app/callback` as the redirect URL in both developer apps. Keep Trakt allowed origin `https://mokumokuren.netlify.app` where applicable.

## Changes
- AniList OAuth now requests an authorization code and exchanges it through a Netlify Function instead of requesting the unsupported implicit grant.
- Trakt OAuth now uses authorization-code PKCE and validates callback state; server exchange can include the secret when configured.
- OAuth callbacks verify which provider initiated the request and reject mismatched state.
- Connection status now checks actual AniList Viewer and Trakt user settings, and shows verified usernames in Settings.
- Anime library import includes custom lists and deduplicates entries, retaining entry IDs and episode progress.
- Library API failures display their error instead of appearing to be an empty watchlist.

## Testing
1. Open Settings and connect AniList. Check the username appears. Check Anime > In Progress, Watchlist and Watched.
2. Connect Trakt. Check username appears. Check Movies/TV > Watchlist, Watched and In Progress.
3. If a connection fails, capture the exact error text and the Netlify Function log (redact tokens and secrets).

**Known limitations:** Trakt movie/TV metadata enrichment and full bidirectional tracking are not complete. The UI still intentionally refuses to mark TMDB titles as watched on Trakt without mapping IDs. No live OAuth verification has been performed for this build.
