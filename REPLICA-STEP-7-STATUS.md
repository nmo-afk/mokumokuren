# Replica Step 7 — development visual review complete

17 November 2026. Internal source checkpoint.

## 17 November current status

The development visual and scope review is complete in Chrome. The earlier preview failure was resolved through the supported managed local preview. Runtime data was replaced by fixture handlers for this review. Current results and remaining work are recorded in `RELEASE-PROGRESS.md`.

The Watchlist header was shortened and its search, sort, refresh and view controls moved alongside its title and count. The date picker uses centered insertion gaps and equal-width Cancel and Mark as Watched actions. A final size check caught an older rule overriding the action height. The final rule measures 44 pixels high.

The review covered 45 desktop and phone main-page states, with additional tablet, detail, sidebar, keyboard and episode checks. Dated show and individual episode writes were confirmed by fixture handlers. All 37 core checks passed. The final release build and integrity audit verified 97 runtime files. The automated Playwright suites remain unexecuted and their 40 Python sources parse.

Replica implementation milestones are 7 of 7 complete. The final release plan is 1 of 5 complete, with an estimated four steps remaining. Live Trakt, live AniList, real-device installation and offline acceptance, and the owner's release are the remaining steps.

The sections below retain the earlier reference corrections and verification history.

## Recovered context

The two earlier conversations were searched for relevant decisions, not read in full. Full transcripts were not returned. The attached Step 6 package and its binding design specification were read. Later instructions take priority over earlier green/forest layouts: Trakt anatomy with burgundy #960012, gold #FBD242, ivory #F2F4F3; Trakt icons first, Arctic Fuse fallback (user override 12 November 2026); collapsible desktop sidebar; top-only mobile navigation; Trakt native lists; AniList progress and existing integrations. Do not request intermediate owner testing or show screenshots until the fidelity gate is satisfied.

## Reference evidence actually inspected

Original files IMG_4057.jpeg through IMG_4066.jpeg were visually inspected (contact sheet, with full-size inspection of 4057, 4063, and 4066). IMG_4055, IMG_4056 and IMG_4067 depict the superseded Mokumokuren design, not the intended Trakt target.

Measurements below are approximate pixel ratios from the 707px-wide reference images, not a claim about device CSS width or pixel-perfect similarity:

| Component | Reference evidence | Source correction at <=600px |
|---|---|---|
| Title | IMG_4057: title is compact relative to poster | 24–30px replaced by clamp(17px,4.4vw,22px) |
| Cast | IMG_4063: about 193px wide / 707px; portrait roughly 2:3 | 34vw replaced by 27.3vw with bounds; 3:4 replaced by 2:3 |
| Episode | IMG_4063: about 321px / 707px; almost two full cards visible | 76vw replaced by 45.5vw with bounds |
| Related | IMG_4060/4064/4065: three poster cards plus next-card hint | 37vw replaced by 29.2vw with bounds |
| Review | IMG_4063: about 512px / 707px, next card visible | 82vw replaced by 72.5vw, maximum 340px |
| Content sequence | IMG_4063/4064: episodes, Actors, Reviews, Extras | Moved Actors before Reviews/Extras in DOM, preserving keyboard and reading order |

Also replaced invalid scroll-snap-align:nearest with start. Kept existing touch-target rules. Extended the existing detail browser regression with density and DOM-order checks; these new browser assertions are unexecuted here.

## Verification evidence

- Original Step 6 source: core regression 35/35 passed in this workspace.
- Modified source: unit regression, syntax and 25 of 26 Node contracts passed on the first run; cache-version contract correctly rejected the stale dist build.
- Rebuilt dist, then reran cache-version contract: PASS. Thus all 35 core checks have passing results against the final runtime source, with the cache check run after rebuilding.
- Release build: 94 allowlisted runtime files plus integrity manifest.
- Independent release bundle audit: PASS; zero network calls.
- Modified browser test: Python syntax compilation passed. Browser execution did not occur.
- API/OAuth/provider functions and tracking/list mutations were not edited.

## Earlier preview blocker

Playwright Chromium launch failed before loading the app: process_singleton socket() returned Operation not permitted. A separate native Chromium preview was attempted through the supported desktop tools; file:///tmp/moku-review.html showed the organization-policy blocked page. No browser restrictions were disabled or bypassed. No current-build rendered screenshots were produced or visually reviewed. Step 6's historical browser passes do not validate the Step 7 changes.

## Earlier visual review plan

1. In an environment that permits local previews, build and run the existing replica browser suites, including the extended browser_replica_detail_step4.py, mobile Step 6, navigation, main pages, Anime, palette, reviews, and release browser groups. Verify narrow episode copy does not collide with its tracking button.
2. Render matching desktop/tablet/mobile states using real-reference artwork. Compare all pages, not only the mobile detail proportions corrected here. Retrieve the original Trakt HTML and desktop references as needed; those were located by search but not fully read in this continuation.
3. Correct differences and review focus, hover, collapsed sections, dialogs, tablet breakpoints and mobile top navigation. Do not claim a similarity percentage from checklist completion.
4. Mark Step 7 complete only after actual rendered inspection and browser gates pass. Live provider, device/PWA and owner-controlled release acceptance still remain afterwards.

## Reference retrieval identifiers

