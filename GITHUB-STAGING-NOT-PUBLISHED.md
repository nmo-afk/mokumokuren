# Mokumokuren — GitHub source staging (UNPUBLISHED)

This source tree is prepared for the owner's first manual GitHub upload. It does not perform any push or Netlify deployment.

**Do not publish yet.** Production OAuth/HTTPS checks remain outstanding. This is for private use; preserve included source attribution and revisit rights if distribution scope changes.

Deploy with the project root containing netlify.toml; Netlify must build dist/ with Node and also deploy netlify/functions. Static-only drag-and-drop of dist is not enough.

No real tokens or secrets belong in this tree. Set Netlify environment variables privately. Confirm deployment/build automation settings before linking the repository, to avoid unwanted credit-consuming deploys.

The local-login.html and local_server.py files are test helpers and must never appear in dist/; the build allowlist enforces this.

Reproducible local checks: node scripts/build-release.mjs, node scripts/audit-release-bundle.mjs, python tests/run_release_regression.py --group core.
