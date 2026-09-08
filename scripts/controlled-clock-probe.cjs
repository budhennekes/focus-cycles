#!/usr/bin/env node
// Read-only production extraction. No production algorithms are duplicated here.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
function range(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `Missing extraction boundaries: ${start}`);
  return html.slice(a, b);
}
function fn(name) {
  const a = html.indexOf(`function ${name}(`);
  assert(a >= 0, `Missing function ${name}`);
  const b = html.indexOf('\n}', a);
  const code = html.slice(a, b + 2);
  new vm.Script(code); // Fail loudly if source shape no longer fits extraction.
  return code;
}
const production = [
  range('const LS_KEY =', '// Debounced save'),
  range('let timerState = null;', "startBtn.addEventListener('click', startFlow);"),
  ...['ensureCycleRecord', 'showSaveRetry', 'updateSaveRecoveryStatus', 'endSession', 'cancelSession', 'saveActive', 'clearActive', 'tryResume',
    'allCompletedCycles', 'computeStreak', 'computeBestHour', 'completionMessage', 'showToast', 'setCompactWindow'].map(fn),
  range('const formatHour =', 'const fmtMin =')
].join('\n');
const epoch = new Date(2026, 8, 4, 9).getTime();
function harness(storage = new Map(), start = epoch) {
  let now = start, nextId = 1, failArchive = false, failActive = false, failActiveRead = false;
  const jobs = new Map(), elements = new Map(), notices = [], chimes = [], routes = [], toasts = [];
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const classes = new Set(), listeners = new Map();
    let text = '';
    const el = {
      get textContent() { return text; },
      set textContent(v) { text = v; if (id === 'toast') toasts.push(v); },
      innerHTML: '', className: '', style: { setProperty() {} },
      classList: { add: x => classes.add(x), remove: x => classes.delete(x),
        toggle(x, on) { if (on) classes.add(x); else classes.delete(x); } },
      setAttribute() {}, appendChild() {},
      querySelector: s => element(id + ' ' + s),
      addEventListener(type, cb) { assert(!listeners.has(type)); listeners.set(type, cb); },
      click() { if (this.onclick) return this.onclick(); assert(listeners.has('click'), `No production click handler: ${id}`); listeners.get('click')(); }
    };
    elements.set(id, el); return el;
  }
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  function schedule(cb, delay, repeat) {
    const id = nextId++; jobs.set(id, { cb, delay, due: now + delay, repeat }); return id;
  }
  // Only presentation/OS boundaries are stubbed. Timer, persistence, toast,
  // completion copy, metric and button logic above are real extracted source.
  const ctx = vm.createContext({
    structuredClone, Date: ClockDate,
    document: { getElementById: element, querySelector: element, createElement: () => element('created-' + nextId++), title: '' },
    window: { matchMedia: () => ({ matches: true }) },
    localStorage: {
      getItem(k) { if (failActiveRead && k === 'focus_active_v1') throw new Error('Injected read failure'); return storage.get(k) ?? null; },
      setItem(k, v) { if ((failArchive && k === 'focus_app_v2') || (failActive && k === 'focus_active_v1')) throw new Error('Injected write failure'); storage.set(k, v); },
      removeItem: k => storage.delete(k)
    },
    setInterval: (cb, ms) => schedule(cb, ms, true), clearInterval: id => jobs.delete(id),
    setTimeout: (cb, ms) => schedule(cb, ms, false), clearTimeout: id => jobs.delete(id),
    chime: kind => chimes.push(kind), notify: msg => notices.push(msg),
    syncNavigation: () => {}, // Presentation is exercised by verify-navigation.cjs.
    showScreen: id => routes.push(id), showSprintEnd: () => routes.push('sprint-end'),
    showCycleReview: (idx, last) => routes.push(['review', idx, last]),
    showCyclePlan: idx => routes.push(['plan', idx]),
    setRandomQuote() {}, updateProjections() {}, renderIntent() {}, renderDailyGoal() {}, celebrate() {},
    fieldChoice: () => '', fieldText: () => '', fieldTextarea: () => '', attachPromptListeners() {},
    readChoice: () => 'yes', readField: (_, id) => element(id).textContent,
    currentVisibleScreen: () => routes.at(-1), renderHistory() {}
  });
  vm.runInContext('let currentSession = null, runner = null, currentFlow = null, lastActiveSave = 0, activeRecoveryAvailable = false, toastTimer;', ctx);
  vm.runInContext(production, ctx, { filename: 'extracted-index.html.js' });
  const run = code => vm.runInContext(code, ctx);
  return { run, storage, notices, chimes, routes, toasts, element,
    failArchive(value = true) { failArchive = value; },
    failActive(value = true) { failActive = value; },
    failActiveRead(value = true) { failActiveRead = value; },
    realPrompts() {
      run(['showSprintEnd', 'showCycleReview', 'proceedAfterReview', 'showDebrief'].map(fn).join('\n'));
    },
    historyControls() {
      run(range("let screenBeforeHistory =", '/* ============================================================') +
        range("document.getElementById('historyBtn').addEventListener", '/* Background menu'));
    },
    intervals: () => [...jobs.values()].filter(j => j.repeat).length,
    jump(ms) { now += ms; },
    now: () => now,
    advance(ms) {
      const target = now + ms;
      while (true) {
        const entry = [...jobs].filter(([, j]) => j.due <= target).sort((a,b) => a[1].due-b[1].due)[0];
        if (!entry) break;
        const [id, job] = entry; now = Math.max(now, job.due);
        if (job.repeat) job.due = now + job.delay; else jobs.delete(id);
        job.cb();
      }
      now = target;
    },
    start() { run(`currentSession = { id: 'qa-synthetic', startedAt: Date.now(), focusMinutes: 30, breakMinutes: 5, totalCycles: 1, mode: 'sprint', cycles: [] }; startCycleTimer(0);`); },
    cycle() { return JSON.parse(run('JSON.stringify(currentSession.cycles[0])')); }
  };
}
let failures = 0;
const results = [];
function check(name, expected, actual, kind = 'baseline') {
  let pass = true;
  try { assert.deepEqual(actual, expected); } catch { pass = false; failures++; }
  results.push({ name, kind, pass, expected, actual });
}
let h = harness(); h.start(); h.advance(1000);
check('Fresh Start installs runner and advances', { runners: 1, display: '29:59' }, { runners: h.intervals(), display: h.element('timerDisplay').textContent });
h.advance(59_000); h.element('pauseBtn').click(); h.advance(120_000); h.element('pauseBtn').click(); h.advance(1000);
check('Same-renderer Pause/Resume keeps runner and excludes pause', { runners: 1, display: '28:59', pausedMs: 120000 }, { runners: h.intervals(), display: h.element('timerDisplay').textContent, pausedMs: h.run('timerState.pausedAccumMs') });
h.advance(29*60_000-1000);
check('On-time expiry after pause credits 30 minutes', { minutes: 30, completed: true }, { minutes: h.cycle().minutes, completed: h.cycle().completed });
h = harness(); h.start(); h.advance(60_000); h.element('pauseBtn').click();
let restored = harness(new Map(h.storage), h.now()+120_000);
check('Paused snapshot restores', true, restored.run('tryResume()'));
restored.element('pauseBtn').click(); restored.advance(1000);
check('Restored Pause then Resume starts runner and advances', { runners: 1, display: '28:59', paused: false }, { runners: restored.intervals(), display: restored.element('timerDisplay').textContent, paused: restored.run('timerState.paused') }, 'regression');
h = harness(); h.start(); h.advance(60_000);
restored = harness(new Map(h.storage), h.now()+60_000); restored.run('tryResume()'); restored.advance(1000);
check('Running snapshot restores and advances', { runners: 1, display: '27:59' }, { runners: restored.intervals(), display: restored.element('timerDisplay').textContent });
h = harness(); h.start(); h.advance(30*60_000);
const expiry = { completed: h.cycle().completed, minutes: h.cycle().minutes, notice: h.notices.at(-1), route: h.routes.at(-1) };
check('Normal focus expiry', { completed: true, minutes: 30, notice: 'Focus cycle complete', route: 'sprint-end' }, expiry);
h = harness(); h.start(); h.jump(45*60_000); h.advance(0);
check('Delayed callback cannot exceed configured focus duration', 30, h.cycle().minutes, 'regression');
h = harness(); h.start(); restored = harness(new Map(h.storage), epoch+45*60_000); restored.run('tryResume()'); restored.advance(80);
check('Overdue restore cannot exceed configured focus duration', 30, restored.cycle().minutes, 'regression');
h = harness(); h.start(); h.advance(60_000); h.element('skipBtn').click();
check('Early Skip differs from expiry completion and notification', { completed: false, minutes: 1, sameCompletionNotice: false }, { completed: h.cycle().completed, minutes: h.cycle().minutes, sameCompletionNotice: h.notices.at(-1) === expiry.notice }, 'regression');
h = harness(); h.start(); h.advance(60_000); h.element('stopBtn').click();
const stopped = JSON.parse(h.storage.get('focus_app_v2')).sessions[0].cycles[0];
check('Stop baseline preserves incomplete elapsed minute', { completed: false, minutes: 1 }, { completed: stopped.completed, minutes: stopped.minutes });
h = harness(); h.start(); h.run('startBreakTimer(0)'); h.advance(5*60_000);
check('Break expiry routes to next plan', { notice: 'Break over — back to focus', route: ['plan', 1], runners: 0 }, { notice: h.notices.at(-1), route: h.routes.at(-1), runners: h.intervals() });
for (const fail of [false, true]) {
  h = harness(); h.start(); h.advance(30*60_000);
  // Prompt rendering is a stub; explicitly call production persistence to model
  // the recoverable review snapshot before invoking production finalization.
  h.run("currentFlow = 'sprint-end'; saveActive(true)");
  assert(h.storage.has('focus_active_v1'));
  if (fail) h.failArchive();
  h.run('endSession(true)');
  const archived = JSON.parse(h.storage.get('focus_app_v2') || '{"sessions":[]}').sessions.length;
  check(fail ? 'Failed final save retains recovery and suppresses logged toast' : 'Successful final save archives and clears recovery',
    { archived: fail ? 0 : 1, recovery: fail, toast: fail ? 'Session not saved. Click Retry save.' : 'First session saved. One less thing to keep in your head.' },
    { archived, recovery: h.storage.has('focus_active_v1'), toast: h.element('toast').textContent }, fail ? 'regression' : 'baseline');
  if (fail) results.push({ name: 'Failed save toast sequence (observed)', actual: h.toasts });
}
// First-save copy uses the real archive, load, rollback and toast paths.
const firstSaveCopy = 'First session saved. One less thing to keep in your head.';
const routineCopy = 'Session saved. A good place to pause.';
function finishSession(subject, id) {
  subject.start(); subject.run(`currentSession.id = ${JSON.stringify(id)}`);
  subject.advance(30*60_000); subject.run('endSession(true)');
}
h = harness(); finishSession(h, 'first');
check('First durable archive persists marker and shows first-save copy once',
  {marker:true, count:1}, {marker:JSON.parse(h.storage.get('focus_app_v2')).hasSavedSession,
    count:h.toasts.filter(t => t === firstSaveCopy).length}, 'regression');
