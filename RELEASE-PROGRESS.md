# Mokumokuren 1.0.0 progress

17 November 2026. Resume from `Mokumokuren-1.0.0-rc.1-Source.zip`.

The owner clarified on 17 November that each request to continue counts as one work step. The countdown now records completed implementation/review checkpoints. It is 5 of 5 work steps complete, with zero planned development steps left. The earlier 1-of-5 figure tracked live release acceptance and did not show completed source work; it is superseded as the work countdown. Keep actual release acceptance separate, and record additional work explicitly if a verified blocker changes the estimate.

| Work step | Deliverable | Work status | Acceptance still needed |
| --- | --- | --- | --- |
| 1 | Desktop/mobile visual comparison and layout fixes | Complete; Chrome fixture review | Real-device visual behavior |
| 2 | Trakt source review, tracking fixes and readiness checkpoint | Complete; offline regression verified | Live connected Trakt read/write/readback |
| 3 | AniList source review, progress fixes and readiness checkpoint | Complete; offline and Chrome fixture checks | Live connected AniList read/write/readback |
| 4 | Installation/offline/update source review and Chrome worker checks | Complete; this checkpoint | Production HTTPS install and phone/Safari checks |
| 5 | Final source/configuration audit, release candidate and owner handoff | Complete; 1.0.0-rc.1 source package | Owner's manual publication and final live acceptance |

## Step 1 evidence

The Watchlist title, media type, count, search, sort, refresh and view controls now share a compact header. The first poster starts at 127 CSS pixels on the desktop fixture and 216 CSS pixels in the narrow phone fixture. The native sort drawer remains 380 pixels wide on desktop. Sort, search, layout switching, Escape and focus restoration were exercised.

The custom date picker has centered gap controls between history entries. A chosen gap fills the date field and enables save. Cancel and save have equal widths and a minimum height of 44 pixels. A dated show watch and a dated individual episode were submitted to fixture handlers, which confirmed the expected UTC value and episode identity. The existing one-tap episode toggle was exercised afterwards.

Chrome rendered the 15 main Movies, TV and Anime page combinations at desktop width and the same combinations at each of 320 and 390 frame widths. All 45 combinations fit the viewport. Tablet Anime library and discovery controls were checked at 768 pixels. Movie, show and anime detail layouts, episode control spacing, the sidebar modes, profile scope and keyboard dismissal were also inspected. These checks use still artwork from the supplied captures and generated watch records.

All 37 core offline checks passed. The final stylesheet change passed a new release build, the 97-file integrity audit and the cache-version contract. The Playwright browser suites remain unexecuted in this environment. Their Python sources parse successfully. Chrome interaction evidence is in `checks/browser-evidence.json`. Screenshots are in `checks/desktop-watchlist.jpg` and `checks/phone-tracking.jpg`.

## Remaining acceptance

Live Trakt and AniList account reads and writes still need to be exercised through the normal app. Real-device and Safari behavior remain part of Step 4. The source is a release candidate until the owner's publication and live sign-off.

When the current candidate has an authenticated Trakt session, confirm Watchlist, Watched and In Progress data, then movie and episode changes, date selection, rewatches, refresh and reconnection. Record live results alongside the existing fixture evidence. This live gate does not prevent independent source work in the next counted step.

Replica implementation milestones are 7 of 7 complete after this Chrome review. This count records completed work. The earlier four release signoffs stand at 1 of 4 complete for the development visual and scope review. Live provider acceptance, real-device behavior and the owner-controlled release remain open.

## Step 2 source review

The current browser is signed out of Trakt. The existing Netlify interface predates the current candidate. The local environment has no configured Trakt test token. These observations leave live account acceptance pending.

The source review reproduced duplicate title-page Watchlist writes when the action was pressed repeatedly during a delayed request. It also reproduced a false success in the +1 episode action with an invalid addition count. Both failures now have a passing regression. The Watchlist action remains disabled through concurrent status refreshes. The quick episode action requires a positive integer confirmation, rejects unmatched shows, seasons and episodes, and validates episode positions before making a request.

All 38 core offline checks passed, and the runtime audit verified 97 files. These results cover the code and synthetic responses. The live read, write and readback scenarios remain pending.

The included `START-MOKUMOKUREN-WINDOWS.bat` opens the existing local login page. Live acceptance requires an authenticated session with the current candidate, through that local workflow or the owner's eventual HTTPS candidate. The earlier deployed interface provides separate historical evidence.

