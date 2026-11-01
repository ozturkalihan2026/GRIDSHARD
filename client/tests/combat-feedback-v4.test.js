const test=require('node:test'),assert=require('node:assert/strict');
const {corePowerText,coreCue,coreTotalsText}=require('../src/battle/combat-feedback-v4');
test('core notices show actual outcomes and distinguish the seven powers',()=>{
  for(const [power,effects,expected]of[
    ['core_resonance',[{kind:'direct_damage',value:90},{kind:'direct_damage',value:45}],'135 hasar'],
    ['core_guardian',[{kind:'channel',value:6000}],'6 sn çekirdek ateşi'],
    ['core_overdrive',[{kind:'channel',value:7000}],'7 sn çekirdek ateşi'],
    ['core_disruptor',[{kind:'execution_mark',value:1500}],'1.5 sn imha işareti'],
    ['core_capacitor',[{kind:'reinforcement',value:1}],'1 ücretsiz takviye'],
    ['core_phoenix',[{kind:'direct_damage',value:40},{kind:'repair',value:40}],'40 hasar · +40 CAN onarım'],
    ['core_quantum',[{kind:'direct_damage',value:200}],'200 hasar'],
  ]){
    assert.ok(corePowerText({power_id:power,effects,boost_percent:60}).includes(expected),power);
    assert.ok(coreCue(power));
  }
  assert.equal(corePowerText({power_id:'core_resonance',effects:[{kind:'repair',value:10}]},true),'Resonance: +10 HP healed');
  assert.equal(coreTotalsText({repair:10,damage_boosted:7,current:2}),'10 CAN onarım · 7 ek hasar · 2 Akım');
  assert.equal(coreTotalsText({direct_damage:200,executions:1,reinforcements:2}),'200 çekirdek hasarı · 1 imha · 2 takviye');
});