h.run('endSession(true)'); finishSession(h, 'second');
check('Later save and duplicate finalization do not repeat first-save copy',
  {count:1, toast:routineCopy}, {count:h.toasts.filter(t => t === firstSaveCopy).length, toast:h.toasts.at(-1)}, 'regression');
restored = harness(new Map(h.storage), h.now()); finishSession(restored, 'third');
check('Reload preserves first-save marker', routineCopy, restored.toasts.at(-1), 'regression');
restored.run('state.sessions = []; saveState()');
h = harness(new Map(restored.storage), restored.now()); finishSession(h, 'after-empty-history');
check('Persisted marker survives empty history', routineCopy, h.toasts.at(-1), 'regression');
for (const reload of [false, true]) {
  h = harness(); h.failArchive(); finishSession(h, 'failed-first');
  h.element('retrySaveBtn').click();
  check('First-save failure rolls back marker and emits no success '+reload,
    {marker:false, archive:false, success:false}, {marker:h.run('state.hasSavedSession'),
      archive:h.storage.has('focus_app_v2'), success:h.toasts.some(t => t === firstSaveCopy || t === routineCopy)}, 'regression');
  if (reload) { h = harness(new Map(h.storage), h.now()); h.run('tryResume()'); }
  h.failArchive(false); h.element('retrySaveBtn').click(); h.element('retrySaveBtn').click();
  check('First-save retry shows once after durable success '+reload,
    {marker:true, count:1, archives:1}, {marker:JSON.parse(h.storage.get('focus_app_v2')).hasSavedSession,
      count:h.toasts.filter(t => t === firstSaveCopy).length, archives:h.run('state.sessions.length')}, 'regression');
}
for (const completed of [false, true]) {
  const legacy = {version:2, sessions:[{id:'legacy', cycles:[{startedAt:epoch, endedAt:epoch, completed}]}]};
  h = harness(new Map([['focus_app_v2', JSON.stringify(legacy)]]));
  check('Existing history migrates marker including incomplete cycles '+completed, true, h.run('state.hasSavedSession'), 'regression');
  finishSession(h, 'post-migration');
  check('Existing-history user never receives first-save copy '+completed,
    {toast:routineCopy, marker:true}, {toast:h.toasts.at(-1), marker:JSON.parse(h.storage.get('focus_app_v2')).hasSavedSession}, 'regression');
}
for (const action of ['stop', 'cancel']) {
  for (const reload of [false, true]) {
    h = harness(new Map([['focus_app_v2', JSON.stringify({version:2, hasSavedSession:true, sessions:[]})]]));
    h.start(); h.advance(60_000); h.failArchive();
    if (action === 'stop') h.element('stopBtn').click(); else h.run('cancelSession()');
    h.element('retrySaveBtn').click();
    check('Existing-user '+action+' failure suppresses success '+reload,
      {toast:'Session not saved. Click Retry save.', archives:0, success:false},
      {toast:h.toasts.at(-1), archives:h.run('state.sessions.length'),
        success:h.toasts.some(t => t === firstSaveCopy || t === routineCopy)}, 'regression');
    if (reload) { h = harness(new Map(h.storage), h.now()); h.run('tryResume()'); }
    h.failArchive(false); h.element('retrySaveBtn').click(); h.element('retrySaveBtn').click();
    check('Existing-user '+action+' retry shows exact success and archives once '+reload,
      {toast:routineCopy, archives:1, successes:1, route:'setupScreen'},
      {toast:h.toasts.at(-1), archives:JSON.parse(h.storage.get('focus_app_v2')).sessions.length,
        successes:h.toasts.filter(t => t === routineCopy).length, route:h.routes.at(-1)}, 'regression');
  }
}
h = harness(); h.run("currentSession = {id:'empty-cancel', cycles:[]}; cancelSession()");
check('No-archive cancel retains cancellation fallback',
  {toast:'Session cancelled.', archives:0},
  {toast:h.toasts.at(-1), archives:h.run('state.sessions.length')}, 'regression');
