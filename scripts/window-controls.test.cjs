#!/usr/bin/env node
// Exercise production functions with Electron mocks, without opening any profile.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const root = path.resolve(__dirname, '..');
function harness() {
  const handlers = new Map();
  let menu, menuBuilds = 0;
  const events = new EventEmitter();
  const area = { x: -900, y: 20, width: 900, height: 700 };
  function build(template) {
    menuBuilds++;
    return { items: template, getMenuItemById(id) {
      for (const item of template) {
        if (item.id === id) return item;
        if (Array.isArray(item.submenu)) { const match = item.submenu.find(i => i.id === id); if (match) return match; }
      }
    } };
  }
  class Win extends EventEmitter {
    constructor(options) {
      super(); this.options = options; this.bounds = { x: -800, y: 50, width: 700, height: 600 };
      this.visible = true; this.minimized = false; this.destroyed = false; this.lights = true; this.sent = [];
      this.webContents = new EventEmitter();
      Object.assign(this.webContents, { mainFrame: { url: require('node:url').pathToFileURL(path.join(root, 'index.html')).href },
        send: (...args) => this.sent.push(args), setWindowOpenHandler() {}, getURL: () => this.webContents.mainFrame.url });
    }
    getBounds() { return { ...this.bounds }; }
    setBounds(b, animate) { assert.equal(animate, false); this.bounds = b; }
    isDestroyed() { return this.destroyed; }
    isFullScreen() { return !!this.fullscreen; }
    isMaximized() { return false; }
    setMinimumSize(...v) { this.minimum = v; }
    setWindowButtonVisibility(v) { this.lights = v; }
    setResizable(v) { this.resizable = v; }
    setAlwaysOnTop(v) { this.top = v; }
    isMinimized() { return this.minimized; }
    restore() { this.minimized = false; }
    show() { this.visible = true; }
    hide() { this.visible = false; }
    focus() { this.focused = true; }
    loadFile() {}
  }
  class Tray {
    constructor(icon) { this.icon = icon; this.title = ''; }
    setContextMenu(v) { this.menu = v; }
    setTitle(v, options) { assert.equal(options.fontType, 'monospacedDigit'); this.title = v; }
    getTitle() { return this.title; }
    setToolTip(v) { this.tooltip = v; }
  }
  const electron = { app: Object.assign(events, { setName() {}, requestSingleInstanceLock: () => true, whenReady: () => ({ then() {} }), quit: () => events.emit('before-quit') }),
    BrowserWindow: Win, Tray, nativeImage: { createFromPath(file) { assert.equal(file, path.join(root, 'assets/trayTemplate.png')); return { setTemplateImage(v) { this.template = v; } }; } },
    Menu: { buildFromTemplate: build, getApplicationMenu: () => menu, setApplicationMenu(v) { menu = v; } },
    ipcMain: { on: (name, cb) => handlers.set(name, cb), handle: (name, cb) => handlers.set(name, cb) },
    screen: { getDisplayMatching: () => ({ workArea: area }) }, shell: {}, session: {}, dialog: {} };
  const context = { require: name => name === 'electron' ? electron : require(name), __dirname: root, process, URL, exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'main.js'), 'utf8') + `\nexports.qa = { createWindow, createTray, setCompact, isCompact, showFullWindow, clampBounds, acceptStatus, isTrustedAppFrame, sendTrayAction, get win() { return mainWin; }, get tray() { return tray; }, get status() { return windowStatus; }, get drag() { return dragOrigin; } };`, context);
  const q = context.exports.qa; q.createTray(); q.createWindow();
  const trusted = () => ({ sender: q.win.webContents, senderFrame: q.win.webContents.mainFrame });
  return { q, events, handlers, trusted, area, builds: () => menuBuilds };
}
const status = (phase, paused = false, seconds = 120) => ({ phase, paused, seconds });
test('idle template tray, stable actions, state-only menu changes and countdown', () => {
  const { q, builds } = harness();
  assert.equal(q.tray.icon.template, true);
  const item = id => q.tray.menu.getMenuItemById(id);
  for (const id of ['compact', 'pause', 'skip', 'stop']) assert.equal(item(id).enabled, false);
  q.acceptStatus(status('focus')); const initial = builds();
  q.acceptStatus(status('focus', false, 119)); assert.equal(builds(), initial); assert.equal(q.tray.title, '1:59');
  assert.equal(item('pause').label, 'Pause'); assert.equal(item('skip').label, 'Skip focus');
  q.acceptStatus(status('focus', true, 119)); assert.equal(item('pause').label, 'Resume'); assert.equal(q.tray.title, 'Ⅱ 1:59');
  q.acceptStatus(status('break')); assert.equal(item('skip').label, 'Skip break');
  for (const phase of ['planning', 'review', 'save-retry', 'idle']) {
    const stale = item('stop'); q.acceptStatus(status(phase));
    for (const id of ['compact', 'pause', 'skip', 'stop']) assert.equal(item(id).enabled, false);
    const count = q.win.sent.length; stale.click(); assert.equal(q.win.sent.length, count);
    assert.equal(q.tray.title, '');
  }
});
test('explicit compact state, bounds clamping, flags and native minimize', () => {
  const { q, area } = harness(); const original = q.win.getBounds();
  q.setCompact(true); assert.equal(q.isCompact(), false);
  q.acceptStatus(status('focus')); q.setCompact(true);
  assert.equal(q.isCompact(), true); assert.equal(q.win.bounds.width, 480); assert.equal(q.win.bounds.height, 112);
  assert.equal(q.win.top, true); assert.equal(q.win.resizable, false); assert.equal(q.win.lights, false);
  q.win.minimized = true; q.win.emit('minimize'); assert.equal(q.win.minimized, true);
  q.showFullWindow(); assert.equal(q.win.minimized, false); assert.equal(q.isCompact(), false);
  assert.equal(q.win.top, false); assert.equal(q.win.resizable, true); assert.equal(q.win.lights, true);
  assert.deepEqual(q.win.getBounds(), original); assert.deepEqual(q.win.minimum, [480, 560]);
  q.setCompact(true); area.x = 300; area.y = -400; area.width = 600; area.height = 580;
  q.setCompact(false); const b = q.win.getBounds();
  assert(b.x >= area.x && b.y >= area.y && b.x + b.width <= area.x + area.width && b.y + b.height <= area.y + area.height);
});
test('fullscreen disables Compact and invalidates stale commands until exit', () => {
  const { q } = harness();
  q.acceptStatus(status('focus'));
  const stale = q.tray.menu.getMenuItemById('compact');
  assert.equal(stale.enabled, true);
  q.win.fullscreen = true; q.win.emit('enter-full-screen');
  assert.equal(q.tray.menu.getMenuItemById('compact').enabled, false);
  stale.click(); assert.equal(q.isCompact(), false);
  assert.deepEqual(q.win.sent.at(-1), ['compact-availability', false]);
  q.win.fullscreen = false; q.win.emit('leave-full-screen');
  assert.equal(q.tray.menu.getMenuItemById('compact').enabled, true);
  assert.deepEqual(q.win.sent.at(-1), ['compact-availability', true]);
});
test('all control IPC rejects foreign sender, subframe, URL suffix tricks and malformed values', () => {
  const { q, handlers, trusted } = harness();
  const valid = trusted();
  for (const event of [{}, { ...valid, sender: {} }, { ...valid, senderFrame: { url: valid.senderFrame.url } }]) {
    handlers.get('window-status')(event, status('focus'));
    handlers.get('set-compact')(event, true); assert.equal(q.isCompact(), false);
    assert.equal(q.isTrustedAppFrame(event), false);
  }
  const frame = valid.senderFrame; const url = frame.url;
  frame.url = 'file:///elsewhere/index.html'; assert.equal(q.isTrustedAppFrame(valid), false); frame.url = url + '?x'; assert.equal(q.isTrustedAppFrame(valid), false); frame.url = url;
  for (const value of [null, '1:00', status('bad'), status('focus', false, Infinity), status('focus', 'yes'), status('focus', false, '2')]) assert.equal(q.acceptStatus(value), false);
  handlers.get('window-status')(trusted(), status('focus', false, 1e12)); assert.equal(q.status.seconds, 86400);
  handlers.get('set-compact')(trusted(), 'true'); assert.equal(q.isCompact(), false);
  handlers.get('set-compact')(trusted(), true); assert.equal(q.isCompact(), true);
  handlers.get('drag-start')(trusted()); const before = q.win.getBounds();
  handlers.get('drag-move')(trusted(), NaN, 30); assert.deepEqual(q.win.getBounds(), before);
  handlers.get('drag-move')(trusted(), 500, -500); assert(q.win.bounds.y >= 20);
  q.win.emit('blur'); assert.equal(q.drag, null);
  handlers.get('drag-start')(trusted()); handlers.get('drag-end')(trusted()); assert.equal(q.drag, null);
});
test('close hides the same renderer; quit allows close; reload disables actions', () => {
  const { q, events } = harness(); q.acceptStatus(status('focus'));
  const win = q.win, wc = win.webContents; let prevented = false;
  win.emit('close', { preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(win.visible, false);
  q.showFullWindow(); assert.equal(q.win, win); assert.equal(q.win.webContents, wc); assert.equal(q.status.phase, 'focus');
  assert.equal(win.options.webPreferences.backgroundThrottling, false);
  win.webContents.emit('did-start-loading'); assert.equal(q.status.phase, 'idle');
  events.emit('before-quit'); prevented = false;
  win.emit('close', { preventDefault() { prevented = true; } }); assert.equal(prevented, false);
});
