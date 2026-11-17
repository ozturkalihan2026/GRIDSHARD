const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RecoilCannonPresentation } = require('../src/battle/recoil-cannon-presentation');
const options = { session: 'battle-a', elapsedMs: 100, moduleIds: ['gun'] };
const wear = { type: 'module_recoil', at_ms: 0, data: { definition_id: 'recoil_cannon', module_id: 'gun', hp_loss: 16, counts_as_enemy_damage: false } };
const shot = { type: 'attack_performed', at_ms: 0, data: { attacker_module_id: 'gun', target_player_id: 'enemy', target_module_id: 'target', damage: 38, damage_kind: 'direct' } };

test('one real discharge has separate own wear and target presentation; duplicate snapshot is silent', () => {
  const adapter = new RecoilCannonPresentation();
  const actions = adapter.consume([wear, shot], options);
  assert.deepEqual(actions.map(a => a.type), ['wear', 'shot']);
  assert.equal(actions[0].hpLoss, 16);
  assert.equal(actions[1].impact, true);
  assert.deepEqual(adapter.consume([wear, shot], { ...options, elapsedMs: 200 }), []);
  assert.equal(wear.data.hp_loss, 16); // Adapter does not mutate server input.
});

test('phase-blocked shot still fires but does not show a damaging target impact', () => {
  const adapter = new RecoilCannonPresentation();
  const actions = adapter.consume([wear, { ...shot, data: { ...shot.data, damage: 0 } }], options);
  assert.equal(actions[1].impact, false);
  const floor = new RecoilCannonPresentation().consume([{ ...wear, data: { ...wear.data, hp_loss: 0 } }, shot], options);
  assert.deepEqual(floor.map(a => a.type), ['shot']);
});

test('EMP without a real discharge, unrelated cards and derived damage never invent shots', () => {
  const adapter = new RecoilCannonPresentation();
  const events = [{ type: 'cooldown_started', at_ms: 0, data: {} }, { ...shot, data: { ...shot.data, attacker_module_id: 'laser' } },
    { ...shot, data: { ...shot.data, damage_kind: 'echo' } }, { ...wear, data: { ...wear.data, counts_as_enemy_damage: true } }];
  assert.deepEqual(adapter.consume(events, options), []);
});

test('hidden, finished and stale events cannot replay a burst on return; new battle resets dedupe', () => {
  const adapter = new RecoilCannonPresentation();
  assert.deepEqual(adapter.consume([wear, shot], { ...options, visible: false }), []);
  assert.deepEqual(adapter.consume([wear, shot], options), []);
  assert.equal(adapter.consume([shot], { ...options, session: 'battle-b' }).length, 1);
  assert.deepEqual(adapter.consume([wear], { ...options, session: 'battle-b', finished: true }), []);
  assert.deepEqual(new RecoilCannonPresentation().consume([wear, shot], { ...options, elapsedMs: 1000 }), []);
});
