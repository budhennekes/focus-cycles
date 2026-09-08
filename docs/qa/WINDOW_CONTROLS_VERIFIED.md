# Compact window and menu-bar pass — verified

## Delivered
- Explicit compact mode (480×112), not a width-triggered layout that hides narrow normal windows.
- Solid light/dark panel, prominent countdown, phase/paused state, target tooltip, cycle count, distinct labeled Expand and Pause/Resume controls.
- Accessible Review/Continue action when a phase ends. No success checkmark for unsaved/review states.
- Native minimize/Cmd+M retained. Compact is separate (Cmd+Shift+M).
- Persistent template menu-bar icon, tabular countdown, state-specific Pause/Resume and Skip labels, disabled unavailable actions, Show full window and Quit.
- Menu is not rebuilt on each countdown second.
- Closing hides the same renderer so the session continues. Quit exits; reopening restores saved recovery.
- Compact bounds restore and clamp to a current display, opaque surfaces, no animated resize, no stale drag after lost capture.
- Fullscreen disables compact commands and the renderer button; refreshed on entering/leaving fullscreen.
- Compact keyboard handling cannot open oversized Help/background/music panels.
- All touched control IPC validates the exact sender, main frame and local app URL; input status/deltas are bounded.

## Verification
- npm run audit:release: passed; zero known dependency vulnerabilities, 104 existing timing/save assertions, onboarding regressions, five focused production-main test cases.
- node scripts/verify-window-controls.cjs: passed using actual main.js, sandboxed preload, native BrowserWindow/Tray/Menu and a fresh temporary profile.
- Native checks: idle template icon; focus/pause/resume/break/planning/review/save-retry menu state; no per-second menu recreation; native minimize remains minimized while countdown advances; same session across hide/close/show; compact size and restored bounds/flags; keyboard Expand/Pause/Resume/Review; long-target light/dark layout; lost capture; live reduced motion; hidden expiry does not reveal the window; idle renderer recreation.
- A second native process reopened the same isolated profile after actual Quit, restored a paused session, resumed ticking, and archived exactly once.
- Fullscreen availability and removed-display clamping are production-function tests with mocked OS state; no user Spaces were switched.
- Native onboarding (including online scenic delivery) and reliability verifiers: passed after final changes.
- Final screenshots visually inspected. Home/onboarding markup and background/accounting/recovery functions checked against the pre-pass snapshot and remain unchanged.
- Direct and unsigned MAS bundles verified; bundled index.html, main.js, preload.js and both tray images exactly match tested source.
- git diff --check passed. No commits, signing changes, dependency changes, or real profile changes.

## Evidence
- Native QA profile: /tmp/focus-window-controls-nPDJxz
- Direct preview: /Users/budhennekes/Documents/Focus Cycles Previews/window-controls-3f8ugj/Focus Cycles-darwin-arm64/Focus Cycles.app
- Durable screenshots beside the preview: compact-light.png and compact-dark.png.
- Preview launched with separate Test Profile; process observed running.
- Design sources: WINDOW_CONTROLS_REFERENCES.md.

## Remaining hands-on check
Native menu handlers were called programmatically; keyboard tests used real Electron input events. Physical menu/traffic-light clicking, multi-monitor/fullscreen transitions, and cross-application focus still warrant a short human check on the intended Mac. Apple signing/provisioning and submission remain separate release checkpoints.