h = harness(); h.start(); h.advance(60_000); h.element('stopBtn').click();
check('First stopped session is still a successful first archive', firstSaveCopy, h.toasts.at(-1), 'regression');
h = harness(); h.start(); h.advance(60_000); h.run('cancelSession()');
check('First cancelled session keeps first-save copy visible', firstSaveCopy, h.toasts.at(-1), 'regression');
h = harness(); h.run("currentSession = {id:'empty', cycles:[]}; endSession(true)");
check('No archive means no saved toast or marker', {toasts:0, marker:false},
  {toasts:h.toasts.length, marker:h.run('state.hasSavedSession')}, 'regression');
const milestoneHistory = {version:2, sessions:Array.from({length:6}, (_, i) => ({id:'day-'+i,
  cycles:[{completed:true, startedAt:epoch-(i+1)*86400_000, endedAt:epoch-(i+1)*86400_000}]}))};
h = harness(new Map([['focus_app_v2', JSON.stringify(milestoneHistory)]])); finishSession(h, 'day-seven');
check('Seven-day milestone reports factual saved-session copy', '7-day streak. Session saved.', h.toasts.at(-1), 'regression');

// Additional recovery, pause, routing and durable retry contracts.
for (const action of ['skipBtn', 'stopBtn']) {
  h = harness(); h.start(); h.advance(60_000); h.element('pauseBtn').click();
  restored = harness(new Map(h.storage), h.now() + 120_000); restored.run('tryResume()');
  restored.element(action).click();
  const c = action === 'skipBtn' ? restored.cycle() : JSON.parse(restored.storage.get('focus_app_v2')).sessions[0].cycles[0];
  check('Restored paused ' + action + ' excludes time away', {minutes:1, completed:false, reason:action === 'skipBtn' ? 'skipped' : 'stopped', runners:0},
    {minutes:c.minutes, completed:c.completed, reason:c.endReason, runners:restored.intervals()});
}
h = harness(); h.start(); h.advance(60_000); h.element('pauseBtn').click(); h.advance(120_000); h.element('pauseBtn').click(); h.advance(60_000);
restored = harness(new Map(h.storage), h.now()); restored.run('tryResume()'); restored.element('pauseBtn').click(); restored.advance(60_000); restored.element('pauseBtn').click();
check('Completed pause accounting survives running snapshot and another pause', 180000, restored.run('timerState.pausedAccumMs'));
restored.element('skipBtn').click(); check('Multiple pauses preserve elapsed focus', 2, restored.cycle().minutes);
h = harness(); h.start(); h.advance(60_000); h.element('pauseBtn').click();
restored = harness(new Map(h.storage), h.now()+120_000); restored.run('tryResume()'); restored.element('pauseBtn').click();
check('Restored pause includes closed interval in accumulator', 120000, restored.run('timerState.pausedAccumMs'));
restored.jump(45*60_000); restored.advance(0); check('Late expiry after paused restore stays capped', 30, restored.cycle().minutes);
h = harness(); h.start(); h.run("currentSession.mode = 'cycles'; currentSession.totalCycles = 2"); h.advance(60_000); h.element('skipBtn').click();
check('Early Skip still routes to cycle review', ['review',0,false], h.routes.at(-1));
h.run('startBreakTimer(0)'); h.advance(60_000); h.element('pauseBtn').click(); h.advance(60_000); h.element('skipBtn').click();
check('Paused break Skip routes to next plan with accurate notice', {route:['plan',1], notice:'Break skipped — back to focus'}, {route:h.routes.at(-1), notice:h.notices.at(-1)});
for (const stop of [false, true]) {
  h = harness(); h.start(); h.advance(60_000); h.failArchive();
  if (stop) h.element('stopBtn').click(); else { h.element('skipBtn').click(); h.run('endSession(true)'); }
  check('Failed save retains in-memory session and no tentative archive '+stop, {session:true, archives:0, flow:'save-retry', runners:0},
    {session:h.run('currentSession !== null'), archives:h.run('state.sessions.length'), flow:h.run('currentFlow'), runners:h.intervals()});
  h.element('retrySaveBtn').click();
  check('Repeated write failure keeps recovery '+stop, true, h.storage.has('focus_active_v1'));
  restored = harness(new Map(h.storage), h.now()+7*3600_000); restored.run('tryResume()');
  check('Failed-save recovery survives reload and six-hour expiry '+stop, 'promptScreen', restored.routes.at(-1));
  restored.element('retrySaveBtn').click(); restored.run('endSession(true)');
  check('Retry archives exactly once and clears recovery '+stop, {archives:1, recovery:false, session:false},
    {archives:JSON.parse(restored.storage.get('focus_app_v2')).sessions.length, recovery:restored.storage.has('focus_active_v1'), session:restored.run('currentSession !== null')});
  // Model a crash after archive commit but before recovery removal.
  restored.storage.set('focus_active_v1', h.storage.get('focus_active_v1'));
  const again = harness(new Map(restored.storage), restored.now());
  check('Already archived recovery cannot create duplicate '+stop, {resumed:false, archives:1, recovery:false},
    {resumed:again.run('tryResume()'), archives:again.run('state.sessions.length'), recovery:again.storage.has('focus_active_v1')});
  h.failArchive(false); h.element('retrySaveBtn').click();
  check('Same-renderer Retry saves once '+stop, 1, JSON.parse(h.storage.get('focus_app_v2')).sessions.length);
}
h = harness(); check('saveState communicates success', true, h.run('saveState()')); h.failArchive(); check('saveState communicates failure', false, h.run('saveState()'));

