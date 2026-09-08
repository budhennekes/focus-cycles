# Focus Cycles regression evidence — September 4, 2026

Tested current working-tree `index.html`, not a clean release. Read `/Users/budhennekes/AGENTS.md` and `docs/MVP_UX_INSIGHTS_REVIEW.md`; no nearer AGENTS.md found. Initial tree: 10 modified tracked files and 8 untracked files. All pre-existing work was preserved. Only new files under `docs/qa/` were written; no app/test source, dependencies, configuration, or commits changed.

Environment: Node v22.23.2, Darwin arm64, America/Chicago; installed Electron 42.9.3.
Tested index.html SHA-256: `1dac8333118ec33a04f1df32c77ca5e1ba5b227169abeec24b56a9ac4d5d731a`.

## Commands and results

From repository root:

```sh
npm test
node docs/qa/2026-09-04-controlled-clock-probe.cjs
node_modules/electron/dist/Electron.app/Contents/MacOS/Electron docs/qa/2026-09-04-native-probe.cjs
```

- `npm test`: exit **0**, `Smoke check passed`.
- Controlled-clock probe: exit **1**, **18 assertions: 13 pass, 5 fail**. Exit 1 deliberately reports unmet regression contracts, not a harness exception. It prints expected/actual JSON and the current source hash on each run.
- Native attempt: exit **134**, no stdout/stderr. No launcher initialization message appeared. **Native GUI/runtime verification was not performed.** Cause of abort is undetermined; no dependencies or security settings were changed. The launcher sets fresh temporary `userData` and `sessionData` before requiring production `main.js`, blocks HTTP(S), and has a 20-second watchdog. It is provided for reproduction, not as evidence of a successful launch. Its syntax check passed.

## Reproduced behavior

All durations below are synthetic controlled-clock fixtures, not measured human focus or performance.

| Case | Expected contract | Actual production behavior |
|---|---|---|
| Restore paused 30-minute focus after 1 minute running; Resume; advance 1 second | One runner; display 28:59; unpaused | **Zero runners; display remains 29:00; unpaused** |
| Observe 30-minute expiry at minute 45 with delayed callback | Credit no more than 30 minutes | **45 minutes** |
| Restore running snapshot at minute 45; execute scheduled completion after 80 ms | Credit no more than 30 minutes | **45 minutes** |
| Skip focus after 1 minute | Distinct early-end semantics; probe expects incomplete and no normal completion notice | **1 minute, completed=true, same “Focus cycle complete” notification as expiry** |
| Fail archive write while a completed session recovery snapshot exists | Zero durable archived sessions; recovery retained; failure toast remains | **Zero durable archived sessions; recovery deleted; final toast says “Your very first session, logged. This is how it compounds.”** |

Failed-save toast sequence was observed as “Could not save settings locally.” immediately followed by the successful “logged” message. Storage failure was injected only for `focus_app_v2`; active-record deletion remained available. This models an archive write failure with working reads/deletes, not every storage failure mode. Skip's incomplete flag is an explicit test contract, not a prescribed future schema; current completion flag and notification demonstrably match ordinary expiry.

## Successful baselines and metric characterization

- Fresh Start: one interval; 29:59 after one second.
- Same-renderer Pause/Resume: after one minute running and two minutes paused, one interval; 28:59 after another second; accumulated pause 120,000 ms. On-time expiry credits exactly 30 minutes.
- Paused snapshot loads successfully; running snapshot restores and advances to 27:59 after two minutes away/running plus one second.
- Normal focus expiry: completed=true, 30 minutes, normal completion notification, sprint-end route.
- Stop after one minute: archived incomplete cycle with one minute.
- Five-minute break expiry: no remaining interval, break-over notification, next-plan route.
- Successful final save: one durable archive, recovery removed, first-session logged toast.
- Best hour: fewer than three completed-flag cycles returns null. Two 9am starts with **zero minutes and No outcomes** beat one 3pm start with 30 minutes and Yes: **9am–10am**. Three tied hours (3pm, 10am, 8am) select **8am–9am**. Adding four incomplete-flag 3pm cycles with Yes does not change a 9am winner.

Thus best hour measures the **most frequent local start hour among completed-flag cycles**, gated on three total eligible cycles, with earliest-hour tie resolution. These fixtures establish that it does not rank reported outcomes or recorded minutes.

## Harness boundaries and untested risks

The standalone probe reads and compiles actual source slices from `index.html` with `vm`: timer start/break/runner/tick/render/completion functions and actual Pause/Skip/Stop event registrations; state load/save; active save/clear/restore; finalization and completion copy; toast; completed-cycle collection and best-hour formatting. It does not copy or reimplement their algorithms. Extraction boundaries assert and extracted named functions syntax-compile before use.

Each scenario uses fresh VM state, synthetic records and a memory-backed storage map. Clock queues execute registered production callbacks; a deliberate wall-clock jump simulates delayed delivery without replaying missed ticks. DOM elements retain display text, toast writes and click handlers. Audio and OS notifications are recording stubs; prompt/screen routes and unrelated setup rendering are stubs. For finalization, the probe explicitly invokes production `saveActive(true)` with sprint-end flow to create the review recovery record because prompt rendering is stubbed. Completion copy follows the real first-session branch; other milestone copy is not exercised.

These are behavioral reproductions within those boundaries, not full DOM/native journey tests. Actual sleep/wake, macOS close/reopen or quit, visibility reconciliation, real storage quota exhaustion, prompt draft recovery, >6-hour recovery, duplicate archival/retry, visual/accessibility behavior, real audio, and other audit findings remain untested here. No launch latency, resource usage, contrast, or productivity measurements were made. No fixes were implemented.
