"use strict";
// Mechanical trimming, resizing and preview layout only. Art comes from image_gen.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const sharp = require(process.env.GRIDSHARD_SHARP_MODULE || "sharp");
const root = path.resolve(__dirname, "..");
const record = JSON.parse(fs.readFileSync(path.join(root, "docs/GORSEL_DONUSUM_PAKET08B_PROMPTLAR_20261018.json"), "utf8"));
const out = path.join(root, "artifacts/visual-refresh-pack08b-20261018");
const escape = s => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const svg = (w,h,body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
const text = (x,y,value,size=18,color="#effaff") => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial" font-size="${size}" fill="${color}">${escape(value)}</text>`;
const tones = {destek:"#56e69f",savunma:"#5abaff",saldırı:"#ff6675",sistem:"#41e6ed",sabotaj:"#c58aff"};
async function main() {
  fs.mkdirSync(path.join(out,"masters"),{recursive:true});
  const layers = [], reports = [], cards = [];
  layers.push({input:svg(1500,90,text(750,35,"PAKET 8B · 10 YENİ FİZİKSEL MODÜL",28)+text(750,66,"Tasarım önizlemesi · Büyük çizim + 48 / 32 px · Henüz oyuna bağlı değil",18,"#9bbbc8")),left:0,top:0});
  for (let i=0;i<record.assets.length;i++) {
    const a=record.assets[i], file=path.join(out,a.id+".webp");
    fs.copyFileSync(a.source,path.join(out,"masters",a.id+".png"));
    const sourceStats=await sharp(a.source).stats();
    assert.equal(sourceStats.channels.length,4,a.id+": alpha channel");
    assert.equal(sourceStats.channels[3].min,0,a.id+": transparent background");
    assert.equal(sourceStats.channels[3].max,255,a.id+": solid body");
    await sharp(a.source).trim({background:"#00000000",threshold:8}).resize(352,352,{fit:"contain",background:"#00000000"}).extend({top:16,bottom:16,left:16,right:16,background:"#00000000"}).webp({quality:90,alphaQuality:100,effort:6}).toFile(file);
    const x=(i%5)*300,y=90+Math.floor(i/5)*400,tone=tones[a.category];
    layers.push({input:svg(284,384,`<rect x="1" y="1" width="282" height="382" rx="18" fill="#112c3a" stroke="${tone}" stroke-opacity=".65"/>`+text(28,31,String(i+1).padStart(2,"0"),20,tone)+text(144,281,a.proposedName,17)+text(144,305,a.category.toLocaleUpperCase("tr"),13,tone)),left:x+8,top:y});
    layers.push({input:await sharp(file).resize(232,232).png().toBuffer(),left:x+34,top:y+35});
    layers.push({input:await sharp(file).resize(48,48).png().toBuffer(),left:x+85,top:y+318});
    layers.push({input:await sharp(file).resize(32,32).png().toBuffer(),left:x+173,top:y+326});
    const bytes=fs.statSync(file).size;
    reports.push({id:a.id,width:384,height:384,bytes,alphaMin:0,alphaMax:255,source:a.source});
    cards.push(`<article style="--tone:${tone}"><span class="number">${i+1}</span><img class="hero" src="${a.id}.webp" alt="${escape(a.proposedName)}"><h2>${escape(a.proposedName)}</h2><p class="kind">${escape(a.category)}</p><div class="small"><img width="48" height="48" src="${a.id}.webp" alt="48 piksel"><img width="32" height="32" src="${a.id}.webp" alt="32 piksel"></div><p>${escape(a.mechanic)}</p>${a.proposedName!==a.currentName?`<p class="rename">Ad önerisi · ${escape(a.currentName)} → ${escape(a.proposedName)}</p>`:""}</article>`);
  }
  await sharp({create:{width:1500,height:900,channels:4,background:"#071b26"}}).composite(layers).webp({quality:92}).toFile(path.join(out,"pack08b-preview.webp"));
  fs.writeFileSync(path.join(out,"index.html"),`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GRIDSHARD · Paket 8B</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#071b26;color:#edfaff;font:16px Arial}header{max-width:1440px;margin:0 auto 24px}h1{font-size:27px}p{line-height:1.5;color:#abc8d7}.grid{max-width:1440px;margin:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}article{position:relative;background:#112c3a;border:1px solid var(--tone);border-radius:18px;padding:18px;text-align:center}.number{position:absolute;left:15px;top:12px;color:var(--tone);font-weight:bold}.hero{width:100%;height:230px;object-fit:contain}h2{font-size:19px}.kind{color:var(--tone)}.small{display:flex;align-items:center;justify-content:center;gap:28px}.rename{color:#ffdc7c;font-size:13px}a{color:#65e7da}</style><header><h1>PAKET 8B · 10 fiziksel modül</h1><p>Tasarım onayı için hazırlanmıştır; oyuna bağlı değildir. Ad ve mekanik kimlikleri kayıtlıdır. Küçük örnekler 48 ve 32 pikseldir.</p><p>16 yön hedefi: 22,5° aralık; kamera tepeden 30°. Açı pilotu ayrı değerlendirilir, bu tekli çizimler çalışma atlası değildir.</p></header><main class="grid">${cards.join("")}</main></html>`);
  const report={date:"2026-10-18",count:reports.length,totalWebpBytes:reports.reduce((n,a)=>n+a.bytes,0),files:reports,liveGameVerified:false,runtimeConnected:false};
  fs.writeFileSync(path.join(out,"asset-checks.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({preview:path.join(out,"pack08b-preview.webp"),count:report.count,webpBytes:report.totalWebpBytes}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