const memoryWarning = 'Newest session is only in memory. Keep this window open and click Retry save.';
h = harness(); h.start(); h.advance(60_000);
const olderSnapshot = h.storage.get('focus_active_v1');
h.run("currentSession.cycles[0].review = {noteworthy:'Newest draft'}");
h.failActive(); h.failArchive(); h.element('stopBtn').click();
check('Both writes fail: preserve prior recovery bytes and newest draft',
  {oldCopy:true, draft:'Newest draft', session:true, archives:0, flow:'save-retry'},
  {oldCopy:h.storage.get('focus_active_v1') === olderSnapshot, draft:h.cycle().review.noteworthy,
    session:h.run('currentSession !== null'), archives:h.run('state.sessions.length'), flow:h.run('currentFlow')}, 'regression');
check('Both writes fail: saveActive returns false and status does not claim newest is durable',
  {saved:false, available:false, toast:memoryWarning, warning:true},
  {saved:h.run('saveActive(true)'), available:h.run('activeRecoveryAvailable'), toast:h.element('toast').textContent,
    warning:h.element('saveRecoveryStatus').textContent.includes('only in memory')}, 'regression');
h.historyControls(); h.element('historyBtn').click(); h.element('closeHistoryBtn').click();
check('History round trip preserves accessible retry and draft', {route:'promptScreen', draft:'Newest draft'},
  {route:h.routes.at(-1), draft:h.cycle().review.noteworthy}, 'regression');
