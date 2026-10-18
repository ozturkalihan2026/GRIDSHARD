"use strict";
// Original reference-guided mesh authoring. No raster projection or image-to-3D API.
// Produces a real editable glTF mesh, an offline viewer and mesh-rendered previews.
const fs=require("node:fs"), path=require("node:path"), assert=require("node:assert/strict");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||"sharp");
const root=path.resolve(__dirname,".."),out=path.join(root,"artifacts/visual-refresh-pack08b-20261018/model-pilot-v2");
const pivot=1.12, triangles=[];
const palette={green:"#06c582",light:"#36edaa",silver:"#b9cde9",bright:"#e0ebfb",dark:"#18273f",joint:"#3b4c68",gold:"#ffb613",glass:"#ff9910",hot:"#ffe76a",cyan:"#00c9f7",screen:"#064f83"};
const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const rgb=k=>[1,3,5].map(i=>linear(parseInt(palette[k].slice(i,i+2),16)/255));
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const unit=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
function face(points,tone,part,center){
  for(let i=1;i<points.length-1;i++){
    let v=[points[0],points[i],points[i+1]],n=unit(cross(sub(v[1],v[0]),sub(v[2],v[0])));
    const mid=v[0].map((_,j)=>(v[0][j]+v[1][j]+v[2][j])/3);
    if(dot(n,sub(mid,center))<0){v=[v[0],v[2],v[1]];n=n.map(x=>-x)}
    triangles.push({v,n,c:rgb(tone),part});
  }
}
function box(c,size,tone,part=0,b=.06){
  const [hx,hy,hz]=size.map(x=>x/2);b=Math.min(b,hx*.38,hy*.38,hz*.38);
  const ring=(x,z,y)=>[[-x+b,y,-z],[x-b,y,-z],[x,y,-z+b],[x,y,z-b],[x-b,y,z],[-x+b,y,z],[-x,y,z-b],[-x,y,-z+b]].map(p=>add(p,c));
  const rings=[ring(hx-b,hz-b,-hy),ring(hx,hz,-hy+b),ring(hx,hz,hy-b),ring(hx-b,hz-b,hy)];
  face([...rings[0]].reverse(),tone,part,c);face(rings[3],tone,part,c);
  for(let j=0;j<3;j++)for(let i=0;i<8;i++)face([rings[j][i],rings[j][(i+1)%8],rings[j+1][(i+1)%8],rings[j+1][i]],tone,part,c);
}
function tube(c,r,length,axis,tone,part=0,sides=24){
  const pt=(i,t)=>{const a=Math.cos(i*2*Math.PI/sides)*r,b=Math.sin(i*2*Math.PI/sides)*r;return add(axis==="y"?[a,t,b]:axis==="x"?[t,a,b]:[a,b,t],c)};
  const lo=[],hi=[];for(let i=0;i<sides;i++){lo.push(pt(i,-length/2));hi.push(pt(i,length/2))}
  face(lo,tone,part,c);face(hi,tone,part,c);
  for(let i=0;i<sides;i++)face([lo[i],lo[(i+1)%sides],hi[(i+1)%sides],hi[i]],tone,part,c);
}
// Broad chamfers around the optical silhouette, not a stack of square slabs.
function opticalHousing(c,w,h,d,tone,part=1){
  const b=Math.min(.19,w*.3,h*.3),outline=[[-w/2+b,-h/2],[w/2-b,-h/2],[w/2,-h/2+b],[w/2,h/2-b],[w/2-b,h/2],[-w/2+b,h/2],[-w/2,h/2-b],[-w/2,-h/2+b]];
  const rings=[[-d/2,.88],[-d/2+.10,1],[d/2-.10,1],[d/2,.88]].map(([z,s])=>outline.map(([x,y])=>add([x*s,y*s,z],c)));
  face(rings[0],tone,part,c);face(rings[3],tone,part,c);
  for(let j=0;j<3;j++)for(let i=0;i<8;i++)face([rings[j][i],rings[j][(i+1)%8],rings[j+1][(i+1)%8],rings[j+1][i]],tone,part,c);
}
function lensArmor(c,r){
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4+.055,b=(i+1)*Math.PI/4-.055;
    const p=(angle,radius,z)=>add([Math.cos(angle)*radius,Math.sin(angle)*radius,z],c);
    face([p(a,r,-.015),p(b,r,-.015),p(b,r-.085,.025),p(a,r-.085,.025)],"bright",1,c);
    face([p(a,r,-.065),p(b,r,-.065),p(b,r,-.015),p(a,r,-.015)],"silver",1,c);
  }
}
function lens(c,r,depth,part=1){
  const steps=7,sides=32;
  for(let j=0;j<steps;j++)for(let i=0;i<sides;i++){
    const p=(row,col)=>{const a=row/steps*Math.PI/2,t=col/sides*2*Math.PI;return add([r*Math.cos(a)*Math.cos(t),r*Math.cos(a)*Math.sin(t),depth*Math.sin(a)],c)};
    face([p(j,i),p(j,i+1),p(j+1,i+1),p(j+1,i)],j>4?"hot":"glass",part,c);
  }
}
// Four silver feet and compact green processor body, front = world +Z.
box([0,.13,0],[1.72,.26,1.42],"dark");
box([0,.38,0],[1.48,.48,1.18],"green",0,.13);
for(const x of[-.68,.68])for(const z of[-.5,.5]){
  box([x,.19,z],[.49,.34,.50],"silver",0,.09);box([x,.38,z],[.38,.18,.38],"green",0,.07);
}
box([0,.55,-.08],[1.14,.24,.94],"joint");
tube([0,.71,-.05],.46,.11,"y","silver");tube([0,.8,-.05],.34,.13,"y","dark");
tube([0,.88,-.05],.23,.15,"y","silver");
for(const x of[-.755,.755]){
  box([x,.4,.04],[.045,.17,.45],"dark");box([x,.4,.04],[.06,.095,.31],"gold");
}
// Angled front radar, constructed as actual panel geometry, not reference-photo decal.
const panelCenter=[0,.51,.59],pa=-.56;
const pan=p=>add([p[0],Math.cos(pa)*p[1]-Math.sin(pa)*p[2],Math.sin(pa)*p[1]+Math.cos(pa)*p[2]],panelCenter);
const pane=(w,h,z,tone)=>face([[-w/2,-h/2,z],[w/2,-h/2,z],[w/2,h/2,z],[-w/2,h/2,z]].map(pan),tone,0,pan([0,0,-.1]));
pane(.86,.5,.01,"silver");pane(.74,.39,.018,"screen");
function radarRing(r){for(let i=0;i<48;i++){const a=i/48*2*Math.PI,b=(i+1)/48*2*Math.PI;face([[Math.cos(a)*r,Math.sin(a)*r,.026],[Math.cos(b)*r,Math.sin(b)*r,.026],[Math.cos(b)*(r-.008),Math.sin(b)*(r-.008),.026],[Math.cos(a)*(r-.008),Math.sin(a)*(r-.008),.026]].map(pan),"cyan",0,pan([0,0,0]))}}
radarRing(.15);radarRing(.075);
for(const [w,h]of[[.4,.007],[.007,.34]])pane(w,h,.027,"cyan");
face([[0,0,.028],[.13,.11,.028],[.11,.13,.028]].map(pan),"cyan",0,pan([0,0,0]));
box([0,.27,.72],[.47,.11,.05],"gold");
// Head local coordinates relative to a real yaw joint at y=1.12.
opticalHousing([0,.23,-.04],1.18,.85,.83,"dark");
opticalHousing([0,.24,-.03],1.29,.97,.97,"green");
box([0,.22,.445],[1.08,.63,.04],"dark",1,.025);
for(const x of[-.43,.43])opticalHousing([x,.31,-.04],.30,.98,.94,"green");
for(const z of[-.33,-.04,.25])box([0,.75,z],[.57,.10,.23],"silver",1,.035);
for(const x of[-.48,.48])box([x,.60,.36],[.23,.20,.22],"bright",1,.065);
box([-.48,-.15,.32],[.22,.21,.24],"silver",1);
box([.48,-.15,.32],[.22,.21,.24],"silver",1);
// Two distinct front lenses.
tube([-.16,.22,.45],.39,.12,"z","silver",1,32);
tube([-.16,.22,.52],.325,.06,"z","dark",1,32);
tube([-.16,.22,.559],.279,.025,"z","gold",1,32);
lens([-.16,.22,.577],.254,.09);
lensArmor([-.16,.22,.565],.397);
face([[-.29,.37,.642],[-.23,.39,.65],[-.19,.30,.67],[-.25,.28,.66]],"bright",1,[-.16,.22,.4]);
box([.54,.24,.24],[.36,.48,.48],"silver",1,.065);
tube([.54,.24,.52],.18,.09,"z","dark",1);
tube([.54,.24,.575],.145,.025,"z","gold",1);
lens([.54,.24,.59],.12,.045);
for(const x of[-.65,.65]){
  tube([x,.04,-.03],.225,.13,"x","joint",1);
  tube([x*1.09,.04,-.03],.174,.055,"x","green",1);
  tube([x*1.13,.04,-.03],.115,.027,"x","gold",1);
}
// Back is designed explicitly: armored service panel and vent slats.
box([0,.2,-.505],[.72,.55,.07],"silver",1);
box([0,.2,-.55],[.56,.4,.04],"dark",1);
for(let i=0;i<4;i++)box([0,.07+i*.085,-.578],[.45,.028,.025],"joint",1,.006);
box([-.48,.22,-.5],[.15,.37,.07],"light",1);
box([.48,.22,-.5],[.15,.37,.07],"light",1);

