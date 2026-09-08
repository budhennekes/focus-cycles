// Run with the existing Electron binary, not Node. Uses no personal profile.
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'focus-cycles-qa-'));
app.setPath('userData', profile);
app.setPath('sessionData', path.join(profile, 'session'));
console.log('QA isolated userData:', profile);
const watchdog = setTimeout(() => { console.error('QA native timeout'); app.exit(2); }, 20000);
app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']}, (_details, cb) => cb({cancel:true}));
});
require(path.join(__dirname, '../../main.js'));
app.whenReady().then(async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) throw new Error('Production main did not create a window');
    const wc = win.webContents;
    const loaded = () => new Promise(resolve => wc.once('did-finish-load', resolve));
    if (wc.isLoading()) await loaded();
    const evaluate = code => wc.executeJavaScript(code);
    await evaluate(`state.settings.sound=false; currentSession={id:'native-qa',startedAt:Date.now(),focusMinutes:30,breakMinutes:5,totalCycles:1,mode:'sprint',cycles:[]}; startCycleTimer(0);`);
    const read = () => evaluate(`({display:document.getElementById('timerDisplay').textContent,runner:runner!==null,paused:timerState.paused})`);
    console.log('QA native fresh:', JSON.stringify(await read()));
    await new Promise(resolve => setTimeout(resolve, 1200));
    console.log('QA native after 1.2 seconds:', JSON.stringify(await read()));
    await evaluate(`document.getElementById('pauseBtn').click()`);
    const done = loaded(); wc.reload(); await done;
    console.log('QA native restored paused:', JSON.stringify(await read()));
    await evaluate(`document.getElementById('pauseBtn').click()`);
    console.log('QA native resumed:', JSON.stringify(await read()));
    await new Promise(resolve => setTimeout(resolve, 2200));
    console.log('QA native after 2.2 seconds:', JSON.stringify(await read()));
    clearTimeout(watchdog); app.exit(0);
  } catch (error) { console.error('QA native failed:', error.message); clearTimeout(watchdog); app.exit(2); }
});