h.element('retrySaveBtn').click();
check('Repeated dual failure keeps prior snapshot and actionable warning', {oldCopy:true, toast:memoryWarning},
  {oldCopy:h.storage.get('focus_active_v1') === olderSnapshot, toast:h.element('toast').textContent}, 'regression');
restored = harness(new Map(h.storage), h.now()+7*3600_000);
check('Old active recovery remains recoverable after seven hours', true, restored.run('tryResume()'), 'regression');
check('Stale running recovery pauses without awarding time away or deleting snapshot',
  {paused:true, remaining:29*60_000, minutes:1, completed:false, runners:0, oldCopy:true, notice:true},
  {paused:restored.run('timerState.paused'), remaining:restored.run('timerState.pausedRemainingMs'),
    minutes:restored.run('recordedFocusMinutes()'), completed:restored.cycle().completed, runners:restored.intervals(),
    oldCopy:restored.storage.get('focus_active_v1') === olderSnapshot,
    notice:restored.element('toast').textContent.includes('Recent changes may be missing')}, 'regression');
restored.element('stopBtn').click();
check('Stopping stale recovery archives only last saved progress', 1,
  JSON.parse(restored.storage.get('focus_app_v2')).sessions[0].cycles[0].minutes, 'regression');
h.failActive(false); h.failArchive(false);
const retryCallback = h.element('retrySaveBtn').onclick;
retryCallback(); retryCallback();
check('Dual failure then double Retry archives newest draft exactly once without throwing',
  {count:1, draft:'Newest draft', current:false, recovery:false},
  {count:JSON.parse(h.storage.get('focus_app_v2')).sessions.length,
    draft:JSON.parse(h.storage.get('focus_app_v2')).sessions[0].cycles[0].review.noteworthy,
    current:h.run('currentSession !== null'), recovery:h.storage.has('focus_active_v1')}, 'regression');
