(function(root){
  "use strict";
  // Each canon module owns a bounded visual/audio signature. No gameplay values.
  const rows=[
    ["laser","beam","#ff354b",0,190,0.24],
    ["shield","hex","#62d9ff",null,330,0.24],
    ["amplifier","coil","#b4f55b",null,290,0.26],
    ["emp","arc","#d76aff",null,130,0.28],
    ["repair","heal","#57ef9a",null,370,0.28],
    ["armor","plates","#80baff",null,80,0.19],
    ["pulse_cannon","orb","#ffa141",340,115,0.27],
    ["missile_launcher","rocket","#ffb458",500,70,0.48],
    ["barrier","bars","#83c6ff",null,180,0.22],
    ["arc_cannon","arc","#5fe7ff",100,220,0.25],
    ["drone_bay","drone","#ffd576",430,140,0.36],
    ["railgun","rail","#f3d790",70,110,0.2],
    ["reflector","mirror","#9efbff",null,410,0.18],
    ["virus","packets","#cd66ff",null,165,0.3],
    ["plasma_mortar","plasma","#ff793e",600,75,0.42],
    ["guardian_dome","hex","#39cdf5",null,190,0.26],
    ["quantum_repeater","double","#8bf6ff",100,350,0.22],
    ["phase_armor","phase","#89bcff",null,230,0.25],
    ["burst_cannon","orb","#ffac46",120,240,0.15],
    ["shield_breaker","rail","#56e8ff",130,150,0.22],
    ["buffer_shield","hex","#62d9ff",null,330,0.24],
    ["last_bastion","bars","#83c6ff",null,180,0.22],
    ["cleanser","heal","#57ef9a",null,370,0.28],
    ["speed_relay","chevrons","#a4f55b",null,320,0.24],
  ];
  // Different roles share a sound family without equal foreground loudness.
  const soundGains=Object.freeze({laser:.38, pulse_cannon:.60, missile_launcher:.60,
    railgun:.58, drone_bay:.52, arc_cannon:.58, plasma_mortar:.62,
    quantum_repeater:.52, burst_cannon:.54, shield_breaker:.60,
    shield:.40, armor:.36, barrier:.38, reflector:.38, guardian_dome:.40,
    phase_armor:.36, buffer_shield:.36, last_bastion:.40,
    repair:.30, amplifier:.28, emp:.35, virus:.30, cleanser:.30, speed_relay:.28});
  const profiles=Object.freeze(Object.fromEntries(rows.map(([id,shape,color,travel,hz,seconds])=>[id,Object.freeze({
    id,shape,color,travel,hz,seconds,cue:"module_"+id,
    asset:"./assets/audio/modules/"+id+".wav",gain:soundGains[id],
    audioFamily:travel!==null?"weapon":["shield","armor","barrier","reflector","guardian_dome","phase_armor","buffer_shield","last_bastion"].includes(id)?"protection":"utility"
  })])));
  root.GridshardModulePresentation=profiles;
  if(typeof module!=="undefined"&&module.exports)module.exports=profiles;
})(globalThis);