Step 2 source work is complete. Live acceptance remains pending. Its historical evidence records the previous acceptance-based counter.

## Step 3 source and fixture review

AniList source work continued while live Trakt acceptance awaits a connected candidate. There is no configured AniList test token in the current environment. No live account calls or mutations were made.

The new regression reproduced an older collection response replacing a newer same-account refresh and a read begun before a confirmed mutation overwriting newer progress. Collection commits now require the active pending request identity as well as the initiating token. Cache invalidation cancels the right to commit older reads.

Status mutations request the returned progress, status and repeat count. Confirmed, nonnegative integer counters reconcile across the anime collection, visible titles, recommendations and open detail. Nullable counters preserve the last known value. The detail progress count, bar, active status and episode button bounds update together, including after the header's Mark Watched action. The application does not invent a rewatch reset; it applies returned counters.

Status changes and episode changes now use one per-account, per-title write lock. A rejected competing action leaves the active lock intact, and success or failure releases the acquired lock. If the user changes media sections during a delayed anime response, that response updates the anime collection without changing Movie or TV records that happen to share its numeric ID.

All 39 core offline checks passed, including the new regression's six case groups. The release build and integrity audit verified 97 runtime files. The existing full Playwright browser suites remain unexecuted in this environment.

Chrome checks used the current title controls with a local fixture handler: Completed displayed 12 / 12 and disabled +1; Rewatching displayed 0 / 12; +1 displayed 1 / 12; a rejected Paused request retained 1 / 12 and Rewatching; -1 returned to zero; header Mark Watched displayed 12 / 12 and disabled +1. The fixture explicitly returned those progress values and an updated rewatch count. These observations verify UI handling of fixture replies. Real AniList completion and rewatch behavior still require live readback.

Evidence is in `STEP-3-ANILIST-CHECKS.log` and `checks/anilist-step3.json`. The browser fixture and sample session are excluded from the checkpoint and release bundle. The checkpoint has not been deployed.

Step 3 source and fixture work is complete. Both provider live-account gates remain pending. The owner will publish the final candidate manually to GitHub and Netlify.

## Step 4 PWA source and Chrome review

The review reproduced two version/lifecycle defects: global cache matching could serve an asset from an unrelated cache created earlier, and a first worker installation could show the notice intended for an update activated in another tab. Network-first HTML could also come from a newer release while the same page's unversioned JS/CSS came from the active worker's older cache. The worker now reads its own named cache for HTML and static assets, and a controlled app navigation uses that cached shell until the staged update is accepted. Auth callbacks, API routes, local login, the worker script, cross-origin requests and non-GET requests retain their network-only behavior.

Trakt and AniList mutation activity spans the whole logical request, including response parsing and token refresh when relevant. Read queries do not hold the write counter. Update consent is disabled while a save is active. A write that starts after consent delays the accepted reload until it settles. Request failures release the activity counter, while uncertain writes retain their existing no-replay handling. A failed worker activation message restores the action, and a redundant waiting worker does not leave the action permanently accepted.

All 40 core offline checks passed. The new `pwa_lifecycle_step4_contract.mjs` covers six groups: cache/version consistency and bypasses; first installation; save-aware consent and delayed reload; other-tab consent; activation-message recovery; and provider mutation activity through response consumption and failure. The release build and audit verified 97 runtime files. The previously available full Playwright suites were not rerun in this environment.

Chrome exercised the current worker and update code through local test builds A and B. The diagnostics added public build labels and a held sample-save action; they did not connect provider accounts. Earlier preview tabs were closed and the preview worker/cache was reset before the fresh install check.

| Chrome scenario | Observed result |
| --- | --- |
| Fresh service-worker installation | Controlled, active worker, one shell cache; no update notice |
| Origin server stopped, then app reload | Shell A and main navigation reopened from cache; network-only test endpoint was unreachable |
| Shell B made available while A is active | B remained waiting, with two shell caches and an explicit update notice |
| Reload before accepting B | HTML/build label remained A and the update stayed waiting |
| Sample save held while update waits | Reload action disabled with a saving message; enabled after the save finished |
| Keyboard consent in the first tab | The worker activated and the tab loaded shell B |
| Second tab during that activation | It retained shell A and its sample save; after the save it offered its own reload choice |
| Second tab accepts | Both tabs ran B; one shell cache remained and the update notice was hidden |