h = harness(); h.start(); h.failActive();
check('Failed active write is reported', false, h.run('saveActive(true)'), 'regression');
h.failActive(false);
check('Active write can recover immediately without throttle hiding failure', true, h.run('saveActive()'), 'regression');
check('Successful recovery is accurately tracked', true, h.run('activeRecoveryAvailable'), 'regression');
const readableSnapshot = h.storage.get('focus_active_v1');
h.failActiveRead();
check('Transient recovery read failure preserves stored copy', {resumed:false, preserved:true},
  {resumed:h.run('tryResume()'), preserved:h.storage.get('focus_active_v1') === readableSnapshot}, 'regression');

for (const savedAt of [undefined, epoch+10*3600_000]) {
  const snap = JSON.parse(olderSnapshot); snap.savedAt = savedAt;
  restored = harness(new Map([['focus_active_v1',JSON.stringify(snap)]]), epoch+7*3600_000);
  restored.run('tryResume()');
  check('Uncertain save time pauses and grants no inferred progress '+savedAt,
    {paused:true, minutes:0, runners:0}, {paused:restored.run('timerState.paused'), minutes:restored.run('recordedFocusMinutes()'), runners:restored.intervals()}, 'regression');
}
h = harness(); h.start(); h.advance(60_000); h.element('pauseBtn').click();
restored = harness(new Map(h.storage), h.now()+7*3600_000); restored.run('tryResume()');
restored.element('pauseBtn').click(); restored.advance(1000);
check('Stale paused recovery resumes from saved remaining time', '28:59', restored.element('timerDisplay').textContent, 'regression');

