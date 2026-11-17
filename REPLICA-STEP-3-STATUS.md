# Mokumokuren — Replica substep 3: Trakt-style main pages

**Status: Implemented and offline-verified as an internal development milestone, not final Trakt parity and not v1.0.0 acceptance.**

## Reference and requirements

The user-supplied Trakt Home HTML contains two forms of title rail: landscape Continue Watching items and portrait Start Watching cards, both with linked section headings and collapse controls. The user's Trakt list, progress, movie, TV and mobile references inform the density and navigation. This source implements corresponding UI structures using Mokumokuren's own state and rendering functions, not private Trakt app/runtime dependencies.

- Keep the exact #960012 burgundy page canvas, #FBD242 selected accents, #F2F4F3 ivory text, original Arctic icon imagery and top mobile navigation.
- Keep all previous account, OAuth, TMDB, AniList and Trakt list logic; there is no new list backend.

## Actual implementation

1. **Home**: connected-data Continue Watching and Watchlist now render section headings with Trakt-style linked labels, minimal Previous/Next and Collapse/Expand controls. Start Watching supports the same navigation and collapse affordances. These are real accessible buttons and event handlers, not static decoration. Existing quick +1 episode actions and content IDs are preserved.
2. **In Progress**: TV and Anime libraries use horizontal 16:9 episode/progress cards rather than generic portrait posters, with actual episode titles, watched counts and gold progress bars where provider data is available. Other library collections remain poster grids.
3. **Watchlist and Watched/Completed**: shared compact headings and inline search/sort/view/refresh controls rather than a large ornamental filter panel. View, filter, sort and click mapping remain backed by the original items, including Trakt IDs.
4. **Discover**: compact header, search/filter toolbar and denser poster results, including separate AniList format, status, season and year controls. Search actions and provider APIs are unchanged.
5. **My Lists**: full-width, denser Trakt-native list surface with list/item search and sorting. It is still a page-like overlay, **not yet a true route**, and remains on Trakt for create, delete, membership and synchronization.
6. **Profile**: tighter profile and connection sections with true account verification states, and no invented usage statistics.
7. **Removed a visual regression**: the legacy `.empty { display:flex }` styling overrode the HTML `hidden` attribute, displaying a giant decorative empty-state illustration below populated TV libraries. The new scoped rule respects hidden states; a browser test now checks this.

## Verification performed

- `node --check app.js` — passed.
- Python unit suite — **117 passed**.
- All **25 Node contract test files passed**, including the current PWA source hash contract after regenerating the bundle.
- New `tests/browser_replica_main_pages_step3.py` — passed at **320, 375, 768, 1024, 1440px**. Checks linked/collapsible rails, TV/Anime landscape progress cards, sorting/search, Discover, AniList, Profile, Trakt lists, no overflow or page JS errors, and no visible empty illustration on populated libraries.
- Existing shell tests — passed at 320, 375, 768, 1024 and 1440px.
- Trakt show classification/library — passed at 375 and 1440px.
- Trakt discovery + native lists sort/search/removal — passed at 320, 375, 768 and 1440px.
- AniList discovery/statuses — passed at 320, 375, 768 and 1440px.
- Trakt and AniList +1 episode regressions — passed at 375 and 1440px.
- Library, detail-modal and off-palette-green tests — passed in their original viewport sets.
- Internal screenshot capture script — 22 views captured, using demonstration data. **These screenshots are deliberately not supplied to the user until the UI meets the Trakt-fidelity goal.**
- Production allowlist build and offline integrity audit — **94 runtime files** verified; no credentials or network calls required.

## Release and visual acceptance still outstanding

This checkpoint is structurally closer to the user-provided Trakt pages; it has **not** passed pixel-by-pixel fidelity against Trakt on every screen. The detail-page replica (next milestone), Anime-specific visual parity, top-navigation mobile polish, and final side-by-side visual gate remain. Real authenticated Trakt/AniList/TMDB requests, cross-device synchronization, OAuth flows and PWA deployment cannot be certified by offline fixtures and remain release blockers.

## Tracked milestones (checklists, not quantified visual similarity)

- Replica visual-rebuild checklist: **3 / 7** = **42.9%**.
- Full v1.0.0 acceptance checklist: **13 / 20** = **65%**.
- No deployment, no live account mutation and no user acceptance testing performed.
