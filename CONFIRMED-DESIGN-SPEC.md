# Mokumokuren — binding design specification (2026-11-11)

The user explicitly superseded any earlier conflicting visual instructions. This is a visually faithful reproduction of the user-supplied Trakt HTML and screenshots, **not** merely a Trakt-inspired design. Match source interface anatomy: layout, typography, density, navigation, expanded/compact/hidden sidebar, card proportions, detail sections, control shapes, animation/scroll behavior, lists and progress. Replace Trakt branding with Mokumokuren branding; use supplied Trakt icons first, with Arctic Fuse as fallback only. Add AniList/Anime and the account integrations without disturbing faithful Trakt visuals. Mobile navigation remains sticky at TOP to avoid covering Netlify badge.

## Confirmed exact palette roles
- Primary: #960012 (burgundy)
- Secondary: #FBD242 (bright gold)
- Tertiary: #006757 (emerald)
- Main page / application background: #960012 (same as primary burgundy; exact user override at 17:20 UTC)
- Main text: #F2F4F3 (cool ivory)
- Secondary surfaces: darker burgundy derived from #960012 (currently #79000f / #65000f). Deep forest #061D1B and other greens must not take over the canvas.

WCAG contrast against respective standard surfaces: ivory text on the burgundy canvas approximately 8.25:1. Gold is a highlight for selected states; avoid ivory text on gold-filled buttons. Emerald remains limited to connection/success states. Use dark text on gold controls.

## Release acceptance gates
Compare rendered Home, Discover, In Progress, Watchlist, Watched, Profile, movie, show, seasons, episodes and Anime against the supplied Trakt HTML and screenshots at desktop, mobile and tablet widths. Verify hover, active and focus states, sidebar collapse, offline behavior, Trakt Watchlist and AniList progress across devices. My Lists and Smart Lists are deferred to v2.0.0. Personal rating input, Plex Library and Settings Preview are outside the v1.0.0 scope.

## Icon priority — user override, 12 November 2026

This instruction supersedes every earlier Arctic-only/original-Arctic requirement in historical documents and tests:
1. Use Trakt icons available in the supplied HTML/assets as the primary reference and implementation source. Preserve their viewBox, proportions, optical centering, stroke/fill treatment, and control alignment/spacing.
2. Use Arctic Fuse only when the needed icon is unavailable in the supplied Trakt set, including Anime-specific controls where necessary. Normalize fallback sizing and alignment to the surrounding Trakt controls.
3. Keep Mokumokuren branding, burgundy #960012, gold #FBD242, ivory #F2F4F3 and top mobile navigation.

This adopted requirement is implemented in the current source: the Trakt SVG symbol registry supplies available primary icons and normalized Arctic PNGs provide fallbacks. The build verifies registry/sprite parity and includes the Anime mask. Preserve the existing asset attribution when changing assets. Older Arctic-only notes remain historical and do not override this priority.
