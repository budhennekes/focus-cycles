#!/usr/bin/env node
// Native rendered polish regression: exact controls, geometry and paint costs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
if(!process.versions.electron){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const r=require('node:child_process').spawnSync(require('electron'),[__filename],{env,stdio:'inherit',timeout:75000});process.exit(r.status??1);}
const {app,BrowserWindow,session}=require('electron');
const profile=fs.mkdtempSync('/tmp/focus-polish-');
app.setPath('userData',profile);app.setPath('sessionData',path.join(profile,'session'));
const timeout=setTimeout(()=>app.exit(2),70000);
app.whenReady().then(async()=>{
  try{
    if(!process.env.FOCUS_QA_ONLINE)session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
    const root=process.env.FOCUS_QA_APP_ROOT||path.resolve(__dirname,'..');
    const win=new BrowserWindow({width:1000,height:800,show:false,webPreferences:{preload:path.join(root,'preload.js'),contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}}),wc=win.webContents;
    const run=code=>wc.executeJavaScript(code),settle=()=>new Promise(r=>setTimeout(r,250));
    await win.loadFile(path.join(root,'index.html'));await settle();
    await run("if(welcomeDialog.open)document.getElementById('firstRunDismiss').click();setQuote(0)");
    if(process.env.FOCUS_QA_ONLINE){const end=Date.now()+15000;while(!(await run("[bg1,bg2].some(b=>b.classList.contains('active')&&b.style.backgroundImage.includes('images.unsplash.com'))"))&&Date.now()<end)await settle();assert(await run("[bg1,bg2].some(b=>b.classList.contains('active')&&b.style.backgroundImage.includes('images.unsplash.com'))"),'Real scenic image must load');await new Promise(r=>setTimeout(r,1000));}
    const checks=[],failures=[],screenshots=[];
    for(const theme of ['light','dark']){
      await run(`state.settings.theme=${JSON.stringify(theme)};applyTheme()`);
      for(const [width,height] of [[1000,800],[1100,900],[800,650],[480,560]]){
        win.setSize(width,height);await settle();
        await run("document.querySelector('main').scrollTop=0");
        const geometry=await run(`(() => {
          const box=id=>document.getElementById(id).getBoundingClientRect();
          const intent=box('intentForm'),top=Array.from(document.querySelector('.top-bar').children).map(e=>e.getBoundingClientRect());
          const overlap=top.some(r=>r.width>0&&r.left<intent.right&&r.right>intent.left&&r.top<intent.bottom&&r.bottom>intent.top);
          const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
          const blur=Array.from(document.querySelectorAll('body *')).filter(e=>visible(e)&&getComputedStyle(e).backdropFilter!=='none').map(e=>e.id||e.className);
          const grain=Array.from(document.querySelectorAll('.chip,.card,.prompt-wrap,.active-screen,.history-header')).filter(e=>visible(e)&&!['none','normal'].includes(getComputedStyle(e,'::after').content)&&getComputedStyle(e,'::after').backgroundImage!=='none').length;
          const quote=box('quoteChip'),footer=document.querySelector('.bottom-bar').getBoundingClientRect();
          const card=document.querySelector('#setupScreen .card').getBoundingClientRect();
          const fullCardClear=innerWidth<900||innerHeight<740||card.bottom<=footer.top-8;
          const rgb=s=>(s.match(/[\\d.]+/g)||[]).map(Number);
          const over=(fg,bg)=>{const a=fg.length>3?fg[3]:1;return fg.slice(0,3).map((v,i)=>v*a+bg[i]*(1-a));};
          const lum=c=>c.map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;}).reduce((v,n,i)=>v+n*[0.2126,0.7152,0.0722][i],0);
          const contrasts=[...document.querySelectorAll('.quote-body .author,.cycle-btn .ends,.cycle-btn .label,.section-label,.duration-field label,.projection,.btn-primary,.preset-chip')].filter(visible).map(e=>{
            const chain=[];for(let n=e;n&&n!==document.body;n=n.parentElement)chain.unshift(n);
            let backgrounds=[[0,0,0],[255,255,255]];
            for(const n of chain){const s=getComputedStyle(n);backgrounds=backgrounds.map(b=>over(rgb(s.backgroundColor),b));const stops=s.backgroundImage.match(/rgba?\\([^)]+\\)/g);if(stops)backgrounds=backgrounds.flatMap(b=>stops.map(stop=>over(rgb(stop),b)));}
            const fg=rgb(getComputedStyle(e).color),ratio=Math.min(...backgrounds.map(b=>{const a=lum(over(fg,b)),c=lum(b);return(Math.max(a,c)+0.05)/(Math.min(a,c)+0.05);}));return {selector:e.id||e.className,ratio};
          });
          const contrastPass=contrasts.every(c=>c.ratio>=4.5);
          const labels=['focusDuration','breakDuration','customInput','intentInput'].every(id=>{const e=document.getElementById(id);return !!e.getAttribute('aria-label')||e.labels?.length>0;});
          const nav=getComputedStyle(document.getElementById('quoteNext')).opacity;
          const main=document.querySelector('main');main.scrollTop=main.scrollHeight;const start=box('startBtn');
          return {overlap,blur,grain,labels,fullCardClear,contrastPass,contrasts,quoteVisible:quote.height>0&&quote.top>=0&&quote.bottom<=innerHeight,quoteNavigationVisible:Number(nav)>=0.6,startReachable:start.height>0&&start.bottom<=footer.top,footerFits:footer.left>=0&&footer.right<=innerWidth,cycles:document.querySelectorAll('#cycleGrid .cycle-btn').length};
        })()`);
        checks.push({theme,width,height,...geometry});
        for(const [key,value] of Object.entries({noHeaderOverlap:!geometry.overlap,noBackdropBlur:geometry.blur.length===0,noGrain:geometry.grain===0,labels:geometry.labels,fullCardClear:geometry.fullCardClear,contrastPass:geometry.contrastPass,quoteVisible:geometry.quoteVisible,quoteNavigationVisible:geometry.quoteNavigationVisible,startReachable:geometry.startReachable,footerFits:geometry.footerFits,fourChoices:geometry.cycles===4}))if(!value)failures.push(`${theme} ${width}x${height}: ${key}`);
        await run("document.querySelector('main').scrollTop=0");await settle();
        if(width===1000||width===480){const file=path.join(profile,`setup-${theme}-${width}.png`);fs.writeFileSync(file,(await wc.capturePage()).toPNG());screenshots.push(file);}
      }
    }
    win.setSize(1000,800);await settle();
    const before=await run('state.sessions.length');
    const selected=await run(`(() => {
      document.querySelector('[data-preset="deep"]').click();
      const preset=document.querySelector('[data-preset="deep"]').getAttribute('aria-pressed');
      document.querySelector('.cycle-btn[data-cycles="3"]').click();
      return {presetCleared:document.querySelector('[data-preset="deep"]').getAttribute('aria-pressed')==='false',cycles:state.settings.cycles,selected:document.querySelector('.cycle-btn[data-cycles="3"]').getAttribute('aria-pressed'),others:[...document.querySelectorAll('.cycle-btn:not(.selected)')].every(e=>e.getAttribute('aria-pressed')==='false'),preset};
    })()`);
    if(selected.selected!=='true'||!selected.others||selected.preset!=='true'||!selected.presetCleared)failures.push('Selected state must be announced to assistive technology');
    const timings=[];
    for(const cycles of [1,3,5,7,1,3,5,7]){
      const point=await run(`(() => {const r=document.querySelector('.cycle-btn[data-cycles="${cycles}"]').getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()`);
      const start=performance.now();wc.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...point});wc.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...point});
      const deadline=performance.now()+1000;
      while((await run('state.settings.cycles'))!==cycles&&performance.now()<deadline)await new Promise(r=>setTimeout(r,16));
      assert.equal(await run('state.settings.cycles'),cycles);timings.push(performance.now()-start);
    }
    assert.equal(await run('state.sessions.length'),before,'UI-only choices must preserve history');
    await run("currentSession={id:'polish-qa',startedAt:Date.now(),focusMinutes:30,breakMinutes:5,totalCycles:1,mode:'sprint',cycles:[]};ensureCycleRecord(0);currentSession.cycles[0].plan={accomplish:'Draft the opening paragraph. Let it be a draft.',start:'Write the first sentence.'};startCycleTimer(0)");await settle();
    const active=path.join(profile,'active.png');fs.writeFileSync(active,(await wc.capturePage()).toPNG());screenshots.push(active);
    wc.debugger.attach('1.3');await wc.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await run("getComputedStyle(document.querySelector('#activeScreen .active-screen')).animationName"),'none');
    wc.debugger.detach();
    const report={passed:failures.length===0,failures,checks,selected,inputRoundtripMs:timings,screenshots,profile,root};
    if(process.env.FOCUS_QA_REPORT)fs.writeFileSync(process.env.FOCUS_QA_REPORT,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));clearTimeout(timeout);app.exit(failures.length?1:0);
  }catch(error){console.error(error.stack);clearTimeout(timeout);app.exit(1);}
});
