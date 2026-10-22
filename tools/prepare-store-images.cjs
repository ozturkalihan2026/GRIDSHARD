// Technical export only: AI artwork is authored with the built-in image tool.
// No generative API calls, redraw, or invented gameplay screenshots here.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||'sharp');
async function main(){
  const [icon,feature]=process.argv.slice(2);
  if(!icon||!feature)throw new Error('Usage: node tools/prepare-store-images.cjs ICON_SOURCE FEATURE_SOURCE');
  const out=path.resolve(__dirname,'../artifacts/store-2.1.1-20261022');
  fs.mkdirSync(out,{recursive:true});
  const exports=[['app-icon-512.png',512,512,icon,true],['feature-graphic-1024x500.png',1024,500,feature,false]];
  for(const [name,width,height,source,alpha]of exports){
    const file=path.join(out,name);if(fs.existsSync(file))throw new Error('Refusing to overwrite '+file);
    let image=sharp(source).resize(width,height,{fit:'cover',position:'centre'}).toColourspace('srgb');
    image=alpha?image.ensureAlpha():image.removeAlpha();
    await image.png().toFile(file);
    const m=await sharp(file).metadata();
    if(m.width!==width||m.height!==height||m.hasAlpha!==alpha)throw new Error('Invalid export '+name);
    console.log(name,`${m.width}x${m.height}`,fs.statSync(file).size+' bytes');
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
