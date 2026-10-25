"use strict";
// Offline PCM measurements, not microphone/SPL or a perceptual listening verdict.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
require('../client/src/battle/module-presentation-profiles.js');
require('../client/src/gridshard-audio.js');
function pcm(asset){
  const bytes=fs.readFileSync(path.join(root,'client',asset));
  if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('WAV required: '+asset);
  let format,data;
  for(let at=12;at+8<=bytes.length;){
    const size=bytes.readUInt32LE(at+4),id=bytes.toString('ascii',at,at+4);
    if(id==='fmt ')format={encoding:bytes.readUInt16LE(at+8),channels:bytes.readUInt16LE(at+10),rate:bytes.readUInt32LE(at+12),bits:bytes.readUInt16LE(at+22)};
    if(id==='data')data=bytes.subarray(at+8,at+8+size);
    at+=8+size+(size%2);
  }
  if(!format||!data||format.encoding!==1||format.bits!==16)throw Error('PCM16 required: '+asset);
  return {data,...format};
}
function measure(asset,gain=1){
  const {data,channels,rate}=pcm(asset),frames=data.length/2/channels;
  const window=Math.max(1,Math.round(rate*.05)),powers=new Float64Array(frames);
  let peak=0,sum=0;
  for(let i=0;i<frames;i++){
    let power=0;
    for(let c=0;c<channels;c++){const v=data.readInt16LE((i*channels+c)*2)/32768;power+=v*v;peak=Math.max(peak,Math.abs(v));}
    powers[i]=power/channels;sum+=powers[i];
  }
  let rolling=0,max=0;
  for(let i=0;i<frames;i++){rolling+=powers[i];if(i>=window)rolling-=powers[i-window];max=Math.max(max,rolling/Math.min(i+1,window));}
  const db=v=>20*Math.log10(Math.max(v,1e-12));
  return {seconds:frames/rate,rms:Math.sqrt(sum/frames)*gain,peak:peak*gain,windowRms:Math.sqrt(max)*gain,
    rmsDbfs:db(Math.sqrt(sum/frames)*gain),windowDbfs:db(Math.sqrt(max)*gain),energy:sum/rate*gain*gain};
}
function audit(){
  const cues=globalThis.GRIDSHARD_SFX_CUES;
  return Object.fromEntries(['laser_fire','emp','module_emp','module_laser','amplifier_charge','battery_charge','energy_transfer','repair_beam','cooling_air',
    'omega_link','chrono_shift','target_lock','nano_pulse','module_lost','core_hit',
    'module_amplifier','module_battery','module_capacitor','module_current_balancer','module_omega_amplifier'].filter(n=>cues[n]).map(name=>[
      name,{gain:cues[name].gain??1,...measure(cues[name].asset,cues[name].gain??1)}]));
}
module.exports={measure,audit};
if(require.main===module)console.log(JSON.stringify(audit(),null,2));