- IMG_4057.jpeg: libfile_2f46d8eea67c8191a0de87a29215be1b
- IMG_4058.jpeg: libfile_a2332f7e961881918885314956222926
- IMG_4059.jpeg: libfile_c970facfcdcc8191b64728abcad9e23b
- IMG_4060.jpeg: libfile_1c7cf18640548191a3725ef3bdf6beb5
- IMG_4061.jpeg: libfile_bfbecf2ab3a481918f1a59c49676fc8f
- IMG_4062.jpeg: libfile_9022168371f48191a6817e1b2c83a86b
- IMG_4063.jpeg: libfile_a2596cde2d5c81918220f28ed189dc05
- IMG_4064.jpeg: libfile_f10e820ecc3c819184c759d881c7db0b
- IMG_4065.jpeg: libfile_225f20439d7881919ad26a23c0fc12a3
- IMG_4066.jpeg: libfile_3dbaf82bd00c8191ba9a471bb34c3d7a

The 11 November checkpoint recorded the earlier review before rendered screenshots were available.

## Icon priority — user override, 12 November 2026

This instruction supersedes every earlier Arctic-only/original-Arctic requirement in historical documents and tests:
1. Use Trakt icons available in the supplied HTML/assets as the primary reference and implementation source. Preserve their viewBox, proportions, optical centering, stroke/fill treatment, and control alignment/spacing.
2. Use Arctic Fuse only when the needed icon is unavailable in the supplied Trakt set, including Anime-specific controls where necessary. Normalize fallback sizing and alignment to the surrounding Trakt controls.
3. Keep Mokumokuren branding, burgundy #960012, gold #FBD242, ivory #F2F4F3 and top mobile navigation.

The 17 November checkpoint implements the first icon pass. The build and offline shell include the captured Trakt sprite and the Arctic Fuse fallback assets. Source attribution is recorded in `UI-ICON-SOURCES.md` and `ARCTIC-FUSE-LICENSE.txt`.

## 17 November — Watchlist and icon checkpoint

- Home opens the active media section's Watchlist. The sidebar, mobile drawer, profile and title actions no longer expose My Lists. Custom-list code and provider routes remain for future v2 work. The active v1 interface retains provider-backed Watchlist and progress actions.
- The Trakt sprite provides navigation, media switcher, rail, tracking, title and sort icons. Missing shapes use the existing fallback pack. Anime uses the centered mask from the supplied Arctic Fuse archive.
- Watchlist sorting uses the 380px desktop drawer layout from the actual Watchlist capture. Trakt options include Default, Date Added, Runtime, Rating, Release Date, Title and Rank. AniList uses its available sort fields. Rating uses published scores. Selecting the current option reverses the order, and unavailable metadata sorts last in either direction. Sort changes act on the loaded data.
- Verification passed for the offline build, 97-file bundle audit, 35 core checks, and 31 library contract scenarios. Browser test files parse successfully. Chromium still exits before rendering because the workspace rejects the process singleton socket. Drawer interaction and visual fidelity on a device remain to be checked. Live account acceptance is still pending.

Resume with `browser_replica_main_pages_step3.py`, `browser_library_interactions.py`, `browser_visual_assets.py`, the detail checks and the mobile checks. Compare the rendered result with the captured Watchlist sort drawer and title controls first. Then finish the remaining Watchlist, Discover, Home, profile and title page comparisons, including card hover and menus. The captured hover recording, page bundles and mobile images are in Project Essentials. MKCinema is a separate reference for later recommendations and image-loading work.

## 17 November — card and title-menu checkpoint

The Recommended, Watchlist and Continue Watching page captures contain separate front and back faces. The recording shows the art flipping under a fixed caption and three-dot control. The updated artwork uses the saved stylesheet’s 525ms curve, 1280px perspective and 64px lift where supported. It applies the burgundy and gold palette and takes the displayed data from the title record. Missing back artwork leaves the summary readable. List view keeps static thumbnails, and touch stays on the cover unless a keyboard focuses the card.

Recommended cards use an anchored actions popover independent of the title button. Why this? identifies the app’s actual recommendation source. Watchlist reuses the provider’s state and actions. Track… opens the title’s tracking controls. Hide recommendation uses the local recommendation preference. The title page’s existing two preference actions use the same anchored menu. Escape, click-away dismissal and focus restoration are covered by the offline contract. The Trakt date options and other captured menu states remain part of later fidelity work.

Verification passed for the build, bundle integrity, all 36 core checks, and the source parser for 40 browser test scripts. The saved reference artwork was reviewed through screenshots and footage. Desktop preview failed with a refused connection to the local workspace server, leaving the current app’s rendered desktop, tablet and phone comparison open. No live Trakt or AniList account verification occurred.

## 17 November — Track… date checkpoint

The recommendation menu and title-page tracking action open the side drawer shown in the saved Trakt captures. The drawer offers Just now, Release date, Other date and Unknown date. Other date begins with a disabled date field and save button. A gap in recent Trakt history enables both and supplies an editable local date. The app reads up to 15 entries and lets the user enter a date manually when the read fails or there are no usable gaps. The user can return to the choices with Cancel or Escape.

The episode guide has a dated action for each episode and retains its one-tap watch and unwatch control. The primary in-progress +1 action and AniList episode tracking keep their existing behavior. Trakt title-page rewatching is available after the title’s tracking status is loaded. Show-level writes apply to the show’s episodes. Episode writes target an individual Trakt episode or its show, season and episode number. A watch is acknowledged after Trakt reports an addition. The app prevents a simultaneous repeat submit in the same drawer and retains failed submissions for review. It does not automatically resend writes with an unknown outcome.

Offline verification passed for all 37 core checks and the release audit verified 97 runtime files. The contract covers watched dates, UTC conversion across clock changes, show and episode scope, proxy query limits, account changes and repeated clicks. The mocked movie and episode browser fixtures were updated and parsed, and their execution remains pending. Current visual comparison and live provider signoff are open. No GitHub or Netlify deploy occurred.
