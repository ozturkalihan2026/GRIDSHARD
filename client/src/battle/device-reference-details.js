(function(root){
  "use strict";
  // Hand-authored geometry from the approved local illustrations.
  // All pieces are added once to the cached mesh; no frame-time construction.
  const recipes={
    laser(a){a.vents([0,.14,-.77],"z",3,.08);for(const s of[-1,1])a.port([s*.47,.12,.16],"x","gold");},
    shield(a){
      for(let row=0;row<3;row++)for(let i=0;i<8;i++){
        const y=-.15+row*.14,r=Math.sqrt(Math.max(0,.48*.48-(y+.27)*(y+.27)*.68));
        const theta=i*Math.PI/4+(row%2)*Math.PI/8;
        const points=Array.from({length:6},(_,k)=>{const angle=k*Math.PI/3,yy=y+Math.sin(angle)*.065,tt=theta+Math.cos(angle)*.15,rr=Math.sqrt(Math.max(0,.48*.48-(yy+.27)*(yy+.27)*.68))+.003;return[Math.cos(tt)*rr,yy,Math.sin(tt)*rr];});
        for(let j=0;j<6;j++)a.pipe(points[j],points[(j+1)%6],.006,"white",0,4);
      }
      for(const x of[-.48,.48])a.panel([x,-.28,.25],[.12,.21,.04],"cyan",0);
    },
    cooler(a){for(const x of[-.40,.40])for(const y of[-.29,.45])a.bolt([x,y,.32],"z");a.vents([-.51,.08,-.08],"x",4,.13);},
    battery(a){for(const x of[-.37,0,.37]){a.panel([x,.31,.27],[.16,.07,.025],"gold");a.b([x,.02,.222],[.028,.51,.016],"white");}a.port([.57,-.27,0],"x","gold");},
    amplifier(a){for(const s of[-1,1]){a.pipe([s*.32,.25,-.20],[s*.48,-.27,-.26],.045,"metal",0,8);a.panel([s*.32,.50,.25],[.15,.07,.025],"lime");}a.panel([0,-.28,.44],[.19,.10,.04],"lime");},
    emp(a){for(const s of[-1,1]){a.b([s*.44,-.36,.30],[.27,.27,.24],"silver");a.b([s*.44,-.36,.43],[.19,.19,.02],"dark");for(let i=0;i<3;i++)a.b([s*.44,-.42+i*.055,.447],[.14,.021,.015],"pink");}a.port([0,-.50,.57],"z","gold",0);},
    repair(a){a.panel([0,-.12,.29],[.15,.09,.025],"lime");for(const s of[-1,1]){a.b([s*.40,-.27,.12],[.14,.13,.15],"gold");a.b([s*.58,-.07,.54],[.05,.12,.15],"metal",2);}a.vents([0,.10,-.41],"z",3,.10);},
    armor(a){for(const s of[-1,1]){a.port([s*.61,-.10,.25],"x","silver");a.panel([s*.36,-.37,.40],[.18,.13,.035],"cyan");a.pipe([s*.39,.18,-.20],[s*.22,.18,-.05],.075,"metal",0,8);}a.b([0,-.40,.48],[.29,.22,.19],"blue");a.panel([0,-.39,.585],[.19,.075,.02],"cyan");},
    pulse_cannon(a){for(const s of[-1,1]){a.b([s*.44,-.31,.33],[.22,.24,.31],"silver");a.panel([s*.44,-.29,.50],[.14,.14,.025],"gold");}for(const x of[-.18,.18])a.b([x,.34,.42],[.10,.07,.25],"red");},
    missile_launcher(a){for(const [x,y]of[[-.30,0],[.30,0],[0,.38]]){a.c([x,y,-.34],.22,.12,"z","red");a.c([x,y,-.405],.14,.03,"z","dark");}a.vents([0,-.51,.57],"z",3,.11,0);},
    targeting_computer(a){a.radar([0,-.058,.29],.15);a.panel([0,-.34,.38],[.25,.08,.03],"gold");for(const x of[-.29,.29])a.b([x,.47,-.09],[.11,.06,.22],"silver");},
    barrier(a){for(const x of[-.45,.45]){a.panel([x,.37,.175],[.14,.07,.02],"gold");a.c([x*.66,.01,.04],.05,.45,"y","gold");a.port([x,.06,.19],"z","cyan");}a.b([0,-.36,.13],[.24,.10,.08],"gold");},
    arc_cannon(a){a.c([0,.08,.20],.17,.30,"z","cyan");for(const s of[-1,1])a.panel([s*.36,.17,-.16],[.025,.08,.18],"gold");},
    capacitor(a){for(const s of[-1,1]){a.pipe([s*.29,.46,0],[s*.39,.32,0],.055,"gold",0,8);a.panel([s*.37,.03,.16],[.075,.28,.02],"gold");}for(const x of[-.12,.12])a.c([x,.54,0],.075,.10,"y","gold");},
    drone_bay(a){for(const s of[-1,1]){a.panel([s*.34,.20,.12],[.08,.025,.40],"gold");a.b([s*.34,.25,-.28],[.13,.10,.16],"silver");}a.c([0,.10,.40],.075,.04,"z","gold");a.b([0,.30,-.35],[.38,.06,.05],"gold");},
    jammer(a){a.port([-.45,-.20,.12],"z","gold");a.c([-.44,.18,-.17],.075,.08,"y","gold");a.panel([0,-.46,.56],[.20,.10,.02],"gold",0);},
    railgun(a){for(const s of[-1,1]){a.b([s*.20,.16,.43],[.07,.04,.71],"dark");a.b([s*.20,.06,.84],[.18,.25,.14],"red");a.panel([s*.30,.16,-.12],[.025,.075,.15],"gold");}},
    current_balancer(a){for(let i=0;i<3;i++){const t=i*Math.PI*2/3,x=.42*Math.cos(t),z=.42*Math.sin(t);a.c([x,-.05,z],.12,.07,"y","silver");a.c([x,-.008,z],.065,.02,"y","lime");}a.c([0,.22,0],.18,.06,"y","silver");a.c([0,.26,0],.11,.02,"y","lime");},
    reflector(a){a.c([-.55,.22,0],.08,.045,"x","gold");a.c([.55,.22,0],.08,.045,"x","gold");a.panel([0,-.25,.24],[.22,.07,.03],"gold");},
    nano_medic(a){for(const s of[-1,1])a.b([s*.20,.11,.14],[.055,.53,.07],"silver");a.panel([0,-.38,.43],[.22,.08,.03],"gold");a.b([-.07,.09,.234],[.028,.36,.012],"white");},
    virus(a){for(const t of[-.35,0,.35])a.c([0,.08,t],.30,.06,"z","purple");for(const s of[-1,1])a.panel([s*.28,-.06,-.10],[.025,.07,.20],"pink");a.c([0,.08,.76],.07,.15,"z","lime");},
    overclock_unit(a){for(const x of[-.20,0,.20])a.b([x,.41,-.18],[.12,.06,.48],"silver");a.b([0,.46,-.30],[.51,.07,.08],"green");},
    plasma_mortar(a){for(const s of[-1,1]){a.b([s*.26,.40,-.21],[.14,.08,.22],"silver");a.panel([s*.40,.14,-.19],[.025,.10,.20],"dark");}a.c([0,.35,.63],.21,.015,"z","gold");},
    guardian_dome(a){for(let i=0;i<3;i++){const t=i*Math.PI*2/3,x=.44*Math.cos(t),z=.44*Math.sin(t);a.b([x,.42,z],[.31,.25,.31],"silver");a.b([x,.57,z],[.19,.06,.19],"blue");a.pipe([x,-.20,z],[0,-.20,0],.05,"gold",0,8);}a.c([0,-.15,0],.27,.05,"y","silver");},
    quantum_repeater(a){for(const x of[-.19,.19])for(const y of[-.11,.23]){a.c([x,y,.10],.17,.09,"z","silver");a.c([x,y,.36],.17,.07,"z","red");}},
    chrono_relay(a){for(const y of[-.09,.55]){a.c([0,y,0],.21,.055,"y","silver");a.c([0,y+.03,0],.16,.025,"y","cyan");}a.panel([0,-.46,.55],[.20,.08,.025],"cyan",0);},
    phase_armor(a){a.c([0,-.12,0],.20,.07,"y","gold");a.c([0,-.20,0],.25,.08,"y","silver");},
    swarm_fabricator(a){for(const [x,z]of[[0,.29],[-.33,-.23],[.33,-.23]]){a.b([x,-.07,z+.22],[.12,.09,.025],"dark");for(const s of[-1,1])a.c([x+s*.09,.16,z-.08],.04,.05,"y","gold");}},
    precision_matrix(a){for(const x of[-.16,0,.16])for(const z of[.21,.32,.43])a.b([x,-.055,z],[.12,.014,.075],"blue");for(const x of[-.29,.29])a.vents([x,.25,-.03],"x",2,.13);},
    ion_spear(a){for(const s of[-1,1]){a.b([s*.20,.06,.84],[.16,.24,.15],"red");a.b([s*.20,.06,.67],[.19,.21,.10],"gold");}a.b([0,.06,.91],[.08,.08,.04],"white");},
    prism_shield(a){for(let i=0;i<3;i++){const t=i*Math.PI*2/3,x=.42*Math.cos(t),z=.42*Math.sin(t);a.c([x,-.37,z+.10],.095,.07,"z","silver");a.c([x,-.37,z+.15],.06,.035,"z","gold");}a.c([0,-.13,0],.26,.08,"y","gold");},
    disruptor(a){a.c([0,.08,-.12],.23,.48,"z","pink");for(const z of[-.38,.12])a.c([0,.08,z],.28,.07,"z","silver");a.c([0,.08,.69],.095,.03,"z","white");},
    phoenix_repair(a){for(const s of[-1,1]){a.b([s*.20,.13,.14],[.055,.60,.07],"silver");a.panel([s*.47,.27,.09],[.075,.16,.02],"gold");a.b([s*.41,-.03,.62],[.045,.11,.07],"gold");}a.b([-.08,.12,.213],[.025,.40,.015],"white");},
    quantum_cannon(a){for(const s of[-1,1]){a.c([s*.27,.36,-.07],.15,.05,"z","silver");a.c([s*.27,.36,-.43],.15,.05,"z","silver");}a.c([0,.08,.747],.075,.01,"z","white");},
    omega_amplifier(a){for(let i=0;i<3;i++){const t=i*Math.PI*2/3,x=.41*Math.cos(t),z=.41*Math.sin(t);a.c([x,.40,z],.22,.15,"y","green",0,6);a.c([x,.49,z],.16,.05,"y","silver");a.c([x,.54,z],.09,.06,"y","gold");}a.panel([0,-.46,.56],[.20,.07,.025],"gold",0);},
    singularity_projector(a){for(const s of[-1,1]){a.c([s*.47,.20,0],.15,.09,"x","silver");a.c([s*.53,.20,0],.09,.04,"x","gold");}a.c([0,.20,.23],.05,.01,"z","white");}
  };
  function build(id,api){
    const recipe=recipes[id];if(!recipe)return false;
    const p=api.fixed?0:1;
    const b=(pos,size,t,part=p)=>api.box(pos,size,t,part,.025);
    const c=(pos,r,h,axis,t,part=p,n=10)=>api.cylinder(pos,r,h,axis,t,part,n);
    const panel=(pos,size,t,part=p)=>{b(pos,size,"dark",part);b([pos[0],pos[1],pos[2]+.012],size.map(v=>v*.72),t,part);};
    const bolt=(pos,axis,part=p)=>{c(pos,.027,.02,axis,"metal",part,8);};
    const port=(pos,axis,t,part=p)=>{c(pos,.10,.045,axis,"metal",part);c(pos,.065,.052,axis,t,part);};
    const vents=(pos,axis,count,step,part=p)=>{for(let i=0;i<count;i++){const v=[...pos];v[1]+=(i-(count-1)/2)*step;b(v,axis==="x"?[.02,.025,.17]:[.17,.025,.02],"dark",part);}};
    const radar=(pos,r)=>{for(let i=0;i<12;i++){const a=i*Math.PI/6,z=(i+1)*Math.PI/6;api.pipe([pos[0]+Math.cos(a)*r,pos[1]+.006,pos[2]+Math.sin(a)*r],[pos[0]+Math.cos(z)*r,pos[1]+.006,pos[2]+Math.sin(z)*r],.005,"white",p,4);}api.pipe(pos,[pos[0]+r*.6,pos[1],pos[2]+r*.6],.008,"white",p,4);};
    recipe({...api,b,c,panel,bolt,port,vents,radar});return true;
  }
  root.GridshardDeviceReferenceDetails=Object.freeze({build,ids:Object.freeze(Object.keys(recipes))});
  if(typeof module!=="undefined"&&module.exports)module.exports=root.GridshardDeviceReferenceDetails;
})(globalThis);
