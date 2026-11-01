(function(root){
  "use strict";
  const titles={core_resonance:["Rezonans","Resonance"],core_guardian:["Muhafız","Guardian"],
    core_overdrive:["Aşırı Yük","Overdrive"],core_disruptor:["Kesinti","Disruptor"],
    core_capacitor:["Takviye","Reinforcement"],core_phoenix:["Anka","Phoenix"],core_quantum:["Kuantum","Quantum"]};
  function corePowerText(data,english=false){
    const effects=data.effects||[],sum=kind=>effects.filter(x=>x.kind===kind).reduce((n,x)=>n+Number(x.value||0),0);
    const count=kind=>effects.filter(x=>x.kind===kind).length,parts=[];
    if(sum('direct_damage'))parts.push(`${Math.round(sum('direct_damage'))} ${english?'damage':'hasar'}`);
    if(sum('channel'))parts.push(`${sum('channel')/1000} ${english?'s direct core fire':'sn çekirdek ateşi'}`);
    if(sum('execution_mark'))parts.push(`${sum('execution_mark')/1000} ${english?'s execution mark':'sn imha işareti'}`);
    if(sum('reinforcement'))parts.push(`${sum('reinforcement')} ${english?'free reinforcement':'ücretsiz takviye'}`);
    if(sum('blocked'))parts.push(english?'Target blocked the power':'Hedef gücü engelledi');
    if(sum('repair'))parts.push(`+${Math.round(sum('repair'))} ${english?'HP healed':'CAN onarım'}`);
    if(sum('shield'))parts.push(`+${Math.round(sum('shield'))} ${english?'shield HP':'kalkan CAN'}`);
    if(sum('current'))parts.push(`+${sum('current')} ${english?'Current':'Akım'}`);
    if(count('boost_shots'))parts.push(english?`${count('boost_shots')} weapons · ${sum('boost_shots')} shots +${data.boost_percent||60}%`:`${count('boost_shots')} silah · ${sum('boost_shots')} atış +%${data.boost_percent||60}`);
    if(count('disable')){const seconds=Math.max(...effects.filter(x=>x.kind==='disable').map(x=>x.value))/1000;
      parts.push(english?`${count('disable')} weapons paused · ${seconds}s`:`${count('disable')} silah durdu · ${String(seconds).replace('.',',')} sn`);}
    if(count('hit_guard'))parts.push(english?`${count('hit_guard')} allies · 2-hit guard`:`${count('hit_guard')} dost · 2 isabetlik perde`);
    if(sum('revive'))parts.push(english?`Revived · ${sum('revive')} HP`:`Geri döndü · ${sum('revive')} CAN`);
    return `${(titles[data.power_id]||['Çekirdek','Core'])[english?1:0]}: ${parts.join(' · ')|| (english?'Power active':'Güç etkin')}`;
  }
  function coreCue(power){return titles[power]?power+'_activate':'shield_activate';}
  function coreTotalsText(totals,english=false){
    if(!totals)return '';
    const labels={direct_damage:english?'core damage':'çekirdek hasarı',executions:english?'executions':'imha',reinforcements:english?'reinforcements':'takviye',repair:english?'HP healed':'CAN onarım',damage_boosted:english?'extra damage':'ek hasar',damage_blocked:english?'damage blocked':'hasar engeli',
      revive:english?'HP revived':'CAN geri kurulum',current:english?'Current':'Akım',disable_targets:english?'weapon interruptions':'silah kesintisi'};
    return Object.entries(labels).filter(([key])=>Number(totals[key])>0).map(([key,label])=>`${Math.round(totals[key])} ${label}`).join(' · ');
  }
  const api=Object.freeze({corePowerText,coreCue,coreTotalsText});root.GridshardCombatFeedback=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(globalThis);
