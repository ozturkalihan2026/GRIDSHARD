'use strict';
// Technical atlas slicing/format preparation only. No pixel painting, alpha
// threshold edits, mirroring, flat rotation, or generated view interpolation.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.GRIDSHARD_SHARP_MODULE || 'sharp');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'client/assets/ui/module-candidates-v1');
const png = path.join(output, 'recoil_cannon-atlas-clean.png');
const master = path.join(output, 'recoil_cannon-atlas-master.webp');
const source = path.resolve(process.argv[2] || (fs.existsSync(png) ? png : master));
const headings = [
  ['e','Doğu','East',0], ['ne','Kuzeydoğu','Northeast',-45], ['n','Kuzey','North',-90],
  ['nw','Kuzeybatı','Northwest',-135], ['w','Batı','West',180], ['sw','Güneybatı','Southwest',135],
  ['s','Güney','South',90], ['se','Güneydoğu','Southeast',45],
];
// Muzzle/outlet on each actual painting; read in the source cell, never
// inferred by rotating a flat 2D circle. N/NW show the far end of the barrel.
const emitters = {e:[.83,.36],ne:[.77,.27],n:[.50,.06],nw:[.29,.10],w:[.13,.28],sw:[.25,.37],s:[.50,.39],se:[.75,.31]};
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const round = value => Math.round(value * 10000) / 10000;

