# Changelog

All notable changes to Focus Cycles. Format follows [Keep a Changelog](https://keepachangelog.com); versions follow [semver](https://semver.org).

## [Unreleased]

### Added
- A little whimsy. Finishing a session sends up a soft burst of sparks and a warm, varied sign-off line instead of the same message every time, with special notes for your first session and streak milestones (3, 7, 14, 30, 50, 100 days). The sprint prompt now rotates through friendlier examples. All of it honors reduced-motion.

## [1.0.2] — 2026-07-06

### Added
- **Menu-bar countdown.** While a session runs, the time left shows in the macOS menu bar at the top of the screen (with a ⏸ when paused and ☕ on breaks), so you can see it from any app. It clears when the session ends.
- **Mini bar mode.** Shrink the window to a strip and the running timer collapses to one readable row you can park in a screen corner while you work. In the mini bar the controls become clean symbols (pause/play, skip, stop). Drag it by the bar itself. The window can now shrink much smaller than before.
- **Your own background photos.** Background menu → "Add your photos…" imports images straight into the app. Photos are downscaled to 2560px and stored locally in the app (IndexedDB), so originals never leave your Mac and a full set stays light. Up to 20 photos; "Use built-in set" switches back anytime.
- **Day timeline.** History now shows the last 7 days with each focus cycle drawn at the time it actually happened, 6am to midnight. Hover a block for the time and target.

### Changed
- Credit pill on the setup screen is now dismissible and stays dismissed.

### Fixed
- The 7-day focus minutes chart rendered near-empty bars regardless of data (CSS percentage-height bug). Bars now scale correctly.
- Build tooling self-heals when iCloud sync corrupts `node_modules` (prepackage check runs `npm ci` automatically if key packages are broken).

## [1.0.1] — 2026-07-04

### Fixed
- macOS "Focus Cycles.app is damaged and can't be opened" on download. The packager was invalidating the app's code signature; releases are now ad-hoc signed (`npm run release-zip`). Install still needs a one-time Gatekeeper bypass since the app isn't notarized.

## [1.0.0] — 2026-07-02

### Added
- First public release.
- Full Work Cycles flow: prep, plan, focus, review, debrief. One-cycle sprint mode. Every prompt skippable.
- Local history dashboard: focus time, streak, 7-day chart, target hit rate, expandable session detail, CSV export.
- Crash-proof resume: sessions restore to the exact second, prompts included, within 6 hours.
- Focus sounds: Lofi and Synthwave (YouTube streams), locally generated Rain for offline.
- Today's intent pin, rotating landscape backgrounds, local weather, light and dark themes, keyboard shortcuts with a `?` overlay.

[Unreleased]: https://github.com/budhennekes/focus-cycles/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/budhennekes/focus-cycles/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/budhennekes/focus-cycles/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/budhennekes/focus-cycles/releases/tag/v1.0.0
