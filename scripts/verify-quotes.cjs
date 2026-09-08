#!/usr/bin/env node
// Real macOS Electron renderer, fresh profile, no account access.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
if (!process.versions.electron) {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const result = require('node:child_process').spawnSync(require('electron'), [__filename], { env, stdio: 'inherit' });
  if (result.signal || result.error) console.error(result.signal || result.error.message);
  process.exit(result.status ?? 1);
}
const { app, BrowserWindow, session } = require('electron');
const root = process.env.FOCUS_QA_APP_ROOT || path.resolve(__dirname, '..');
const profile = fs.mkdtempSync('/tmp/focus-quotes-');
app.setPath('userData', profile);
app.setPath('sessionData', path.join(profile, 'session'));
const watchdog = setTimeout(() => app.exit(2), 45000);
app.whenReady().then(async () => {
  try {
    if (!process.env.FOCUS_QA_ONLINE) session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_, cb) => cb({ cancel: true }));
    const win = new BrowserWindow({ width: 1000, height: 800, show: false, webPreferences: { preload: path.join(root, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
    const wc = win.webContents;
    const run = code => wc.executeJavaScript(code);
    const settle = () => new Promise(r => setTimeout(r, 250));
    const load = async () => { await win.loadFile(path.join(root, 'index.html')); await settle(); };
    const click = async selector => {
      const point = await run(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}; })()`);
      wc.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...point});
      wc.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...point});
      await settle();
    };
    const toggle = async () => { await click('#prefsBtn'); await click('[data-pref="quotes"]'); await click('#prefsBtn'); };
    const visible = () => run(`(() => { const e=document.getElementById('quoteChip'), r=e.getBoundingClientRect(); return getComputedStyle(e).display!=='none' && r.width>0 && r.height>0 && r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight && !!document.querySelector('#quoteBody .q')?.textContent.trim() && !!document.querySelector('#quoteBody .author')?.textContent.trim(); })()`);
    await load();
    await run("if(welcomeDialog.open) document.getElementById('firstRunDismiss').click()");
    await toggle(); assert.equal(await run('state.settings.showQuotes'), false);
    await toggle(); assert.equal(await run('state.settings.showQuotes'), true);
    console.log('Quote diagnosis:', await run("JSON.stringify({setting:state.settings.showQuotes,text:document.getElementById('quoteBody').textContent,display:getComputedStyle(document.getElementById('quoteChip')).display,width:innerWidth,height:innerHeight})"));
    assert.equal(await visible(), true, 'Quotes switched on must actually be visible in the normal Mac window');
    const checks = [];
    for (const [width,height] of [[1000,800],[800,650],[480,560],[1000,960]]) {
      win.setSize(width,height); await settle();
      await run("document.querySelector('main').scrollTop=0");
      assert.equal(await visible(), true, `${width}x${height}: quote readable`);
      const first = await run("document.getElementById('quoteBody').textContent");
      await click('#quoteNext');
      assert.notEqual(await run("document.getElementById('quoteBody').textContent"), first);
      await click('#quotePrev');
      assert.equal(await run("document.getElementById('quoteBody').textContent"), first);
      await toggle(); assert.equal(await visible(), false);
      await load(); assert.equal(await run('state.settings.showQuotes'), false);
      assert.equal(await visible(), false, 'Off preference survives reload');
      await toggle(); assert.equal(await visible(), true);
      await load(); assert.equal(await visible(), true, 'On preference survives reload');
      assert.equal(await run(`(() => { const main=document.querySelector('main'), btn=document.getElementById('startBtn'); main.scrollTop=main.scrollHeight; const r=btn.getBoundingClientRect(), bar=document.querySelector('.bottom-bar').getBoundingClientRect(); return r.height>0 && r.bottom<=bar.top && r.right<=innerWidth; })()`), true, 'Start remains reachable above bottom bar');
      await run("document.querySelector('main').scrollTop=0");
      checks.push({width,height,passed:true});
    }
    win.setSize(1000,800); await settle();
    const quoteCount = await run('QUOTES.length');
    for(let i=0;i<quoteCount;i++) {
      await run(`setQuote(${i})`);
      assert.equal(await visible(),true, `Quote ${i} renders`);
    }
    await run("setQuote(0); document.getElementById('quoteNext').focus()");
    await settle();
    assert.equal(await run("Number(getComputedStyle(document.getElementById('quoteNext')).opacity)"), 1, 'Keyboard-focused navigation remains visible');
    if(process.env.FOCUS_QA_ONLINE) {
      const deadline=Date.now()+12000;
      while(!(await run("[bg1,bg2].some(b=>b.classList.contains('active') && b.style.backgroundImage.includes('images.unsplash.com'))")) && Date.now()<deadline) await settle();
      assert.equal(await run("[bg1,bg2].some(b=>b.classList.contains('active') && b.style.backgroundImage.includes('images.unsplash.com'))"),true,'Real scenic background loads');
      await new Promise(r=>setTimeout(r,1100));
    }
    const screenshots=[];
    for(const theme of ['light','dark']) {
      await run(`document.body.dataset.theme=${JSON.stringify(theme)}; document.getElementById('quoteNext').blur(); document.querySelector('main').scrollTop=0`);
      await settle();
      const file=path.join(profile,`quotes-${theme}.png`);
      fs.writeFileSync(file,(await wc.capturePage()).toPNG()); screenshots.push(file);
    }
    console.log(JSON.stringify({passed:true,checks,quoteCount,screenshots,profile,root},null,2));
    clearTimeout(watchdog); app.exit(0);
  } catch(error) { console.error(error.stack); clearTimeout(watchdog); app.exit(1); }
});
