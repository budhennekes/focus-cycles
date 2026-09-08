#!/usr/bin/env node
// Native WebAudio and blob-URL lifecycle; muted, offline, isolated test profile.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
if(!process.versions.electron){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const r=require('node:child_process').spawnSync(require('electron'),[__filename],{env,stdio:'inherit'});process.exit(r.status??1);}
const {app,BrowserWindow,session}=require('electron');
const profile=fs.mkdtempSync('/tmp/focus-media-lifecycle-');
app.setPath('userData',profile);app.setPath('sessionData',path.join(profile,'session'));
const timeout=setTimeout(()=>app.exit(2),30000);
app.whenReady().then(async()=>{
  try{
    session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
    const win=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}}),wc=win.webContents;
    wc.setAudioMuted(true);
    await win.loadFile(path.join(process.env.FOCUS_QA_APP_ROOT||path.resolve(__dirname,'..'),'index.html'));
    await new Promise(r=>setTimeout(r,300));
    const audio=await wc.executeJavaScript(`(() => {
      const ctx=ensureAudioCtx(),original=ctx.createOscillator.bind(ctx);let oscillators=0;
      ctx.createOscillator=(...args)=>{oscillators++;return original(...args);};
      const realSet=window.setInterval,realClear=window.clearInterval;const intervals=new Set();
      window.setInterval=(...args)=>{const id=realSet(...args);intervals.add(id);return id;};
      window.clearInterval=id=>{intervals.delete(id);return realClear(id);};
      try{
        startMusic('lofi');const immediateOscillators=oscillators;const graph=!!musicNodes;
        for(let i=0;i<3;i++)for(const mode of MUSIC_MODES)startMusic(mode);
        stopMusic();
        return {immediateOscillators,graph,activeIntervalsAfterStop:intervals.size,graphAfterStop:musicNodes};
      }finally{stopMusic();ctx.createOscillator=original;window.setInterval=realSet;window.clearInterval=realClear;}
    })()`);
    console.log('Audio diagnosis:',JSON.stringify(audio));
    assert.equal(audio.immediateOscillators,4,'Lofi must schedule its first chord immediately, not ten seconds later');
    assert(audio.graph);assert.equal(audio.activeIntervalsAfterStop,0);assert.equal(audio.graphAfterStop,null);
    const backgrounds=await wc.executeJavaScript(`(async() => {
      const originalAll=bgDbAll,originalDiscover=discoverLocalBackgrounds,originalRevoke=URL.revokeObjectURL.bind(URL);const revoked=[];
      const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;const blob=await new Promise(r=>canvas.toBlob(r));
      URL.revokeObjectURL=url=>{revoked.push(url);originalRevoke(url);};
      state.settings.bgFill='#112233';discoverLocalBackgrounds=async()=>[];
      try{
        bgDbAll=async()=>[{id:'synthetic-photo',added:1,blob}];await initBackgrounds();const first=BACKGROUNDS[0];
        await initBackgrounds();const second=BACKGROUNDS[0];
        bgDbAll=async()=>[];await initBackgrounds();
        return{reimportReleased:revoked.includes(first),builtinReleased:revoked.includes(second),builtinRestored:BACKGROUNDS===UNSPLASH_FALLBACKS,builtinCount:BACKGROUNDS.length};
      }finally{bgDbAll=originalAll;discoverLocalBackgrounds=originalDiscover;URL.revokeObjectURL=originalRevoke;}
    })()`);
    console.log('Background diagnosis:',JSON.stringify(backgrounds));
    assert(backgrounds.reimportReleased);assert(backgrounds.builtinReleased,'Switching from custom to built-in must release the custom blob URL');assert(backgrounds.builtinRestored);assert.equal(backgrounds.builtinCount,15);
    await new Promise(r=>setTimeout(r,500));
    console.log(JSON.stringify({passed:true,audio,backgrounds,muted:true,profile},null,2));clearTimeout(timeout);app.exit(0);
  }catch(error){console.error(error.stack);clearTimeout(timeout);app.exit(1);}
});
