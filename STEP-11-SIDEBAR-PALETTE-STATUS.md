# Mokumokuren Step 11: navigation collapse and palette decision

Status: implementation complete for the three-state desktop sidebar; palette choice pending user selection.

## Sidebar change
- Desktop viewport >=960px: one top toolbar button cycles Expanded (210px), Compact (64px icon rail), Hidden (0px). The next click returns to Expanded.
- Preference persists under `mok_sidebar_mode` in localStorage. Re-rendering and section switches retain it.
- Mobile below 960px retains the sticky top navigation and drawer; desktop toggle not shown on mobile.
- Hidden sidebar is inert and aria-hidden; compact icon buttons have accessible names.
- No account or metadata API code changed.

## Original CSS palette (style.css v0.3)
- Deep green canvas `#061D1B`
- Panel green `#092824`
- Elevated green `#10332E`
- Burgundy `#960012`
- Green accent `#006757`
- Cool ivory `#F2F4F3`
- Bright gold `#FBD242`

Later stylistic variants also present in stylesheet: muted gold `#D7B67A`, warm ivory `#F4E6C9`, deep burgundy `#690E20`. These are variants, not all part of the earliest v0.3 list.

## Verification
- 111 Python unit tests passing
- 25 Node contract test files passing after production rebuild
- Offline prepublication integrity audit passing: 94 files
- Playwright: desktop expanded -> compact -> hidden -> expanded at 1024 and 1440px; state retained across navigation; no overflow or runtime errors
- Playwright: mobile layout unaffected at 375px; existing shell test passes at 320/375/768/1024/1440px
- Not deployed; final Trakt visual fidelity and live-provider acceptance still outstanding