// Exercise production prompt callbacks and every endSession caller, including
// indirect finalization from restore. Presentation fields alone remain stubs.
for (const flow of ['overdue', 'debrief-restore', 'review-restore', 'skip', 'expiry', 'stop', 'cancel',
  'sprintEndSaveBtn', 'sprintEndSkipBtn', 'debSaveBtn', 'debSkipBtn']) {
  h = harness(); h.realPrompts(); h.start(); h.advance(60_000);
  h.run("currentSession.mode = 'cycles'; currentSession.skippedPrompts = true;");
  if (flow === 'overdue' || flow.endsWith('-restore')) {
    h.run(flow === 'overdue' ? 'saveActive(true)' :
      `timerState = null; currentFlow = ${JSON.stringify(flow === 'debrief-restore' ? 'debrief' : 'review-0')}; saveActive(true)`);
    h = harness(new Map(h.storage), epoch+45*60_000); h.realPrompts();
  }
  h.failArchive();
  if (flow === 'overdue' || flow.endsWith('-restore')) h.run('tryResume()');
  else if (flow === 'skip') h.element('skipBtn').click();
  else if (flow === 'expiry') h.advance(29*60_000);
  else if (flow === 'stop') h.element('stopBtn').click();
  else if (flow === 'cancel') h.run('cancelSession()');
  else {
    h.run("currentSession.skippedPrompts = false; timerState = null;");
    h.run(flow.startsWith('sprint') ? 'showSprintEnd()' : 'showDebrief()');
    h.element('sprint_note').textContent = 'Sprint draft';
    h.element('deb_got_done').textContent = 'Debrief draft';
    h.element(flow).click();
  }
  check('Finalization failure remains actionable through '+flow,
    {flow:'save-retry', route:'promptScreen', toast:'Session not saved. Click Retry save.', session:true},
    {flow:h.run('currentFlow'), route:h.routes.at(-1), toast:h.element('toast').textContent,
      session:h.run('currentSession !== null')}, 'regression');
  if (flow === 'sprintEndSaveBtn' || flow === 'debSaveBtn') {
    check('Submitted draft retained after failure '+flow, flow === 'sprintEndSaveBtn' ? 'Sprint draft' : 'Debrief draft',
      h.run(flow === 'sprintEndSaveBtn' ? 'currentSession.cycles[0].review.noteworthy' : 'currentSession.debrief.got_done'), 'regression');
  }
  h.failArchive(false); h.element('retrySaveBtn').click(); h.element('retrySaveBtn').click();
  check('Finalization retry saves once through '+flow, 1, JSON.parse(h.storage.get('focus_app_v2')).sessions.length, 'regression');
}
h = harness();
function metric(cycles) {
  h.run(`state.sessions = [{id:'metric-synthetic',cycles:${JSON.stringify(cycles)}}]`);
  return h.run('computeBestHour(allCompletedCycles())');
}
const cycle = (hour, outcome, minutes=30, completed=true) => ({startedAt: new Date(2026,8,4,hour).getTime(), completed, minutes, review:{completed_target:outcome}});
check('Best hour needs three completed-flag cycles', null, metric([cycle(9,'yes'),cycle(9,'yes')]), 'metric characterization');
check('Best hour favors start count despite zero minutes and No outcomes', '9am–10am', metric([cycle(9,'no',0),cycle(9,'no',0),cycle(15,'yes',30)]), 'metric characterization');
check('Best hour ties resolve to earliest local hour', '8am–9am', metric([cycle(15,'yes'),cycle(10,'yes'),cycle(8,'no')]), 'metric characterization');
check('Best hour excludes incomplete flag even with Yes outcome', '9am–10am', metric([cycle(9,'no'),cycle(9,'no'),cycle(15,'yes'),...Array.from({length:4},()=>cycle(15,'yes',30,false))]), 'metric characterization');
console.log(JSON.stringify({ sourceSha256: crypto.createHash('sha256').update(html).digest('hex'), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, results, assertions: results.filter(x=>'pass' in x).length, failures }, null, 2));
process.exitCode = failures ? 1 : 0; // Nonzero means a production regression contract failed.
