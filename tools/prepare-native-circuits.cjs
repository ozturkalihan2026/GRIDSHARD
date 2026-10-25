// Register generated native floor plates once, at asset preparation time.
// Runtime owns no second floor: transparent hitboxes match this single image.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.env.GRIDSHARD_SHARP_MODULE || 'sharp');
const root = path.resolve(__dirname, '..');
const source = path.resolve(process.argv[2] || path.join(root, 'artifacts/battle-native-20261025/source'));
const target = path.join(root, 'client/assets/ui/battle-native-v6');
const audit = path.join(root, 'artifacts/battle-native-20261025');
const geometry = { canvas:1254, left:264, top:260, width:728, height:404,
  columns:5, rows:3, cellWidth:140, cellHeight:130, gap:7, rimTop:145, rimBottom:820 };
const xs = [[264,405],[412,550],[557,695],[702,840],[847,992]];
const ys = [[260,392],[399,527],[534,664]];
async function main() {
  await fs.mkdir(target, {recursive:true});
  await fs.mkdir(audit, {recursive:true});
  const results = [];
  for (const side of ['player','enemy']) {
    const input = path.join(source, `island-${side}.png`);
    const meta = await sharp(input).metadata();
    if(meta.width!==1254 || meta.height!==1254 || !meta.hasAlpha) throw new Error(`Unexpected source geometry: ${input}`);
    const plates = [], bounds = [];
    for(let y=0;y<3;y++) for(let x=0;x<5;x++) {
      const left=x*147, top=y*137;
      const plate=await sharp(input).extract({left:xs[x][0],top:ys[y][0],width:xs[x][1]-xs[x][0],height:ys[y][1]-ys[y][0]})
        .resize(140,130,{fit:'fill'}).png().toBuffer();
      plates.push({input:plate,left,top});
      bounds.push({x,y,left:264+left,top:260+top,width:140,height:130});
    }
    const floor=await sharp({create:{width:728,height:404,channels:4,background:'#091822'}}).composite(plates).png().toBuffer();
    const master=await sharp(input).composite([{input:floor,left:264,top:260}]).png().toBuffer();
    await fs.writeFile(path.join(audit,`island-${side}-registered.png`),master);
    const output=path.join(target,`island-${side}.webp`);
    const result=await sharp(master).resize(1024,1024).webp({quality:87,effort:6}).toFile(output);
    results.push({side,bytes:result.size,bounds});
  }
  await fs.writeFile(path.join(target,'registration.json'),JSON.stringify(geometry,null,2)+'\n');
  await fs.writeFile(path.join(audit,'registration-audit.json'),JSON.stringify({geometry,results},null,2)+'\n');
  console.log(JSON.stringify({geometry,assets:results.map(({side,bytes})=>({side,bytes}))},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
