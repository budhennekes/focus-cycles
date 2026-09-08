#!/usr/bin/env node
// Actual native renderer, isolated profile, deterministic local DST boundaries.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
if(!process.versions.electron){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const r=require('node:child_process').spawnSync(require('electron'),[__filename],{env,stdio:'inherit'});process.exit(r.status??1);}
const {app,BrowserWindow,session}=require('electron');
const profile=fs.mkdtempSync('/tmp/focus-history-timezone-');
app.setPath('userData',profile);app.setPath('sessionData',path.join(profile,'session'));
const timeout=setTimeout(()=>app.exit(2),30000);
app.whenReady().then(async()=>{
  try{
    session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
    const win=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}}),wc=win.webContents;
    await win.loadFile(path.join(process.env.FOCUS_QA_APP_ROOT||path.resolve(__dirname,'..'),'index.html'));
    wc.debugger.attach('1.3');
    await wc.debugger.sendCommand('Emulation.setTimezoneOverride',{timezoneId:'America/Chicago'});
    const results=[];
    for(const [year,month,day] of [[2026,2,8],[2026,10,1],[2026,8,6]]){
      const result=await wc.executeJavaScript(`(() => {
        const RealDate=Date;const anchor=new RealDate(${year},${month},${day},12).getTime();
        window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[anchor]));}static now(){return anchor;}};
        try{
          const cycle=(dayOffset,hour,minute,label)=>{const startedAt=new Date(${year},${month},${day}+dayOffset,hour,minute).getTime();return{startedAt,endedAt:startedAt+15*60000,minutes:15,completed:true,plan:{accomplish:label}};};
          state.sessions=[{id:'dst-fixture',cycles:[cycle(0,9,0,'morning'),cycle(0,23,30,'late-today'),cycle(1,0,30,'next-day')]}];
          renderDayTimeline();
          const blocks=Array.from(document.querySelectorAll('.timeline-row.today .timeline-block')).map(e=>({title:e.title,left:parseFloat(e.style.left)}));
          return {date:new Date().toLocaleDateString('en-CA'),blocks};
        }finally{window.Date=RealDate;}
      })()`);
      console.log('Timeline diagnosis:',JSON.stringify(result));
      assert.equal(result.blocks.length,2,`${result.date}: exactly today's two cycles, including 23:30 and excluding next day`);
      const morning=result.blocks.find(b=>b.title.includes('morning'));assert(morning);
      assert(Math.abs(morning.left-((9-6)/18*100))<0.001,`${result.date}: 9am must occupy the 9am position, not elapsed hours since midnight`);
      results.push(result);
    }
    wc.debugger.detach();console.log(JSON.stringify({passed:true,timezone:'America/Chicago',results,profile},null,2));clearTimeout(timeout);app.exit(0);
  }catch(error){console.error(error.stack);clearTimeout(timeout);app.exit(1);}
});
