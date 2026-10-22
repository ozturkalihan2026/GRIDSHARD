// Verify only the public deliverable allowlist; never archive traces or account data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||'sharp');
async function main(){
  const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/store-2.1.1-20261022');
  const run=JSON.parse(fs.readFileSync(path.join(out,'test-output/.last-run.json'),'utf8'));
  if(run.status!=='passed')throw new Error('The latest authentic screenshot capture did not pass');
  const shots=fs.readdirSync(path.join(out,'screenshots')).filter(n=>n.endsWith('.png')).sort();
  if(shots.length!==8)throw new Error('Exactly eight gameplay captures are required');
  const items=[['app-icon-512.png',512,512,true],['feature-graphic-1024x500.png',1024,500,false],...shots.map(n=>['screenshots/'+n,1080,1920,false])];
  const files=[];
  for(const [name,width,height,alpha] of items){
    const file=path.join(out,name),m=await sharp(file).metadata(),bytes=fs.readFileSync(file);
    if(m.format!=='png'||m.width!==width||m.height!==height||m.hasAlpha!==alpha)throw new Error('Wrong dimensions or colour channels: '+name);
    if(name==='app-icon-512.png'&&bytes.length>1024*1024)throw new Error('App icon exceeds 1024KB');
    files.push({path:name,width,height,alpha:m.hasAlpha,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  fs.copyFileSync(path.join(root,'docs/MAGAZA_GORSELLERI_2_1_1.md'),path.join(out,'README.md'),fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(out,'STORE_MANIFEST.json'),JSON.stringify({release_candidate:'2.1.1',play_uploaded:false,
    artwork_tool:'built-in image_gen',screenshots:'actual isolated local game, no fabricated UI',files},null,2)+'\n',{flag:'wx'});
  console.log('Verified: icon, feature graphic and eight genuine 1080x1920 captures. No Play upload performed.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
