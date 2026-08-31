const test = require("node:test");
const assert = require("node:assert/strict");

const {
  GRIDSHARD_BATTLE_EVENT_CHANNELS,
  GridshardBattleEventBus,
  GridshardBattleEffectAggregator,
  GridshardAudioStateOwner,
  GridshardBoosterTargetMode,
} = require("../src/battle/battle-event-bus.js");

test("battle event bus publishes an event to its single channel", () => {
  let now = 50;
  const bus = new GridshardBattleEventBus({ now: () => now });
  const received = [];
  bus.subscribe(GRIDSHARD_BATTLE_EVENT_CHANNELS.GAME_EFFECT, (event) => {
    received.push(event);
    return "handled";
  });

  const result = bus.emit(
    GRIDSHARD_BATTLE_EVENT_CHANNELS.GAME_EFFECT,
    { targetId:"generator-1", amount:8 }
  );

  assert.equal(received.length, 1);
  assert.equal(received[0].occurredAt, 50);
  assert.deepEqual(result.results, ["handled"]);
});

test("same target and semantic effect aggregates inside 900 ms", () => {
  let now = 0;
  const effects = new GridshardBattleEffectAggregator({ now:() => now });
  const base = {
    targetId:"generator-1",
    variant:"heal",
    semanticKey:"value:CAN · ONARIM",
    text:"+8 CAN · ONARIM",
    metadata:{ suffix:"CAN · ONARIM", explicitSign:true },
  };

  const first = effects.ingest({ ...base, amount:8 });
  now = 300;
  const second = effects.ingest({ ...base, amount:5 });
  now = 870;
  const third = effects.ingest({ ...base, amount:7 });

  assert.equal(first.mode, "created");
  assert.equal(second.id, first.id);
  assert.equal(third.id, first.id);
  assert.equal(third.mode, "updated");
  assert.equal(third.amount, 20);
  assert.equal(third.occurrences, 3);
});

test("different simultaneous effects use separate lanes and stale effect is replaced", () => {
  let now = 0;
  const effects = new GridshardBattleEffectAggregator({
    now:() => now,
    windowMs:900,
    lifetimeMs:1200,
  });
  const first = effects.ingest({
    targetId:"core-1",
    variant:"damage",
    semanticKey:"value:HASAR",
    amount:-12,
    text:"-12 HASAR",
  });
  const second = effects.ingest({
    targetId:"core-1",
    variant:"energy",
    semanticKey:"value:ENERJİ",
    amount:-4,
    text:"-4 ENERJİ",
  });
  assert.notEqual(second.id, first.id);
  assert.notEqual(second.lane, first.lane);

  now = 950;
  const replacement = effects.ingest({
    targetId:"core-1",
    variant:"damage",
    semanticKey:"value:HASAR",
    amount:-3,
    text:"-3 HASAR",
  });
  assert.notEqual(replacement.id, first.id);
  assert.ok(replacement.expiredRecordIds.includes(first.id));
  assert.equal(effects.snapshot().some((item) => item.id === first.id), false);
});

test("audio state owner prevents stale pool writers from overwriting battle and result", () => {
  const applied = [];
  const owner = new GridshardAudioStateOwner({
    applyState:(state) => applied.push(state),
  });

  assert.equal(owner.sync({ screen:"play", onlineStatus:"battle" }).state, "battle");
  assert.equal(
    owner.sync({ screen:"play", onlineStatus:"idle", localStatus:"battle" }).state,
    "battle"
  );
  assert.equal(owner.setTerminal("victory").state, "victory");
  assert.equal(
    owner.sync({ screen:"play", onlineStatus:"idle", localStatus:"setup" }).state,
    "victory"
  );
  assert.equal(owner.sync({ screen:"menu" }).state, "menu");
  assert.equal(owner.terminalState, null);
  assert.deepEqual(applied, ["battle", "victory", "menu"]);
  assert.equal(owner.sync({ screen:"settings" }).state, "menu");
});

test("booster targeting is explicitly cancellable", () => {
  const mode = new GridshardBoosterTargetMode();
  assert.equal(mode.select("emergency_repair").active, true);
  const cancelled = mode.cancel({ reason:"normal_module_click" });
  assert.equal(cancelled.active, false);
  assert.equal(cancelled.reason, "normal_module_click");
});
