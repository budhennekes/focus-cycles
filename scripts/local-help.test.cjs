const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('Privacy and support open packaged documents with isolated permissions',()=>{
 const windows=[]; class Win {constructor(options){this.options=options;this.webContents={session:{setPermissionRequestHandler(fn){this.permission=fn;}},setWindowOpenHandler(fn){this.open=fn;},on:(event,fn)=>{this[event]=fn;}};windows.push(this);}loadFile(file){this.file=file;}once(){}show(){}}
 const electron={app:{setName(){},on(){},requestSingleInstanceLock(){return true;},whenReady(){return{then(){}};}},BrowserWindow:Win,ipcMain:{on(){},handle(){}},shell:{openExternal(){throw new Error('QA must not open browser');}}};
 const c={require:n=>n==='electron'?electron:require(n),__dirname:root,URL,process,exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'main.js'),'utf8')+'\nexports.open=typeof openLocalHelp===\'function\'?openLocalHelp:null;',c);
 assert.equal(typeof c.exports.open,'function','Local Help is required when public URLs are unavailable');
 for(const page of ['privacy','support']){c.exports.open(page);const w=windows.at(-1);assert.equal(w.file,path.join(root,page+'.html'));assert.equal(w.options.webPreferences.sandbox,true);assert.equal(w.options.webPreferences.nodeIntegration,false);let granted;w.webContents.session.permission(null,'notifications',v=>granted=v);assert.equal(granted,false);assert(fs.existsSync(w.file));}
 assert.throws(()=>c.exports.open('../anything'));
});
