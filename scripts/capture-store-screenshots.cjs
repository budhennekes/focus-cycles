#!/usr/bin/env node
// Actual production main/preload; fictional samples in an isolated profile only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
if(!process.versions.electron){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const r=require('node:child_process').spawnSync(require('electron'),[__filename],{env,stdio:'inherit',timeout:85000});process.exit(r.status??1);}
const {app,BrowserWindow,Menu}=require('electron');
const profile=fs.mkdtempSync('/tmp/focus-store-');app.setPath('userData',profile);app.setPath('sessionData',path.join(profile,'session'));
const root=process.env.FOCUS_QA_APP_ROOT||path.resolve(__dirname,'..');
const out=process.env.FOCUS_SCREENSHOT_OUTPUT;assert(out,'Set FOCUS_SCREENSHOT_OUTPUT to a new destination');fs.mkdirSync(out,{recursive:true});
require(path.join(root,'main.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){const end=Date.now()+20000;while(!(await fn())){if(Date.now()>end)throw new Error('Timed out waiting for rendered app');await sleep(100);}}
const watch=setTimeout(()=>app.exit(2),80000);
app.whenReady().then(async()=>{try{
 await until(()=>BrowserWindow.getAllWindows().length>0);const win=BrowserWindow.getAllWindows()[0],wc=win.webContents;
 await until(()=>!wc.isLoadingMainFrame());const run=c=>wc.executeJavaScript(c);
 await until(()=>run("typeof state!=='undefined'&&!!document.getElementById('startBtn')"));
 assert.equal(await run('state.sessions.length'),0);win.setContentSize(1440,900);
 await run("if(welcomeDialog.open)document.getElementById('firstRunDismiss').click();state.settings.theme='light';applyTheme();setQuote(0)");
 await until(()=>run("[bg1,bg2].some(b=>b.classList.contains('active')&&b.style.backgroundImage.includes('images.unsplash.com'))"));await sleep(1200);
 const captures=[];
 async function capture(name,window=win){await sleep(400);const file=path.join(out,name+'.png');assert(!fs.existsSync(file),'Do not overwrite screenshots');const image=await window.webContents.capturePage();fs.writeFileSync(file,image.resize({width:1440,height:900,quality:'best'}).toPNG());captures.push(file);}
 await capture('01-work-cycles');
 await run("state.settings.theme='dark';applyTheme()");await capture('05-dark-mode');
 await run("state.settings.theme='light';applyTheme();currentSession={id:'store-sample',startedAt:Date.now(),focusMinutes:30,breakMinutes:5,totalCycles:3,mode:'cycles',cycles:[]};showCyclePlan(0);document.getElementById('plan_accomplish').value='Draft the opening paragraph. Let it be a draft.';document.getElementById('plan_start').value='Open the document and write the first sentence.';document.getElementById('plan_hazards').value='Checking messages before the draft is done.'");
 await capture('02-plan');await run("document.getElementById('planStartBtn').click()");assert.equal(await run('timerState.phase'),'focus');await capture('03-focus');
 await run("document.getElementById('skipBtn').click()");await until(()=>run("!!document.getElementById('revContinueBtn')"));await capture('04-review');
 const help=Menu.getApplicationMenu().items.find(i=>i.role==='help');assert(help);
 const helpChecks=[];
 for(const label of ['Privacy Policy','Focus Cycles Support']){
  const existing=new Set(BrowserWindow.getAllWindows());help.submenu.items.find(i=>i.label===label).click();await until(()=>BrowserWindow.getAllWindows().some(w=>!existing.has(w)));const child=BrowserWindow.getAllWindows().find(w=>!existing.has(w));await until(()=>!child.webContents.isLoadingMainFrame());
  const text=await child.webContents.executeJavaScript('document.body.innerText');assert(text.includes('bud@aboundlessworld.com'));assert(child.webContents.getURL().startsWith('file:'));assert.notEqual(child.webContents.session,wc.session);
  const f=path.join(profile,label.startsWith('Privacy')?'privacy.png':'support.png');fs.writeFileSync(f,(await child.webContents.capturePage()).toPNG());helpChecks.push({label,url:child.webContents.getURL(),screenshot:f});child.close();
 }
 fs.writeFileSync(path.join(out,'capture-report.json'),JSON.stringify({passed:true,root,profile,captures,helpChecks,sampleData:'Fictional text, real UI. No user data. Review reached by Skip, not fabricated elapsed time.'},null,2));
 console.log(JSON.stringify({passed:true,out,captures,helpChecks},null,2));clearTimeout(watch);app.exit(0);
}catch(e){console.error(e.stack);clearTimeout(watch);app.exit(1);}});
