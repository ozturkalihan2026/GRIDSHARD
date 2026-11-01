// Register imagegen artwork offline, then restore original playable floor pixels.
// NODE_PATH may point to the workspace runtime's bundled sharp package.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
(async()=>{
  const [player,enemy]=process.argv.slice(2);
  if(!player||!enemy)throw Error('Pass the two imagegen PNG paths: cyan then red');
  const output=path.join(root,'client/assets/ui/battle-native-v7');
  fs.mkdirSync(output,{recursive:true});
  for(const [name,generated] of [['player',player],['enemy',enemy]]){
    const original=path.join(root,`client/assets/ui/battle-native-v6/island-${name}.webp`);
    const metadata=await sharp(original).metadata(),canvas=metadata.width;
    const source=await sharp(generated).metadata();
    const bounds=name==='player'?[252,260,1000,664]:[266,250,990,634];
    const axis=(size,a,b)=>[0,Math.round(size*a/1254),Math.round(size*b/1254),size];
    const sx=axis(source.width,bounds[0],bounds[2]),sy=axis(source.height,bounds[1],bounds[3]);
    const dx=axis(canvas,264,992),dy=axis(canvas,260,664),layers=[];
    // One-time asset registration, never runtime slicing or extra DOM layers.
    for(let y=0;y<3;y++)for(let x=0;x<3;x++)layers.push({left:dx[x],top:dy[y],
      input:await sharp(generated).extract({left:sx[x],top:sy[y],width:sx[x+1]-sx[x],height:sy[y+1]-sy[y]})
        .resize(dx[x+1]-dx[x],dy[y+1]-dy[y],{fit:'fill'}).png().toBuffer()});
    const floor={left:dx[1],top:dy[1],width:dx[2]-dx[1],height:dy[2]-dy[1]};
    const registered=await sharp({create:{width:canvas,height:canvas,channels:4,background:'#00000000'}})
      .composite(layers).png().toBuffer();
    const pixels=await sharp(registered).ensureAlpha().raw().toBuffer();
    const old=await sharp(original).ensureAlpha().raw().toBuffer();
    // Restore floor plus its connectors/rim; blend only the exterior margin
    // into the generated towers, avoiding a rectangular seam through metal.
    for(let y=0;y<canvas;y++)for(let x=0;x<canvas;x++){
      const distance=Math.max(floor.left-x,x-(floor.left+floor.width-1),floor.top-y,y-(floor.top+floor.height-1),0);
      const weight=distance<=40?1:distance>=52?0:(52-distance)/12;
      if(!weight)continue;
      const i=(y*canvas+x)*4,a=pixels[i+3]/255*(1-weight),b=old[i+3]/255*weight,total=a+b;
      for(let c=0;c<3;c++)pixels[i+c]=total?Math.round((pixels[i+c]*a+old[i+c]*b)/total):0;
      pixels[i+3]=Math.round(total*255);
    }
    const result=await sharp(pixels,{raw:{width:canvas,height:canvas,channels:4}})
      .webp({quality:87,alphaQuality:100,effort:6}).toBuffer();
    const target=path.join(output,`island-${name}.webp`);fs.writeFileSync(target,result);
    console.log(name,result.length);
  }
  fs.copyFileSync(path.join(root,'client/assets/ui/battle-native-v6/registration.json'),path.join(output,'registration.json'));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
