#!/usr/bin/env node
// Exercise the actual packaged executable, never the user's app/profile.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const inputPath=process.argv[2];assert(inputPath&&fs.existsSync(inputPath),'Pass an existing Mac app bundle');
const appPath=path.resolve(inputPath);
const profile=fs.mkdtempSync('/tmp/focus-bundle-launch-');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(path.join(appPath,'Contents/MacOS/Focus Cycles'),['--user-data-dir='+profile,'--remote-debugging-port=0'],{env,stdio:['ignore','pipe','pipe']});
let stderr='',exit=null,ws;child.stderr.on('data',b=>stderr+=b);child.on('exit',(code,signal)=>exit={code,signal});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){const end=Date.now()+12000;while(!(await fn())){if(exit)throw new Error('Packaged executable exited: '+JSON.stringify(exit)+' '+stderr.slice(-1200));if(Date.now()>end)throw new Error('Timeout: '+label);await sleep(50);}}
const watchdog=setTimeout(()=>{child.kill('SIGTERM');process.exit(2);},40000);
(async()=>{
 try{
  await until(()=>/ws:\/\/127\.0\.0\.1:\d+\//.test(stderr),'isolated package inspector');
  const origin=stderr.match(/ws:\/\/(127\.0\.0\.1:\d+)\//)[1];let target;
  await until(async()=>{target=(await(await fetch('http://'+origin+'/json/list')).json()).find(t=>t.type==='page'&&t.url.includes('/app.asar/index.html'));return target;},'packaged app renderer');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  let id=0;const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}});
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
  const run=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;};
  await until(()=>run("typeof state!=='undefined'&&!!document.getElementById('startBtn')"),'initialized production app');
  assert(fs.existsSync(path.join(profile,'Local Storage')),'Chromium must be using the new isolated profile');
  const result=await run(`(() => {
    if(welcomeDialog.open)document.getElementById('firstRunDismiss').click();
    const before=state.sessions.length;
    document.querySelector('.cycle-btn[data-cycles="3"]').click();
    const selected=document.querySelector('.cycle-btn[data-cycles="3"]').getAttribute('aria-pressed');
    return {url:location.href,cycles:state.settings.cycles,selected,before,after:state.sessions.length,backdrop:getComputedStyle(document.querySelector('#setupScreen .card')).backdropFilter,labels:document.getElementById('focusDuration').labels.length};
  })()`);
  assert(result.url.startsWith('file://'+appPath+'/Contents/Resources/app.asar/')||decodeURI(result.url).startsWith('file://'+appPath+'/Contents/Resources/app.asar/'));
  assert.equal(result.cycles,3);assert.equal(result.selected,'true');assert.equal(result.before,0);assert.equal(result.after,0);assert.equal(result.backdrop,'none');assert.equal(result.labels,1);
  await sleep(500);const screenshot=path.join(profile,'packaged-launch.png');fs.writeFileSync(screenshot,Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
  console.log(JSON.stringify({passed:true,app:appPath,profile,result,screenshot},null,2));
 }catch(e){console.error(e.stack);process.exitCode=1;}
 finally{if(ws)ws.close();child.kill('SIGTERM');clearTimeout(watchdog);}
})();
