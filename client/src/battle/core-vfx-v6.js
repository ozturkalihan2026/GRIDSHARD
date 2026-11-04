(function(root){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const THEMES=Object.freeze({
    core_resonance:{shape:'resonance',color:'#ffe66f',light:'#fffbe1'},
    core_guardian:{shape:'fortress',color:'#59dfff',light:'#e5fdff'},
    core_overdrive:{shape:'storm',color:'#ff982f',light:'#fff0b7'},
    core_disruptor:{shape:'verdict',color:'#f66aff',light:'#ffe0ff'},
    core_capacitor:{shape:'summon',color:'#54ffd0',light:'#ecfff8'},
    core_phoenix:{shape:'phoenix',color:'#ffba65',light:'#fff3cf'},
    core_quantum:{shape:'rift',color:'#bda0ff',light:'#f0e7ff'},
  });
  // A reserved, small core budget: ordinary weapon load never hides the hero.
  // Server events own every hit. CSS animates presentation, never combat cadence.
  class GridshardCoreVfx{
    constructor({doc,layer,anchor,cellAnchor=()=>null,domId,now,schedule,sound,quality=()=> 'orta',reduced=()=>false,hidden=()=>false}){
      Object.assign(this,{doc,layer,anchor,cellAnchor,domId,now,schedule,sound,quality,reduced,hidden});
      this.effects=new Map();this.seen=new Set();this.cues=new Map();this.session=null;
    }
    svg(tag,attrs={},parent){const n=this.doc.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(parent)parent.appendChild(n);return n;}
    remove(key){this.effects.get(key)?.node.remove();this.effects.delete(key);}
    clear(){for(const e of this.effects.values())e.node.remove();this.effects.clear();}
    reset(){this.clear();this.seen.clear();this.cues.clear();}
    surface(power,points){
      const theme=THEMES[power],pad=64,left=Math.min(...points.map(p=>p.x))-pad,top=Math.min(...points.map(p=>p.y))-pad;
      const width=Math.max(...points.map(p=>p.x))-left+pad,height=Math.max(...points.map(p=>p.y))-top+pad;
      const n=this.svg('svg',{viewBox:`${left} ${top} ${width} ${height}`,width,height,'aria-hidden':'true'});
      n.classList.add('core-vfx',`core-vfx-${theme.shape}`);n.dataset.corePower=power;
      n.style.left=`${left}px`;n.style.top=`${top}px`;n.style.setProperty('--core-fx-color',theme.color);n.style.setProperty('--core-fx-light',theme.light);
      return n;
    }
    put(key,node,duration,kind='burst',until=0){
      if(this.hidden()||!this.layer())return;
      this.remove(key);
      const cap=this.quality()==='dusuk'?8:12;
      if(this.effects.size>=cap){const victim=[...this.effects].find(([,e])=>e.kind==='burst')||this.effects.entries().next().value;this.remove(victim[0]);}
      node.style.setProperty('--core-fx-ms',`${duration}ms`);this.layer().appendChild(node);
      const entry={node,kind,until};this.effects.set(key,entry);
      this.schedule(duration,()=>{if(this.effects.get(key)===entry)this.remove(key);});
    }
    cue(power,kind,at){
      const name=power+'_'+kind;
      if(this.hidden()||this.now()-(this.cues.get(name)??-Infinity)<240)return;
      this.cues.set(name,this.now());const w=this.layer()?.clientWidth||0;
      this.sound(name,{pan:w?Math.max(-.5,Math.min(.5,at.x/w-0.5)):0});
    }
    point(snapshot,player,id,position){
      const m=snapshot.players[player]?.modules?.find(m=>m.instance_id===id);
      const dom=m&&this.domId(player,m),anchor=dom&&this.anchor(dom);
      return anchor||this.cellAnchor(player,position||(m&&m.x!=null?{x:m.x,y:m.y}:null));
    }
    core(snapshot,player){const m=snapshot.players[player]?.modules?.find(m=>m.definition_id==='core');return m&&this.point(snapshot,player,m.instance_id);}
    path(n,d,cls){return this.svg('path',{d,class:cls},n);}
    ring(n,p,r,cls='core-rune'){return this.svg('circle',{cx:p.x,cy:p.y,r,class:cls},n);}
    polygon(n,p,r,sides,cls,rotation=-Math.PI/2){
      const points=Array.from({length:sides},(_,i)=>`${p.x+Math.cos(rotation+i*Math.PI*2/sides)*r},${p.y+Math.sin(rotation+i*Math.PI*2/sides)*r}`).join(' ');
      return this.svg('polygon',{points,class:cls},n);
    }
    emblem(n,p,shape){
      if(shape==='fortress'){
        this.path(n,`M${p.x-25} ${p.y+23}V${p.y-20}h10v10h9v-16h12v16h9v-10h10v43l-25 15Z`,'core-citadel');
      }else if(shape==='phoenix'){
        this.path(n,`M${p.x} ${p.y+25}Q${p.x-7} ${p.y-8} ${p.x-40} ${p.y-21}Q${p.x-32} ${p.y+12} ${p.x-6} ${p.y+13}L${p.x} ${p.y-20}L${p.x+6} ${p.y+13}Q${p.x+32} ${p.y+12} ${p.x+40} ${p.y-21}Q${p.x+7} ${p.y-8} ${p.x} ${p.y+25}Z`,'core-phoenix-wings');
      }else if(shape==='rift'){
        this.polygon(n,p,31,4,'core-void');this.polygon(n,p,43,4,'core-rune core-orbit');
        this.path(n,`M${p.x-14} ${p.y+36}L${p.x+8} ${p.y+3}l-16 -6 22 -33`,'core-rift-cut');
      }else if(shape==='verdict'){
        this.polygon(n,p,33,6,'core-rune');
        this.path(n,`M${p.x-16} ${p.y-16}l32 32m0 -32l-32 32`,'core-verdict-cross');
      }else if(shape==='summon'){
        this.polygon(n,p,34,3,'core-portal');this.polygon(n,p,26,3,'core-portal core-orbit',Math.PI/2);
      }else if(shape==='storm'){
        this.polygon(n,p,38,8,'core-corona core-orbit');this.polygon(n,p,21,4,'core-white');
      }else{
        this.ring(n,p,36,'core-rune core-orbit');this.ring(n,p,24,'core-rune');
        this.polygon(n,p,15,6,'core-white');
      }
    }
    activation(d,s){
      if(!THEMES[d.power_id])return;
      const a=this.core(s,d.player_id);
      this.cue(d.power_id,'activate',a?.center||{x:(this.layer()?.clientWidth||0)/2,y:0});
      if(!a)return;
      const p=a.center,n=this.surface(d.power_id,[p]);n.dataset.coreEvent='activation';
      this.ring(n,p,47,'core-charge-ring');this.emblem(n,p,THEMES[d.power_id].shape);
      this.put(`activation:${d.player_id}`,n,this.reduced()?350:1000);
      for(const t of d.affected_targets||[]){
        const b=this.point(s,t.player_id,t.module_id);if(!b)continue;
        if(d.role==='reinforcement'){
          const portal=this.surface(d.power_id,[p,b.center]);portal.dataset.coreEvent='reinforcement';
          this.path(portal,`M${p.x} ${p.y}Q${b.center.x} ${p.y} ${b.center.x} ${b.center.y}`,'core-summon-thread');
          this.emblem(portal,b.center,'summon');
          this.svg('rect',{x:b.center.x-25,y:b.center.y-38,width:50,height:76,rx:9,class:'core-materialize'},portal);
          this.put(`summon:${d.player_id}:${t.module_id}`,portal,this.reduced()?450:1450);
        }
      }
      if(d.role==='drain'&&(d.effects||[]).some(e=>e.kind==='repair'&&e.value>0)){
        const t=(d.affected_targets||[]).find(t=>t.player_id!==d.player_id),b=t&&this.point(s,t.player_id,t.module_id);
        if(b){const n=this.surface(d.power_id,[p,b.center]);n.dataset.coreEvent='drain-return';
          this.path(n,`M${b.center.x} ${b.center.y}Q${p.x-50} ${b.center.y} ${p.x} ${p.y}`,'core-life-return');
          this.ring(n,p,33,'core-life-ring');this.put(`drain:${d.player_id}`,n,this.reduced()?350:1000);}
      }
    }
    shot(d,s){
      if(!THEMES[d.power_id])return;
      const a=this.point(s,d.attacker_player_id,d.attacker_module_id),b=this.point(s,d.target_player_id,d.target_module_id,d.target_position);
      this.cue(d.power_id,'shot',b?.center||{x:(this.layer()?.clientWidth||0)/2,y:0});
      if(!a||!b)return;
      const from=a.center,to=b.center,n=this.surface(d.power_id,[from,to]),shape=THEMES[d.power_id].shape;
      n.dataset.coreEvent='impact';n.dataset.coreTarget=d.target_module_id;n.dataset.coreDamage=String(d.damage||0);
      const dx=to.x-from.x,dy=to.y-from.y,length=Math.max(1,Math.hypot(dx,dy)),normal={x:-dy/length,y:dx/length};
      const curve=k=>`M${from.x} ${from.y}Q${(from.x+to.x)/2+normal.x*k} ${(from.y+to.y)/2+normal.y*k} ${to.x} ${to.y}`;
      if(shape==='resonance'){
        this.path(n,curve(0),'core-resonance-halo');this.path(n,curve(0),'core-resonance-beam');
        for(const r of [18,30,43])this.ring(n,to,r,'core-resonance-impact');
        this.polygon(n,to,24,6,'core-rune');
      }else if(shape==='fortress'){
        this.path(n,curve(0),'core-fortress-lance');this.polygon(n,to,27,4,'core-fortress-seal');
        this.path(n,`M${to.x-38} ${to.y}h76m-38 -38v76`,'core-target-lines');
      }else if(shape==='storm'){
        this.path(n,curve(18),'core-flame-ribbon');this.path(n,curve(-18),'core-flame-ribbon');this.path(n,curve(0),'core-flame-white');
        this.polygon(n,to,35,8,'core-corona');this.ring(n,to,24,'core-fire-impact');
      }else if(shape==='verdict'){
        this.path(n,curve(0),'core-verdict-link');
        for(const sign of [-1,1])this.path(n,`M${to.x+sign*42} ${to.y-42}L${to.x} ${to.y}l${sign*42} 42`,'core-verdict-blade');
        this.polygon(n,to,37,6,'core-verdict-seal');
      }else if(shape==='phoenix'){
        this.path(n,curve(24),'core-phoenix-trail');this.path(n,curve(-24),'core-phoenix-trail');
        this.emblem(n,to,'phoenix');this.ring(n,to,34,'core-fire-impact');
      }else if(shape==='rift'){
        this.path(n,curve(0),'core-rift-thread');this.emblem(n,to,'rift');
        this.path(n,`M${to.x-38} ${to.y+18}l76 -36m-76 0l76 36`,'core-rift-shards');
      }
      if(!d.damage)this.ring(n,to,39,'core-blocked');
      // One distinct effect per affected target: an AoE never overwrites itself.
      this.put(`hit:${d.attacker_player_id}:${d.target_module_id}`,n,this.reduced()?320:shape==='storm'?520:900);
    }
    sync(s){
      const keep=new Set();
      for(const[player,state]of Object.entries(s.players)){
        const a=this.core(s,player),power=state.core_power?.id||state.core_type;
        for(const m of state.modules||[]){
          if(m.hp<=0||m.status!=='active')continue;
          const firing=(m.signature_badges||[]).find(b=>b.kind==='core_firing');
          if(m.definition_id==='core'&&firing&&a){
            const id=power||'core_overdrive',key=`channel:${player}`;keep.add(key);
            if(!this.effects.has(key)&&THEMES[id]){const n=this.surface(id,[a.center]);n.dataset.coreEvent='channel';
              this.emblem(n,a.center,THEMES[id].shape);this.ring(n,a.center,43,'core-channel-ring');
              this.put(key,n,Math.max(100,Number(firing.value||1)*1000),'state');}
          }
          const marked=(m.signature_badges||[]).find(b=>b.kind==='execution');
          if(marked){const b=this.point(s,player,m.instance_id),key=`mark:${player}:${m.instance_id}`;keep.add(key);
            if(b&&!this.effects.has(key)){const n=this.surface('core_disruptor',[b.center]);n.dataset.coreEvent='execution-mark';
              this.emblem(n,b.center,'verdict');this.ring(n,b.center,45,'core-verdict-countdown');
              this.put(key,n,Math.max(100,Number(marked.value||1)*1000),'state');}}
        }
      }
      for(const[key,e]of this.effects)if(e.kind==='state'&&!keep.has(key))this.remove(key);
    }
    receive(events,s){
      if(!s?.players)return;
      if(this.session!==s.session_id){this.reset();this.session=s.session_id;}
      if(this.hidden()||s.status==='finished'){this.clear();return;}
      this.sync(s);
      const fresh=Math.max(Number(s.elapsed_ms||0),...(events||[]).map(e=>Number(e.at_ms)||0));
      for(const e of events||[]){
        if(e.type!=='core_power_used'&&!(e.type==='attack_performed'&&e.data?.core_attack))continue;
        const key=JSON.stringify([e.type,e.at_ms,e.data]);
        if(!Number.isFinite(e.at_ms)||e.at_ms<fresh-500||this.seen.has(key))continue;
        this.seen.add(key);if(this.seen.size>256)this.seen.delete(this.seen.values().next().value);
        if(e.type==='core_power_used')this.activation(e.data,s);else this.shot(e.data,s);
      }
    }
  }
  root.GridshardCoreVfx=GridshardCoreVfx;
  if(typeof module!=='undefined'&&module.exports)module.exports={GridshardCoreVfx,THEMES};
})(globalThis);
