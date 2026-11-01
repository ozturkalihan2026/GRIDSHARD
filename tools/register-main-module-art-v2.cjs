"use strict";
// Runtime preparation of approved transparent paintings; no image synthesis.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE || 'C:/Users/S-A/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=path.join(root,'client/assets/ui/modules-physical-v3');
const source='assets/ui/modules-physical-v3/';
const file=path.join(root,'client/src/module-layer-data.js');
async function run(){
 const roster=JSON.parse(fs.readFileSync(path.join(root,'server/data/module_roster_v2.json'),'utf8'));
 const active=new Set(roster.modules.map(m=>m.id));
 const layers={...require(file)};
 for(const id of Object.keys(layers))if(!layers[id].core&&!active.has(id))delete layers[id];
 for(const id of ['burst_cannon','shield_breaker','buffer_shield','last_bastion','cleanser','speed_relay']){
  await sharp(path.join(dir,id+'.png')).trim().resize(480,480,{fit:'inside'}).extend({top:16,bottom:16,left:16,right:16,background:{r:0,g:0,b:0,alpha:0}}).webp({quality:92,alphaQuality:100}).toFile(path.join(dir,id+'.webp'));
  if(!['burst_cannon','shield_breaker'].includes(id)){
   layers[id]={kind:'single',art:{src:source+id+'.webp',left:0,top:0,size:1},emitter:{x:.5,y:.35}};continue;
  }
  const atlas=path.join(dir,id+'-yaw.png');const info=await sharp(atlas).metadata();const heads={};
  for(let i=0;i<8;i++){
   const left=Math.round((i%3)*info.width/3),top=Math.round(Math.floor(i/3)*info.height/3);
   const right=Math.round((i%3+1)*info.width/3),bottom=Math.round((Math.floor(i/3)+1)*info.height/3);
   const yaw=[12,14,0,2,4,6,8,10][i];const name=id+'-y'+String(yaw).padStart(2,'0')+'.webp';
   const tile=await sharp(atlas).extract({left,top,width:right-left,height:bottom-top}).png().toBuffer();
   await sharp(tile).trim().resize(480,480,{fit:'contain',background:{r:0,g:0,b:0,alpha:0},position:'south'}).extend({top:16,bottom:16,left:16,right:16,background:{r:0,g:0,b:0,alpha:0}}).webp({quality:92,alphaQuality:100}).toFile(path.join(dir,name));
   const angle=yaw*Math.PI/8;
   heads['y'+String(yaw).padStart(2,'0')]={src:source+name,left:0,top:0,size:1,emitter:{x:.5+Math.cos(angle)*.3,y:.35+Math.sin(angle)*.15},pivot:{x:.5,y:.8}};
  }
  layers[id]={kind:'layered',heads};
 }
 fs.writeFileSync(file,'/* Approved main roster paintings; tools/register-main-module-art-v2.cjs. */\nglobalThis.GridshardModuleLayerData = Object.freeze('+JSON.stringify(layers,null,1)+');\nif(typeof module!=="undefined"&&module.exports)module.exports=globalThis.GridshardModuleLayerData;\n');
 console.log('Registered '+active.size+' modules and '+Object.values(layers).filter(m=>m.core).length+' cores.');
}
run().catch(e=>{console.error(e);process.exitCode=1});