async function main() {
  const bytes = fs.readFileSync(source);
  const metadata = await sharp(bytes).metadata();
  if (!metadata.hasAlpha || metadata.width !== metadata.height) throw Error('A square transparent atlas is required');
  const { width, height } = metadata;
  const raw = await sharp(bytes).ensureAlpha().raw().toBuffer();
  const blank = { x: Math.round(width * 2 / 3), y: Math.round(height * 2 / 3) };
  let blankMaxAlpha = 0, blankResidualPixels = 0;
  for (let y = blank.y; y < height; y++) for (let x = blank.x; x < width; x++) {
    const alpha=raw[(y * width + x) * 4 + 3];
    blankMaxAlpha=Math.max(blankMaxAlpha,alpha);
    if(alpha)blankResidualPixels++;
    // Preserve the generated alpha byte-for-byte. Alpha1 encoding residue is
    // recorded, never threshold-painted away; any visible ninth sprite fails.
    if (alpha > 1) throw Error('Ninth atlas cell contains visible artwork');
  }
  const portableMaster = await sharp(bytes).webp({ lossless: true }).toBuffer();
  fs.writeFileSync(master, portableMaster);
  const overview = await sharp(portableMaster).resize(1024,1024).webp({ quality:92,alphaQuality:100 }).toBuffer();
  fs.writeFileSync(path.join(output, 'recoil_cannon-atlas.webp'), overview);
  const frames = [];
  for (let index = 0; index < headings.length; index++) {
    const [id,tr,en,angle] = headings[index];
    const col = index % 3, row = Math.floor(index / 3);
    const left = Math.round(col * width / 3), top = Math.round(row * height / 3);
    const rect = { left, top, width: Math.round((col+1)*width/3)-left, height: Math.round((row+1)*height/3)-top };
    const cell = await sharp(portableMaster).extract(rect).resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).ensureAlpha().raw().toBuffer();
    let x0=512,y0=512,x1=-1,y1=-1,opaque=0;
    for (let y=0;y<512;y++) for(let x=0;x<512;x++) if(cell[(y*512+x)*4+3]>140) {
      x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);opaque++;
    }
    if(opaque<10000 || x0<4 || y0<4 || x1>507 || y1>507) throw Error(`Missing/cropped sprite: ${id}`);
    // Ground contact is measured from the bottom pedestal band; runtime can
    // align pivots without rolling the entire image or changing generated art.
    let footLeft=512,footRight=-1;
    for(let y=Math.round(y0+(y1-y0)*.78);y<=y1;y++) for(let x=x0;x<=x1;x++) if(cell[(y*512+x)*4+3]>140) {
      footLeft=Math.min(footLeft,x);footRight=Math.max(footRight,x);
    }
    const encoded = await sharp(cell,{raw:{width:512,height:512,channels:4}}).webp({quality:92,alphaQuality:100}).toBuffer();
    const file = `recoil_cannon-${id}.webp`;
    fs.writeFileSync(path.join(output,file),encoded);
    frames.push({id,name_tr:tr,name_en:en,angle_deg:angle,file,width:512,height:512,sha256:hash(encoded),emitter:{x:emitters[id][0],y:emitters[id][1]},
      source_rect:rect,opaque_pixels:opaque,bounds:{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1},
      ground_pivot:{x:round((footLeft+footRight)/2/512),y:round(y1/512)},pedestal_width:round((footRight-footLeft+1)/512)});
  }
  if(new Set(frames.map(f=>f.sha256)).size!==8)throw Error('All eight generated views must be distinct');
  const manifest = {schema_version:1,module_id:'recoil_cannon',candidate:true,runtime_registered:false,
    source_kind:'image_gen_directional_art',source_size:{width,height},grid:{columns:3,rows:3,empty_cell:8},
    empty_cell_max_alpha:blankMaxAlpha,empty_cell_residual_pixels:blankResidualPixels,
    technical_operations:['equal_cell_extract','contain_resize_512','webp_encode','read_only_alpha_measurement'],
    flat_rotation:false,mirrored_views:false,alpha_preserved:true,release_art_accepted:false,
    master:{file:path.basename(master),sha256:hash(portableMaster)},
    overview:{file:'recoil_cannon-atlas.webp',sha256:hash(overview)},frames};
  const json=JSON.stringify(manifest,null,2)+'\n';
  fs.writeFileSync(path.join(output,'recoil_cannon-directions.json'),json);
  fs.writeFileSync(path.join(root,'docs/planning/prototypes/recoil-cannon/directions-data.js'),
    '// Generated by tools/prepare-recoil-cannon-atlas.cjs; candidate only.\nwindow.RECOIL_DIRECTIONS = '+json.trimEnd()+';\n');
  const heads = Object.fromEntries(frames.map(frame=>{
    const size=.64/frame.pedestal_width,left=.5-frame.ground_pivot.x*size,top=.98-frame.ground_pivot.y*size;
    return [frame.id,{src:'assets/ui/module-candidates-v1/'+frame.file,left:round(left),top:round(top),size:round(size),
      emitter:{x:round(left+frame.emitter.x*size),y:round(top+frame.emitter.y*size)}}];
  }));
  const bounds={left:Infinity,top:Infinity,right:-Infinity,bottom:.98,footMin:.18,footMax:.82};
  for(const frame of frames){const part=heads[frame.id];
    bounds.left=Math.min(bounds.left,part.left+frame.bounds.x/512*part.size);
    bounds.right=Math.max(bounds.right,part.left+(frame.bounds.x+frame.bounds.width)/512*part.size);
    bounds.top=Math.min(bounds.top,part.top+frame.bounds.y/512*part.size);
  }
  bounds.width=bounds.right-bounds.left;bounds.height=bounds.bottom-bounds.top;
  const fit=.85/Math.max(bounds.width,bounds.height);
  const layer={kind:'layered',recoilSplit:true,icon:'assets/ui/module-candidates-v1/recoil_cannon-ne.webp',
    socketFit:{left:.5-.5*fit,top:1-.98*fit,size:fit},socketBounds:bounds,heads};
  fs.writeFileSync(path.join(root,'client/src/battle/recoil-cannon-art-data.js'),
    '// Generated by tools/prepare-recoil-cannon-atlas.cjs. Presentation is gated by the compiled roster.\n'+
    '(function(root){\n  if(!root.GRIDSHARD_CANON_MODULES?.some(m=>m.id==="recoil_cannon"))return;\n'+
    '  root.GridshardModuleLayerData=Object.freeze({...root.GridshardModuleLayerData,recoil_cannon:'+JSON.stringify(layer,null,2)+'});\n})(globalThis);\n');
  console.log(JSON.stringify({views:frames.length,alpha:true,source_size:manifest.source_size,
    pedestal_width_range:[Math.min(...frames.map(f=>f.pedestal_width)),Math.max(...frames.map(f=>f.pedestal_width))],
    runtime_registered:false,output}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
