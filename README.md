# Mokumokuren 1.0.0-rc.1

This is the release-candidate source for the personal Movies, TV and Anime app. Movies and TV use Trakt, anime uses AniList, and TMDB supplies movie/TV discovery and metadata. The interface uses the supplied Trakt reference structure, burgundy `#960012`, gold `#FBD242`, ivory `#F2F4F3`, top mobile navigation, Trakt icons and Arctic Fuse fallbacks.

Start with [OWNER-RELEASE-HANDOFF.md](OWNER-RELEASE-HANDOFF.md) for the owner's manual GitHub/Netlify publication. [LATEST-CHECKPOINT.md](LATEST-CHECKPOINT.md) and [RELEASE-PROGRESS.md](RELEASE-PROGRESS.md) record the work countdown. [RELEASE-V1-ACCEPTANCE.md](RELEASE-V1-ACCEPTANCE.md) records live checks still required. Older `STEP-*`, `REPLICA-*` and `DEVELOPMENT-*` notes describe historical checkpoints; the current handoff and progress tracker supersede their old counts and planning estimates.

The source includes Watchlist, In Progress, Watched, recommendations/discovery, title details, season/episode tracking, confirmed AniList progress and rewatches, account/session recovery and a public-asset offline shell. My Lists and Smart Lists are deferred to v2.0.0. Ratings shown are external/community values; there is no personal rating input. [CONFIRMED-DESIGN-SPEC.md](CONFIRMED-DESIGN-SPEC.md) is the visual specification.

## Build and deployment configuration

Node 24 is pinned in `.nvmrc`. The production build uses Node built-ins and requires no npm dependencies or package installation.

| Setting | Value |
| --- | --- |
| Repository/base directory | The project root containing `netlify.toml` |
| Build command | `node scripts/build-release.mjs` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |
| Static runtime | 97 allowlisted files plus `release-integrity.json` |
| Backend | Six function handlers with imported modules under `netlify/lib` |

The build excludes local login/server helpers, tests, fixtures and development documents from `dist`. A production deployment must also package the Functions backend. A static-only upload of `dist` cannot provide those APIs.

## Provider configuration

Configure these privately in Netlify for production, with Functions runtime scope (or All scopes when per-scope controls are unavailable):

- `MOKUMOKUREN_ORIGIN`: the exact HTTPS origin, with no trailing slash or path.
- `TMDB_READ_TOKEN`: private TMDB API read token.
- `TRAKT_CLIENT_ID`: the public application ID from `.env.example`, which must match `app.js`.
- `ANILIST_CLIENT_ID`: the public application ID from `.env.example`, which must match `app.js`.
- `ANILIST_CLIENT_SECRET`: private AniList OAuth secret.

Register the exact `${MOKUMOKUREN_ORIGIN}/callback` in both OAuth applications. Missing or mismatched configuration fails closed. The repository contains public client IDs and empty secret placeholders only. Keep personal access tokens and secrets out of source and chat.

## Developer verification

```sh
node scripts/build-release.mjs
node scripts/audit-release-bundle.mjs
python tests/run_release_regression.py --group core
node scripts/prepare-source-tree.mjs
```

The source staging script produces the ignored `release-github-source/` tree and does not push or deploy. It includes the current design/progress documents, backend modules, source checks and supplied test artwork. Its regression builds that staged tree and checks that its production inventory matches the original.

The final staged-source core group passed **41/41 checks**, and the build/audit verified **97 runtime files**. The audit details and limitations are recorded in `checks/release-step5.json`. Chrome evidence from the preceding steps covers fixture interactions and actual local service-worker startup/update behavior. The full legacy Playwright media/library groups were not rerun for this candidate. Live accounts and production phone/Safari behavior remain pending.

## After the owner's candidate deployment

Optional read-only verification with Node already installed:

```sh
node scripts/verify-live-deploy.mjs https://YOUR-SITE.netlify.app
```

This uses `checks/candidate-integrity.json` to compare the deployed 97-file inventory and the actual HTML, JS, CSS, worker and manifest entry-point bytes. It also probes configuration, TMDB and anonymous AniList reads. An optional `TRAKT_TEST_ACCESS_TOKEN` from the secure environment adds a read-only identity check. It does not establish authenticated writes, cross-device sync or OS-level installation. A different candidate or stale asset fails the identity check.

The worker caches public app assets only. Provider account data and edits require a connection. Updates wait for explicit consent and active provider saves; other tabs retain their own reload choice.

## Credits

Mokumokuren is a personal, non-commercial app. Existing attribution is preserved in `ARCTIC-FUSE-LICENSE.txt` and the app settings. This product uses the TMDB API but is not endorsed or certified by TMDB. The owner's existing decision to defer additional per-icon research for this personal-use scope is unchanged.
