# Mokumokuren v0.7 — tracking and discovery patch

Based on the provided v0.6 ZIP; existing UI styling is preserved.

## Changes
- Trakt OAuth uses PKCE S256 with a per-login code verifier and no Client Secret, as required by the Trakt app configuration.
- AniList library fetched and deduplicated by media ID, with custom-list overlap handled.
- Recommendations exclude all titles present in the connected AniList collection, including planning, completed, paused and dropped.
- Discovery balance slider re-ranks recommendations based on genre overlap with viewing history and novelty, rather than only changing its label.
- Episode progress controls in anime detail modal: plus, minus, manual count, and right/left swipe. Optimistic update, AniList mutation, error rollback.
- Status shortcuts for Watching, Paused and Dropped.

## Deployment
Upload all files from this ZIP to GitHub main, replacing existing files. Netlify deploys automatically. Configure `TRAKT_CLIENT_ID` in Netlify environment variables, and verify callback is exactly `https://mokumokuren.netlify.app/callback` in Trakt's app settings. Keep `SECRETS_SCAN_OMIT_KEYS=TRAKT_CLIENT_ID,ANILIST_CLIENT_ID` if Netlify flags public OAuth IDs. No Trakt Client Secret is required or issued for PKCE apps.

## Limits
- Episode progress updates are numeric counts, not individual AniList episode history (AniList stores a progress count).
- Last-episode completion remains manual, to avoid accidental completion.
- Discovery uses genre-based ranking of AniList's popular pool, not a machine-learned recommender.
- Trakt watched/list actions still require TMDB-to-Trakt ID mapping; this patch focuses on authentication, not two-way movie/TV syncing.
- No live OAuth test can be performed without the user's Trakt credentials/session.
