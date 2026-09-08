# Focus Cycles: verified reliability fixes

## Scope

Fixed the confirmed timer/recovery/storage defects. No new product features, dependencies, account changes, or commits. Earlier uncommitted work remains in place.

## Fixes

- Resume after restoring a paused timer starts one runner. Pause timing survives saved snapshots.
- Recorded focus duration is bounded by the timer budget, including delayed expiry and overdue restoration.
- Early Skip records incomplete/skipped rather than normal completion, while retaining review/break routing.
- Failed archive writes retain the current session and provide Retry save. Successful retry archives the session once, then clears recovery.
- If both archive and recovery writes fail, the app preserves any older recovery record and explicitly warns that newest work is only in memory. Storage rejection cannot guarantee persistence; keep the app open and retry.
- Valid old recovery records are not discarded solely because six hours passed. Stale timers restore paused at saved progress with an uncertainty warning.
- Recovery completion notices do not hide save failure notices. Repeated retry activation is guarded.
- “Best window” now reads “Most common start”; it is a descriptive frequency metric, not an effectiveness estimate.

## Parent verification

All commands ran in the repository root.

| Command/check | Result |
|---|---|
| `npm run audit:release` | Exit 0; no known dependency vulnerabilities; smoke passed; 79 controlled-clock assertions, 0 failures |
| `npm run package && npm run verify:direct` | Exit 0; direct arm64 app rebuilt and verified |
| `npm run package-mas:unsigned && npm run verify:mas` | Exit 0; unsigned arm64 MAS app rebuilt and verified |
| `git diff --check` | Exit 0 |
| ASAR extraction comparison | `index.html`, `main.js`, and `preload.js` match current source in both bundles |

Bundle ID: `com.bud.focuscycles`; version: `1.4.0`.

## Real Electron runtime verification

Used isolated temporary app/session storage and blocked HTTP(S). Did not use personal app records.

Commands:

```sh
node_modules/electron/dist/Electron.app/Contents/MacOS/Electron docs/qa/2026-09-04-native-probe.cjs
node_modules/electron/dist/Electron.app/Contents/MacOS/Electron docs/qa/native-reliability-verification.cjs
```

Both exited 0. The first showed a reopened paused timer resume with a live runner and advance from 29:59 to 29:57. The second asserted:

- Simulated late completion records 30 minutes, not 45.
- Early Skip has `completed: false`, `endReason: skipped`.
- Injected archive failure retains recovery and displays Retry save.
- Retry leaves exactly one durable archived session and no active recovery.
- Injected failure of all storage writes retains the older recovery and displays the memory-only warning.
- Retrying and activating the former retry button again does not duplicate the archive or throw.

The save-retry screenshot was opened and visually checked: heading, recovery status, and button are readable and not clipped at the tested 1100×900 window size.

## Independent review

Final read-only review of the repaired recovery, failed-save, retry, and history-navigation paths returned `passed: true`, with no security concerns, logic errors, or suggestions. The reviewer independently reran `npm test` and inspected the production-extraction coverage. This verdict is scoped to those repairs, not a whole-product release certification.

## Limits

These checks verify the repaired paths, not full product QA. Artificial clock/storage failures are fixtures, not measurements of human productivity or disk performance. Actual system sleep/wake, a complete accessibility/size matrix, long-session performance, and audio quality are not covered by this final pass. The MAS bundle is unsigned and is not an upload-ready package. Apple signing/provisioning and submission remain separate release work.
