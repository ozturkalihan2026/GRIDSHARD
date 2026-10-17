(function (global) {
  "use strict";
  // Pilot: one procedural low-poly laser, one shared WebGL canvas/context.
  // No library/download, texture, shadow map, combat mutation or private loop.
  const TILT = Math.PI * 35 / 180;
  const HOME = { ne:-Math.PI/4, nw:-3*Math.PI/4, se:Math.PI/4, sw:3*Math.PI/4 };
  const yawForAngle = angle => Math.atan2(Math.cos(angle), Math.sin(angle) / Math.sin(TILT));
  const shortest = (from,to) => Math.atan2(Math.sin(to-from),Math.cos(to-from));
  function transformVertex(p,part,yaw,recoil=0) {
    const a=yaw*part,c=Math.cos(a),s=Math.sin(a),z=p[2]-recoil*part;
    return [c*p[0]+s*z,p[1],-s*p[0]+c*z];
  }
  const color = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const PALETTE = { red:color("#e93842"), silver:color("#d4e3ef"), metal:color("#304052"),
    dark:color("#101c2d"), gold:color("#ffbc30"), lens:color("#fff277") };

  function laserMesh() {
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
      for(let r=0;r<3;r++)for(let i=0;i<8;i++)face([rings[r][i],rings[r][(i+1)%8],rings[r+1][(i+1)%8],rings[r+1][i]],tone,part,center);
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
    // Fixed footing/spindle (part 0). All upper mechanics are part 1.
    cylinder([0,-.69,0],.62,.17,"y","metal",0);
    cylinder([0,-.57,0],.49,.12,"y","red",0);
    for(const [x,z]of[[-.48,-.37],[.48,-.37],[-.48,.37],[.48,.37]]){
      bevelBox([x,-.69,z],[.34,.23,.34],"silver",0);
      bevelBox([x,-.56,z],[.26,.06,.26],"red",0,.025);
    }
    cylinder([0,-.36,0],.18,.32,"y","silver",0);
    bevelBox([0,-.05,-.11],[.55,.48,1.14],"red",1);
    bevelBox([0,.23,-.17],[.46,.10,.73],"silver",1,.035);
    bevelBox([0,-.10,-.69],[.49,.45,.20],"metal",1);
    bevelBox([0,.04,-.77],[.37,.22,.07],"red",1,.02);
    cylinder([0,-.02,.50],.30,.28,"z","red",1);
    cylinder([0,-.02,.66],.31,.08,"z","silver",1);
    cylinder([0,-.02,.711],.235,.025,"z","dark",1);
    cylinder([0,-.02,.73],.18,.02,"z","gold",1);
    cylinder([0,-.02,.746],.105,.012,"z","lens",1);
    for(const side of[-1,1]){
      cylinder([side*.30,-.16,-.18],.16,.14,"x","metal",1);
      cylinder([side*.38,-.16,-.18],.105,.035,"x","gold",1);
      bevelBox([side*.283,.02,-.30],[.025,.09,.27],"gold",1,.01);
      for(let i=0;i<3;i++)bevelBox([side*.285,.06,-.04+i*.10],[.028,.13,.04],"dark",1,.009);
    }
    return new Float32Array(data);
  }
  const VERTEX = `
    attribute vec3 a_position; attribute vec3 a_normal; attribute vec3 a_color; attribute float a_part;
    uniform float u_yaw; uniform float u_recoil;
    varying mediump vec3 v_color; varying mediump vec3 v_normal;
    void main() {
      float a=u_yaw*a_part, c=cos(a), s=sin(a);
      vec3 p=a_position; p.z-=u_recoil*a_part;
      p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);
      vec3 n=vec3(c*a_normal.x+s*a_normal.z,a_normal.y,-s*a_normal.x+c*a_normal.z);
      float ct=0.819152,st=0.573576;
      vec3 view=vec3(p.x,ct*p.y-st*p.z,st*p.y+ct*p.z);
      gl_Position=vec4(view.x/1.05,(view.y+0.13)/1.05,-view.z/4.0,1.0);
      v_color=a_color; v_normal=n;
    }`;
  const FRAGMENT = `
    precision mediump float; varying mediump vec3 v_color; varying mediump vec3 v_normal;
    void main() {
      float light=0.56+0.44*max(dot(normalize(v_normal),normalize(vec3(-0.6,0.9,0.8))),0.0);
      gl_FragColor=vec4(v_color*light,1.0);
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
    attach(id,host,enemy=false) {
      const angle=HOME[enemy?"se":"ne"],yaw=yawForAngle(angle);
      this.entries.set(String(id),{host,yaw,target:yaw,phase:"rest",workAt:null});this.dirty=true;
    }
    aim(id,pose,time) {
      const entry=this.entries.get(String(id));if(!entry)return;
      const angle=Number.isFinite(pose.angle)?pose.angle:HOME[pose.heading] ?? HOME.ne;
      const target=yawForAngle(angle);
      if(entry.target!==target || entry.phase!==pose.phase)this.dirty=true;
      if(pose.phase==="work" && entry.phase!=="work")entry.workAt=time;
      entry.target=target;entry.phase=pose.phase;
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
        const mesh=laserMesh(),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
        gl.useProgram(program);
        for(const [name,size,offset]of[["a_position",3,0],["a_normal",3,12],["a_color",3,24],["a_part",1,36]]){
          const loc=gl.getAttribLocation(program,name);if(loc<0)throw new Error("Laser attribute missing");
          gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,40,offset);
        }
        gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
        this.gl=gl;this.program=program;this.buffer=buffer;this.vertices=mesh.length/10;
        this.yawUniform=gl.getUniformLocation(program,"u_yaw");this.recoilUniform=gl.getUniformLocation(program,"u_recoil");
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
        const delta=shortest(entry.yaw,entry.target);
        entry.yaw=this.reduced()?entry.target:entry.yaw+delta*(1-Math.exp(-dt/42));
        if(Math.abs(shortest(entry.yaw,entry.target))>.002)moving=true;else entry.yaw=entry.target;
        const age=entry.workAt===null?Infinity:time-entry.workAt;
        const recoil=!this.reduced() && entry.phase==="work" && age>=0 && age<170 ? .09*Math.sin(Math.PI*age/170) : 0;
        if(!this.reduced() && (recoil || (entry.phase==="work" && age<170)))moving=true;
        const size=Math.max(1,Math.min(rect.width-4,rect.height-15));
        const x=Math.round((rect.left-area.left+(rect.width-size)/2)*ratio);
        const y=Math.round((area.height-(rect.top-area.top+rect.height-7))*ratio);
        const pixels=Math.max(1,Math.round(size*ratio));
        gl.viewport(x,y,pixels,pixels);gl.scissor(Math.max(0,x),Math.max(0,y),pixels,pixels);
        gl.uniform1f(this.yawUniform,entry.yaw);gl.uniform1f(this.recoilUniform,recoil);
        gl.drawArrays(gl.TRIANGLES,0,this.vertices);
      }
      // One startup error check, not a blocking GPU query on every frame.
      if(!this.checked){this.checked=true;if(gl.getError()!==gl.NO_ERROR){this.failed=true;this.gl=null;this.suspend();return false;}}
      for(const {entry}of items)if(entry.host.dataset.deviceRenderer!=="webgl")entry.host.dataset.deviceRenderer="webgl";
      this.dirty=moving;this.animating=moving;return true;
    }
  }
  global.GridshardLaser3DPilot=GridshardLaser3DPilot;
  if(typeof module!=="undefined" && module.exports)module.exports={GridshardLaser3DPilot,laserMesh,yawForAngle,shortest,transformVertex,HOME,TILT};
})(globalThis);
