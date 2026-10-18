"use strict";
// Stage compact artwork only. Does not enable new combat renderers or change mechanics.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const records=['08B','08C'].map(pack=>JSON.parse(fs.readFileSync(path.join(root,`docs/GORSEL_DONUSUM_PAKET${pack}_PROMPTLAR_20261018.json`),'utf8')));
const files=[];
for(let p=0;p<records.length;p++)for(const a of records[p].assets){
 const core=a.category==='çekirdek',folder=core?'cores-physical-v1':'modules-physical-v2';
 const source=path.join(root,`artifacts/visual-refresh-pack08${p?'c':'b'}-20261018`,a.id+'.webp');
 const destination=path.join(root,'client/assets/ui',folder,a.id+'.webp');
 assert.ok(fs.existsSync(source),a.id+' missing artwork');
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 if(fs.existsSync(destination))assert.ok(fs.readFileSync(source).equals(fs.readFileSync(destination)),a.id+' differs: use a new version instead of overwriting');
 else fs.copyFileSync(source,destination);
 files.push({id:a.id,kind:core?'core':'module',path:path.relative(root,destination).replaceAll('\\','/'),bytes:fs.statSync(destination).size});
}
assert.equal(files.filter(f=>f.kind==='module').length,26);assert.equal(files.filter(f=>f.kind==='core').length,7);
const report={count:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),runtimeConnected:false,threeDModels:false,files};
fs.writeFileSync(path.join(root,'qa_reports/pack08bc-art-staging-20261018.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({count:report.count,bytes:report.bytes,runtimeConnected:false}));
