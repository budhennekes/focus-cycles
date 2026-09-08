# Mac quote visibility verification

## Scope and security
Local app repair only. No Apple Developer or App Store Connect access, authentication, keychain inspection, signing, or account changes were attempted in this pass. Existing running prototypes and real user profiles were left untouched.

## Root cause and repair
The laptop-height media query hid `#setupScreen .quote-chip` with `display: none` at heights at or below 900px. The saved setting and rendered quote were correct, but the CSS overrode the user's choice.

Replaced forced hiding with tighter quote spacing. Preserved `.quote-chip.hidden`, all quote content, scenic backgrounds, and the method-focused home. Added keyboard-focus visibility for quote arrows.

## Reproduction and verification
`node scripts/verify-quotes.cjs` first failed with setting=true, populated text, display=none, viewport=1000x768. After the layout fix, it exposed an invisible keyboard-focused navigation arrow; that was fixed and rerun.

Passed:
- Real Electron mouse-input Quotes off/on; preference survives reload and resize.
- Four requested window sizes: 1000x800, 800x650, 480x560, 1000x960. macOS may clamp requested bounds to the current display.
- All 15 bundled quotes contain visible text and attribution.
- Previous/next navigation and keyboard-focus visibility.
- Start remains reachable above the fixed bottom bar.
- Light/dark visual inspection and real scenic image delivery.
- `npm test`: smoke, 104 timer assertions with zero failures, onboarding regressions, five window-control tests.
- `node scripts/verify-window-controls.cjs`: real main/preload, Compact, programmatic native menu commands, hide/show, Quit/reopen/recovery.
- `node scripts/verify-onboarding.cjs`: onboarding, recovery precedence, Reduced Motion, image fallback.
- `env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron docs/qa/native-reliability-verification.cjs`: duration cap, Skip, save failure/retry, exactly-once archive.
- `git diff --check`.
- Direct Mac bundle verification and the quote test repeated against the packaged app.asar, offline.

The reliability script requires Electron, not plain Node; an initial plain-Node invocation failed before app startup and was corrected.

## Built artifact
/Users/budhennekes/Documents/Focus Cycles Previews/quotes-fixed-NANJhw/Focus Cycles-darwin-arm64/Focus Cycles.app

Bundle: com.bud.focuscycles, version 1.4.0, macOS Apple silicon.
Launched with its own `quotes-fixed-NANJhw/Test Profile`, copied from the completed isolated quote test. Quotes are enabled and onboarding has already been dismissed in this test profile.

Screenshots: `quotes-fixed-NANJhw/quotes-light.png` and `quotes-fixed-NANJhw/quotes-dark.png` beside the bundle's parent folder.

## Limits
This is a locally verified build, not an App Store submission. No private Apple account steps are part of this pass. Physical traffic-light clicks, cross-application focus, and multi-monitor behavior remain distinct from the programmatic native tests. No commits were made.
