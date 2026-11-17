# Mokumokuren v1.0.0 — zero-credit prepublication audit

**11 November 2026. Status: still an unpublished candidate, not approved for public distribution.**

The owner will manually upload a completed source snapshot to GitHub and manually initiate the first Netlify publication. **Do not push commits, auto-deploy, run preview deploys or request local install tests during development.** Netlify billing/credits can be affected by automatic builds, so the owner should inspect Netlify's deployment triggers before linking a GitHub repository.

## Independent checks completed offline

- `node scripts/build-release.mjs`: allowlisted production assets and a SHA-256 manifest.
- `node scripts/audit-release-bundle.mjs`: verifies every SHA-256 digest, rejects extra files and missing assets, checks local HTML/CSS/PWA references, validates the Netlify publish target and route ordering. Runs with no network requests.
- `node tests/release_bundle_integrity_contract.mjs`: tests clean pass and tampered/missing/extra/broken-reference failures.
- `node scripts/prepare-source-tree.mjs`: reconstructs a clean GitHub staging directory from a strict source allowlist, retaining full tests and deployment functions but omitting old historical documents, generated dist/, caches, and old ZIPs. **No push/deploy.**

The generated `release-github-source/` directory is intentionally Git-ignored and clearly marked not ready to publish. The production `dist/` remains generated at build time and must not be uploaded as a static-only site without the Netlify Functions.

## Blocking for the final version number

1. Live provider credentials and callback domain registration; not checked until a production origin exists.
2. Full Trakt and AniList OAuth, authenticated writes and cross-device readback; cannot be proven by the mocked regression suite.
3. Actual HTTPS PWA install, offline reopening and update behaviour on mobile and desktop.
4. Clearance of all bundled Arctic Fuse derivative PNG redistribution rights, including CC BY-NC-SA obligations if applicable.
5. First owner-initiated GitHub source publication and Netlify deployment, followed by minimal production acceptance. Avoid automatic deploy-on-push settings if they would consume extra credits.

No credit-consuming Netlify action was taken and no user local build test was requested.

## Deploy-credit distinction (Netlify documentation checked 11 November 2026)

Netlify **Stop auto publishing** can still build preview/branch/production deploys. To prevent unnecessary build activity, use **Stop builds** while the repository receives non-release commits, or do not link the repository until release day. Netlify's documentation also notes that stopping builds disables the UI's normal Trigger deploy action; re-enable builds when deliberately triggering the intended Git-based release. A manual Netlify CLI production deploy can be performed instead when its required functions are included. Merely dragging the static `dist/` directory to Netlify is not a complete API deployment.

References (official Netlify documentation):
- https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/
- https://docs.netlify.com/deploy/create-deploys/
- https://cli.netlify.com/commands/deploy/

## Most recent source verification

Core: 24/24 command-level checks (including Python units, JavaScript contracts and the new artifact-tamper tests).
Media browser: 6/6, library browser: 9/9. Total **39/39 command-level automated checks**. Static artifact and clean source-tree builds pass independently; real HTTPS authentication/installation remain unverified.
