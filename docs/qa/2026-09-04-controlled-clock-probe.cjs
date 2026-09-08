#!/usr/bin/env node
// Read-only production extraction. No production algorithms are duplicated here.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
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
  ...['ensureCycleRecord', 'endSession', 'saveActive', 'clearActive', 'tryResume',
    'allCompletedCycles', 'computeBestHour', 'completionMessage', 'showToast', 'setCompactWindow'].map(fn),
  range('const formatHour =', 'const fmtMin ='),
  range('const COMPLETION_LINES =', '// Rotating,')
].join('\n');
const epoch = new Date(2026, 8, 4, 9).getTime();
function harness(storage = new Map(), start = epoch) {
  let now = start, nextId = 1, failArchive = false;
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
      click() { assert(listeners.has('click'), `No production click handler: ${id}`); listeners.get('click')(); }
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
      getItem: k => storage.get(k) ?? null,
      setItem(k, v) { if (failArchive && k === 'focus_app_v2') throw new Error('Injected archive write failure'); storage.set(k, v); },
      removeItem: k => storage.delete(k)
    },
    setInterval: (cb, ms) => schedule(cb, ms, true), clearInterval: id => jobs.delete(id),
    setTimeout: (cb, ms) => schedule(cb, ms, false), clearTimeout: id => jobs.delete(id),
    chime: kind => chimes.push(kind), notify: msg => notices.push(msg),
    showScreen: id => routes.push(id), showSprintEnd: () => routes.push('sprint-end'),
    showCycleReview: (idx, last) => routes.push(['review', idx, last]),
    showCyclePlan: idx => routes.push(['plan', idx]),
    setRandomQuote() {}, updateProjections() {}, renderIntent() {}, renderDailyGoal() {}, celebrate() {}
  });
  vm.runInContext('let currentSession = null, runner = null, currentFlow = null, lastActiveSave = 0, toastTimer;', ctx);
  vm.runInContext(production, ctx, { filename: 'extracted-index.html.js' });
  const run = code => vm.runInContext(code, ctx);
  return { run, storage, notices, chimes, routes, toasts, element,
    failArchive() { failArchive = true; },
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
    { archived: fail ? 0 : 1, recovery: fail, toast: fail ? 'Could not save settings locally.' : 'Your very first session, logged. This is how it compounds.' },
    { archived, recovery: h.storage.has('focus_active_v1'), toast: h.element('toast').textContent }, fail ? 'regression' : 'baseline');
  if (fail) results.push({ name: 'Failed save toast sequence (observed)', actual: h.toasts });
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
process.exitCode = failures ? 1 : 0; // Expected to fail until the regression contracts hold.
