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
  const profiles=Object.freeze(Object.fromEntries(rows.map(([id,shape,color,travel,hz,seconds])=>[id,Object.freeze({
    id,shape,color,travel,hz,seconds,cue:"module_"+id,
    asset:"./assets/audio/modules/"+id+".wav",gain:id==="laser"?.38:id==="emp"?.35:.50
  })])));
  root.GridshardModulePresentation=profiles;
  if(typeof module!=="undefined"&&module.exports)module.exports=profiles;
})(globalThis);
