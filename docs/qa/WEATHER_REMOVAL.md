# Weather deferred from first release

User decision: remove weather now; keep a note for later.

- Removed weather UI, opt-in handler, condition mapping, fetch paths, periodic refresh and provider CSP permissions.
- Retained the clock/date, scenic backgrounds, quotes and session workflow.
- No user profile was edited. Legacy weather preferences are ignored, not transmitted.
- Updated bundled policy/support, README, Store copy and first-release SOP.
- Backlog: ../BACKLOG_WEATHER.md. NWS is a free U.S.-focused candidate; use manual place selection, not silent IP lookup.
- Updated Store screenshots: ../store-assets-no-weather/. Older screenshots and email weather steps are superseded.

## Verification
- New source/native regression passed; zero weather requests with legacy weather-enabled settings.
- Release audit and timer suite passed; zero known dependency vulnerabilities.
- Direct and unsigned MAS packages passed verification.
- Native suite and actual packaged executable launch passed in the serial run.
- Packaged no-weather regression passed after teaching the test harness to read ASAR archives.
- All five final screenshot dimensions verified at 1440×900; delivery copies are RGB PNG without alpha.
- A concurrent native-focus test timed out while screenshot capture also owned foreground focus; serial rerun passed. Do not run focus-sensitive GUI suites concurrently.

Logs: weather-removal-build.log, weather-removal-native-serial.log, weather-removal-packaged.log, weather-removal-screenshots.json.

## Still separate release gates
Public privacy/support hosting needs approval. Unsplash request handling still needs privacy-label review. Apple signing, signed sandbox testing and submission remain user-controlled. Weather licensing is no longer a blocker for this build.
