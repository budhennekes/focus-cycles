#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.FOCUS_QA_APP_ROOT||path.resolve(__dirname,'..');
if(!process.versions.electron){
 const readAsset=file=>root.endsWith('.asar')?require('@electron/asar').extractFile(root,file).toString('utf8'):fs.readFileSync(path.join(root,file),'utf8');
 for(const file of ['index.html','main.js'])assert(!/ipwho\.is|ipapi\.co|api\.open-meteo\.com|renderWeatherSlot|enableWeather|fetchWeather|weatherSlot/.test(readAsset(file)),file+': weather UI, requests and CSP permissions must be absent');
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const r=require('node:child_process').spawnSync(require('electron'),[__filename],{env,stdio:'inherit',timeout:25000});process.exit(r.status??1);
}
const {app,BrowserWindow,session}=require('electron');const profile=fs.mkdtempSync('/tmp/focus-no-weather-');app.setPath('userData',profile);app.setPath('sessionData',path.join(profile,'session'));
const watchdog=setTimeout(()=>app.exit(2),20000);
app.whenReady().then(async()=>{try{
 const requests=[];session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(d,cb)=>{requests.push(d.url);cb({cancel:true});});
 const win=new BrowserWindow({width:1000,height:800,show:false,webPreferences:{preload:path.join(root,'preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false}});const run=c=>win.webContents.executeJavaScript(c);
 await win.loadFile(path.join(root,'index.html'));
 assert.equal(await run('state.sessions.length'),0);
 await run("state.settings.weather={enabled:true,lat:39.7456,lon:-97.0892};state.settings.dailyGoalMinutes=240;localStorage.setItem(LS_KEY,JSON.stringify(state))");
 await win.loadFile(path.join(root,'index.html'));await new Promise(r=>setTimeout(r,500));
 const result=await run(`({hidden:!document.querySelector('#weatherSlot,#enableWeather,#weatherChip'),noFunctions:typeof fetchWeather==='undefined'&&typeof enableWeather==='undefined',goal:state.settings.dailyGoalMinutes,sessions:state.sessions.length,clock:document.getElementById('clockTime').textContent,scenes:UNSPLASH_FALLBACKS.length})`);
 assert(result.hidden&&result.noFunctions);assert.equal(result.goal,240);assert.equal(result.sessions,0);assert(result.clock);assert.equal(result.scenes,15);
 assert(!requests.some(u=>/ipwho|ipapi|open-meteo/.test(u)));
 console.log(JSON.stringify({passed:true,result,weatherRequests:0,profile,root}));clearTimeout(watchdog);app.exit(0);
}catch(e){console.error(e.stack);clearTimeout(watchdog);app.exit(1);}});
