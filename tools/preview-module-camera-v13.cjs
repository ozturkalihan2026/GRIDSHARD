"use strict";
// Offline geometry/asset proof. NOT a browser render or gameplay screenshot.
const fs=require("node:fs"),path=require("node:path");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||"sharp"),root=path.resolve(__dirname,"..");
const out=path.join(root,"artifacts/modules-camera-v13-20261017");
const tilt=Math.PI/6,distance=1400,scale=.98,axis={x:400,y:358};
function project(x,y){const dy=(y-axis.y)*scale,den=1-dy*Math.sin(tilt)/distance;return{x:axis.x+(x-axis.x)*scale/den,y:axis.y+dy*Math.cos(tilt)/den,zoom:scale/den};}
function polygon(points,attrs){return `<polygon points="${points.map(p=>{const q=project(...p);return `${q.x.toFixed(2)},${q.y.toFixed(2)}`;}).join(" ")}" ${attrs}/>`;}
async function main(){
  const fragments=['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="760"><defs><linearGradient id="cell" x2="0" y2="1"><stop stop-color="#1a303a"/><stop offset="1" stop-color="#0b1921"/></linearGradient></defs><rect width="800" height="760" fill="#0a1d29"/><text x="400" y="32" fill="#77e8d4" font-family="Arial" font-size="20" text-anchor="middle">DEVRE + MODÜLLER · ORTAK 30° KAMERA</text><text x="400" y="57" fill="#9ab6c5" font-family="Arial" font-size="13" text-anchor="middle">Geometri / varlık önizlemesi — gerçek oyun ekran görüntüsü değildir</text>'];
  const devices=[
    {board:0,x:1,y:0,id:"laser",frame:2},{board:0,x:3,y:0,id:"shield",frame:2},
    {board:0,x:0,y:1,id:"battery",frame:2},{board:0,x:2,y:1,id:"amplifier",frame:1},{board:0,x:4,y:2,id:"emp",frame:3},
    {board:1,x:0,y:0,id:"repair",frame:7},{board:1,x:2,y:1,id:"armor",frame:2},
    {board:1,x:1,y:1,id:"cooler",frame:1},{board:1,x:4,y:0,id:"pulse_cannon",frame:6},{board:1,x:3,y:2,id:"missile_launcher",frame:5},
  ];
  for(let board=0;board<2;board++){
    const top=board?384:100;
    fragments.push(polygon([[194,top-6],[598,top-6],[598,top+238],[194,top+238]],`fill="#0b2026" stroke="${board?'#356759':'#735341'}" stroke-width="2"`));
    for(let y=0;y<3;y++)for(let x=0;x<5;x++){
      const left=200+x*80,t=top+y*80;
      fragments.push(polygon([[left,t],[left+72,t],[left+72,t+72],[left,t+72]],'fill="url(#cell)" stroke="#486270" stroke-width="1.5"'));
      for(const [a,b]of [[[5,5],[67,5]],[[5,67],[67,67]]])for(const p of[a,b]){const q=project(left+p[0],t+p[1]);fragments.push(`<circle cx="${q.x}" cy="${q.y}" r="1.4" fill="#bb985c"/>`);}
      const start=project(left+72,t+36),end=project(left+80,t+36);
      if(x<4)fragments.push(`<path d="M${start.x} ${start.y}L${end.x} ${end.y}" stroke="#b89758" stroke-width="4"/>`);
      const v1=project(left+36,t+72),v2=project(left+36,t+80);
      if(y<2)fragments.push(`<path d="M${v1.x} ${v1.y}L${v2.x} ${v2.y}" stroke="#64efd1" stroke-width="4"/>`);
    }
  }
  for(const d of devices){
    const left=200+d.x*80,top=(d.board?384:100)+d.y*80;
    fragments.push(polygon([[left+2,top+67],[left+70,top+67],[left+70,top+71],[left+2,top+71]],'fill="#60e58a"'));
    fragments.push(polygon([[left+2,top+1],[left+28,top+1],[left+28,top+4],[left+2,top+4]],'fill="#f9bd55"'));
    const frame=await sharp(path.join(root,"client/assets/ui/modules-views-v3",d.id+".webp")).extract({left:(d.frame%4)*128,top:Math.floor(d.frame/4)*128,width:128,height:128}).png().toBuffer();
    const stage=66,anchor=project(left+3+stage*.5,top+3+stage*.82),w=stage*anchor.zoom;
    fragments.push(`<image x="${anchor.x-w*.5}" y="${anchor.y-w*.82}" width="${w}" height="${w}" xlink:href="data:image/png;base64,${frame.toString('base64')}"/>`);
  }
  fragments.push('<circle cx="400" cy="358" r="15" fill="#081723" stroke="#d5ac51"/><text x="400" y="363" text-anchor="middle" fill="#ffd46a" font-family="Arial" font-weight="bold" font-size="12">VS</text><text x="400" y="688" fill="#d9eff4" font-family="Arial" font-size="15" text-anchor="middle">Zemin eğilir · gövdeler dik kalır · kablo ve barlar hücreye bağlıdır</text><text x="400" y="717" fill="#9ab6c5" font-family="Arial" font-size="12" text-anchor="middle">8 yönlü çizim, 360° hedef hesabı. Gerçek hacimli 3D model değildir.</text></svg>');
  fs.mkdirSync(out,{recursive:true});
  const svg=fragments.join("")
    .replace('width="800" height="760"','width="520" height="740" viewBox="140 0 520 740"')
    .replace('DEVRE + MODÜLLER · ORTAK 30° KAMERA','30° ORTAK KAMERA · YAKIN GÖRÜNÜŞ')
    .replace('Geometri / varlık önizlemesi — gerçek oyun ekran görüntüsü değildir','Geometri/varlık önizlemesi — oyun görüntüsü değil')
    .replace('Zemin eğilir · gövdeler dik kalır · kablo ve barlar hücreye bağlıdır','Dik gövde · hücreye bağlı kablo ve barlar')
    .replace('8 yönlü çizim, 360° hedef hesabı. Gerçek hacimli 3D model değildir.','8 yönlü 2.5D · 360° hedef hesabı');
  await sharp(Buffer.from(svg)).webp({quality:92}).toFile(path.join(out,"shared-board-camera-preview.webp"));
  console.log(path.join(out,"shared-board-camera-preview.webp"));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
