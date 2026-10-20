"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {runtimeAssets,readBuildBlock}=require("./build-client.js");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||"sharp");
const root=path.resolve(__dirname,".."),client=path.join(root,"client");
const layers=require("../client/src/module-layer-data.js");
(async()=>{
  const html=fs.readFileSync(path.join(client,"index.html"),"utf8");
  const scripts=readBuildBlock(html,"scripts").inputs;
  const packaged=new Set(runtimeAssets(client,html,scripts,new Set()));
  const report=[];
  for(const[id,entry]of Object.entries(layers)){
    const frames=entry.heads?Object.entries(entry.heads):[["single",entry.art]];
    if(entry.heads&&frames.length!==16)throw new Error(id+": 16 kare eksik");
    const hashes=new Set();let bytes=0;
    for(const[key,part]of frames){
      const filename=path.join(client,part.src),buffer=fs.readFileSync(filename);
      if(!packaged.has(part.src))throw new Error("Paket dışında: "+part.src);
      if(entry.heads){
        if(!/^y(?:0[0-9]|1[0-5])$/.test(key))throw new Error("Geçersiz yön: "+key);
        const m=await sharp(buffer).metadata(),stats=await sharp(buffer).stats();
        if(m.width!==384||m.height!==384||!m.hasAlpha||stats.isOpaque)throw new Error("Boyut/alfa: "+part.src);
        if(![part.left,part.top,part.size,part.emitter.x,part.emitter.y].every(Number.isFinite))throw new Error("Ölçüm: "+id);
      }
      hashes.add(crypto.createHash("sha256").update(buffer).digest("hex"));bytes+=buffer.length;
    }
    report.push({id,frames:frames.length,distinctFiles:hashes.size,bytes,packaged:true});
  }
  const summary={modules:report.filter(r=>!r.id.startsWith("core_")).length,cores:report.filter(r=>r.id.startsWith("core_")).length,turning:report.filter(r=>r.frames===16).length,yawFrames:report.filter(r=>r.frames===16).reduce((n,r)=>n+r.frames,0),yawBytes:report.filter(r=>r.frames===16).reduce((n,r)=>n+r.bytes,0),models:report};
  if(summary.modules!==36||summary.cores!==7||summary.turning!==22)throw new Error("Kapsam eksik: "+JSON.stringify(summary));
  const out=path.join(root,"artifacts/moduller16-20261020/audit.json");fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(summary,null,2));
  console.log(JSON.stringify({...summary,models:undefined}));
})().catch(e=>{console.error(e);process.exitCode=1;});
