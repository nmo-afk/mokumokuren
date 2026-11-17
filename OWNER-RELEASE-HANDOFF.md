# Mokumokuren 1.0.0-rc.1 — owner release handoff

17 November 2026. This package is the candidate source. Publication remains your manual GitHub/Netlify action. The live account and phone checks below determine whether it can be signed off as 1.0.0. No deployment or account mutation was performed while preparing this package.

## 1. Keep builds stopped while uploading

On your existing Netlify project, inspect **Project configuration → Developer settings → Continuous deployment → Build settings**. Keep **Build status: Stopped builds** while replacing the GitHub source. Stopping automatic publishing alone can still allow builds, so it does not serve the same credit-saving purpose. Existing published content can remain available while builds are stopped.

## 2. Upload this candidate to GitHub

Extract the ZIP and use the contents of its project folder as the repository root. `netlify.toml`, `app.js`, `scripts/`, `assets/` and `netlify/` must sit at that root, rather than inside an extra nested checkpoint folder. Include `.gitignore`, `.env.example` and `.nvmrc`. Use your normal GitHub client to commit/push this completed candidate, and note the commit SHA. No intermediate deployment is needed.

The build ignores development notes, tests and reference artwork when producing `dist`. Keep the existing licence/attribution file. Private `.env` files, OAuth secrets and personal provider tokens do not belong in GitHub.

## 3. Confirm configuration before the one deliberate deployment

| Netlify setting | Required value |
| --- | --- |
| Base directory | Repository root |
| Build command | `node scripts/build-release.mjs` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |
| Node version | 24, selected by `.nvmrc` |

Set the following production environment variables privately in Netlify with **Functions** scope, or **All scopes** if your plan does not expose per-scope controls. The two public IDs are supplied in `.env.example`; the secrets are blank there.

| Variable | Meaning |
| --- | --- |
| `MOKUMOKUREN_ORIGIN` | Your exact production HTTPS origin, with no trailing slash, path, query or fragment |
| `TMDB_READ_TOKEN` | Private TMDB API read token |
| `TRAKT_CLIENT_ID` | Public Trakt application ID matching `app.js` |
| `ANILIST_CLIENT_ID` | Public AniList application ID matching `app.js` |
| `ANILIST_CLIENT_SECRET` | Private AniList OAuth application secret |

Both provider applications must register `${MOKUMOKUREN_ORIGIN}/callback` exactly. Use the production context; changing runtime variables requires a new deploy, so confirm them before building. A developer who already has the variables in a secure environment can run `node scripts/release-preflight.mjs https://YOUR-SITE.netlify.app`; it prints pass/block status without values. You do not need an intermediate local installation.

## 4. Make one deliberate candidate deployment

After the GitHub commit and configuration are ready, activate builds. Inspect Deploys for the candidate commit. If no build is already queued/running, trigger one deployment for that commit; avoid starting a second build for the same upload. Verify the build log reports **97 allowlisted runtime files plus the integrity manifest** and that the six Functions handlers were packaged.

Publish that candidate to the intended production URL using your existing Netlify publishing workflow. If automatic publishing is stopped, a successful build can remain unpublished; check which deploy is actually serving production. Once the intended deployment is complete, stop builds again to preserve manual control. A static-only upload of `dist` cannot provide the provider Functions backend.

## 5. Check the deployed candidate once

With Node already available, this optional script performs read-only probes and never changes lists/history:

```sh
node scripts/verify-live-deploy.mjs https://YOUR-SITE.netlify.app
```

The script reads the included `checks/candidate-integrity.json`. It compares the whole deployed static inventory and the bytes of six application entry points, so an older Mokumokuren interface cannot pass merely because its name matches. It also checks configuration, TMDB metadata and an anonymous AniList read. `TRAKT_TEST_ACCESS_TOKEN` in a secure environment optionally adds a read-only identity check. The script's own tests use simulated responses; it has not been run against this candidate in production.

If you use only the browser, verify the deployed commit in Netlify and open `/api/release-health` on your production origin. A successful response has `configured: true`; this establishes configuration presence only. Keep the stronger scripted identity/API checks marked pending if they were not run.

## 6. Complete the necessary live account/device acceptance

Use the normal app with your own Trakt and AniList accounts. Note the original state of any chosen test title before editing.

- Confirm Movies/TV Watchlist, In Progress and Watched show the provider's data. Make one reversible Watchlist change and confirm provider readback. Check a genuine watched episode/date or rewatch through the appropriate control; verify the result instead of creating fictional watch history.
- Confirm Anime Planning/Watching/Completed lists, one chosen progress change and rewatch status. Read back the returned episode and repeat counts, and restore a reversible test change if needed.
- Open the same account on the other device and refresh progress to confirm the chosen change is visible there. If a write's outcome is uncertain, reread the provider before retrying.
- Install/open the candidate from the production HTTPS URL on the phone and desktop. Load once online, then reopen with connectivity disabled: the public app shell should open and provider edits should require a connection. Reconnect and refresh. On iPhone, include Safari/home-screen behavior and top navigation/Netlify badge clearance.
- If an older installed version is present, accept its staged update and confirm the candidate loads. Do not create another deployment solely to manufacture an update test; record an unavailable real-device update scenario as pending. The actual two-version update sequence already passed in local Chrome.

These are production acceptance checks, separate from the completed development countdown. Keep `1.0.0-rc.1` until the applicable results are recorded. Record a verified failure concretely so any repair has a defined scope.

## Acceptance record

| Evidence | Current status / owner result |
| --- | --- |
| Candidate source | 1.0.0-rc.1; final report in `checks/release-step5.json` |
| Uploaded GitHub commit SHA | Pending owner upload |
| Production URL and deploy ID/commit | Pending owner publication |
| Configuration and candidate identity/API probes | Pending production check |
| Trakt OAuth, tracking and provider readback | Pending connected candidate |
| AniList OAuth, progress and provider readback | Pending connected candidate |
| Cross-device, phone/Safari and installed PWA | Pending real-device check |
| Final 1.0.0 sign-off/tag | Pending the results above |

## Platform references

Official Netlify references checked on 17 November 2026: [stop/activate builds](https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/), [Node version selection](https://docs.netlify.com/build/configure-builds/manage-dependencies/), [Functions deployment](https://docs.netlify.com/build/functions/get-started/), and [Functions environment variables](https://docs.netlify.com/build/functions/environment-variables/).
