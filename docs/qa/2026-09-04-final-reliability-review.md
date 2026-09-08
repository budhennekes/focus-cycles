# Final narrow reliability review — September 4, 2026

Implemented in `index.html`; regression coverage in `scripts/controlled-clock-probe.cjs`. Pre-existing working-tree changes were preserved. No commit, dependency, security, configuration, or existing user-data changes were made.

- Recovery writes return success/failure and track whether the latest recovery write succeeded. Dual write failure keeps the prior stored snapshot and newest in-memory session, with a persistent warning to keep the window open and Retry.
- Valid recovery is no longer discarded solely for age. Stale timers restore paused at saved progress; missing/future timestamps infer no running progress. The notice explains uncertainty, potentially missing changes, and excluded time away. Read failures preserve stored recovery.
- Both prompt restoration and overdue completion suppress their normal recovery toast when finalization enters save-retry. Retry guards a missing session, so repeated activation cannot throw or archive twice.
- Inspected all `endSession` callers: sprint Save/Skip, debrief Save/Skip, skipped-prompt finalization, Stop, Cancel, and Retry. Tests exercise these production callbacks, expiry/Skip, overdue restore, and debrief/review restore. Submitted drafts survive failure; History returns to the retry screen.

## Verification

| Check | Result |
| --- | --- |
| `npm test` | Exit 0: smoke passed; **79/79 assertions**, including all original 40 and 39 added checks |
| `npm audit` | Exit 1: registry unavailable, `getaddrinfo ENOTFOUND registry.npmjs.org`; no vulnerability result obtained |
| Test script and native reliability script syntax | Passed `node --check` |
| `git diff --check` | Passed |

Tested renderer SHA-256: `443307ba6956d14bdad7ebf43c82827fa998771519dc9a31adc1d75646483261`.

Regression tests use extracted production functions, synthetic sessions, isolated memory-backed storage, controlled time, and stubbed DOM/OS boundaries. They cover dual-write failure, unchanged older snapshot after seven hours, truthful status, draft retention, retry exactly once, stale/uncertain paused recovery, actionable finalization failures, and repeat activation.

Native runtime success for `docs/qa/native-reliability-verification.cjs` and the original native probe was reported by the user via parent tooling before these edits. Native runtime was not rerun in this sandbox; the earlier Codex sandbox abort is not evidence of an app failure. These new regressions were verified by the controlled-clock suite, not a new native run.

Remaining verification: rerun `npm audit` with registry access. No dependency changes are needed to obtain that result.
