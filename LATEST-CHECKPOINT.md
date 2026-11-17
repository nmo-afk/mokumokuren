# Latest Mokumokuren checkpoint

17 November 2026. Resume from `Mokumokuren-1.0.0-rc.1-Source.zip`.

The five planned development work steps are complete: **5 of 5, with zero remaining**. The owner's rule counts one implementation/review step per request to continue. Production acceptance has its own status. This source package is **1.0.0-rc.1**; publication and final 1.0.0 sign-off remain the owner's manual actions.

Step 5 repaired the GitHub source staging path. It now accepts the included Python maintenance scripts, preserves the binding design specification, progress tracker, Windows launcher and supplied test artwork, and includes the current handoff and expected candidate inventory. A new regression builds that exact staged source independently and verifies identical runtime output. All **41 of 41 core offline checks passed from the staged upload tree**.

Node 24 is pinned in `.nvmrc`. The production build and integrity audit verify **97 runtime files plus the inventory**. All 97 runtime source files are unchanged from the tested Step 4 checkpoint. The final source audit parsed 94 Python files, resolved all 10 relative backend imports and found no private environment/key file or literal private-key/Bearer pattern in the selected source scope. Public client IDs remain in `.env.example`; its secret placeholders are empty.

The read-only live verifier now compares the entire expected/deployed static inventory and hashes six actual entry-point bodies. Its offline regression rejects older/tampered content, inventory mismatches, redirected assets and unsafe inventory paths. The included `checks/candidate-integrity.json` identifies this candidate. No production probe was run for it.

The owner handoff is `OWNER-RELEASE-HANDOFF.md`. It covers stopped builds while uploading, the correct repository root, Functions configuration, exact callback registration, one deliberate candidate deployment, the necessary live readback/device checks and an acceptance record. Current README/gate documents supersede historical file counts, background colours and earlier environment/planning notes.

Live Trakt/AniList OAuth, mutations and cross-device readback remain pending. Production HTTPS configuration, actual candidate identity/API probes, phone/Safari and OS-level PWA installation remain pending. Earlier Chrome evidence includes fixture UI checks and an actual local worker/startup/two-tab update sequence; it does not establish those production gates. The legacy full Playwright media/library suites were not rerun for this candidate. There were no account mutations, GitHub pushes or Netlify deployments during the final audit.

Current evidence is in `STEP-5-RELEASE-CHECKS.log`, `checks/release-step5.json` and `checks/candidate-integrity.json`. Earlier visual, Trakt, AniList and PWA evidence is retained. The next action is the owner's manual GitHub/Netlify candidate publication followed by live acceptance. Record any actual live failure before defining further repair work.