function transform(t,azimuth,headYaw){
  const rot=(p,a)=>[Math.cos(a)*p[0]+Math.sin(a)*p[2],p[1],-Math.sin(a)*p[0]+Math.cos(a)*p[2]];
  return {...t,v:t.v.map(p=>rot(t.part?add(rot(p,headYaw),[0,pivot,0]):p,azimuth)),n:rot(rot(t.n,t.part?headYaw:0),azimuth)};
}
function glb(){
  const buffers=[],views=[],accessors=[];let offset=0;
  const accessor=(values,type,width)=>{
    const b=Buffer.from(new Float32Array(values).buffer);const index=views.length;
    views.push({buffer:0,byteOffset:offset,byteLength:b.length});buffers.push(b);offset+=b.length;
    const min=Array(width).fill(Infinity),max=Array(width).fill(-Infinity);
    values.forEach((v,i)=>{assert.ok(Number.isFinite(v));min[i%width]=Math.min(min[i%width],v);max[i%width]=Math.max(max[i%width],v)});
    accessors.push({bufferView:index,componentType:5126,count:values.length/width,type,min,max});return accessors.length-1;
  };
  const meshes=[0,1].map(part=>{const ts=triangles.filter(t=>t.part===part);return {name:part?"OpticalHead":"ProcessorPedestal",primitives:[{attributes:{POSITION:accessor(ts.flatMap(t=>t.v.flat()),"VEC3",3),NORMAL:accessor(ts.flatMap(t=>t.v.flatMap(()=>t.n)),"VEC3",3),COLOR_0:accessor(ts.flatMap(t=>t.v.flatMap(()=>t.c)),"VEC3",3)},material:0,mode:4}]}});
  const times=accessor([0,2,4,6,8],"SCALAR",1);
  const rotations=accessor([0,1,2,3,4].flatMap(i=>[0,Math.sin(i*Math.PI/4),0,Math.cos(i*Math.PI/4)]),"VEC4",4);
  const doc={asset:{version:"2.0",generator:"GRIDSHARD reference-guided targeting pilot v1"},scene:0,scenes:[{nodes:[0]}],nodes:[{name:"TargetingComputer",children:[1,2]},{name:"FixedBase",mesh:0},{name:"HeadYawPivot",translation:[0,pivot,0],mesh:1,children:[3]},{name:"OpticalEmitter",translation:[-.16,.22,.667]}],meshes,materials:[{name:"Vivid enamel and silver vertex palette",pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:.08,roughnessFactor:.38},doubleSided:false}],animations:[{name:"HeadTurn360",samplers:[{input:times,output:rotations,interpolation:"LINEAR"}],channels:[{sampler:0,target:{node:2,path:"rotation"}}]}],buffers:[{byteLength:offset}],bufferViews:views,accessors,extras:{cameraElevationDegrees:60,reference:"../targeting_computer.webp",prototype:true,notRuntimeConnected:true}};
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const binary=Buffer.concat(buffers);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const bh=Buffer.alloc(8);bh.writeUInt32LE(binary.length,0);bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,json,bh,binary]);
}
// Independent CPU rasterizer for evidence images of the SAME mesh; no browser needed.
async function render(azimuth,size=512,headYaw=0){
  const pixels=Buffer.alloc(size*size*4),depth=new Float32Array(size*size).fill(-Infinity);
  const elevation=Math.PI/3,ce=Math.cos(elevation),se=Math.sin(elevation),scale=size/2.85;
  const proj=p=>[(p[0]*scale)+size/2,(-ce*(p[1]-.9)+se*p[2])*scale+size/2,se*(p[1]-.9)+ce*p[2]];
  const light=unit([-.6,.9,.8]),view=[0,se,ce];
  const srgb=v=>Math.round(255*Math.min(1,Math.max(0,v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055)));
  for(const original of triangles){
    const t=transform(original,azimuth,headYaw);if(dot(t.n,view)<=0)continue;
    const p=t.v.map(proj),den=(p[1][1]-p[2][1])*(p[0][0]-p[2][0])+(p[2][0]-p[1][0])*(p[0][1]-p[2][1]);if(Math.abs(den)<1e-9)continue;
    const lambert=Math.max(0,dot(t.n,light)),spec=Math.pow(Math.max(0,dot(t.n,unit(add(light,view)))),34)*.15;
    const col=t.c.map(c=>srgb(c*(.48+.62*lambert)+spec));
    const minX=Math.max(0,Math.floor(Math.min(...p.map(v=>v[0])))),maxX=Math.min(size-1,Math.ceil(Math.max(...p.map(v=>v[0]))));
    const minY=Math.max(0,Math.floor(Math.min(...p.map(v=>v[1])))),maxY=Math.min(size-1,Math.ceil(Math.max(...p.map(v=>v[1]))));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const u=((p[1][1]-p[2][1])*(x+.5-p[2][0])+(p[2][0]-p[1][0])*(y+.5-p[2][1]))/den;
      const v=((p[2][1]-p[0][1])*(x+.5-p[2][0])+(p[0][0]-p[2][0])*(y+.5-p[2][1]))/den,w=1-u-v;
      if(u<0||v<0||w<0)continue;const z=u*p[0][2]+v*p[1][2]+w*p[2][2],i=y*size+x;
      if(z<=depth[i])continue;depth[i]=z;pixels[i*4]=col[0];pixels[i*4+1]=col[1];pixels[i*4+2]=col[2];pixels[i*4+3]=255;
    }
  }
  return sharp(pixels,{raw:{width:size,height:size,channels:4}}).png().toBuffer();
}
async function main(){
  fs.mkdirSync(out,{recursive:true});
  const data=triangles.flatMap(t=>t.v.flatMap(p=>[...p,...t.n,...t.c,t.part]));
  const model=glb();fs.writeFileSync(path.join(out,"targeting-computer-v2.glb"),model);
  fs.writeFileSync(path.join(out,"mesh-data.json"),JSON.stringify({pivot,vertices:data}));
  const template=fs.readFileSync(path.join(__dirname,"targeting-3d-viewer.template.html"),"utf8");
  fs.writeFileSync(path.join(out,"index.html"),template.replace("targeting-computer-v1.glb","targeting-computer-v2.glb").replace("__MODEL_DATA__",JSON.stringify({pivot,vertices:data})));
  const layers=[];
  const label=(s)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="45"><text x="210" y="30" font-family="Arial" font-size="20" text-anchor="middle" fill="#e6faff">${s}</text></svg>`);
  for(const [i,a]of[-Math.PI/4,Math.PI/4,Math.PI*3/4,-Math.PI*3/4].entries()){
    layers.push({input:await sharp(await render(a,840)).resize(420,420).png().toBuffer(),left:(i%2)*420,top:60+Math.floor(i/2)*465});
    layers.push({input:label(["Ön / sol","Ön / sağ","Arka / sağ","Arka / sol"][i]),left:(i%2)*420,top:480+Math.floor(i/2)*465});
  }
  const title=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="840" height="60"><text x="420" y="30" text-anchor="middle" fill="#74e8be" font-family="Arial" font-size="23">GERÇEK 3B GEOMETRİ · İLK MODEL DENEMESİ</text><text x="420" y="51" text-anchor="middle" fill="#abc6d2" font-family="Arial" font-size="14">Tepeden 30° kamera · Aynı modelin dört yüzü · Oyuna bağlı değil</text></svg>');
  layers.push({input:title,left:0,top:0});
  await sharp({create:{width:840,height:990,channels:4,background:"#0d2431"}}).composite(layers).webp({quality:92}).toFile(path.join(out,"four-views.webp"));
  // Review images only. Runtime rotates geometry, so no direction atlas is made.
  const report={date:"2026-10-18",method:"Local reference-guided geometric modeling",reference:"artifacts/visual-refresh-pack08b-20261018/targeting_computer.webp",triangles:triangles.length,vertices:data.length/10,glbBytes:model.length,nodes:["TargetingComputer","FixedBase","HeadYawPivot","OpticalEmitter"],animation:"8 second head rotation, full360",cameraDegreesFromOverhead:30,actualVolumetricMesh:true,photoProjected:false,automatedImageTo3D:false,renderValidation:"Four views inspected from CPU mesh rendering; interactive browser/WebGL not launched",runtimeConnected:false};
  fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={triangles,render};