The server-stop check establishes cached startup when the local origin is unreachable. It does not emulate a phone's airplane mode or establish `navigator.onLine` behavior. The sample saves verify update coordination; they are not live Trakt/AniList writes. OS-level installation, the production HTTPS origin, iPhone/Safari and actual account synchronization remain unverified. No deployment was made.

Evidence is in `STEP-4-PWA-CHECKS.log` and `checks/pwa-step4.json`. Preview-only diagnostics, labels and session state are excluded from the source checkpoint and production build. Technical references consulted: [service-worker lifecycle](https://web.dev/articles/service-worker-lifecycle) and [named cache matching](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage/match).

At the Step 4 handoff, the countdown was 4 of 5 complete, with one step remaining. That last step is completed below. Live acceptance and the owner's release remain open until their results are actually recorded.


## Step 5 final source audit and release-candidate handoff

The final countdown is **5 of 5 work steps complete, zero remaining**. The deliverable is `Mokumokuren-1.0.0-rc.1-Source.zip`. The current source is ready for the owner's deliberate candidate publication; it remains a release candidate while production account/device acceptance is pending.

The GitHub staging script had fallen behind the source: its script allowlist rejected included Python maintenance scripts, and its top-level list omitted the current design/progress records and Windows launcher. It also skipped the supplied visual test artwork. The source-staging path now preserves those inputs along with the owner handoff and expected inventory. Its new contract checks complete source modules/documents/artwork, excludes private/generated paths and builds an identical release independently.

The complete **41/41 core offline checks passed from the actual staged GitHub source tree**. That includes the new staging contract and extended live-deployment verifier contract. Build/audit output verifies **97 runtime files**. The final audit parsed **94 Python source files**, resolved **10 relative backend imports** and found no private environment/key files or literal private-key/Bearer pattern in its selected source scope. The `.env.example` secret placeholders are blank; its provider client IDs are public. This file/content scan does not establish the remote Netlify settings or prove the absence of every possible secret format.

Node 24 is pinned in `.nvmrc`. All 97 runtime source files remain byte-identical to the Step 4 version; this step changes release tooling, tests and documentation. The expected inventory is saved in `checks/candidate-integrity.json`.

The read-only live verifier compares the complete deployed inventory with the candidate inventory, then downloads/hashes the six actual HTML/JS/CSS/worker/manifest entry points. Mock responses reproduced acceptance of an otherwise plausible older application under the old verifier; the extended tests now reject stale/tampered assets, changed inventories, redirects and unsafe inventory paths. Other inventoried asset bodies are verified in the local bundle audit, rather than downloaded individually by the live script. No candidate production endpoint was probed in this step.

`OWNER-RELEASE-HANDOFF.md` supplies the manual source upload/deployment sequence, Node/build/publish/Functions settings, required private environment variables and exact callback rule. It distinguishes stopped builds from stopped auto publishing so the owner can avoid unnecessary builds. It also records the required live account, cross-device and phone/Safari/PWA checks. The current README and release-gate documents replace outdated top-level instructions, counts and palette descriptions. Historical development journals are retained as history. The existing private-use attribution decision is preserved.

| Final evidence | Result |
| --- | --- |
| Offline core group executed in staged upload source | 41/41 passed |
| Static runtime build and integrity audit | 97 files plus manifest, passed |
| Staged source completeness and independent runtime build | Passed |
| Python source parsing | 94 files passed |
| Relative backend module resolution | 10 imports passed |
| Selected private-file/literal-credential checks | Zero findings within the stated scan scope |
| Current production configuration/candidate/API probes | Pending owner publication |
| Live Trakt/AniList OAuth, tracking and readback | Pending connected candidate |
| Real cross-device, phone/Safari and installed PWA | Pending |
| Owner's final 1.0.0 sign-off | Pending |

Evidence: `STEP-5-RELEASE-CHECKS.log` and `checks/release-step5.json`. Earlier Chrome evidence is retained. The full legacy Playwright media/library groups were not rerun for this candidate. No account writes, GitHub pushes or Netlify deployments occurred during this audit. The next action is the owner's manual candidate publication and live acceptance; the completed work countdown is not restarted without a concrete new task or verified defect.
