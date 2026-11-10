# Mokumokuren v0.3 — approved dark-mode visual preview

This version applies the agreed Liverpool-inspired palette to the previously approved light-layout composition, without changing the tracking APIs. It retains the top-level navigation and the eye-filled shoji header, replaces white surfaces with dark green/teal, uses burgundy for selected controls, and adds the approved generated app icon.

## Deploy
Replace the repository files with the ZIP contents (including `assets/`), commit to `main`, and allow Netlify to redeploy. Existing Netlify environment variables remain in Netlify. Do not upload secrets.

## Testing
Open the site in Safari, hard-refresh or remove/re-add the Home Screen shortcut if the old icon is cached. Check Movies/TV/Anime, each tab, posters, Watchlist empty state, Settings, and OAuth integrations. This is a CSS/visual build; actual account flows have not been live-tested.

## Notes
The generated mockups are design references, not screenshots of the running app. This build deliberately does not claim to implement every illustrated concept screen, animated shoji transitions, or new recommendation features.
