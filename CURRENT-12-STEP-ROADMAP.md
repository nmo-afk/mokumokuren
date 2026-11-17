> HISTORICAL PLAN — superseded by the seven replica milestones documented in REPLICA-STEP-1-STATUS.md. Current continuation: Replica Step 7 IN PROGRESS; see LATEST-CHECKPOINT.md and REPLICA-STEP-7-STATUS.md. Entries below preserve earlier development history and are not current next-step instructions.

# Mokumokuren — active 12-step plan (supersedes the older six-step release document)

As of 11 November 2026, the user requested **no intermediate testing or deployment** until a consolidated Trakt-like v1.0.0 candidate exists. The older `V1-RELEASE-ROADMAP.md` records prior release engineering history and is **not** the active development-step count.

| Step | Development workstream | Status |
|---|---|---|
| 1 | Baseline source audit and design-reference inventory | Done in internal development |
| 2 | Desktop shell, sidebar, home and card layout | Done in internal development |
| 3 | Movie, TV and anime detail screen reconstruction | Done in internal development |
| 4 | Mobile top navigation, responsive interactions and carousel polish | Done in internal development |
| 5 | Trakt/AniList account isolation and OAuth hardening | Offline implementation complete; live-provider acceptance open |
| 6 | TMDB identity, metadata and artwork | Offline implementation complete; live-provider acceptance open |
| 7 | Trakt pagination, TV progress and native Trakt lists | Offline implementation complete; live-provider acceptance open |
| **8** | **Dedicated AniList discovery and rich anime metadata/status views** | **Offline implementation complete; live-provider acceptance open** |
| **9** | **Episode +1 and progress synchronization polish** | **Offline implementation complete; live-provider acceptance open** |
| 10 | Discovery, recommendations, list-management UX | Next |
| 11 | Visual/regression acceptance and integration verification | Pending |
| 12 | Full Windows acceptance build and owner-controlled deployment readiness | Pending |

**Release condition:** Green offline test fixtures and an internal source ZIP do *not* prove working production OAuth, TMDB/AniList network connectivity, Trakt list writes, or offline PWA behavior on the user's actual devices. GitHub and Netlify have not been modified during this step. See `STEP-9-IMPLEMENTATION-STATUS.md`.
