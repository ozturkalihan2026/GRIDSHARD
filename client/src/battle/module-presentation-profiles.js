(function(root){
  "use strict";
  // Each canon module owns a bounded visual/audio signature. No gameplay values.
  const rows=[
    ["laser","beam","#ff354b",0,190,0.24],
    ["shield","hex","#62d9ff",null,330,0.24],
    ["cooler","mist","#b9f6ff",null,90,0.5],
    ["battery","charge","#ffd049",null,260,0.22],
    ["amplifier","coil","#b4f55b",null,290,0.26],
    ["emp","arc","#d76aff",null,130,0.28],
    ["repair","heal","#57ef9a",null,370,0.28],
    ["armor","plates","#80baff",null,80,0.19],
    ["pulse_cannon","orb","#ffa141",340,115,0.27],
    ["missile_launcher","rocket","#ffb458",500,70,0.48],
    ["targeting_computer","reticle","#99f496",null,430,0.15],
    ["barrier","bars","#83c6ff",null,180,0.22],
    ["arc_cannon","arc","#5fe7ff",100,220,0.25],
    ["capacitor","charge","#ffd97d",null,245,0.23],
    ["drone_bay","drone","#ffd576",430,140,0.36],
    ["jammer","waves","#ca85ff",null,155,0.32],
    ["railgun","rail","#f3d790",70,110,0.2],
    ["current_balancer","triad","#57e9d9",null,310,0.2],
    ["reflector","mirror","#9efbff",null,410,0.18],
    ["nano_medic","heal","#7affca",null,460,0.26],
    ["virus","packets","#cd66ff",null,165,0.3],
    ["overclock_unit","chevrons","#ffb543",null,320,0.24],
    ["plasma_mortar","plasma","#ff793e",600,75,0.42],
    ["guardian_dome","hex","#39cdf5",null,190,0.26],
    ["quantum_repeater","double","#8bf6ff",100,350,0.22],
    ["chrono_relay","clock","#80e6d3",null,385,0.3],
    ["phase_armor","phase","#89bcff",null,230,0.25],
    ["swarm_fabricator","swarm","#ffba67",440,175,0.32],
    ["precision_matrix","reticle","#ffde88",null,470,0.15],
    ["ion_spear","spear","#55edff",80,300,0.21],
    ["prism_shield","prism","#c5faff",null,440,0.23],
    ["disruptor","fracture","#f77aff",null,120,0.27],
    ["phoenix_repair","phoenix","#ffd576",null,400,0.4],
    ["quantum_cannon","quantum","#ae7dff",380,95,0.37],
    ["omega_amplifier","coil","#82ffb6",null,280,0.3],
    ["singularity_projector","vortex","#c18aff",null,65,0.4],
  ];
  const profiles=Object.freeze(Object.fromEntries(rows.map(([id,shape,color,travel,hz,seconds])=>[id,Object.freeze({
    id,shape,color,travel,hz,seconds,cue:"module_"+id,
    asset:"./assets/audio/modules/"+id+".wav",gain:id==="laser"?.38:id==="cooler"?.45:.50
  })])));
  root.GridshardModulePresentation=profiles;
  if(typeof module!=="undefined"&&module.exports)module.exports=profiles;
})(globalThis);
