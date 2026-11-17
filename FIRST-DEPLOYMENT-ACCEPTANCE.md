# Mokumokuren v1.0.0 — Owner-controlled first deployment

Status: **candidate only, not live accepted**. No GitHub push or Netlify deploy has occurred.

## Before first Netlify build

1. Select the final HTTPS origin, e.g. `https://YOUR-SITE.netlify.app`. Do not change it after OAuth registration without updating settings.
2. Register `https://YOUR-SITE.netlify.app/callback` with the Trakt and AniList applications. Confirm the provider's required redirect configuration in its developer console.
3. In Netlify's environment-variable settings, add the **Functions runtime** values: `MOKUMOKUREN_ORIGIN` (no trailing slash), `TMDB_READ_TOKEN`, `TRAKT_CLIENT_ID`, `ANILIST_CLIENT_ID`, `ANILIST_CLIENT_SECRET`. Client IDs must match the values in `.env.example`; keep secrets out of GitHub and the ZIP.
4. Upload the contents of this ZIP to a GitHub repository, keeping `netlify.toml`, `scripts/`, `netlify/`, `app.js`, and `assets/` at the repository root. Do not upload the ZIP as a single repository file.
5. Import that repository into Netlify when ready to deploy. Confirm build command `node scripts/build-release.mjs`, publish directory `dist`, and Functions directory `netlify/functions`. Do **not** use Netlify's drag-and-drop static upload: this app requires Functions.
6. Avoid additional builds until the full configuration is ready. Disabling automatic *publishing* is not the same as disabling automatic *builds*.

## Immediately after the single controlled deployment

- Run `node scripts/verify-live-deploy.mjs https://YOUR-SITE.netlify.app` from the repository on a computer with Node and network access. This is read-only and tests the deployed endpoints; it does not establish OAuth or PWA acceptance by itself.
- On the actual HTTPS site, complete Trakt login and check list read, list write, and readback after refresh; repeat on a second device.
- Complete AniList login and check progress update and readback after refresh and on a second device.
- On a supported mobile/desktop browser, install the PWA, reopen offline, return online, and verify the update path. Check that no private tokens or secret values are logged.
- If any live gate fails, **do not label v1.0.0 accepted**. Fix the issue locally and deploy a corrected release only when it is ready.

## Evidence and limitations

- This package was rebuilt and its production integrity audit passed offline.
- Previous unit and browser regression results are documented in the development checkpoint. Browser tests were not rerun as part of this handoff.
- Netlify credentials, provider callbacks, real account synchronization, and HTTPS PWA behavior are not validated by offline checks.

This handoff is for private personal use. Publication and account actions remain entirely owner-controlled.
