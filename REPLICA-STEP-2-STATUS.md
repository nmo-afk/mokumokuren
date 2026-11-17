# Mokumokuren — Trakt replica substep 2: desktop navigation and simplified controls

**Status: Implemented and offline-verified. Internal checkpoint only. Not a finished Trakt replica and not v1.0.0 acceptance.**

## Source of the layout

The user-supplied **Trakt Web Home** HTML (`Pasted text(4).txt`) includes a navbar containing a segmented media selector (`role="radiogroup"` with radio-style selected states) and compact utility controls. This checkpoint reproduces that anatomy in Mokumokuren's own app, with a third Anime option. It **does not** import Trakt's internal application JavaScript or backend dependencies.

## Implemented

1. Replaced equal-weight media buttons with one segmented selector: Movies, TV Shows and Anime. The active mode shows its label and a gold-accented outline; inactive modes are icon-only. The original Arctic icon images are retained.
2. Added accessible `radiogroup`/`radio` states (`aria-checked`, roving `tabindex`) and Left/Right/Home/End keyboard navigation. Navigation still selects the existing application section; no alternate list database or media state is created.
3. Simplified the desktop toolbar to a collapse button, segmented selector and icon-only Filter, Search and Profile actions. `Filter` opens Discover and focuses its filter when available; `Search` opens Discover and focuses the search input; `/` works as a search shortcut outside text-editing controls; Profile opens the existing Profile page.
4. Reorganized the existing sidebar into NAVIGATION, YOUR LIBRARY, and ACCOUNT. The familiar Trakt-like destinations Home, Discover, Continue Watching, Watchlist, Watched/Completed, My Lists, Profile and Settings remain operational.
5. Preserved expanded (208px), compact (62px) and hidden (0px) sidebar modes. Corrected the old sidebar fixed-width CSS that extended 38px into the 208px track and intercepted clicks on the collapse control.
6. Kept mobile category switching and the sticky **top** navigation; no fixed bottom app bar may obscure the Netlify badge. The desktop collapse control is hidden on mobile and cannot add an accidental fourth mobile header row.
7. Preserved burgundy canvas `#960012`, gold selected states `#FBD242`, ivory text `#F2F4F3` and restricted emerald tertiary usage. No unapproved green computed UI colours reappeared.
8. The keyboard shortcut listener is aborted/replaced whenever the shell re-renders, avoiding accumulated handlers and duplicate navigation.

## Actual browser measurements and test results

- Desktop expanded sidebar: 208px. Compact: 62px. Hidden: 0px. Toolbar: 56px high.
- Mobile toolbar remains within the established 180px upper limit; no overflow at 320/375/768px.
- 117 Python unit tests **pass**.
- All 25 Node contract test files **pass**.
- New navigation browser checks **pass** at 320, 375, 768, 1024, 1440px: radiogroup, keyboard, selected state, toggle click geometry, Profile, Discover, search shortcut, responsive overflow.
- Existing sidebar-mode checks pass at 375/1024/1440px; existing shell and mobile-interaction tests pass at their viewport sizes.
- Existing Trakt classification, native-list search/sort/removal, AniList discovery, AniList +1 and Trakt +1 regressions pass at their tested widths using mocked responses.
- Computed CSS audit passes 5 views × 2 widths: **zero unintended green interface colours**.
- Production release build and independent offline audit pass: 94 allowlisted runtime files plus integrity manifest, no external network calls.

## Still outstanding

The segmented control and sidebar now follow the supplied Trakt anatomy, but **the remaining screens have not passed a pixel-level visual parity gate**. Replica steps 3–7 rebuild the content pages, detail pages, Anime visual integration, mobile fidelity and finally check screenshots against Trakt references. Authenticated Trakt/AniList/TMDB connectivity and cross-device sync remain unverified by these offline fixtures.

## Checklist progress (not objective screenshot similarity)

- Replica visual-rebuild checklist: **2 / 7** milestones = **28.6%**.
- Full v1.0.0 acceptance checklist: **12 / 20** milestones = **60%**.
- No deployment and no user acceptance testing performed.
