# Mokumokuren 1.0.0 production acceptance

17 November 2026. Candidate: **1.0.0-rc.1**. The final development audit is recorded in `checks/release-step5.json`. This is source readiness evidence; the candidate has not been deployed by the development run.

## Verified development evidence

The current build emits 97 allowlisted runtime files and an integrity manifest. The static audit checks every hash, local asset reference, the worker shell, publish restrictions and Netlify route order. Source contracts cover provider proxies, authentication boundaries, mutations, read recovery and PWA lifecycle. The source-staging regression checks complete documents/artwork/backend modules and an identical clean build.

Earlier Chrome work covers the desktop/mobile fixture layouts, confirmed anime detail controls, actual local worker installation, cached startup with the server unavailable and a two-tab consent/update sequence. The browser's sample save activity is synthetic. Full legacy Playwright media/library groups were not rerun for this candidate, and their earlier results are historical.

## Owner-controlled sequence

Use `OWNER-RELEASE-HANDOFF.md`: stop builds while uploading, confirm the production variables/callbacks, make one deliberate deployment of this candidate, then run the necessary live checks. Live checks follow candidate publication; final 1.0.0 acceptance follows successful live results. This avoids requiring a production check before a candidate exists.

| Gate | Current status |
| --- | --- |
| Current source build, core checks and upload-tree audit | Passed: 41/41 staged-source core checks, 97 verified runtime files |
| Production Functions configuration and candidate identity | Pending owner deployment and read-only probes |
| Trakt PKCE/refresh, real data, tracking/date/rewatch readback | Pending connected current candidate |
| AniList OAuth, progress/status/repeat readback | Pending connected current candidate |
| Real cross-device behavior and phone/Safari HTTPS installation | Pending |
| Owner's final 1.0.0 sign-off | Pending |

`/api/release-health` establishes configuration consistency only. The live verifier adds candidate inventory/entry-point checks and read-only API probes; it does not establish authenticated writes or device installation. Keep unknown write outcomes protected against automatic replay.

No intermediate owner-run local build is required. Existing attribution is retained, and the owner's private-use decision to defer additional per-icon investigation is unchanged. Do not turn that historical investigation into a new approval gate.
