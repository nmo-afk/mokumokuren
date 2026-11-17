# Mokumokuren — Trakt replica substep 1: CSS and palette foundation

**Status:** Source refactor and offline checks complete. **NOT** a release build, **NOT** a claim of pixel-perfect Trakt parity, **NOT** authenticated integration acceptance.

## Binding user requirements

1. The supplied Trakt HTML and screenshots take priority over prior Mokumokuren-inspired layouts. Reproduce its anatomy, spacing, density, button geometry, sections, episode views, lists and navigation as closely as possible.
2. Primary background and dominant brand: burgundy `#960012`; Trakt purple selections become gold `#FBD242`; text is ivory `#F2F4F3`; green `#006757` is restricted to genuine tertiary/success indications.
3. Preserve Arctic icons, expanded/compact/hidden sidebar, mobile top navigation (no bottom app navbar that covers Netlify) and the Trakt/AniList/TMDB integrations.
4. No screenshots shown to the user until the full replica is visually acceptable. No intermediate user testing or deployment.

## Source changes in this checkpoint

- Starting point: `mokumokuren-step11-trakt-replica-pass` (end of the previous 12-step Step 11).
- Replaced 249 pre-existing green-tinted CSS colour occurrences while leaving the original media artwork, icons, and application JavaScript unchanged.
- Consolidated four scattered `:root` token blocks in `trakt-rebuild.css` into one authoritative 37-token theme, with explicit palette ownership.
- Eliminated 18 competing `!important` decoration/colour declarations in `style.css`; left 164 historical layout priority declarations after testing proved that removing all 182 caused click interception at the header. Further structural cleanup is still necessary and must be regression-driven.
- Added `tests/browser_replica_palette_audit.py` to audit actual computed colours across Movies Home, TV In Progress, Movie Watchlist, Anime In Progress, and My Lists at 375px and 1440px. Result: **zero unintended green computed surfaces/text/borders** in all ten scenarios, excluding explicit connected/success status components.
- Added `tests/test_replica_palette_contract.py` to prevent CSS palette regressions, including duplicate token ownership, non-tertiary green values, and reversed stylesheet loading order.

## Gating and unfinished work

- This step fixes residual green and establishes a stable base for the visual reconstruction; it does not yet replicate Trakt's homepage, list, profile or detail-page geometry pixel-for-pixel.
- Visual comparison still requires actual user-supplied Trakt reference screenshots at matching viewport dimensions, not approximate mock data.
- Trakt, AniList, TMDB live authenticated behavior and cross-device sync are not verified by offline tests.
- No GitHub or Netlify deployment was made.

## Remaining replica visual milestones

2. Desktop shell, sidebar and simplified controls measured against the supplied Trakt references.
3. Home, Discover, In Progress, Watchlist, Watched, My Lists and Profile layout reconstruction.
4. Movie, TV, season, episode, cast, streaming and recommendations detail-page reconstruction.
5. AniList features layered into the same Trakt anatomy.
6. Mobile composition and interactions (sticky TOP navigation for Netlify badge compatibility).
7. Visual comparison gate, polish, accessibility and complete regressions.

## Progress accounting

- **Replica visual milestones:** 1/7 = 14.3% of the tracked reconstruction checklist. This is a task-completion percentage, **not an objective image-similarity score**.
- **v1.0.0 acceptance milestones:** 11/20 = 55% of the checklist: 10 earlier functional milestones plus this replica foundation; 6 further replica milestones; 3 release gates (live provider verification, comprehensive end-to-end QA, final distribution/deployment readiness). This is **not a forecast of elapsed time or a declaration that the app is 55% production-ready**.

## Final verified regression results (same checkpoint)

- 117 Python unit tests passed (includes 3 new static palette regression tests).
- All 25 Node contract test files passed.
- Production release build and independent offline bundle audit passed: 94 allowlisted runtime files, zero network calls.
- Computed-style audit passed on 5 screens × 2 widths = 10 checks, with no unintended green.
- Responsive shell passed at 320/375/768/1024/1440px.
- Trakt library classification passed at 375/1440px; discovery/list sorting and correct index removal passed at 320/375/768/1440px.
- Sidebar mode, mobile interactions and detail-page browser regressions passed at tested widths.
- `app.js` SHA-256 matches the original source checkpoint exactly: `6c4872d5e247dc1f12cd91b20db21d666dec49f3ea8100196251318a2175ae86`.
