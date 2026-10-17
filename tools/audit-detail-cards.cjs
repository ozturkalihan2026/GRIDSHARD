"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),esbuild=require("esbuild");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE || "sharp");
const {readBuildBlock}=require("./build-client.js");
const root=path.resolve(__dirname,".."),client=path.join(root,"client");
async function main(){
  const html=fs.readFileSync(path.join(client,"index.html"),"utf8");
  const styles=readBuildBlock(html,"styles").inputs;
  const scripts=readBuildBlock(html,"scripts").inputs;
  assert.ok(scripts.indexOf("./src/detail-card-layout.js")<scripts.indexOf("./src/app.js"));
  assert.ok(styles.includes("./src/detail-cards-v10.css"));
  const result=esbuild.buildSync({stdin:{contents:styles.map(p=>fs.readFileSync(path.join(client,p),"utf8")).join("\n"),resolveDir:path.join(client,"src"),loader:"css"},
    bundle:true,write:false,metafile:true,outdir:path.join(root,"artifacts/in-memory-detail-audit"),logLevel:"silent",target:["chrome109","safari15"],
    loader:{".webp":"file",".png":"file",".jpg":"file",".jpeg":"file",".svg":"file",".woff2":"file",".woff":"file",".ttf":"file"}});
  assert.equal(result.warnings.length,0);
  const packed=Object.keys(result.metafile.inputs).filter(p=>p.replaceAll('\\','/').includes("/detail-icons-v1/"));
  assert.equal(packed.length,10,"All generated icons must ship through actual CSS asset resolution");
  const records=[];
  for(const input of packed){
    const file=path.resolve(input),meta=await sharp(file).metadata(),stats=await sharp(file).stats();
    assert.equal(meta.width,192);assert.equal(meta.height,192);assert.ok(meta.hasAlpha);
    assert.equal(stats.channels[3].min,0);assert.equal(stats.channels[3].max,255);
    records.push({file:path.relative(root,file),bytes:fs.statSync(file).size});
  }
  const report={passed:true,icons:records.length,bytes:records.reduce((n,r)=>n+r.bytes,0),resolvedInCssBundle:true,alphaVerified:true,
    scripts:scripts.length,styles:styles.length,browserStarted:false,serverStarted:false,distWritten:false,realViewportLayoutVerified:false,files:records};
  fs.writeFileSync(path.join(root,"qa_reports/detail-cards-v10-audit-20261016.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
