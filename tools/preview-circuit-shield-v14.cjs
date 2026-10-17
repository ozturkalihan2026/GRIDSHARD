"use strict";
// Offline inspection of the actual shield SVG factory; not a game screenshot.
const fs=require("node:fs"),path=require("node:path");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||"sharp");
const {GridshardModuleVfx}=require("../client/src/battle/module-vfx.js");
class Element{
  constructor(tag){this.tag=tag;this.attrs={};this.children=[];this.style={setProperty(){}};this.classes=[];this.classList={add:(...names)=>this.classes.push(...names)};}
  setAttribute(k,v){this.attrs[k]=String(v);}appendChild(n){this.children.push(n);n.parentElement=this;return n;}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);}
  markup(){const attrs={...this.attrs};if(this.classes.length)attrs.class=this.classes.join(" ");
    if(this.tag==="svg"&&this.style.left){attrs.x=this.style.left;attrs.y=this.style.top;}
    return `<${this.tag} ${Object.entries(attrs).map(([k,v])=>`${k}="${v.replaceAll("&","&amp;").replaceAll('"',"&quot;")}"`).join(" ")}>${this.children.map(n=>n.markup()).join("")}</${this.tag}>`;}
}
async function main(){
  const root=path.resolve(__dirname,".."),out=path.join(root,"artifacts/modules-camera-v13-20261017/shield-dome-preview.webp");
  const layer=new Element("g"),rect={left:48,top:170,width:420,height:210};
  const fx=new GridshardModuleVfx({doc:{createElementNS:(_ns,tag)=>new Element(tag)},layer:()=>layer,boardRect:()=>rect,schedule(){},hidden:()=>false});
  fx.dome("preview",500);
  const svg=['<svg xmlns="http://www.w3.org/2000/svg" width="520" height="460">',
    `<style>${fs.readFileSync(path.join(root,"client/src/module-vfx-v14.css"),"utf8")}</style>`,
    '<rect width="520" height="460" fill="#081823"/><text x="260" y="28" fill="#d9f6ff" text-anchor="middle" font-family="Arial" font-size="17">KALKAN · YÜKSELEN PETEK KUBBE</text>',
    '<text x="260" y="48" fill="#91aebd" text-anchor="middle" font-family="Arial" font-size="12">Gerçek efekt kodundan çevrimdışı önizleme — oyun görüntüsü değil</text>'];
  const placed=[{x:0,y:0,id:"laser",frame:5},{x:2,y:1,id:"shield",frame:2},{x:4,y:2,id:"battery",frame:2}];
  for(let y=0;y<3;y++)for(let x=0;x<5;x++){
    const live=placed.some(d=>d.x===x&&d.y===y),left=rect.left+x*84,top=rect.top+y*70;
    svg.push(`<rect x="${left}" y="${top}" width="76" height="62" rx="5" fill="${live?'#164a47':'#102831'}" stroke="${live?'#64efd1':'#38515b'}" stroke-width="2"/>`);
  }
  for(const d of placed){
    const image=await sharp(path.join(root,"client/assets/ui/modules-views-v3",d.id+".webp")).extract({left:d.frame%4*128,top:Math.floor(d.frame/4)*128,width:128,height:128}).png().toBuffer();
    svg.push(`<image x="${rect.left+d.x*84+4}" y="${rect.top+d.y*70-8}" width="68" height="68" href="data:image/png;base64,${image.toString('base64')}"/>`);
  }
  svg.push(layer.markup(),'<text x="260" y="420" fill="#90bdc9" text-anchor="middle" font-family="Arial" font-size="13">Yükselen yüzey · belirgin petekler · zemine oturan taban</text></svg>');
  fs.mkdirSync(path.dirname(out),{recursive:true});await sharp(Buffer.from(svg.join(""))).webp({quality:90}).toFile(out);console.log(out);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
