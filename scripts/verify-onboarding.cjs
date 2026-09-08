#!/usr/bin/env node
// Run with node. Only the child Electron process and a fresh /tmp profile are used.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
if (!process.versions.electron) {
  const { spawnSync } = require('node:child_process');
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(require('electron'), [__filename], { env, stdio: 'inherit' });
  if (result.signal || result.error) console.error('Electron launch failed:', result.signal || result.error.message);
  process.exit(result.status ?? 1);
}
const { app, BrowserWindow, session } = require('electron');
const profile = fs.mkdtempSync('/tmp/focus-onboarding-');
app.setPath('userData', profile);
app.setPath('sessionData', path.join(profile, 'session'));
const timeout = setTimeout(() => app.exit(2), 45000);
app.whenReady().then(async () => {
  try {
    // Offline by default. Online mode verifies real scenic image delivery.
    if (!process.env.FOCUS_QA_ONLINE) session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_, cb) => cb({ cancel: true }));
    const win = new BrowserWindow({ width: 1000, height: 800, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
    const wc = win.webContents;
    const evaluate = code => wc.executeJavaScript(code);
    const pause = () => new Promise(r => setTimeout(r, 350));
    const load = async () => { await win.loadFile(path.join(__dirname, '../index.html')); wc.focus(); await pause(); };
    const key = async (keyCode, modifiers = []) => {
      wc.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
      if (keyCode === 'Enter') wc.sendInputEvent({ type: 'char', keyCode: '\r', modifiers });
      wc.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); await pause();
    };
    const open = () => evaluate('welcomeDialog.open');
    const focused = () => evaluate('document.activeElement.id');
    const reset = async seed => {
      await evaluate(`currentSession=null; timerState=null; stopRunner(); clearTimeout(saveSoonTimer); saveSoonTimer=null; localStorage.clear(); ${seed || ''}`);
      await load();
    };
    await load();
    assert.equal(await open(), true);
    assert.equal(await evaluate('state.settings.bgFill'), null);
    if (process.env.FOCUS_QA_ONLINE) {
      const deadline = Date.now() + 15000;
      while (!(await evaluate(`[bg1,bg2].some(b=>b.classList.contains('active') && b.style.backgroundImage.startsWith('url('))`)) && Date.now() < deadline) await pause();
      assert.equal(await evaluate(`[bg1,bg2].some(b=>b.classList.contains('active') && b.style.backgroundImage.includes('images.unsplash.com'))`), true, 'A real scenic image must load');
      await new Promise(r => setTimeout(r, 1100));
    }
    const intro = path.join(profile, 'fresh-intro.png');
    fs.writeFileSync(intro, (await wc.capturePage()).toPNG());
    assert.equal(await focused(), 'welcomeFinish');
    await key('Tab'); assert.equal(await focused(), 'firstRunDismiss');
    await key('Tab', ['shift']); assert.equal(await focused(), 'welcomeFinish');
    await key('Tab', ['shift']); assert.equal(await focused(), 'firstRunDismiss');
    await key('Enter'); assert.equal(await open(), false);
    assert.equal(await evaluate('!!currentSession || !!timerState'), false);
    await load(); assert.equal(await open(), false);
    await evaluate("document.getElementById('shortcutsBtn').click()");
    await key('Enter'); assert.equal(await open(), true);
    await key('Escape'); assert.equal(await open(), false);
    assert.equal(await focused(), 'shortcutsBtn');
    await evaluate("document.getElementById('shortcutsBtn').click()"); await key('Enter');
    await key('Enter'); assert.equal(await focused(), 'intentInput');
    assert.equal(await evaluate('!!currentSession || !!timerState'), false);
    const setup = path.join(profile, 'setup.png'); fs.writeFileSync(setup, (await wc.capturePage()).toPNG());
    await load(); assert.equal(await open(), false);
    await evaluate('maybeShowFirstRun(true)');
    win.setSize(480, 560); await pause();
    assert.equal(await evaluate(`(() => { const d=welcomeDialog.getBoundingClientRect(); const b=document.getElementById('welcomeFinish').getBoundingClientRect(); return d.left>=0 && d.right<=innerWidth && d.top>=0 && d.bottom<=innerHeight && b.bottom<=d.bottom; })()`), true);
    const small = path.join(profile, 'small-intro.png'); fs.writeFileSync(small, (await wc.capturePage()).toPNG());
    wc.debugger.attach('1.3');
    await wc.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await pause();
    assert.equal(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"), true);
    assert.deepEqual(await evaluate("[getComputedStyle(welcomeDialog).animationName, getComputedStyle(bg1).transitionDuration]"), ['none', '0s']);
    await evaluate("document.querySelector('#activeScreen .active-screen').classList.remove('phase-pop'); animatePhaseChange()");
    assert.equal(await evaluate("document.querySelector('#activeScreen .active-screen').classList.contains('phase-pop')"), false);
    await wc.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    assert.equal(await evaluate('getComputedStyle(bg1).transitionDuration'), '0.9s');
    await evaluate('animatePhaseChange()');
    assert.equal(await evaluate("document.querySelector('#activeScreen .active-screen').classList.contains('phase-pop')"), true);
    assert.equal(await evaluate("getComputedStyle(document.getElementById('timerDisplay')).animationName"), 'none');
    wc.debugger.detach();
    for (const seed of ["localStorage.setItem(FIRST_RUN_KEY,'1')", "localStorage.setItem(LS_KEY,JSON.stringify({version:2,settings:{}}))", "localStorage.setItem('focus_app_v1','{}')"]) {
      await reset(seed); assert.equal(await open(), false);
    }
    for (const flow of ['sprint-start', 'save-retry']) {
      await reset(`localStorage.setItem(ACTIVE_KEY,JSON.stringify({savedAt:Date.now(),flow:${JSON.stringify(flow)},session:{id:'qa-recovery',startedAt:Date.now(),focusMinutes:30,breakMinutes:5,totalCycles:1,mode:'sprint',cycles:[]}}))`);
      assert.equal(await open(), false);
      assert.equal(await evaluate('currentFlow'), flow);
      await evaluate('maybeShowFirstRun(true)'); assert.equal(await open(), false);
      if (flow === 'save-retry') assert.equal(await evaluate("!!document.getElementById('retrySaveBtn')"), true);
    }
    await reset(`localStorage.setItem(ACTIVE_KEY,JSON.stringify({savedAt:Date.now(),flow:'focus',session:{id:'qa-timer',startedAt:Date.now(),focusMinutes:30,breakMinutes:5,totalCycles:1,mode:'sprint',cycles:[]},timer:{phase:'focus',cycleIdx:0,minutes:30,endsAt:Date.now()+600000,paused:true,pausedRemainingMs:600000,pauseStartedAt:Date.now()}}))`);
    assert.equal(await open(), false);
    assert.equal(await evaluate("currentVisibleScreen()"), 'activeScreen');
    assert.equal(await evaluate('timerState.paused'), true);
    const backgrounds = await evaluate(`(() => {
      const RealImage = window.Image; const original = BACKGROUNDS; const requests = [];
      backgroundRequest += 1;
      window.Image = class { constructor(){requests.push(this);} set src(v){this.url=v;} };
      BACKGROUNDS = ['qa-a','qa-b','qa-c'];
      setBackground(0);
      for(let i=0;i<requests.length && i<12;i++) requests[i].onerror?.();
      const bounded = requests.length === 3;
      requests.length=0;
      setBackground(0); const older=requests[0]; setBackground(1); const newer=requests[1];
      newer.onload(); older.onload();
      const latestWins = [bg1,bg2].some(b=>b.classList.contains('active') && b.style.backgroundImage.includes('qa-b'));
      setBackground(0); const pending=requests.at(-1); setFill('#123456'); pending.onload();
      const fillWins = state.settings.bgFill === '#123456' && document.body.classList.contains('fill-bg') && ![bg1,bg2].some(b=>b.classList.contains('active') && b.style.backgroundImage.includes('qa-a'));
      window.Image = RealImage; BACKGROUNDS=original; backgroundRequest+=1;
      return {bounded,latestWins,fillWins};
    })()`);
    assert.deepEqual(backgrounds, {bounded:true, latestWins:true, fillWins:true});
    console.log(JSON.stringify({ passed: true, backgrounds, checks: 'skip, finish, reload, Help replay, Escape, Tab/Shift-Tab, no auto-start, existing users, recovery/retry precedence, live reduced motion, photo default, small layout', intro, setup, small, profile }, null, 2));
    clearTimeout(timeout); app.exit(0);
  } catch (e) { console.error(e.stack); clearTimeout(timeout); app.exit(1); }
});
