// Integration checks against the real renderer. Synthetic data, isolated profile, no network.
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'focus-cycles-reliability-'));
app.setPath('userData', profile);
app.setPath('sessionData', path.join(profile, 'session'));
const watchdog = setTimeout(() => { console.error('Native QA timeout'); app.exit(2); }, 30000);
app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_, cb) => cb({ cancel: true }));
});
require(path.join(__dirname, '../../main.js'));
app.whenReady().then(async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    const wc = win.webContents;
    if (wc.isLoading()) await new Promise(resolve => wc.once('did-finish-load', resolve));
    const evaluate = code => wc.executeJavaScript(code);
    const emptyHistory = await evaluate(`renderHistory(); document.getElementById('sessionList').textContent;`);
    assert.equal(emptyHistory.trim(), 'No cycles logged yet. Start with one small thing.');
    const seed = id => evaluate(`state.settings.sound=false; currentSession={id:${JSON.stringify(id)},startedAt:Date.now(),focusMinutes:30,breakMinutes:5,totalCycles:1,mode:'sprint',cycles:[]}; startCycleTimer(0);`);
    await seed('native-late');
    const late = await evaluate(`timerState.endsAt=Date.now()-15*60_000; phaseComplete(); ({minutes:currentSession.cycles[0].minutes,reason:currentSession.cycles[0].endReason});`);
    assert.deepEqual(late, {minutes:30, reason:'expired'});
    await seed('native-skip');
    const skipped = await evaluate(`document.getElementById('skipBtn').click(); ({completed:currentSession.cycles[0].completed,reason:currentSession.cycles[0].endReason});`);
    assert.deepEqual(skipped, {completed:false, reason:'skipped'});
    await seed('native-save');
    const failed = await evaluate(`window.qaOriginalSetItem=Storage.prototype.setItem; Storage.prototype.setItem=function(key,value){if(key===LS_KEY)throw new DOMException('QA quota simulation','QuotaExceededError');return window.qaOriginalSetItem.call(this,key,value);}; document.getElementById('stopBtn').click(); ({recovery:!!localStorage.getItem(ACTIVE_KEY),flow:currentFlow,retry:!!document.getElementById('retrySaveBtn'),toast:document.getElementById('toast').textContent});`);
    assert.deepEqual(failed, {recovery:true,flow:'save-retry',retry:true,toast:'Session not saved. Click Retry save.'});
    await new Promise(resolve => setTimeout(resolve, 450));
    const screenshot = path.join(profile, 'save-retry.png');
    fs.writeFileSync(screenshot, (await wc.capturePage()).toPNG());
    await evaluate(`Storage.prototype.setItem=window.qaOriginalSetItem; document.getElementById('retrySaveBtn').click();`);
    const saved = await evaluate(`({count:JSON.parse(localStorage.getItem(LS_KEY)).sessions.filter(s=>s.id==='native-save').length,recovery:!!localStorage.getItem(ACTIVE_KEY),current:!!currentSession});`);
    assert.deepEqual(saved, {count:1,recovery:false,current:false});
    const firstSaveToast = await evaluate(`document.getElementById('toast').textContent;`);
    assert.equal(firstSaveToast, 'First session saved. One less thing to keep in your head.');
    await seed('native-both-fail');
    const doubleFailure = await evaluate(`saveActive(true); Storage.prototype.setItem=function(){throw new DOMException('QA full storage simulation','QuotaExceededError');}; document.getElementById('stopBtn').click(); ({recovery:!!localStorage.getItem(ACTIVE_KEY),flow:currentFlow,status:document.getElementById('saveRecoveryStatus').textContent});`);
    assert.equal(doubleFailure.recovery, true);
    assert.equal(doubleFailure.flow, 'save-retry');
    assert.match(doubleFailure.status, /only in memory/);
    const doubleRetry = await evaluate(`Storage.prototype.setItem=window.qaOriginalSetItem; const retryButton=document.getElementById('retrySaveBtn'); retryButton.click(); retryButton.click(); ({count:JSON.parse(localStorage.getItem(LS_KEY)).sessions.filter(s=>s.id==='native-both-fail').length,current:!!currentSession});`);
    assert.deepEqual(doubleRetry, {count:1,current:false});
    console.log(JSON.stringify({passed:true,late,skipped,failed,saved,doubleFailure,doubleRetry,screenshot,profile},null,2));
    clearTimeout(watchdog); app.exit(0);
  } catch(error) {console.error(error.stack);clearTimeout(watchdog);app.exit(1);}
});
