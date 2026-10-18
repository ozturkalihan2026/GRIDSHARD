(function(global){
  "use strict";
  // Package 8B/8C: solid meshes, not rotating billboards. Coordinates use the
  // same fixed footing / yawing head convention as the original ten devices.
  const specs=Object.freeze({
    targeting_computer:{emitter:[0,.22,.38]},barrier:{emitter:[0,.12,.18]},
    arc_cannon:{emitter:[0,.08,.72]},capacitor:{emitter:[0,.55,0]},
    drone_bay:{emitter:[0,-.08,.62]},jammer:{emitter:[0,.22,.25]},
    railgun:{emitter:[0,.06,.89]},current_balancer:{emitter:[0,.18,0]},
    reflector:{emitter:[0,.24,.19]},nano_medic:{emitter:[0,.06,.57],pair:[[-.46,.06,.57],[.46,.06,.57]]},
    virus:{emitter:[0,.08,.80]},overclock_unit:{emitter:[0,.08,.64]},
    plasma_mortar:{emitter:[0,.35,.63]},guardian_dome:{emitter:[0,.32,0]},
    quantum_repeater:{emitter:[-.19,.23,.69]},chrono_relay:{emitter:[0,.23,0]},
    phase_armor:{emitter:[0,.25,0]},swarm_fabricator:{emitter:[0,.10,.54]},
    precision_matrix:{emitter:[0,.36,.23]},ion_spear:{emitter:[0,.06,.91]},
    prism_shield:{emitter:[0,.37,0]},disruptor:{emitter:[0,.08,.70]},
    phoenix_repair:{emitter:[0,.08,.59],pair:[[-.45,.08,.59],[.45,.08,.59]]},
    quantum_cannon:{emitter:[0,.08,.72]},omega_amplifier:{emitter:[0,.23,0]},
    singularity_projector:{emitter:[0,.20,.20]},
    core_resonance:{emitter:[0,.22,0]},core_guardian:{emitter:[0,.20,0]},
    core_overdrive:{emitter:[0,.28,0]},core_disruptor:{emitter:[0,.32,0]},
    core_capacitor:{emitter:[0,.28,0]},core_phoenix:{emitter:[0,.30,0]},core_quantum:{emitter:[0,.24,0]},
  });
  function build(id,api){
    if(!specs[id])return false;
    const {box,cylinder,pipe,face,base,cap}=api;
    const fixed=api.fixed,part=fixed?0:1;
    const b=(c,s,t,p=part)=>box(c,s,t,p,.07);
    const c=(pos,r,h,axis,t,p=part,n=16)=>cylinder(pos,r,h,axis,t,p,n);
    const link=(a,z,r,t,p=part)=>pipe(a,z,r,t,p,10);
    function ring(center,r,t,axis="z",p=part,start=0,end=Math.PI*2){
      const n=32,point=a=>axis==="z"?[center[0]+r*Math.cos(a),center[1]+r*Math.sin(a),center[2]]:
        axis==="x"?[center[0],center[1]+r*Math.sin(a),center[2]+r*Math.cos(a)]:[center[0]+r*Math.cos(a),center[1],center[2]+r*Math.sin(a)];
      for(let i=0;i<n;i++)link(point(start+(end-start)*i/n),point(start+(end-start)*(i+1)/n),.065,t,p);
    }
    function crystal(center,r,h,t,p=part){
      const point=i=>[center[0]+r*Math.cos(i*Math.PI/3),center[1],center[2]+r*Math.sin(i*Math.PI/3)];
      for(let i=0;i<6;i++){
        face([point(i),point(i+1),[center[0],center[1]+h*.6,center[2]]],i%3===0?"white":t,p,center);
        face([point(i+1),point(i),[center[0],center[1]-h*.4,center[2]]],t,p,center);
      }
    }
    function cell(x,y,z,r,h,t,p=part){
      c([x,y,z],r,h,"y",t,p,20);
      for(const sign of[-1,1]){c([x,y+sign*h/2,z],r*1.2,.10,"y","silver",p);c([x,y+sign*(h/2+.07),z],r*.68,.05,"y","gold",p);}
      b([x-r*.3,y,z+r*.94],[r*.24,h*.75,.015],"lens",p);
    }
    function housing(t,width=.64,length=.67){
      b([0,.04,-.17],[width,.49,length],"metal");b([0,.07,-.17],[width+.035,.49,length-.03],t);
      b([0,.335,-.20],[width*.7,.06,length*.7],"silver");
      for(const x of[-1,1]){c([x*(width/2+.03),-.08,-.13],.16,.08,"x","silver");c([x*(width/2+.08),-.08,-.13],.10,.035,"x","gold");}
    }
    function muzzle(z,r,t="cyan",y=.08,x=0){
      c([x,y,z-.10],r*1.16,.16,"z","silver");c([x,y,z-.008],r,.035,"z","dark");c([x,y,z+.014],r*.75,.02,"z",t);
    }
    function arms(t="green",z=.57){
      for(const side of[-1,1]){
        link([side*.29,.27,-.06],[side*.53,.11,.20],.09,t);
        c([side*.54,.11,.20],.13,.08,"x","gold");
        link([side*.53,.11,.20],[side*.46,.06,z-.10],.085,"silver");
        c([side*.46,.06,z-.055],.10,.09,"z",t);c([side*.46,.06,z-.005],.06,.02,"z","cyan");
      }
    }
    function launchBay(x,z,scale=1){
      b([x,-.10,z],[.45*scale,.16,.65*scale],"metal");
      for(const s of[-1,1])b([x+s*.21*scale,.03,z],[.10*scale,.32,.66*scale],"red");
      b([x,.03,z],[.16*scale,.14,.42*scale],"red");
      b([x,.11,z-.03],[.32*scale,.045,.10*scale],"silver");c([x,.05,z+.23*scale],.045*scale,.04,"z","gold");
    }
    if(id.startsWith("core_")){
      const tone={core_resonance:"cyan",core_guardian:"blue",core_overdrive:"red",core_disruptor:"purple",core_capacitor:"cyan",core_phoenix:"orange",core_quantum:"pink"}[id];
      base(tone);
      for(let i=0;i<6;i++){const a=i*Math.PI/3,x=.49*Math.cos(a),z=.49*Math.sin(a);b([x,-.48,z],[.21,.10,.15],"gold",0);}
      if(id==="core_resonance"||id==="core_quantum"){
        crystal([0,.22,0],.23,.64,id==="core_resonance"?"cyan":"pink",0);
        ring([0,.22,0],.47,"silver","z",0);ring([0,.22,0],.42,tone,"x",0);
        for(const side of[-1,1])c([side*.48,.22,0],.11,.10,"x","gold",0);
        if(id==="core_quantum")crystal([0,.02,0],.17,.25,"cyan",0);
      }else if(id==="core_guardian"){
        c([0,.19,0],.53,.25,"z","blue",0,6);c([0,.19,.14],.35,.04,"z","cyan",0,6);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;b([.43*Math.cos(a),.19+.43*Math.sin(a),.15],[.21,.22,.15],"silver",0);}
      }else if(id==="core_overdrive"||id==="core_capacitor"){
        cell(0,.07,0,.27,.82,"gold",0);
        for(let i=0;i<4;i++){
          const a=Math.PI/4+i*Math.PI/2,x=.40*Math.cos(a),z=.40*Math.sin(a);
          if(id==="core_capacitor")cell(x,-.13,z,.12,.36,"gold",0);
          else{c([x,.09,z],.07,.63,"y","silver",0);b([x,-.19,z],[.21,.30,.21],tone,0);b([x,.43,z],[.23,.22,.23],tone,0);}
        }
        for(const y of[-.28,.42])ring([0,y,0],.34,id==="core_overdrive"?"gold":"cyan","y",0);
      }else if(id==="core_disruptor"){
        cap([0,.26,0],.24,.27,"pink",0);crystal([0,.25,0],.22,.43,"purple",0);
        ring([0,.27,0],.40,"silver","z",0,.18,Math.PI-.18);ring([0,.27,0],.40,"purple","z",0,Math.PI+.18,Math.PI*2-.18);
        for(const x of[-.4,.4])cell(x,-.14,.13,.13,.37,"pink",0);
      }else if(id==="core_phoenix"){
        crystal([0,.22,0],.23,.69,"orange",0);
        for(const s of[-1,1]){
          link([s*.27,-.25,0],[s*.44,.18,0],.13,"silver",0);link([s*.44,.18,0],[s*.34,.64,0],.12,"orange",0);
          b([s*.38,.30,0],[.17,.39,.23],"orange",0);
        }
      }
      return true;
    }
    const red=["arc_cannon","drone_bay","railgun","plasma_mortar","quantum_repeater","swarm_fabricator","ion_spear","quantum_cannon"].includes(id);
    const purple=["jammer","virus","disruptor","singularity_projector"].includes(id);
    const blue=["barrier","reflector","guardian_dome","phase_armor","prism_shield"].includes(id);
    const tone=red?"red":purple?"purple":blue?"blue":["capacitor","current_balancer"].includes(id)?"cyan":"green";
    base(tone);
    switch(id){
      case "targeting_computer":
      case "precision_matrix":{
        b([0,.20,-.08],[.67,.56,.39],"green");b([0,.20,.13],[.60,.49,.06],"silver");
        const lenses=id==="targeting_computer"?[[0,.23,.17],[.37,.27,.09]]:[[-.18,.16,.12],[.18,.16,.12],[0,.40,.12]];
        for(const[x,y,r]of lenses)muzzle(.23,r,"gold",y,x);
        b([0,-.18,.27],[.60,.18,.37],"silver");b([0,-.075,.29],[.48,.025,.27],"cyan");
        for(let i=0;i<3;i++)b([-.15+i*.15,-.059,.29],[.015,.01,.23],"white");break;
      }
      case "barrier":
        for(const x of[-.45,.45]){b([x,.04,0],[.23,.96,.32],"blue");b([x,.49,0],[.27,.12,.35],"silver");b([x,-.39,0],[.31,.12,.41],"silver");}
        for(let i=0;i<3;i++)b([0,-.20+i*.24,0],[.77,.20,.17],"silver");break;
      case "capacitor":cell(0,.08,0,.30,.72,"gold");for(const x of[-.37,.37])b([x,.03,-.03],[.16,.79,.35],"cyan");break;
      case "current_balancer":
        cell(0,-.02,0,.17,.34,"green");
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3,x=.42*Math.cos(a),z=.42*Math.sin(a);b([x,-.22,z],[.31,.27,.31],"cyan");link([x,-.10,z],[0,-.10,0],.07,"gold");}
        ring([0,-.07,0],.40,"gold","y");break;
      case "arc_cannon":
      case "disruptor":
      case "virus":{
        housing(tone);muzzle(id==="virus"?.80:.70,.13,id==="virus"?"lime":id==="arc_cannon"?"cyan":"pink");
        if(id==="virus"){c([0,.08,-.12],.28,.61,"z","pink");for(const z of[-.46,.20])c([0,.08,z],.32,.09,"z","silver");}
        for(const s of[-1,1]){link([0,.08+s*.22,.13],[0,.08+s*.31,.50],.10,"silver");link([0,.08+s*.31,.50],[0,.08+s*.19,.77],.10,"silver");}
        break;
      }
      case "railgun":
      case "ion_spear":
        housing("red",.56,.58);
        for(const x of[-.20,.20]){b([x,.06,.44],[.13,.15,.94],"silver");for(const z of[.10,.67])b([x,.06,z],[.19,.21,.10],"gold");}
        c([0,.06,.42],.07,.94,"z",id==="ion_spear"?"cyan":"gold");
        if(id==="ion_spear")b([0,.06,.86],[.12,.12,.12],"cyan");break;
      case "plasma_mortar":
        housing("red",.77,.58);
        link([0,.02,-.15],[0,.35,.55],.28,"red");muzzle(.615,.29,"orange",.35);
        for(const x of[-.42,.42])c([x,-.03,0],.22,.12,"x","gold");break;
      case "quantum_repeater":
        housing("red",.81,.61);
        for(const x of[-.19,.19])for(const y of[-.11,.23]){c([x,y,.27],.15,.70,"z","cyan");c([x,y,.47],.19,.27,"z","red");muzzle(.676,.14,"cyan",y,x);}break;
      case "quantum_cannon":
        housing("red",.77,.71);muzzle(.706,.36,"purple");c([0,.08,.72],.15,.025,"z","cyan");
        for(const x of[-.27,.27]){c([x,.36,-.25],.13,.56,"z","gold");for(const z of[-.55,.06])c([x,.36,z],.16,.08,"z","silver");}break;
      case "drone_bay":launchBay(0,.10,1.6);b([0,.20,-.39],[.77,.31,.18],"red");break;
      case "swarm_fabricator":launchBay(0,.29,.85);launchBay(-.33,-.23,.85);launchBay(.33,-.23,.85);break;
      case "jammer":
      case "singularity_projector":
        ring([0,.20,0],.42,"silver");ring([0,.20,.05],.33,"purple");c([0,.20,.14],id==="jammer"?.10:.18,.10,"z",id==="jammer"?"pink":"dark");
        if(id==="jammer"){for(let i=0;i<3;i++){const a=i*Math.PI*2/3;link([0,.20,.05],[.38*Math.cos(a),.20+.38*Math.sin(a),.05],.045,"silver");}cell(-.44,-.09,-.17,.07,.38,"purple");}
        else ring([0,.20,.17],.17,"pink");break;
      case "reflector":
        for(const x of[-.50,.50])c([x,.22,0],.12,.09,"x","gold");
        c([0,.24,0],.46,.22,"z","silver",part,6);c([0,.24,.13],.37,.035,"z","cyan",part,6);
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3;link([0,.24,.16],[.34*Math.cos(a),.24+.34*Math.sin(a),.16],.035,"silver");}break;
      case "nano_medic":cell(0,.11,0,.23,.65,"green");arms();break;
      case "phoenix_repair":cell(0,.13,-.04,.25,.72,"gold");arms("green",.59);for(const s of[-1,1])b([s*.47,.26,-.08],[.16,.63,.31],"green");break;
      case "overclock_unit":
        housing("green",.65,.64);
        for(const x of[-.33,.33])for(let i=0;i<5;i++)c([x,.18,-.34+i*.13],.19,.055,"z","gold");muzzle(.626,.20,"gold");break;
      case "chrono_relay":
        ring([0,.23,0],.44,"gold");ring([0,.23,0],.38,"gold","x");crystal([0,.05,0],.16,.34,"cyan");crystal([0,.40,0],.16,.34,"cyan");
        for(const x of[-.46,.46])c([x,.23,0],.13,.10,"x","silver");break;
      case "phase_armor":
      case "prism_shield":
        crystal([0,.20,0],id==="prism_shield"?.25:.16,id==="prism_shield"?.88:.51,"cyan");
        for(let i=0;i<(id==="phase_armor"?4:3);i++){const a=i*Math.PI*2/(id==="phase_armor"?4:3),x=.42*Math.cos(a),z=.42*Math.sin(a);b([x,.04,z],[.20,.79,.23],"silver");b([x,.05,z+.03],[.14,.68,.22],"blue");}break;
      case "guardian_dome":
        cap([0,-.13,0],.25,.40,"cyan",part);
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3;cell(.44*Math.cos(a),.03,.44*Math.sin(a),.14,.65,"cyan");b([.44*Math.cos(a),.44,.44*Math.sin(a)],[.30,.20,.30],"blue");}break;
      case "omega_amplifier":
        cell(0,.02,0,.17,.40,"cyan");
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3,x=.41*Math.cos(a),z=.41*Math.sin(a);cell(x,.06,z,.14,.59,"gold");for(let j=0;j<4;j++)c([x,-.12+j*.13,z],.17,.04,"y","gold");link([x,.34,z],[0,.27,0],.065,"silver");}break;
      default:throw new Error("Missing solid device recipe: "+id);
    }
    return true;
  }
  global.GridshardExtendedDeviceModels=Object.freeze({specs,build});
  if(typeof module!=="undefined"&&module.exports)module.exports=global.GridshardExtendedDeviceModels;
})(globalThis);
