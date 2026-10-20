(function(root){
  "use strict";
  // v15 canvas effects for the first ten modules (laser, pulse, missile,
  // shield, armor, repair, cooler, battery, amplifier, EMP) + destruction.
  // One canvas inside #battle-effect-layer, driven by the battle's existing
  // frame loop (tick); idle when nothing is alive. Coordinates are the same
  // layer-local CSS pixels the module VFX anchors use. Event gating, caps,
  // hidden/session resets stay with GridshardModuleVfx (the single owner).
  const TAU=Math.PI*2;
  const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
  class GridshardModuleFxCanvas {
    constructor({doc,layer,now=()=>performance.now(),quality=()=>"orta",wake=()=>{},dpr=()=>root.devicePixelRatio||1}){
      Object.assign(this,{doc,layer,now,quality,wake,dpr});
      this.canvas=null;this.ctx=null;this.w=0;this.h=0;this.last=null;
      this.parts=[];this.rings=[];this.beams=[];this.shots=[];this.arcs=[];this.timers=[];
    }
    get active(){return this.parts.length+this.rings.length+this.beams.length+this.shots.length+this.arcs.length+this.timers.length>0;}
    get budget(){return this.quality()==="yuksek"?520:260;}
    ensure(){
      const layer=this.layer();if(!layer)return false;
      if(!this.canvas||this.canvas.parentElement!==layer){
        this.canvas?.remove();
        const c=this.doc.createElement("canvas");c.className="module-fx-canvas";c.setAttribute("aria-hidden","true");
        layer.appendChild(c);this.canvas=c;this.ctx=c.getContext("2d");this.w=this.h=0;
      }
      const w=layer.clientWidth,h=layer.clientHeight,r=Math.min(2,Math.max(1,Number(this.dpr())||1));
      if(!(w>0&&h>0)||!this.ctx)return false;
      if(w!==this.w||h!==this.h||r!==this.r){
        this.canvas.width=Math.round(w*r);this.canvas.height=Math.round(h*r);this.w=w;this.h=h;this.r=r;
        this.ctx.setTransform(r,0,0,r,0,0);
      }
      return true;
    }
    start(){if(!this.ensure())return false;this.wake();return true;}
    clear(){
      this.parts.length=this.rings.length=this.beams.length=this.shots.length=this.arcs.length=this.timers.length=0;
      if(this.ctx)this.ctx.clearRect(0,0,this.w,this.h);this.last=null;
    }
    later(ms,run){this.timers.push({at:this.now()+ms,run});}
    // ---------- primitives ----------
    spark(x,y,o){if(this.parts.length>=this.budget)return;this.parts.push(Object.assign({x,y,vx:0,vy:0,life:0,max:500,size:2,color:"#fff",grav:0,drag:.98,add:true,grow:0,kind:"dot",alpha:1},o));}
    burst(x,y,n,o){
      for(let i=0;i<n;i++){const a=rnd(0,TAU),v=rnd(o.vmin||40,o.vmax||220);
        this.spark(x,y,Object.assign({},o,{vx:Math.cos(a)*v,vy:Math.sin(a)*v*(o.flat||1)-(o.up||0),max:rnd(o.lmin||250,o.lmax||600),size:rnd(o.smin||1.2,o.smax||3)}));}
    }
    smoke(x,y,n,k,o={}){for(let i=0;i<n;i++)this.spark(x+rnd(-6,6)*k,y+rnd(-5,5)*k,Object.assign({kind:"smoke",add:false,color:"#262c33bb",size:5*k,grow:16*k,vx:rnd(-14,14),vy:rnd(-34,-14),max:rnd(700,1200),drag:.985},o));}
    ring(x,y,o){this.rings.push(Object.assign({x,y,life:0,max:380,r0:3,r1:30,color:"#fff",w:3,flat:.55},o));}
    arc(a,b,o){this.arcs.push(Object.assign({x0:a.x,y0:a.y,x1:b.x,y1:b.y,life:0,max:220,color:"#fff",w:1.6,jit:5},o));}
    orb(g,x,y,r,core,glow){
      const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,core);gr.addColorStop(.35,glow);gr.addColorStop(1,"rgba(0,0,0,0)");
      g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
    }
    // ---------- module effects ----------
    laser(from,to,{k=1,blocked=false,ms=560}={}){
      if(!this.start())return;
      for(let i=0;i<10;i++){const a=rnd(0,TAU),r=rnd(6,14)*k;this.spark(from.x+Math.cos(a)*r,from.y+Math.sin(a)*r,{vx:-Math.cos(a)*r*5,vy:-Math.sin(a)*r*5,max:200,color:"#ff7a80",size:1.4*k,drag:1});}
      this.beams.push({x0:from.x,y0:from.y,x1:to.x,y1:to.y,life:0,max:ms,w:3.2*k,c0:"#ff2a44",c1:"#ff8a8f"});
      const color=blocked?"#bff7ff":"#ffd0a0";
      const sprinkle=()=>this.burst(to.x,to.y,3,{color,vmin:50,vmax:170*k,grav:420,up:70,lmax:380,kind:"streak",smin:.9,smax:1.6*k});
      for(let t=60;t<ms-80;t+=55)this.later(t,sprinkle);
      if(blocked)this.ring(to.x,to.y,{color:"#bdf8ff",r1:16*k,max:300,w:2});
    }
    pulse(from,to,travel,{k=1,blocked=false}={}){
      if(!this.start())return;
      this.burst(from.x,from.y,10,{color:"#ffc46a",vmin:70,vmax:220*k,lmax:200,kind:"streak",smax:1.8*k});
      this.ring(from.x,from.y,{color:"#ffb34a",r1:12*k,max:180,flat:1,w:2});
      const lift=Math.min(22,Math.hypot(to.x-from.x,to.y-from.y)*.08);
      this.shots.push({life:0,max:Math.max(120,travel),draw:(t,g)=>{
        const x=lerp(from.x,to.x,t),y=lerp(from.y,to.y,t)-Math.sin(t*Math.PI)*lift;
        this.spark(x,y,{max:240,color:"#ff9a3a",size:2.6*k,vx:rnd(-8,8),vy:rnd(-8,8)});
        g.globalCompositeOperation="lighter";this.orb(g,x,y,9*k,"#fff","#ffbf4a");
      },done:()=>this.impact(to,blocked?"blocked":"kinetic",{k})});
    }
    missiles(from,to,travel,{k=1,blocked=false,count=3}={}){
      if(!this.start())return;
      for(let i=0;i<count;i++){
        const delay=i*70,side=(i-(count-1)/2)*26*k+rnd(-6,6)*k;
        const tx=to.x+rnd(-7,7)*k,ty=to.y+rnd(-5,5)*k,cx=(from.x+tx)/2+side,cy=Math.min(from.y,ty)-50*k-rnd(0,24)*k;
        let px=from.x,py=from.y;
        this.later(delay,()=>{
          this.burst(from.x,from.y,5,{color:"#ffc46a",vmin:40,vmax:120,lmax:180,kind:"streak"});
          this.shots.push({life:0,max:Math.max(200,travel-delay),draw:(t,g)=>{
            const e=t*t*(3-2*t),x=(1-e)*(1-e)*from.x+2*(1-e)*e*cx+e*e*tx,y=(1-e)*(1-e)*from.y+2*(1-e)*e*cy+e*e*ty;
            this.spark(x,y,{kind:"smoke",add:false,color:"#c9d3dc77",size:2*k,grow:7*k,max:600,vx:rnd(-5,5),vy:rnd(-5,5)});
            this.spark(x,y,{max:110,color:"#ffb14a",size:2.2*k});
            const an=Math.atan2(y-py,x-px);px=x;py=y;g.save();g.translate(x,y);g.rotate(an);g.scale(k,k);g.globalCompositeOperation="source-over";
            g.fillStyle="#e9eef3";g.fillRect(-6,-1.8,9,3.6);g.fillStyle="#ff3d4f";g.beginPath();g.moveTo(3,-2.2);g.lineTo(7,0);g.lineTo(3,2.2);g.fill();g.restore();
          },done:()=>this.impact({x:tx,y:ty},blocked?"blocked":"explosion",{k:k*.85})});
        });
      }
    }
    impact(p,kind,{k=1}={}){
      if(!this.start())return;
      if(kind==="blocked"){
        this.ring(p.x,p.y,{color:"#bdf8ff",r1:20*k,max:320,w:2.4});
        this.burst(p.x,p.y,12,{color:"#bff7ff",vmin:50,vmax:180*k,lmax:340,kind:"streak",smax:1.5*k});return;
      }
      if(kind==="explosion"){
        for(let j=0;j<5;j++)this.spark(p.x+rnd(-4,4)*k,p.y+rnd(-4,4)*k,{kind:"smoke",add:true,color:"#ff8a2acc",size:5*k,grow:13*k,max:340,vx:rnd(-40,40),vy:rnd(-50,10)});
        this.burst(p.x,p.y,12,{color:"#ffe08a",vmin:70,vmax:230*k,grav:400,up:70,lmax:480,kind:"streak"});
        this.smoke(p.x,p.y,3,k);this.ring(p.x,p.y+4*k,{color:"#ffb14a",r1:24*k,max:300,w:2.6});return;
      }
      this.ring(p.x,p.y+4*k,{color:"#ffcf6a",r1:30*k,max:340,w:3,fill:"#ff9a3a"});
      this.burst(p.x,p.y,16,{color:"#ffd27a",vmin:70,vmax:260*k,grav:360,up:50,lmax:460,kind:"streak",smax:2*k});
      this.smoke(p.x,p.y,3,k,{vy:-22});
    }
    shieldHit(p,{k=1}={}){if(!this.start())return;this.ring(p.x,p.y,{color:"#e8ffff",r1:22*k,max:420,w:2.6,flat:.6});this.burst(p.x,p.y,14,{color:"#bff7ff",vmin:50,vmax:190*k,lmax:380,kind:"streak",smax:1.5*k});}
    dampen(p,{k=1}={}){
      if(!this.start())return;
      this.ring(p.x,p.y,{color:"#9cc8ff",r1:18*k,max:300,w:3,flat:.5});
      this.burst(p.x,p.y,10,{color:"#d6e9ff",vmin:60,vmax:200*k,grav:300,up:40,lmax:360,kind:"streak",smax:1.6*k});
    }
    repair(from,to,{k=1,ms=620}={}){
      if(!this.start())return;
      for(let t=0;t<ms;t+=40)this.later(t,()=>{
        for(let i=0;i<2;i++){const s=rnd(0,1);this.spark(lerp(from.x,to.x,s)+Math.sin(s*12+t*.02)*3*k,lerp(from.y,to.y,s),{vx:(to.x-from.x)*.9,vy:(to.y-from.y)*.9,max:300,color:"#6dffa8",size:1.7*k,drag:1});}
        this.spark(to.x+rnd(-11,11)*k,to.y+rnd(-8,8)*k,{kind:"plus",vy:-34,max:560,color:"#7dffb4",size:2.6*k,drag:.96});
      });
      this.later(ms-120,()=>this.ring(to.x,to.y+6*k,{color:"#6dffa8",r1:22*k,max:420,w:2}));
    }
    cool(from,to,{k=1}={}){
      if(!this.start())return;
      for(let i=0;i<26;i++)this.later(i*22,()=>{const s=rnd(0,.25);
        this.spark(lerp(from.x,to.x,s),lerp(from.y,to.y,s),{kind:"smoke",add:true,color:"#9feaff55",size:2.6*k,grow:8*k,vx:(to.x-from.x)*rnd(1.3,1.8),vy:(to.y-from.y)*rnd(1.3,1.8)+rnd(-10,10),max:600,drag:.97});});
      this.later(460,()=>this.burst(to.x,to.y,10,{color:"#e6fbff",vmin:16,vmax:60,lmax:640,smin:.8,smax:1.8*k}));
    }
    boost(pair,to,{k=1}={}){
      if(!this.start())return;
      for(const p of pair){this.arc(p,to,{color:"#b9ff6a",w:1.6,jit:4*k,max:240});this.burst(p.x,p.y,5,{color:"#d6ff8a",vmin:30,vmax:90,lmax:260,smax:1.4*k});}
      this.ring(to.x,to.y,{color:"#b9ff6a",r1:16*k,max:300,w:2});
    }
    battery(p,{k=1}={}){
      if(!this.start())return;
      this.ring(p.x,p.y+8*k,{color:"#ffd34a",r1:26*k,max:380,w:2.4});
      for(let i=0;i<8;i++)this.spark(p.x+rnd(-12,12)*k,p.y+rnd(-4,8)*k,{vy:rnd(-70,-35),vx:rnd(-8,8),max:rnd(420,700),color:"#ffe27a",size:rnd(1,2)*k,drag:.98});
    }
    emp(from,to,{k=1}={}){
      if(!this.start())return;
      for(let i=0;i<12;i++){const a=rnd(0,TAU),r=rnd(8,16)*k;this.spark(from.x+Math.cos(a)*r,from.y+Math.sin(a)*r,{vx:-Math.cos(a)*r*4,vy:-Math.sin(a)*r*4,max:240,color:"#e08bff",size:1.5*k,drag:1});}
      this.arc(from,to,{color:"#e08bff",w:2,jit:8*k,max:240});
      this.ring(to.x,to.y+4*k,{color:"#d47bff",r1:34*k,max:500,w:3.4,fill:"#8e37eb"});this.ring(to.x,to.y,{color:"#ffffff",r1:18*k,max:280,w:1.6});
      for(let t=120;t<900;t+=150)this.later(t,()=>this.arc({x:to.x+rnd(-14,14)*k,y:to.y+rnd(-12,6)*k},{x:to.x+rnd(-14,14)*k,y:to.y+rnd(-12,6)*k},{color:"#cfa0ff",w:1.1,jit:3*k,max:120}));
    }
    destroy(p,{k=1}={}){
      if(!this.start())return;
      this.burst(p.x,p.y,20,{color:"#ffb04a",vmin:60,vmax:240*k,grav:420,up:110,lmax:820,smin:1.3,smax:3*k,kind:"streak"});
      this.burst(p.x,p.y,8,{color:"#9aa9b6",add:false,vmin:40,vmax:150*k,grav:500,lmax:1000,smin:2,smax:3.6*k,up:140});
      this.smoke(p.x,p.y,7,k,{color:"#20262cdd",vy:-30,max:1500});
      this.ring(p.x,p.y+6*k,{color:"#ffd27a",r1:40*k,max:420,w:3.6});
    }
    // Working core: 1-2 motes rising from the stone (3 when the core power is ready).
    coreIdle(p,{color="#56f1df",k=1,ready=false}={}){
      if(this.quality()==="dusuk"||!this.start())return;
      for(let i=0,n=ready?3:1+(Math.random()<.5);i<n;i++)this.spark(p.x+rnd(-9,9)*k,p.y+rnd(-3,4)*k,{color,size:rnd(1,2.1)*k,
        vx:rnd(-6,6),vy:-rnd(18,ready?52:34)*k,drag:.99,max:rnd(650,1000),alpha:ready?1:.8});
    }
    // ---------- frame ----------
    tick(now){
      if(!this.active){this.last=null;return false;}
      if(!this.ensure()){this.clear();return false;}
      const dt=this.last===null?1/60:clamp((now-this.last)/1000,0,.05);this.last=now;
      for(let i=this.timers.length-1;i>=0;i--)if(this.timers[i].at<=now){const t=this.timers[i];this.timers.splice(i,1);t.run();}
      const g=this.ctx,ms=dt*1000;g.clearRect(0,0,this.w,this.h);
      for(let i=this.parts.length-1;i>=0;i--){const p=this.parts[i];p.life+=ms;if(p.life>=p.max){this.parts.splice(i,1);continue;}
        p.vx*=p.drag;p.vy=p.vy*p.drag+p.grav*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;const f=p.life/p.max;
        g.globalCompositeOperation=p.add?"lighter":"source-over";g.globalAlpha=(1-f)*p.alpha;
        if(p.kind==="smoke"){const r=p.size+p.grow*f;this.orb(g,p.x,p.y,r,p.color,p.color);}
        else if(p.kind==="streak"){g.strokeStyle=p.color;g.lineWidth=p.size;g.lineCap="round";g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-p.vx*.03,p.y-p.vy*.03);g.stroke();}
        else if(p.kind==="plus"){g.fillStyle=p.color;const s=p.size;g.fillRect(p.x-s,p.y-s/3,s*2,s*2/3);g.fillRect(p.x-s/3,p.y-s,s*2/3,s*2);}
        else{g.fillStyle=p.color;g.beginPath();g.arc(p.x,p.y,p.size*(1-f*.5),0,TAU);g.fill();}
      }
      for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.life+=ms;if(r.life>=r.max){this.rings.splice(i,1);continue;}
        const f=r.life/r.max,e=1-Math.pow(1-f,3),rad=lerp(r.r0,r.r1,e);g.globalCompositeOperation="lighter";g.globalAlpha=1-f;
        g.strokeStyle=r.color;g.lineWidth=r.w*(1-f)+.5;g.beginPath();g.ellipse(r.x,r.y,rad,rad*r.flat,0,0,TAU);g.stroke();
        if(r.fill){g.globalAlpha=(1-f)*.3;g.fillStyle=r.fill;g.fill();}}
      for(let i=this.beams.length-1;i>=0;i--){const b=this.beams[i];b.life+=ms;if(b.life>=b.max){this.beams.splice(i,1);continue;}this.drawBeam(g,b);}
      for(let i=this.shots.length-1;i>=0;i--){const s=this.shots[i];s.life+=ms;const t=Math.min(1,s.life/s.max);s.draw(t,g);if(t>=1){this.shots.splice(i,1);s.done?.();}}
      for(let i=this.arcs.length-1;i>=0;i--){const a=this.arcs[i];a.life+=ms;if(a.life>=a.max){this.arcs.splice(i,1);continue;}
        const f=a.life/a.max;g.globalCompositeOperation="lighter";g.globalAlpha=(1-f)*(Math.random()<.3?.4:1);g.strokeStyle=a.color;g.lineWidth=a.w;g.lineJoin="round";
        g.beginPath();g.moveTo(a.x0,a.y0);for(let j=1;j<7;j++){const t=j/7;g.lineTo(lerp(a.x0,a.x1,t)+rnd(-a.jit,a.jit),lerp(a.y0,a.y1,t)+rnd(-a.jit,a.jit));}g.lineTo(a.x1,a.y1);g.stroke();}
      g.globalCompositeOperation="source-over";g.globalAlpha=1;
      if(!this.active){g.clearRect(0,0,this.w,this.h);this.last=null;}
      return this.active;
    }
    drawBeam(g,b){
      const f=b.life/b.max,grow=clamp(b.life/60,0,1),fade=f<.8?1:1-(f-.8)/.2,fl=.86+Math.sin(b.life*.09)*.08+rnd(-.05,.05);
      const ex=lerp(b.x0,b.x1,grow),ey=lerp(b.y0,b.y1,grow);
      g.globalCompositeOperation="lighter";g.lineCap="round";
      for(const[w,c,a]of[[b.w*3.2,b.c0,.16],[b.w*1.7,b.c0,.42],[b.w*.9,b.c1,.9],[b.w*.35,"#ffffff",1]]){
        g.globalAlpha=a*fade*fl;g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(b.x0,b.y0);g.lineTo(ex,ey);g.stroke();}
      g.globalAlpha=fade;this.orb(g,b.x0,b.y0,b.w*2.6,"#fff",b.c1);
      if(grow>=1)this.orb(g,ex,ey,b.w*3.2*fl,"#fff",b.c1);
    }
  }
  root.GridshardModuleFxCanvas=GridshardModuleFxCanvas;
  if(typeof module!=="undefined"&&module.exports)module.exports=GridshardModuleFxCanvas;
})(globalThis);
