#!/usr/bin/env node
// Exercise production onboarding functions/handlers; native layout lives in verify-onboarding.cjs.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const source = html.slice(html.indexOf("const welcomeDialog ="), html.indexOf('/* Credit pill'));
function harness({ fresh = true, flow = '', active = false, storage = new Map() } = {}) {
  const elements = new Map();
  const document = { body: {}, activeElement: null, getElementById(id) {
    if (!elements.has(id)) elements.set(id, { id, isConnected: true, style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, handlers: {},
      addEventListener(type, handler) { this.handlers[type] = handler; }, focus() { document.activeElement = this; },
      showModal() { this.open = true; }, close() { this.open = false; }, open: false });
    return elements.get(id);
  } };
  document.activeElement = document.body;
  const context = vm.createContext({ document, currentSession: active ? {} : null, currentFlow: flow, isFreshInstall: fresh,
    state: { intent: { text: 'Existing target' } }, FIRST_RUN_KEY: 'seen', ACTIVE_KEY: 'active',
    localStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) },
    currentVisibleScreen: () => active ? 'activeScreen' : 'setupScreen', toggleShortcuts() {} });
  vm.runInContext(source, context);
  const run = s => vm.runInContext(s, context);
  const element = id => document.getElementById(id);
  return { run, element, document, storage };
}
let h = harness(); h.run('maybeShowFirstRun()'); assert.equal(h.element('firstRunBanner').open, true);
assert.equal(h.document.activeElement.id, 'welcomeFinish');
const tab = shiftKey => h.element('firstRunBanner').handlers.keydown({ key: 'Tab', shiftKey, stopPropagation() {}, preventDefault() {} });
tab(false); assert.equal(h.document.activeElement.id, 'firstRunDismiss');
tab(true); assert.equal(h.document.activeElement.id, 'welcomeFinish');
h.element('firstRunDismiss').handlers.click(); assert.equal(h.element('firstRunBanner').open, false);
assert.equal(h.document.activeElement.id, 'startBtn'); assert.equal(h.storage.get('seen'), '1');
h = harness({ storage: h.storage }); h.run('maybeShowFirstRun()'); assert.equal(h.element('firstRunBanner').open, false);
h.run('maybeShowFirstRun(true)'); assert.equal(h.element('firstRunBanner').open, true);
h.element('firstRunBanner').handlers.cancel({ preventDefault() {} }); assert.equal(h.document.activeElement.id, 'shortcutsBtn');
h.run('maybeShowFirstRun(true)'); h.element('welcomeFinish').handlers.click();
assert.equal(h.document.activeElement.id, 'intentInput');
assert.equal(h.run('currentSession'), null); assert.equal(h.element('firstRunBanner').open, false);
for (const options of [{ fresh: false }, { active: true }, { flow: 'save-retry' }, { storage: new Map([['active', '{}']]) }]) {
  h = harness(options); h.run('maybeShowFirstRun()'); assert.equal(h.element('firstRunBanner').open, false);
  if (options.active || options.flow) { h.run('maybeShowFirstRun(true)'); assert.equal(h.element('firstRunBanner').open, false); }
}
assert.match(html, /if \(!tryResume\(\)\) maybeShowFirstRun\(\);/);
assert.doesNotMatch(html, /animation:\s*(?:breathe|dot-pulse)/);
assert.match(html, /\*, \*::before, \*::after \{ animation: none !important; transition: none !important/);
assert.match(html, /if \(alive && !matchMedia\('\(prefers-reduced-motion: reduce\)'\).matches\)/);
console.log('Onboarding regressions passed: skip, finish, reload, replay, Escape, focus return, Tab wrap, recovery precedence, motion guards.');
