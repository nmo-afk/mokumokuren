# Step 11 — Trakt colour hierarchy correction (11 Nov 2026)

## User-directed visual contract
- Preserve the Trakt HTML/screenshots as the visual target, rather than a generic inspired UI.
- Primary **#960012 burgundy**: principal brand and action colour, subtle red-tinted chrome.
- Secondary **#FBD242 gold**: replace Trakt purple in ALL active navigation/tabs, selection and progress states.
- Main text **#F2F4F3 ivory**.
- Background **#061D1B deep forest** as previously selected.
- Tertiary **#006757 emerald** limited to connected/success states, not main selection/progress.
- Keep 3-state collapsible desktop sidebar, Arctic Fuse icons, sticky top mobile navigation and existing provider integrations unchanged.

## Actual source changes
- Appended a documented semantic colour override to `trakt-rebuild.css`, retaining previous declarations for rollback and source comparison.
- Updated the offline Chromium palette contract to check gold selection and red CTA separately.
- Regenerated production `dist/` including PWA integrity manifest; no credentials, user data or screenshot fixture images are shipped in that dist build.

## Checks passed
- `node --check app.js`
- `node scripts/build-release.mjs` and `node scripts/audit-release-bundle.mjs` (94 allowlisted files)
- 111 Python unit tests
- 25/25 Node contract scripts
- `tests/browser_confirmed_palette_step11.py` at 375, 1024, 1440px
- Browser screenshots: 22 main navigation views (1440/375) and six detailed desktop captures, using offline fixtures
- Browser sidebar modes, mobile interactions, discovery/lists, detail screens, shell responsiveness passed at their tested widths.

## Still NOT verified or complete
- No claim of exact/pixel-perfect Trakt visual parity. Home and detail composition still differ in places.
- No live authenticated Trakt/AniList/TMDB checks.
- No deployment to GitHub or Netlify; v1.0.0 release gate still blocked.
- Screenshot artwork is user-supplied reference artwork used as OFFLINE TEST FIXTURES only; not deployed.
