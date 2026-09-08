#!/usr/bin/env node
// Local lab measurements, not field startup/battery benchmarks. Fresh QA profiles only.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
if (!process.versions.electron) {
  const env = {...process.env}; delete env.ELECTRON_RUN_AS_NODE;
  const results = [];
  for (let sample=0; sample<3; sample++) {
    const start = performance.now();
    const child = require('node:child_process').spawnSync(require('electron'), [__filename, String(sample)], {env,encoding:'utf8',timeout:65000});
    if(child.status !== 0) { console.error(child.stdout,child.stderr,child.error || child.signal || ''); process.exit(1); }
    const line = child.stdout.split('\n').find(x=>x.startsWith('PERF_RESULT '));
    assert(line, 'Child must report completed checks');
    const result = JSON.parse(line.slice(12)); result.processRunMs = performance.now()-start; results.push(result);
  }
  const report = {passed:true,kind:'Isolated offline native Electron lab; rendererReadyMs is runtime start to loaded visible window, not OS cold launch',results};
  if(process.env.FOCUS_QA_REPORT) fs.writeFileSync(process.env.FOCUS_QA_REPORT,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2)); process.exit(0);
}
const {app,BrowserWindow,Tray,session} = require('electron');
const Module = require('node:module');
const root = process.env.FOCUS_QA_APP_ROOT || path.resolve(__dirname,'..');
const profile=fs.mkdtempSync('/tmp/focus-performance-');
app.setPath('userData',profile); app.setPath('sessionData',path.join(profile,'session'));
let menuUpdates=0;
const setMenu=Tray.prototype.setContextMenu;
Tray.prototype.setContextMenu=function(menu){menuUpdates++;return setMenu.call(this,menu);};
// Register before production ready callback so no external request can escape QA.
app.whenReady().then(()=>session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true})));
const file=path.join(root,'main.js');
const production=new Module(file,module); production.filename=file; production.paths=Module._nodeModulePaths(root);
production._compile(fs.readFileSync(file,'utf8')+'\nmodule.exports.qa={get win(){return mainWin;},get status(){return windowStatus;},get compact(){return compact;},get tray(){return tray;},setCompact,showFullWindow};',file);
const q=production.exports.qa;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label) {const end=Date.now()+10000;while(!(await fn())){if(Date.now()>end)throw new Error('Timeout: '+label);await sleep(20);}}
const watchdog=setTimeout(()=>app.exit(2),55000);
app.whenReady().then(async()=>{
  try {
    await until(()=>q.win&&!q.win.webContents.isLoading()&&q.win.isVisible(),'loaded visible production window');
    const win=q.win,wc=win.webContents,run=code=>wc.executeJavaScript(code);
    const rendererReadyMs=performance.now();
    await run("if(welcomeDialog.open)document.getElementById('firstRunDismiss').click();state.settings.sound=false;window.qaErrors=[];window.addEventListener('error',e=>qaErrors.push(e.message));window.addEventListener('unhandledrejection',e=>qaErrors.push(String(e.reason)));");
    if(process.argv[2]!=='0') {console.log('PERF_RESULT '+JSON.stringify({rendererReadyMs,profile,checks:'Fresh isolated launch'}));clearTimeout(watchdog);app.exit(0);return;}
    const history=await run(`(() => {
      const now=Date.now(),length=500;
      state.sessions=Array.from({length},(_,i)=>{
        const startedAt=now-(length-i)*86400000;
        return {id:'perf-'+i,startedAt,endedAt:startedAt+8*3600000,mode:'full',totalCycles:12,focusMinutes:30,breakMinutes:10,cycles:Array.from({length:12},(_,j)=>({startedAt:startedAt+j*40*60000,endedAt:startedAt+(j*40+30)*60000,minutes:30,completed:true,plan:{accomplish:'Synthetic QA target '+i+' / '+j,start:'Write an outline',energy:7,morale:8},review:{completed_target:j%3===0?'partial':'yes',noteworthy:'Synthetic QA note',distractions:'Synthetic QA distraction'}}))};
      });
      const samples=[];showScreen('historyScreen');
      for(let i=0;i<5;i++){const start=performance.now();renderHistory();void document.getElementById('sessionList').offsetHeight;samples.push(performance.now()-start);}
      const start=performance.now();const saved=saveState();const saveMs=performance.now()-start;
      const rows=document.querySelectorAll('.session-row').length;
      return {sessions:state.sessions.length,cycles:state.sessions.reduce((n,s)=>n+s.cycles.length,0),samplesMs:samples,saveMs,saved,rows,serializedBytes:new Blob([JSON.stringify(state)]).size};
    })()`);
    assert(history.saved);assert.equal(history.rows,50);assert(Math.max(...history.samplesMs)<1500,'History must not block for 1.5 seconds in this lab');
    await run("showScreen('setupScreen'); currentSession={id:'perf-active',startedAt:Date.now(),focusMinutes:30,breakMinutes:5,totalCycles:1,mode:'sprint',cycles:[]};startCycleTimer(0)");
    await until(()=>q.status.phase==='focus','timer IPC');
    const rapid=await run(`(() => {
      const start=performance.now();for(let i=0;i<20;i++){document.getElementById('pauseBtn').click();if(!timerState.paused)throw new Error('Pause failed');document.getElementById('pauseBtn').click();if(timerState.paused)throw new Error('Resume failed');}
      const elapsedMs=performance.now()-start;
      const tickSamples=[];for(let i=0;i<20;i++){const t=performance.now();tick();tickSamples.push(performance.now()-t);}
      return {pauseResumePairs:20,elapsedMs,tickSamplesMs:tickSamples,paused:timerState.paused,recovery:JSON.parse(localStorage.getItem(ACTIVE_KEY)).timer.paused};
    })()`);
    assert.equal(rapid.paused,false);assert.equal(rapid.recovery,false);
    await sleep(120);
    const wcId=wc.id,original=win.getBounds(),compactStart=performance.now();
    for(let i=0;i<10;i++){q.setCompact(true);await until(()=>q.compact&&run('isMiniActive()'),'compact');q.showFullWindow();await until(()=>!q.compact&&run('!isMiniActive()'),'expand');}
    const compactMs=performance.now()-compactStart;
    assert.equal(win.webContents.id,wcId);assert.deepEqual(win.getBounds(),original);
    await sleep(200);
    const beforeMenus=menuUpdates,beforeTitle=q.tray.getTitle();win.hide();await sleep(3200);
    const hidden={beforeTitle,afterTitle:q.tray.getTitle(),menuRebuilds:menuUpdates-beforeMenus};
    assert.notEqual(hidden.beforeTitle,hidden.afterTitle);assert.equal(hidden.menuRebuilds,0,'Timer ticks must not rebuild native menus');
    q.showFullWindow();
    await run('endSession(false)');
    assert.equal(await run("state.sessions.filter(s=>s.id==='perf-active').length"),1);
    const errors=await run('qaErrors');assert.deepEqual(errors,[]);
    const metrics=app.getAppMetrics().map(m=>({type:m.type,workingSetKB:m.memory.workingSetSize,privateKB:m.memory.privateBytes,cpuPercent:m.cpu.percentCPUUsage}));
    // The resulting profile contains synthetic history and must not become a user preview profile.
    console.log('PERF_RESULT '+JSON.stringify({rendererReadyMs,history,rapid,compact:{roundTrips:10,elapsedMs:compactMs},hidden,errors,metrics,profile}));
    clearTimeout(watchdog);app.exit(0);
  }catch(error){console.error(error.stack);clearTimeout(watchdog);app.exit(1);}
});
