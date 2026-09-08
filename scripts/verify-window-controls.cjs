#!/usr/bin/env node
// Isolated native QA. Run: node scripts/verify-window-controls.cjs
// Loads actual main.js and preload.js, with test-only exports appended in memory.
// Native menu handlers are invoked programmatically, not physically clicked.
// Never packages, launches a packaged prototype, or touches an existing profile.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
if (!process.versions.electron) {
  const { spawnSync } = require('node:child_process');
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  env.FOCUS_QA_WINDOW_PROFILE = fs.mkdtempSync('/tmp/focus-window-controls-');
  env.FOCUS_QA_WINDOW_REOPEN = '0';
  const result = spawnSync(require('electron'), [__filename], { env, stdio: 'inherit' });
  if (result.signal || result.error) console.error('Native verifier stopped; no retry:', result.signal || result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
  env.FOCUS_QA_WINDOW_REOPEN = '1';
  const reopened = spawnSync(require('electron'), [__filename], { env, stdio: 'inherit' });
  process.exit(reopened.status ?? 1);
}
const { app, Tray, Menu, session, BrowserWindow, nativeImage } = require('electron');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const profile = process.env.FOCUS_QA_WINDOW_PROFILE || fs.mkdtempSync('/tmp/focus-window-controls-');
app.setPath('userData', profile);
app.setPath('sessionData', path.join(profile, 'session'));
let installedMenu, menuUpdates = 0, productionIcon;
const lightVisibility = new WeakMap();
const setLights = BrowserWindow.prototype.setWindowButtonVisibility;
BrowserWindow.prototype.setWindowButtonVisibility = function(value) { lightVisibility.set(this, value); return setLights.call(this, value); };
const loadImage = nativeImage.createFromPath;
nativeImage.createFromPath = function(file) { const image = loadImage.call(this, file); if (file === path.join(root, 'assets/trayTemplate.png')) productionIcon = image; return image; };
const setMenu = Tray.prototype.setContextMenu;
Tray.prototype.setContextMenu = function(menu) { installedMenu = menu; menuUpdates++; return setMenu.call(this, menu); };
const sourcePath = path.join(root, 'main.js');
const production = new Module(sourcePath, module);
production.filename = sourcePath;
production.paths = Module._nodeModulePaths(root);
production._compile(fs.readFileSync(sourcePath, 'utf8') + `\nmodule.exports.qa = { get win() { return mainWin; }, get tray() { return tray; }, get compact() { return compact; }, get status() { return windowStatus; }, get drag() { return dragOrigin; }, isTrustedAppFrame };`, sourcePath);
const q = production.exports.qa;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label, timeout = 8000) {
  const end = Date.now() + timeout;
  while (!(await fn())) { if (Date.now() > end) throw new Error('Timeout: ' + label); await sleep(50); }
}
const watchdog = setTimeout(() => { console.error('Native QA timed out:', profile); app.exit(2); }, 55000);
app.whenReady().then(async () => {
  try {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_, cb) => cb({ cancel: true }));
    await until(() => q.win && !q.win.webContents.isLoading(), 'production load');
    let win = q.win, wc = win.webContents;
    const run = code => wc.executeJavaScript(code);
    const item = id => installedMenu.getMenuItemById(id);
    const click = async id => { assert.equal(item(id).enabled, true, id + ' enabled'); item(id).click(); await sleep(120); };
    const key = async (keyCode, modifiers = []) => {
      wc.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
      if (keyCode === 'Enter') wc.sendInputEvent({ type: 'char', keyCode: '\r', modifiers });
      wc.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); await sleep(120);
    };
    await until(() => run("typeof currentFlow !== 'undefined'"), 'renderer ready');
    if (process.env.FOCUS_QA_WINDOW_REOPEN === '1') {
      await until(() => q.status.phase === 'focus' && q.status.paused, 'paused session restored after real Quit');
      assert.equal(await run('currentSession.id'), 'window-quit-qa');
      assert.equal(await run('welcomeDialog.open'), false);
      assert.equal(item('pause').label, 'Resume');
      await click('pause');
      const time = q.tray.getTitle(); await sleep(1400);
      assert.notEqual(q.tray.getTitle(), time, 'reopened timer resumes ticking');
      await run('endSession(false)');
      assert.equal(await run("state.sessions.filter(s => s.id === 'window-quit-qa').length"), 1);
      console.log(JSON.stringify({ quitReopenPassed: true, profile }));
      clearTimeout(watchdog); app.quit(); return;
    }
    await run("if (welcomeDialog.open) document.getElementById('firstRunDismiss').click()");
    assert(q.tray && !q.tray.isDestroyed());
    assert(productionIcon && !productionIcon.isEmpty(), 'Tray receives nonempty asset');
    assert(productionIcon.isTemplateImage(), 'Tray receives template image');
    assert.equal(q.tray.getTitle(), '');
    const disabled = () => { for (const id of ['compact', 'pause', 'skip', 'stop']) assert.equal(item(id).enabled, false, id); };
    disabled();
    assert.equal(Menu.getApplicationMenu().getMenuItemById('window-compact').accelerator, 'CommandOrControl+Shift+M');
    // Force a narrow full window only in this QA instance; width must not select compact presentation.
    win.setMinimumSize(360, 560); win.setSize(400, 600); await sleep(120);
    assert.equal(await run("isMiniActive() || getComputedStyle(document.getElementById('setupScreen')).display === 'none'"), false);
    win.setMinimumSize(480, 560); win.setSize(800, 650);
    await run(`currentSession = { id: 'window-qa', startedAt: Date.now(), totalCycles: 2, focusMinutes: 30, breakMinutes: 5, mode: 'full', cycles: [], skippedPrompts: false };
      ensureCycleRecord(0); currentSession.cycles[0].plan = { accomplish: 'Finish the detailed quarterly strategy presentation with a very long target that must remain readable without clipping the controls', start: 'Write the outline' }; startCycleTimer(0);`);
    await until(() => q.status.phase === 'focus', 'focus status');
    assert.equal(item('pause').label, 'Pause'); assert.equal(item('skip').label, 'Skip focus');
    const original = win.getBounds(); const sameWc = wc.id;
    Menu.getApplicationMenu().getMenuItemById('window-compact').click();
    await until(() => q.compact && run('isMiniActive()'), 'compact state');
    assert.equal(win.getBounds().width, 480); assert.equal(win.getBounds().height, 112);
    assert(win.isAlwaysOnTop()); assert.equal(win.isResizable(), false);
    assert.equal(lightVisibility.get(win), false);
    await until(() => run("document.activeElement.id === 'compactExpand'"), 'compact focus');
    for (const theme of ['light', 'dark']) {
      await run(`document.body.dataset.theme = '${theme}'`); await sleep(120);
      assert.equal(await run(`['compactExpand','compactAction','compactCountdown','compactPhase','compactTarget','compactCycle'].every(id => {
        const r = document.getElementById(id).getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
      })`), true, theme + ' no clipped content');
      assert.equal(await run("getComputedStyle(document.getElementById('compactAction')).height"), '34px');
      fs.writeFileSync(path.join(profile, 'compact-' + theme + '.png'), (await wc.capturePage()).toPNG());
    }
    for (const shortcut of ['?', 'h', 'b', 'm']) await key(shortcut);
    assert.equal(await run("currentVisibleScreen() === 'activeScreen' && ['shortcutsOverlay','bgMenu','musicMenu'].every(id => document.getElementById(id).classList.contains('hidden'))"), true, 'compact shortcuts do not open full-size overlays');
    await key('Tab'); assert.equal(await run('document.activeElement.id'), 'compactAction');
    await key('Space'); await until(() => q.status.paused, 'keyboard Pause');
    assert.equal(item('pause').label, 'Resume'); assert(q.tray.getTitle().startsWith('Ⅱ '));
    const pausedTitle = q.tray.getTitle(); await sleep(1100); assert.equal(q.tray.getTitle(), pausedTitle, 'paused countdown stays fixed');
    await key('Enter'); await until(() => !q.status.paused, 'keyboard Resume');
    // Lost pointer capture must release main-process drag state.
    await run(`document.getElementById('compactPanel').dispatchEvent(new PointerEvent('pointerdown', { button:0, pointerId:1, screenX:10, screenY:10, bubbles:true }))`);
    // Exercise the lost-capture cleanup whether Chromium accepted synthetic capture or not.
    await run("document.getElementById('compactPanel').dispatchEvent(new PointerEvent('lostpointercapture', { pointerId:1 }))");
    await until(() => q.drag === null, 'lost capture clears drag');
    wc.debugger.attach('1.3');
    await wc.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await run("matchMedia('(prefers-reduced-motion: reduce)').matches"), true);
    assert.equal(await run("getComputedStyle(document.getElementById('compactPanel')).animationName"), 'none');
    await key('Escape'); await until(() => !q.compact, 'Escape expands');
    assert.deepEqual(win.getBounds(), original); assert.equal(lightVisibility.get(win), true); assert.equal(win.isAlwaysOnTop(), false); assert(win.isResizable());
    await until(() => run("document.activeElement.id === 'miniBtn'"), 'full focus return');
    const titleBefore = q.tray.getTitle(), updatesBefore = menuUpdates;
    win.minimize(); await sleep(2300);
    assert(win.isMinimized(), 'native minimize stays minimized'); assert.notEqual(q.tray.getTitle(), titleBefore, 'background countdown advances'); assert.equal(menuUpdates, updatesBefore, 'no per-second menu rebuild');
    await click('show-full'); assert.equal(win.isMinimized(), false); assert.equal(q.compact, false);
    assert.equal(wc.id, sameWc); assert.equal(await run('currentSession.id'), 'window-qa');
    win.hide(); await sleep(1100); await click('show-full'); assert(win.isVisible());
    win.close(); assert.equal(win.isDestroyed(), false); assert.equal(win.isVisible(), false);
    await click('show-full'); assert.equal(wc.id, sameWc); assert.equal(await run('currentSession.id'), 'window-qa');
    await click('compact'); await click('skip');
    await until(() => q.status.phase === 'review', 'review'); disabled(); assert(q.compact);
    assert.equal(await run("document.getElementById('compactAction').textContent"), 'Review');
    assert.equal(await run("document.getElementById('compactCountdown').textContent"), '', 'review makes no saved/success claim');
    await run("document.getElementById('compactAction').focus()"); await key('Enter');
    await until(() => !q.compact, 'Review keyboard route');
    assert.equal(await run('currentVisibleScreen()'), 'promptScreen');
    await run('startBreakTimer(0)'); await until(() => q.status.phase === 'break', 'break');
    assert.equal(item('skip').label, 'Skip break'); await click('pause'); assert.equal(item('pause').label, 'Resume'); await click('pause');
    await click('compact'); win.hide(); await click('skip');
    assert.equal(win.isVisible(), false, 'phase transition never shows hidden window');
    await until(() => q.status.phase === 'planning', 'planning'); disabled();
    await click('show-full'); assert.equal(q.compact, false);
    await run('startCycleTimer(1)'); await until(() => q.status.phase === 'focus', 'second focus');
    await click('compact'); win.hide();
    await run('timerState.endsAt = Date.now() - 1; tick()');
    await until(() => q.status.phase === 'review', 'hidden expiry review');
    assert.equal(win.isVisible(), false, 'actual expiry does not steal focus'); assert(q.compact); disabled();
    await click('show-full');
    await run("timerState = null; currentFlow = 'save-retry'; showSaveRetry()");
    await until(() => q.status.phase === 'save-retry', 'save retry'); disabled();
    await run('endSession(false)'); await until(() => q.status.phase === 'idle', 'idle after archive'); disabled(); assert(q.tray);
    // Destroy only this isolated idle QA window, then exercise recreation via native tray.
    wc.debugger.detach(); win.destroy(); await click('show-full');
    await until(() => q.win && !q.win.webContents.isLoading() && q.win.isVisible(), 'recreated production window');
    win = q.win; wc = win.webContents; assert.notEqual(wc.id, sameWc); assert(win.isVisible());
    await run(`currentSession = { id: 'window-quit-qa', startedAt: Date.now(), totalCycles: 1, focusMinutes: 30, breakMinutes: 5, mode: 'sprint', cycles: [], skippedPrompts: false };
      ensureCycleRecord(0); currentSession.cycles[0].plan = { accomplish: 'Verify a real Quit and reopen' }; startCycleTimer(0);`);
    await until(() => q.status.phase === 'focus', 'quit test timer');
    await click('pause'); await until(() => q.status.paused, 'quit test paused');
    console.log(JSON.stringify({ ok: true, profile, screenshots: ['compact-light.png', 'compact-dark.png'], menuInteraction: 'Programmatic native MenuItem click handlers; keyboard events use webContents.sendInputEvent.', gaps: ['Physical menu/traffic-light clicking and cross-application focus need human verification.'] }, null, 2));
    clearTimeout(watchdog); item('quit').click();
  } catch (error) { console.error(error.stack); console.error('QA artifacts:', profile); clearTimeout(watchdog); app.exit(1); }
});
