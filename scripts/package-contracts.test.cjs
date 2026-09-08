const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
for(const target of ['direct','mas'])test(`${target}: ASAR, safe replacement, build number and secret exclusions`,async()=>{
 let options,renamed=0;
 const exec=[];
 const context={__dirname:path.join(root,'scripts'),console:{log(){},error(){}},process:{platform:'darwin',argv:['node','script','--unsigned'],env:{FOCUS_BUILD_NUMBER:'1.4.1'},exit(code){throw new Error('Unexpected exit '+code);}},require(name){
  if(name==='path')return path;
  if(name==='fs')return {...fs,existsSync:()=>true,renameSync(){renamed++;}};
  if(name==='child_process')return{execFileSync(...a){exec.push(a);}};
  if(name==='@electron/packager')return{async packager(opts){options=opts;return[path.join(opts.out,'Focus Cycles-'+opts.platform+'-arm64')];}};
  if(name==='@electron/osx-sign')return{async sign(){throw new Error('Unsigned check attempted signing');},async flat(){throw new Error('Unsigned check attempted installer signing');}};
  if(name==='./package-release-utils.js')return require('./package-release-utils.js');
  if(name==='../package.json')return require('../package.json');
  throw new Error('Unexpected require: '+name);
 }};
 await vm.runInNewContext(fs.readFileSync(path.join(__dirname,'package-'+target+'.js'),'utf8'),context);
 assert.equal(options.asar,true,'Verifier requires app.asar');
 assert.equal(options.overwrite,false,'Never discard a previous artifact');
 assert.equal(options.buildVersion,'1.4.1','Explicit upload build number');
 for(const file of ['/.env','/signing/distribution.p12','/profile.provisionprofile','/dist-mas.previous-123','/dist.previous-456'])assert(options.ignore.some(re=>re.test(file)),file+' must be excluded');
 assert(renamed>0,'Existing output must be preserved before packaging');
 assert(exec.some(a=>String(a[1]).includes('stamp-icon.js')));
});
