(function (global) {
  "use strict";
  // First ten volumetric devices: one shared WebGL canvas/context.
  // No library/download, texture, shadow map, combat mutation or private loop.
  const TILT = Math.PI / 3; // 30 degrees away from overhead, shared with the boards.
  const HOME = { ne:-Math.PI/4, nw:-3*Math.PI/4, se:Math.PI/4, sw:3*Math.PI/4 };
  const yawForAngle = angle => Math.atan2(Math.cos(angle), Math.sin(angle) / Math.sin(TILT));
  const shortest = (from,to) => Math.atan2(Math.sin(to-from),Math.cos(to-from));
  // Keep a continuous interval: the player's turret must NOT take a shortcut
  // through its own board when crossing between the left/right edge targets.
  const forwardYaw = (yaw,enemy=false) => {
    const forward=enemy?0:Math.PI;
    return forward+Math.max(-Math.PI/2,Math.min(Math.PI/2,shortest(forward,yaw)));
  };
  const MUZZLE = [0,-.02,.754];
  const extended = global.GridshardExtendedDeviceModels || (typeof module !== "undefined" && module.exports ? require("./device-models-extended.js") : null);
  const referenceDetails = global.GridshardDeviceReferenceDetails || (typeof module !== "undefined" && module.exports ? require("./device-reference-details.js") : null);
  // All 36 canon devices have an explicit mechanical policy. This is NOT a
  // model availability list: unbuilt devices must never inherit another mesh.
  const ROTATION_RULES = Object.freeze(Object.fromEntries([
    ["laser",180,"enemy"], ["shield",0,"self"], ["cooler",360,"allies"],
    ["battery",0,"circuit"], ["amplifier",0,"circuit"], ["emp",180,"enemy"],
    ["repair",360,"allies"], ["armor",0,"self"], ["pulse_cannon",180,"enemy"],
    ["missile_launcher",180,"enemy"], ["targeting_computer",0,"circuit"],
    ["barrier",0,"self"], ["arc_cannon",180,"enemy"], ["capacitor",0,"circuit"],
    ["drone_bay",180,"enemy"], ["jammer",180,"enemy"], ["railgun",180,"enemy"],
    ["current_balancer",0,"circuit"], ["reflector",180,"enemy"], ["nano_medic",360,"allies"],
    ["virus",180,"enemy"], ["overclock_unit",360,"allies"], ["plasma_mortar",180,"enemy"],
    ["guardian_dome",0,"circuit"], ["quantum_repeater",180,"enemy"], ["chrono_relay",0,"circuit"],
    ["phase_armor",0,"self"], ["swarm_fabricator",180,"enemy"], ["precision_matrix",0,"circuit"],
    ["ion_spear",180,"enemy"], ["prism_shield",0,"self"], ["disruptor",180,"enemy"],
    ["phoenix_repair",360,"allies"], ["quantum_cannon",180,"enemy"],
    ["omega_amplifier",0,"circuit"], ["singularity_projector",180,"enemy"],
  ].map(([id,degrees,targetDomain])=>[id,Object.freeze({degrees,targetDomain,
    movingPart:degrees?"head":"none",idleScan:false})])));
  const SPECS = Object.freeze(Object.fromEntries(Object.entries({
    ...extended?.specs,
    laser:{emitter:MUZZLE,limit:true},
    pulse_cannon:{emitter:[0,-.02,.83]},missile_launcher:{emitter:[0,.38,.80]},
    cooler:{emitter:[0,.06,.41]},repair:{emitter:[0,-.16,.67],pair:[[-.53,-.16,.67],[.53,-.16,.67]]},
    emp:{emitter:[0,.20,0]},shield:{emitter:[0,.15,0],fixed:true},
    battery:{emitter:[0,.55,.10],fixed:true},amplifier:{emitter:[0,.54,0],pair:[[-.32,.54,0],[.32,.54,0]],fixed:true},armor:{emitter:[0,.15,0],fixed:true},
  }).map(([id,spec])=>[id,Object.freeze({...spec,
    fixed:(ROTATION_RULES[id]?.degrees ?? 0)===0,limit:ROTATION_RULES[id]?.degrees===180})])));
  function viewportFor(rect) {
    const size=Math.max(1,Math.min(rect.width-4,rect.height-15));
    return {left:rect.left+(rect.width-size)/2,top:rect.top+rect.height-7-size,size};
  }
  function projectPoint(rect,p,yaw=0,part=1) {
    const v=viewportFor(rect),q=transformVertex(p,part,yaw);
    return {x:v.left+v.size*(.5+q[0]/2.1),
      y:v.top+v.size*(.5-(Math.cos(TILT)*q[1]-Math.sin(TILT)*q[2]+.13)/2.1)};
  }
  function transformVertex(p,part,yaw,recoil=0,work=0,spin=0) {
    p=[...p];
    if(part===2)p[1]+=.12*work;
    if(part===3){const x=p[0],y=p[1]-.06;p[0]=Math.cos(spin)*x-Math.sin(spin)*y;p[1]=.06+Math.sin(spin)*x+Math.cos(spin)*y;}
    const moving=part>0?1:0,a=yaw*moving,c=Math.cos(a),s=Math.sin(a),z=p[2]-recoil*moving;
    return [c*p[0]+s*z,p[1],-s*p[0]+c*z];
  }
  const color = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const PALETTE = { red:color("#e93842"), silver:color("#d4e3ef"), metal:color("#304052"),
    dark:color("#101c2d"), gold:color("#ffbc30"), orange:color("#ff881f"), lens:color("#fff277"),
    green:color("#08ce83"),lime:color("#87ed0b"),cyan:color("#20e5f6"),blue:color("#137af4"),
    purple:color("#8e37eb"),pink:color("#f449fa"),white:color("#f4ffff") };
  // Painted bevel bands: retain saturated faces, silver edges and deep seams.
  for(const [name,rgb] of Object.entries({...PALETTE})){
    PALETTE[name+"Edge"]=rgb.map(v=>Math.min(1,v*.78+.20));
    PALETTE[name+"Shade"]=rgb.map(v=>v*.58);
  }

  function laserMesh(definition="laser") {
    if(!SPECS[definition])throw new Error("Unknown 3D device: "+definition);
    const data=[];
    function triangle(a,b,c,tone,part,center) {
      const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
      let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      const len=Math.hypot(...n); if(len<1e-9)return;
      n=n.map(x=>x/len);
      const mid=a.map((x,i)=>(x+b[i]+c[i])/3-center[i]);
      if(n.reduce((s,x,i)=>s+x*mid[i],0)<0)n=n.map(x=>-x);
      for(const p of [a,b,c])data.push(...p,...n,...PALETTE[tone],part);
    }
    function face(points,tone,part,center) {
      for(let i=1;i<points.length-1;i++)triangle(points[0],points[i],points[i+1],tone,part,center);
    }
    function bevelBox(center,size,tone,part,bevel=.06) {
      const [x,y,z]=center,[hx,hy,hz]=size.map(n=>n/2),b=Math.min(bevel,hx*.45,hy*.45,hz*.45);
      const outline=(sx,sy)=>[[-sx+b,-sy],[sx-b,-sy],[sx,-sy+b],[sx,sy-b],[sx-b,sy],[-sx+b,sy],[-sx,sy-b],[-sx,-sy+b]];
      const rings=[[-hz,outline(hx-b*.45,hy-b*.45)],[-hz+b,outline(hx,hy)],
        [hz-b,outline(hx,hy)],[hz,outline(hx-b*.45,hy-b*.45)]]
        .map(([dz,xy])=>xy.map(([px,py])=>[x+px,y+py,z+dz]));
      face(rings[0],tone,part,center);face(rings[3],tone,part,center);
      for(let r=0;r<3;r++)for(let i=0;i<8;i++)face([rings[r][i],rings[r][(i+1)%8],rings[r+1][(i+1)%8],rings[r+1][i]],r===2?tone+"Edge":r===0?tone+"Shade":tone,part,center);
    }
    function cylinder(center,radius,length,axis,tone,part,sides=16) {
      const point=(theta,t)=>{
        const a=Math.cos(theta)*radius,b=Math.sin(theta)*radius;
        const p=axis==="y"?[a,t,b]:axis==="x"?[t,a,b]:[a,b,t];
        return p.map((x,i)=>x+center[i]);
      };
      const lo=[],hi=[];
      for(let i=0;i<sides;i++){lo.push(point(i*2*Math.PI/sides,-length/2));hi.push(point(i*2*Math.PI/sides,length/2));}
      face(lo,tone,part,center);face(hi,tone,part,center);
      for(let i=0;i<sides;i++)face([lo[i],lo[(i+1)%sides],hi[(i+1)%sides],hi[i]],tone,part,center);
    }
    function pipe(a,b,r,tone,part=1,sides=12){
      const dir=b.map((v,i)=>v-a[i]),length=Math.hypot(...dir),n=dir.map(v=>v/length);
      const ref=Math.abs(n[1])>.9?[1,0,0]:[0,1,0];
      const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      let u=cross(n,ref);const size=Math.hypot(...u);u=u.map(v=>v/size);const v=cross(n,u);
      const ring=p=>Array.from({length:sides},(_,i)=>p.map((x,j)=>x+r*(u[j]*Math.cos(i*2*Math.PI/sides)+v[j]*Math.sin(i*2*Math.PI/sides))));
      const lo=ring(a),hi=ring(b),center=a.map((x,i)=>(x+b[i])/2);
      face(lo,tone,part,center);face(hi,tone,part,center);
      for(let i=0;i<sides;i++)face([lo[i],lo[(i+1)%sides],hi[(i+1)%sides],hi[i]],tone,part,center);
    }
    function cap(c,r,h,tone,part=0){
      for(let j=0;j<6;j++)for(let i=0;i<24;i++){
        const p=(row,col)=>{const a=row/6*Math.PI/2,t=col/24*Math.PI*2;return[c[0]+r*Math.cos(a)*Math.cos(t),c[1]+h*Math.sin(a),c[2]+r*Math.cos(a)*Math.sin(t)];};
        face([p(j,i),p(j,i+1),p(j+1,i+1),p(j+1,i)],tone,part,c);
      }
    }
    function base(tone){
      cylinder([0,-.66,0],.66,.15,"y","dark",0,12);
      cylinder([0,-.55,0],.57,.15,"y",tone,0,12);
      for(let i=0;i<4;i++){
        const a=Math.PI/4+i*Math.PI/2,x=Math.cos(a)*.47,z=Math.sin(a)*.47;
        bevelBox([x,-.59,z],[.31,.27,.34],"silver",0,.09);
        bevelBox([x,-.45,z],[.26,.10,.26],tone,0,.03);
      }
      cylinder([0,-.38,0],.30,.20,"y","metal",0,24);
      cylinder([0,-.27,0],.23,.10,"y","silver",0,24);
      // Front/rear power sockets anchor the same readable feet as the paintings.
      for(const z of[-.56,.56]){
        bevelBox([0,-.51,z],[.22,.11,.055],"dark",0,.02);
        bevelBox([0,-.50,z*1.025],[.15,.045,.025],"gold",0,.01);
      }
    }
    const geometryApi={box:bevelBox,cylinder,pipe,face,base,cap,fixed:SPECS[definition].fixed};
    const finish=()=>{referenceDetails?.build(definition,geometryApi);return new Float32Array(data);};
    if(extended?.build(definition,geometryApi))return finish();
    if(definition==="cooler"){
      base("green");
      bevelBox([0,.07,-.06],[.93,.90,.48],"dark",1,.13);
      bevelBox([0,.07,-.06],[1.0,.98,.56],"green",1,.12);
      for(const x of[-.40,.40])for(const y of[-.29,.45])bevelBox([x,y,.20],[.24,.23,.21],"silver",1,.07);
      cylinder([0,.06,.25],.44,.10,"z","silver",1,24);
      cylinder([0,.06,.31],.374,.026,"z","dark",1,32);
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3,points=[[.10,0],[.34,.10],[.27,.25],[.09,.23]];
        const p=(xy,z)=>[Math.cos(a)*xy[0]-Math.sin(a)*xy[1],.06+Math.sin(a)*xy[0]+Math.cos(a)*xy[1],z];
        face(points.map(q=>p(q,.355)),"cyan",3,[0,.06,.30]);
        face([p(points[0],.36),p(points[1],.36),p(points[2],.37)],"white",3,[0,.06,.3]);
      }
      cylinder([0,.06,.37],.135,.06,"z","silver",1,24);cylinder([0,.06,.407],.09,.02,"z","cyan",1,24);
      for(let i=0;i<4;i++)bevelBox([0,.59,-.23+i*.12],[.67,.045,.055],"silver",1,.014);
      const points=[[.54,.38,-.03],[.66,.30,-.03],[.66,-.19,-.03],[.54,-.27,-.03]];
      for(let i=0;i<3;i++)pipe(points[i],points[i+1],.075,"cyan");
      cylinder([.66,.05,-.03],.10,.13,"y","silver",1);
    }else if(definition==="repair"){
      bevelBox([0,-.55,0],[.76,.29,.86],"green",0,.09);
      for(const side of[-1,1]){
        bevelBox([side*.44,-.52,0],[.27,.37,.95],"dark",0,.09);
        for(const z of[-.30,0,.30]){cylinder([side*.48,-.52,z],.18,.13,"x","metal",0);cylinder([side*.56,-.52,z],.12,.035,"x","green",0);}
        cylinder([side*.42,.05,-.04],.19,.15,"x","silver",1);
        cylinder([side*.51,.05,-.04],.12,.04,"x","gold",1);
        pipe([side*.48,.02,-.01],[side*.60,-.15,.29],.12,"green",2);
        cylinder([side*.61,-.15,.29],.14,.08,"x","silver",2);
        pipe([side*.60,-.15,.29],[side*.53,-.16,.52],.095,"gold",2);
        bevelBox([side*.53,-.16,.55],[.19,.22,.19],"silver",2,.05);
        cylinder([side*.53,-.16,.65],.06,.03,"z","cyan",2);
      }
      cylinder([0,-.32,0],.26,.18,"y","metal",0);
      bevelBox([0,.04,-.09],[.71,.70,.62],"green",1,.12);
      bevelBox([0,.03,.235],[.47,.52,.09],"silver",1,.08);
      cylinder([0,.08,.30],.16,.06,"z","dark",1);cylinder([0,.08,.34],.115,.03,"z","cyan",1,24);
      bevelBox([0,.43,-.04],[.42,.13,.30],"silver",1,.04);bevelBox([0,.51,-.04],[.22,.02,.13],"cyan",1,.01);
    }else if(definition==="missile_launcher"){
      base("red");bevelBox([0,-.03,-.16],[1.05,.61,.65],"red",1,.10);
      for(const side of[-1,1]){cylinder([side*.56,-.12,-.10],.22,.09,"x","metal",1);cylinder([side*.62,-.12,-.10],.14,.04,"x","gold",1);}
      for(const [x,y]of[[-.30,.0],[.30,.0],[0,.38]]){
        cylinder([x,y,-.05],.205,.88,"z","metal",1,12);
        cylinder([x,y,.15],.17,.88,"z","silver",1,16);
        cylinder([x,y,.54],.18,.08,"z","dark",1,16);
        for(let i=0;i<16;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8;face([[x+.17*Math.cos(a),y+.17*Math.sin(a),.58],[x+.17*Math.cos(b),y+.17*Math.sin(b),.58],[x,y,.80]],"red",1,[x,y,.60]);}
        for(const s of[-1,1])bevelBox([x+s*.18,y,-.12],[.12,.075,.32],"red",1,.025);
      }
    }else if(definition==="emp"){
      base("purple");
      cylinder([0,.08,0],.18,.46,"y","pink",1,16);
      for(const y of[-.18,.34])cylinder([0,y,0],.23,.08,"y","silver",1,12);
      for(const side of[-1,1]){
        const points=[[side*.24,-.23,0],[side*.48,-.02,0],[side*.56,.28,0],[side*.48,.54,0],[side*.30,.65,0]];
        for(let i=0;i<4;i++){pipe(points[i],points[i+1],.12,i%2?"purple":"silver");pipe(points[i].map((v,j)=>j===2?v+.12:v),points[i+1].map((v,j)=>j===2?v+.12:v),.045,"pink");}
        bevelBox([side*.29,.65,0],[.22,.21,.26],"silver",1,.04);
        bevelBox([side*.29,.65,.14],[.14,.14,.02],"pink",1,.02);
      }
    }else if(definition==="shield"){
      base("blue");cylinder([0,-.35,0],.50,.16,"y","silver",0,24);
      cap([0,-.27,0],.48,.58,"cyan");
      for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*.52,z=Math.sin(a)*.52;bevelBox([x,-.30,z],[.23,.40,.23],"silver",0,.065);bevelBox([x,-.05,z],[.15,.09,.15],"gold",0,.025);}
    }else if(definition==="battery"){
      base("cyan");
      for(const x of[-.37,0,.37]){
        bevelBox([x,-.02,-.15],[.34,1.0,.48],"cyan",0,.09);
        cylinder([x,.01,.10],.15,.73,"y","gold",0,20);
        cylinder([x,.01,.10],.115,.67,"y","lens",0,20);
        for(const y of[-.40,.40])cylinder([x,y,.10],.19,.14,"y","silver",0,12);
        cylinder([x,.51,.10],.11,.08,"y","gold",0);
      }
      bevelBox([0,.53,.10],[.88,.08,.10],"gold",0,.025);
    }else if(definition==="amplifier"){
      base("green");
      for(const x of[-.32,.32]){
        cylinder([x,.05,0],.19,.84,"y","lime",0,24);
        for(let i=0;i<4;i++)cylinder([x,-.24+i*.18,0],.235,.08,"y","gold",0,24);
        for(const y of[-.39,.48])cylinder([x,y,0],.26,.12,"y","silver",0,12);
        cap([x,.54,0],.15,.08,"lime");
      }
      bevelBox([0,.43,0],[.30,.14,.18],"silver",0,.04);
      for(const x of[-.40,.40]){bevelBox([x,-.40,.42],[.30,.30,.26],"green",0,.06);cylinder([x,-.40,.57],.09,.025,"z","lime",0);}
    }else if(definition==="armor"){
      base("blue");cylinder([0,.02,0],.20,.75,"y","blue",0,24);
      for(const y of[-.28,-.02,.24])cylinder([0,y,0],.29,.15,"y","silver",0,24);
      cylinder([0,.34,0],.17,.04,"y","cyan",0,24);
      for(const x of[-.45,.45]){bevelBox([x,-.02,0],[.29,.86,.73],"blue",0,.12);for(const y of[-.24,.19])pipe([x,y,0],[x*.4,y,0],.09,"metal",0);}
    }
    if(definition!=="laser" && definition!=="pulse_cannon")return finish();
    // Fixed footing/spindle (part 0). All upper mechanics are part 1.
    cylinder([0,-.69,0],.64,.17,"y","dark",0,12);
    cylinder([0,-.57,0],.54,.16,"y","red",0,12);
    cylinder([0,-.46,0],.43,.08,"y","silver",0,24);
    for(const [x,z]of[[-.48,-.37],[.48,-.37],[-.48,.37],[.48,.37]]){
      bevelBox([x,-.66,z],[.36,.29,.39],"metal",0,.09);
      bevelBox([x,-.65,z+.035],[.33,.26,.34],"silver",0,.08);
      bevelBox([x,-.49,z-.01],[.31,.13,.28],"red",0,.045);
    }
    cylinder([0,-.36,0],.18,.32,"y","silver",0);
    bevelBox([0,-.05,-.11],[.72,.60,1.18],"metal",1,.12);
    bevelBox([0,-.03,-.11],[.75,.64,1.20],"red",1,.11);
    bevelBox([0,.335,-.17],[.52,.12,.73],"silver",1,.05);
    bevelBox([0,.415,-.17],[.30,.03,.48],"red",1,.014);
    bevelBox([0,-.10,-.69],[.49,.45,.20],"metal",1);
    bevelBox([0,.04,-.77],[.37,.22,.07],"red",1,.02);
    cylinder([0,-.02,.50],.32,.28,"z","red",1,24);
    cylinder([0,-.02,.66],.335,.08,"z","silver",1,12);
    cylinder([0,-.02,.711],.235,.025,"z","dark",1);
    cylinder([0,-.02,.73],.18,.02,"z","gold",1);
    cylinder([0,-.02,.746],.105,.012,"z","lens",1);
    // Separated armor wedges around the muzzle read as the illustrated silver
    // collar, with a dark structural ring between the plates.
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3+.045,b=(i+1)*Math.PI/3-.045;
      const p=(t,r,z)=>[Math.cos(t)*r,-.02+Math.sin(t)*r,z];
      face([p(a,.355,.65),p(b,.355,.65),p(b,.28,.715),p(a,.28,.715)],"silver",1,[0,-.02,.5]);
    }
    for(const side of[-1,1]){
      bevelBox([side*.385,-.12,-.23],[.08,.37,.62],"silver",1,.035);
      bevelBox([side*.435,-.08,-.23],[.045,.22,.46],"red",1,.025);
      cylinder([side*.44,-.16,-.18],.17,.14,"x","metal",1,24);
      cylinder([side*.52,-.16,-.18],.12,.035,"x","gold",1,24);
      cylinder([side*.544,-.16,-.18],.065,.02,"x","red",1);
      bevelBox([side*.35,.09,-.42],[.04,.11,.29],"dark",1,.015);
      bevelBox([side*.375,.09,-.42],[.015,.06,.20],"gold",1,.01);
      for(let i=0;i<2;i++)bevelBox([side*.35,.10,-.09+i*.10],[.035,.10,.05],"dark",1,.009);
      pipe([side*.30,-.06,-.67],[side*.38,-.20,-.52],.06,"metal");
      pipe([side*.38,-.20,-.52],[side*.39,-.20,-.28],.046,"gold");
    }
    if(definition==="pulse_cannon"){
      for(const side of[-1,1]){
        cylinder([side*.46,-.09,-.14],.24,.38,"x","silver",1,12);
        cylinder([side*.65,-.09,-.14],.18,.08,"x","gold",1,20);
        cylinder([side*.70,-.09,-.14],.11,.03,"x","lens",1,20);
      }
      cylinder([0,-.02,.60],.38,.14,"z","metal",1,12);
      cylinder([0,-.02,.76],.28,.10,"z","gold",1,24);
      cylinder([0,-.02,.82],.18,.02,"z","lens",1,24);
    }
    return finish();
  }
  const VERTEX = `
    attribute vec3 a_position; attribute vec3 a_normal; attribute vec3 a_color; attribute float a_part;
    uniform float u_yaw; uniform float u_recoil; uniform float u_work; uniform float u_spin;
    varying mediump vec3 v_color; varying mediump vec3 v_normal;
    void main() {
      float a=u_yaw*step(0.5,a_part), c=cos(a), s=sin(a);
      vec3 p=a_position,n=a_normal; p.z-=u_recoil*step(0.5,a_part);
      if(a_part>1.5 && a_part<2.5)p.y+=0.12*u_work;
      if(a_part>2.5){float fc=cos(u_spin),fs=sin(u_spin);vec2 q=p.xy-vec2(0.,.06);p.xy=vec2(fc*q.x-fs*q.y,fs*q.x+fc*q.y)+vec2(0.,.06);n.xy=vec2(fc*n.x-fs*n.y,fs*n.x+fc*n.y);}
      p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);
      n=vec3(c*n.x+s*n.z,n.y,-s*n.x+c*n.z);
      float ct=0.5,st=0.8660254;
      vec3 view=vec3(p.x,ct*p.y-st*p.z,st*p.y+ct*p.z);
      gl_Position=vec4(view.x/1.05,(view.y+0.13)/1.05,-view.z/4.0,1.0);
      v_color=a_color; v_normal=n;
    }`;
  const FRAGMENT = `
    precision mediump float; varying mediump vec3 v_color; varying mediump vec3 v_normal; uniform float u_dim;
    void main() {
      vec3 n=normalize(v_normal), l=normalize(vec3(-0.6,0.9,0.8));
      float diffuse=max(dot(n,l),0.0);
      float light=0.38+0.48*diffuse+0.13*smoothstep(.58,.72,diffuse);
      float gloss=0.16*pow(max(dot(n,normalize(l+vec3(0.,0.8660254,0.5))),0.),32.);
      float facing=abs(dot(n,vec3(0.,0.8660254,0.5)));
      float contour=smoothstep(.0,.24,facing)*.38+.62;
      gl_FragColor=vec4(clamp((v_color*light+vec3(gloss))*contour,0.,1.)*u_dim,1.0);
    }`;
  function compile(gl,type,source) {
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
      const log=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(log || "Laser shader compile failed");
    }
    return shader;
  }

  class GridshardLaser3DPilot {
    constructor({document,root,rectFor,enabled=()=>true,reduced=()=>false,dpr=()=>1}) {
      Object.assign(this,{document,root,rectFor,enabled,reduced,dpr});
      this.entries=new Map();this.dirty=false;this.failed=false;this.canvas=null;this.gl=null;
      this.animating=false;
      this.lastTime=null;this.lastGeometry="";
    }
    attach(id,host,enemy=false,definition="laser") {
      if(!SPECS[definition])return;
      const old=this.entries.get(String(id));
      if(old?.host===host && old.definition===definition)return;
      if(old)this.fallback(old);
      const angle=HOME[enemy?"se":"ne"],yaw=forwardYaw(yawForAngle(angle),enemy);
      this.entries.set(String(id),{host,enemy,definition,yaw:SPECS[definition].fixed?0:yaw,target:SPECS[definition].fixed?0:yaw,phase:"rest",workAt:null});this.dirty=true;
    }
    aim(id,pose,time) {
      const entry=this.entries.get(String(id));if(!entry)return;
      if(typeof pose.disabled === "boolean" && entry.disabled !== pose.disabled){entry.disabled=pose.disabled;this.dirty=true;}
      const rect=pose.targetPoint && this.rectFor(String(id));
      if(rect){
        const pivot=projectPoint(rect,[0,SPECS[entry.definition].emitter[1],0]);
        pose={...pose,angle:Math.atan2(pose.targetPoint.y-pivot.y,pose.targetPoint.x-pivot.x)};
      }
      // Missing aim is not an instruction to return home (retain target lock).
      if(!Number.isFinite(pose.angle)){
        if(pose.phase && entry.phase!==pose.phase){entry.phase=pose.phase;this.dirty=true;}
        return;
      }
      const raw=yawForAngle(pose.angle),spec=SPECS[entry.definition];
      const target=spec.fixed?0:spec.limit?forwardYaw(raw,entry.enemy):entry.yaw+shortest(entry.yaw,raw);
      if(entry.target!==target || entry.phase!==pose.phase)this.dirty=true;
      if(pose.phase==="work" && entry.phase!=="work")entry.workAt=time;
      entry.target=target;entry.phase=pose.phase;
    }
    detach(id) {
      const entry=this.entries.get(String(id));if(!entry)return;
      this.fallback(entry);this.entries.delete(String(id));this.dirty=true;
    }
    aimAt(id,point,time) {
      const entry=this.entries.get(String(id)),rect=this.rectFor(String(id));
      if(!entry||!rect||!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return null;
      const pivot=projectPoint(rect,[0,SPECS[entry.definition].emitter[1],0]);
      this.aim(id,{angle:Math.atan2(point.y-pivot.y,point.x-pivot.x),phase:"work"},time);
      // The beam is emitted this frame, not after a cosmetic turn has finished.
      entry.yaw=entry.target;this.dirty=true;this.render(time);
      return this.anchor(id);
    }
    anchor(id) {
      const entry=this.entries.get(String(id)),rect=this.rectFor(String(id));
      if(!entry||!rect||this.failed||!this.enabled()||this.canvas?.hidden||entry.host.dataset.deviceRenderer!=="webgl")return null;
      const spec=SPECS[entry.definition],raised=p=>entry.definition==="repair"&&entry.phase==="work"?[p[0],p[1]+.12,p[2]]:p;
      return {center:projectPoint(rect,[0,spec.emitter[1],0]),emitter:projectPoint(rect,raised(spec.emitter),entry.yaw),pair:spec.pair?.map(p=>projectPoint(rect,raised(p),entry.yaw))};
    }
    invalidate(){this.dirty=true;}
    get needsPresent(){return this.dirty && this.entries.size > 0 && !this.failed && this.enabled();}
    fallback(entry){delete entry.host.dataset.deviceRenderer;}
    suspend(){
      for(const entry of this.entries.values())this.fallback(entry);
      if(this.canvas)this.canvas.hidden=true;
      this.lastTime=null;this.dirty=true;this.animating=false;
    }
    init() {
      if(this.gl || this.failed)return Boolean(this.gl);
      try {
        if(!this.canvas){
          const canvas=this.document.createElement("canvas");canvas.className="module-device-3d-layer";
          canvas.setAttribute("aria-hidden","true");canvas.hidden=true;
          canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();this.gl=null;this.suspend();});
          canvas.addEventListener("webglcontextrestored",()=>{this.failed=false;this.gl=null;this.checked=false;this.invalidate();});
          this.root.appendChild(canvas);this.canvas=canvas;
        }
        const gl=this.canvas.getContext("webgl",{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:"low-power"});
        if(!gl)throw new Error("WebGL unavailable");
        const program=gl.createProgram(),v=compile(gl,gl.VERTEX_SHADER,VERTEX),f=compile(gl,gl.FRAGMENT_SHADER,FRAGMENT);
        gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
        gl.deleteShader(v);gl.deleteShader(f);
        if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error("Laser program link failed");
        this.meshes=new Map();
        gl.useProgram(program);
        this.attributes=[["a_position",3,0],["a_normal",3,12],["a_color",3,24],["a_part",1,36]].map(([name,size,offset])=>{
          const loc=gl.getAttribLocation(program,name);if(loc<0)throw new Error("Device attribute missing");
          gl.enableVertexAttribArray(loc);return {loc,size,offset};
        });
        gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
        this.gl=gl;this.program=program;
        this.yawUniform=gl.getUniformLocation(program,"u_yaw");this.recoilUniform=gl.getUniformLocation(program,"u_recoil");
        this.dimUniform=gl.getUniformLocation(program,"u_dim");
        this.workUniform=gl.getUniformLocation(program,"u_work");this.spinUniform=gl.getUniformLocation(program,"u_spin");
        this.checked=false;return true;
      }catch(_error){this.failed=true;this.gl=null;this.suspend();return false;}
    }
    render(time) {
      for(const [id,entry]of this.entries){if(!entry.host.isConnected){this.fallback(entry);this.entries.delete(id);this.dirty=true;}}
      if(!this.entries.size || !this.enabled() || this.document.hidden){
        if(this.canvas && !this.canvas.hidden)this.suspend();return false;
      }
      if(!this.dirty || this.failed)return false;
      // All geometry reads precede canvas sizing and DOM visibility writes.
      const area=this.root.getBoundingClientRect();
      if(!(area.width>0 && area.height>0))return false;
      const items=[];
      for(const [id,entry]of this.entries){
        const rect=this.rectFor(id);
        if(rect && rect.width>8 && rect.height>18)items.push({entry,rect});
        else this.fallback(entry);
      }
      if(!items.length){this.suspend();return false;}
      if(!this.init())return false;
      const gl=this.gl,ratio=Math.max(1,Math.min(1.5,Number(this.dpr())||1,2048/Math.max(area.width,area.height)));
      const width=Math.round(area.width*ratio),height=Math.round(area.height*ratio);
      if(this.canvas.width!==width)this.canvas.width=width;
      if(this.canvas.height!==height)this.canvas.height=height;
      this.canvas.hidden=false;
      gl.disable(gl.SCISSOR_TEST);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
      gl.enable(gl.SCISSOR_TEST);
      const dt=this.lastTime===null?16:Math.max(0,Math.min(50,time-this.lastTime));this.lastTime=time;
      let moving=false;
      for(const {entry,rect}of items){
        let mesh=this.meshes.get(entry.definition);
        if(!mesh){const data=laserMesh(entry.definition),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);mesh={buffer,count:data.length/10};this.meshes.set(entry.definition,mesh);}
        gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
        for(const {loc,size,offset}of this.attributes)gl.vertexAttribPointer(loc,size,gl.FLOAT,false,40,offset);
        const delta=entry.target-entry.yaw;
        entry.yaw=this.reduced()?entry.target:entry.yaw+delta*(1-Math.exp(-dt/42));
        if(Math.abs(shortest(entry.yaw,entry.target))>.002)moving=true;else entry.yaw=entry.target;
        const recoil=0; // A sustained beam must stay attached to its recorded muzzle.
        const viewport=viewportFor(rect),size=viewport.size;
        const x=Math.round((viewport.left-area.left)*ratio);
        const y=Math.round((area.height-(viewport.top-area.top+size))*ratio);
        const pixels=Math.max(1,Math.round(size*ratio));
        gl.viewport(x,y,pixels,pixels);gl.scissor(Math.max(0,x),Math.max(0,y),pixels,pixels);
        gl.uniform1f(this.yawUniform,entry.yaw);gl.uniform1f(this.recoilUniform,recoil);
        gl.uniform1f(this.dimUniform,entry.disabled ? .68 : 1);
        gl.uniform1f(this.workUniform,entry.phase==="work"?1:0);
        const fan=entry.definition==="cooler" && entry.phase==="work" && time-(entry.workAt||0)<500 && !this.reduced();
        gl.uniform1f(this.spinUniform,fan?(time-(entry.workAt||0))*.025:0);
        if(fan)moving=true;
        gl.drawArrays(gl.TRIANGLES,0,mesh.count);
      }
      // One startup error check, not a blocking GPU query on every frame.
      if(!this.checked){this.checked=true;if(gl.getError()!==gl.NO_ERROR){this.failed=true;this.gl=null;this.suspend();return false;}}
      for(const {entry}of items)if(entry.host.dataset.deviceRenderer!=="webgl")entry.host.dataset.deviceRenderer="webgl";
      this.dirty=moving;this.animating=moving;return true;
    }
  }
  global.GridshardLaser3DPilot=GridshardLaser3DPilot;
  global.GridshardDevice3DSpecs=SPECS;
  global.GridshardDeviceRotationRules=ROTATION_RULES;
  if(typeof module!=="undefined" && module.exports)module.exports={GridshardLaser3DPilot,laserMesh,yawForAngle,shortest,transformVertex,forwardYaw,projectPoint,viewportFor,MUZZLE,HOME,TILT,SPECS,ROTATION_RULES};
})(globalThis);
