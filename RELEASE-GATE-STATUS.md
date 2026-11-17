# Mokumokuren release gate status

Updated 17 November 2026 for **1.0.0-rc.1**. `RELEASE-PROGRESS.md` is the work countdown; `checks/release-step5.json` is the final source-audit record. Earlier totals and environment limits in development journals are historical.

The production build contains 97 allowlisted runtime files plus its integrity manifest. The source includes current provider/session contracts, Trakt/AniList tracking fixes, content-derived worker versions, same-version shell caching, explicit updates and save-aware reload handling. The GitHub staging path now preserves the documents, test artwork and backend modules needed to reproduce its checks.

Chrome has verified an actual local service worker, cached startup with the origin server stopped, staged updates and separate consent across two tabs. This replaces the earlier blanket statement that no real local worker check was possible. Production headers, real provider accounts and phone/Safari remain unverified.

| Release evidence | Status |
| --- | --- |
| Source build and offline regression/audit | 41/41 core checks in the staged source; 97 runtime files verified |
| Legacy full Playwright media/library rerun | Not run for this candidate |
| Production deployment of this candidate | Pending owner's manual action |
| Production configuration and exact candidate/API probes | Pending |
| Live Trakt/AniList tracking and cross-device readback | Pending |
| Phone/Safari and installed production PWA | Pending |

A release-candidate publication can precede the live checks needed to accept 1.0.0. Follow `OWNER-RELEASE-HANDOFF.md`; the development run performs no push, deployment or provider mutation. Existing attribution/private-use scope remains unchanged.
