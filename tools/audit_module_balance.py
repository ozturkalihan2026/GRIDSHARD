"""Read-only 36-card audit and paired in-memory balance candidates.

Never imports the gateway, opens a player store or edits game constants on disk.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import replace
import hashlib
from itertools import combinations
import json
from pathlib import Path
from statistics import mean, median
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
from app import arena_canon
from app.game import combat, engine as engine_module, module_cycles, sabotage, support
from app.game.ai import enqueue_ai_actions, should_use_core_power
from app.game.catalog import BASIC_MODULE_DEFINITIONS as DEFINITIONS
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState, ModuleStatus
from app.game.operations import has_disabling_sabotage
from app.game.talents import default_ai_talents, stat_modifiers

OUT = ROOT / "artifacts/balance-rollout-20261028/current-audit"
PROPOSAL = json.loads((ROOT / "docs/MODUL_DENGE_ADAYI_20261027.json").read_text(encoding="utf-8"))
ORIGINAL_DEFINITIONS = dict(DEFINITIONS)
ORIGINAL_STATS = arena_canon.module_stats
ORIGINAL_RESISTANCE = sabotage.sabotage_resistance
ORIGINAL_BLOCK_HEAT = BattleEngine._heat_defense_from_block
ORIGINAL_SCALARS = {
    "plasma":combat.SECONDARY_HIT_RATIOS["plasma_mortar"], "swarm":combat.SWARM_RELEASE_RATIO_PER_TARGET,
    "prism":module_cycles.PRISM_CONVERSION_BASE, "prism_cap":module_cycles.PRISM_CONVERSION_CAP,
    "cleanse":support.COOLER_DEBUFF_REDUCTION_MS_PER_PULSE,
}
DECKS = {
    "common":("laser","shield","repair","battery","cooler","armor"),
    "burst":("pulse_cannon","missile_launcher","shield","repair","targeting_computer","battery"),
    "pierce":("railgun","ion_spear","barrier","battery","current_balancer","cooler"),
    "chain":("arc_cannon","plasma_mortar","battery","guardian_dome","nano_medic","chrono_relay"),
    "repeat":("quantum_repeater","drone_bay","targeting_computer","precision_matrix","battery","phase_armor"),
    "swarm":("swarm_fabricator","drone_bay","omega_amplifier","guardian_dome","repair","capacitor"),
    "quantum":("quantum_cannon","laser","battery","capacitor","prism_shield","cooler"),
    "control":("laser","pulse_cannon","emp","jammer","battery","cooler"),
    "infection":("laser","drone_bay","virus","nano_medic","barrier","battery"),
    "disruption":("railgun","pulse_cannon","disruptor","singularity_projector","battery","shield"),
    "speed":("laser","drone_bay","overclock_unit","chrono_relay","cooler","battery"),
    "focus":("railgun","quantum_repeater","precision_matrix","targeting_computer","armor","current_balancer"),
    "healing":("pulse_cannon","missile_launcher","repair","nano_medic","phoenix_repair","shield"),
    "fortress":("laser","railgun","armor","guardian_dome","phase_armor","repair"),
    "legendary":("ion_spear","quantum_cannon","prism_shield","omega_amplifier","phoenix_repair","singularity_projector"),
    "economy":("laser","missile_launcher","battery","capacitor","current_balancer","emp"),
    "amplify":("pulse_cannon","arc_cannon","amplifier","reflector","repair","battery"),
}
CORES = ("core_resonance","core_guardian","core_overdrive","core_disruptor","core_capacitor","core_phoenix","core_quantum")


def configure_decks(extended=False):
    if extended:
        DECKS.update({
            "precision_balanced":("railgun","quantum_repeater","precision_matrix","battery","shield","repair"),
            "chain_balanced":("arc_cannon","plasma_mortar","shield","battery","repair","emp"),
            "swarm_balanced":("swarm_fabricator","laser","omega_amplifier","shield","battery","emp"),
            "user_legendary":("quantum_cannon","omega_amplifier","prism_shield","phoenix_repair","singularity_projector","cooler"),
            "heavy_without_cooler":("quantum_cannon","missile_launcher","battery","shield","repair","emp"),
            "heavy_with_cooler":("quantum_cannon","missile_launcher","battery","shield","cooler","emp"),
            "ordinary_without_cooler":("laser","pulse_cannon","shield","repair","battery","targeting_computer"),
            "ordinary_with_cooler":("laser","pulse_cannon","shield","repair","battery","cooler"),
        })


def candidate_stats(definition, upgrade_level, talents=None):
    stats = ORIGINAL_STATS(definition, upgrade_level, talents)
    level = max(0, min(14, int(upgrade_level)))
    mods = stat_modifiers(talents, definition.cooldown_ms > 0)
    stats["max_hp"] = round(definition.max_hp * PROPOSAL["level_growth"]["hp"]**level * mods["hp"])
    stats["base_damage"] = round(definition.base_damage * PROPOSAL["level_growth"]["damage"]**level * mods["power"], 2)
    return stats


def capped_resistance(module, target, player):
    result = ORIGINAL_RESISTANCE(module, target, player)
    if module.definition.mechanic_id == "virus":
        return result
    plan = sabotage.plan_sabotage(module, player)
    if plan is None:
        return result
    ceiling = .55 * module.definition.cooldown_ms / plan.duration_ms
    return replace(result, duration_multiplier=min(result.duration_multiplier, ceiling))


def normalized_block_heat(self, player_id, target, blocked_damage):
    # Preserve the level-1 heat budget rather than doubling it with damage.
    base_hp = DEFINITIONS.get(target.definition.id, target.definition).max_hp
    return ORIGINAL_BLOCK_HEAT(self, player_id, target, blocked_damage * base_hp / target.definition.max_hp)


def apply_variant(name):
    DEFINITIONS.clear(); DEFINITIONS.update(ORIGINAL_DEFINITIONS)
    arena_canon.module_stats = ORIGINAL_STATS
    sabotage.sabotage_resistance = ORIGINAL_RESISTANCE
    engine_module.sabotage_resistance = ORIGINAL_RESISTANCE
    BattleEngine._heat_defense_from_block = ORIGINAL_BLOCK_HEAT
    combat.SECONDARY_HIT_RATIOS["plasma_mortar"] = ORIGINAL_SCALARS["plasma"]
    combat.SWARM_RELEASE_RATIO_PER_TARGET = ORIGINAL_SCALARS["swarm"]
    engine_module.SWARM_RELEASE_RATIO_PER_TARGET = ORIGINAL_SCALARS["swarm"]
    module_cycles.PRISM_CONVERSION_BASE = ORIGINAL_SCALARS["prism"]
    module_cycles.PRISM_CONVERSION_CAP = ORIGINAL_SCALARS["prism_cap"]
    support.COOLER_DEBUFF_REDUCTION_MS_PER_PULSE = ORIGINAL_SCALARS["cleanse"]
    engine_module.COOLER_DEBUFF_REDUCTION_MS_PER_PULSE = ORIGINAL_SCALARS["cleanse"]
    if name == "baseline":
        return
    if name == "lighter_heavy":
        for key,hp in {"railgun":95,"arc_cannon":100,"plasma_mortar":100,
                       "quantum_repeater":92,"ion_spear":100,"quantum_cannon":105}.items():
            DEFINITIONS[key]=replace(DEFINITIONS[key],max_hp=hp)
        return
    arena_canon.module_stats = candidate_stats
    if name == "curves":
        return
    for key, spec in PROPOSAL["modules"].items():
        values = {"max_hp":spec["hp"], "current_cost":spec["cost"]}
        for source, target in (("damage","base_damage"),("cooldown_ms","cooldown_ms"),("action_energy","action_energy_cost")):
            if source in spec: values[target] = spec[source]
        DEFINITIONS[key] = replace(DEFINITIONS[key], **values)
    sabotage.sabotage_resistance = capped_resistance
    engine_module.sabotage_resistance = capped_resistance
    BattleEngine._heat_defense_from_block = normalized_block_heat
    combat.SECONDARY_HIT_RATIOS["plasma_mortar"] = .60
    combat.SWARM_RELEASE_RATIO_PER_TARGET = .45
    engine_module.SWARM_RELEASE_RATIO_PER_TARGET = .45
    module_cycles.PRISM_CONVERSION_BASE = .08
    module_cycles.PRISM_CONVERSION_CAP = .12
    support.COOLER_DEBUFF_REDUCTION_MS_PER_PULSE = 500
    engine_module.COOLER_DEBUFF_REDUCTION_MS_PER_PULSE = 500


def setup(level, *, talents=False, battle_id="audit", core_type="core_resonance"):
    e = BattleEngine(BattleState(battle_id=battle_id))
    for owner in ("a", "b"):
        player = e.add_player(owner)
        player.core_level = level; player.core_type = core_type
        e.state.player_upgrade_levels[owner] = {key:level-1 for key in DEFINITIONS}
        if talents:
            e.state.player_module_talents[owner] = {key:default_ai_talents(key,d.rarity,level-1) for key,d in DEFINITIONS.items() if key!="core"}
        e.grant_module(owner,f"{owner}-core","core")
        e.set_initial_active_module(owner,f"{owner}-core",2,1)
    return e


def add(e, owner, key, x, y, instance=None):
    instance = instance or f"{owner}-{key}"
    m = e.grant_module(owner,instance,key);e.set_initial_active_module(owner,instance,x,y)
    return m


def inventory(variants=("baseline","curves","roles")):
    rows=[]
    for variant in variants:
        apply_variant(variant)
        for key in PROPOSAL["modules"]:
            d=DEFINITIONS[key]
            for level in (1,8,15):
                s=arena_canon.module_stats(d,level-1)
                plan=sabotage.plan_sabotage if d.category=="sabotaj" else None
                rows.append({"variant":variant,"id":key,"name":d.name_tr,"category":d.category,"rarity":d.rarity,
                    "level":level,"cost":d.current_cost,"hp":s["max_hp"],"damage":s["base_damage"],
                    "cooldown_ms":s["cooldown_ms"],"theoretical_dps":round(s["base_damage"]*1000/s["cooldown_ms"],3) if s["cooldown_ms"] else 0,
                    "energy_per_second":s["energy_per_second"],"effect":s["effect_multiplier"]})
    apply_variant("baseline")
    return rows


def single_target_lab(variant):
    apply_variant(variant); results=[]
    attacks=[key for key,d in DEFINITIONS.items() if d.category=="saldırı"]
    for level in (1,15):
        for key in attacks:
            e=setup(level);gun=add(e,"a",key,1,1)
            target=add(e,"b","shield",0,0)
            # Neutral target with the current laser's CAN, not a charged tank.
            hp=arena_canon.module_stats(DEFINITIONS["laser"],level-1)["max_hp"]
            target.definition=replace(target.definition,id="audit_target",behavior_id="audit_target",category="saldırı",max_hp=hp,
                base_damage=0,cooldown_ms=0,energy_consumption=0,action_energy_cost=0)
            target.hp=hp;e.start()
            for _ in range(600):
                e.step()
                if target.hp<=0: break
            hits=[event for event in e.state.events if event.type=="attack_performed" and event.data.get("target_module_id")==target.instance_id]
            results.append({"variant":variant,"level":level,"id":key,"target_hp":hp,"destroyed":target.hp<=0,
                "ttk_ms":e.state.elapsed_ms,"hits":len(hits),"first_damage":hits[0].data["damage"] if hits else 0})
    return results


def mechanics_lab(variant):
    """90-second isolated heat and control probes, without AI or core powers."""
    apply_variant(variant)
    output={"thermal":[],"control":[]}
    for level in (1,15):
        for key,d in DEFINITIONS.items():
            if d.category!="saldırı":continue
            for with_cooler in (False,True):
                e=setup(level);gun=add(e,"a",key,1,1)
                if with_cooler:add(e,"a","cooler",0,0)
                target=add(e,"b","laser",0,0)
                target.definition=replace(target.definition,base_damage=0,max_hp=10_000_000)
                target.hp=target.definition.max_hp
                e.start();hot=waiting=0
                for _ in range(900):
                    e.step();hot+=int("overheated" in gun.debuffs);waiting+=int(gun.energy_waiting)
                attacks=[ev for ev in e.state.events if ev.type=="attack_performed" and ev.data["attacker_module_id"]==gun.instance_id]
                heat=[ev.at_ms for ev in e.state.events if ev.type=="module_overheated" and ev.data["module_id"]==gun.instance_id]
                output["thermal"].append({"level":level,"id":key,"cooler":with_cooler,
                    "first_overheat_ms":heat[0] if heat else None,"overheated_seconds":hot/10,
                    "energy_waiting_seconds":waiting/10,"shots":len(attacks),"damage":sum(ev.data["damage"] for ev in attacks)})
        for key in ("emp","jammer","virus","disruptor","singularity_projector"):
            for counter in (None,"cooler","repair","barrier"):
                e=setup(level);sab=add(e,"a",key,0,0)
                sab.definition=replace(sab.definition,max_hp=10_000_000);sab.hp=sab.definition.max_hp
                target=add(e,"b","laser",0,0,instance="b-00-target")
                target.definition=replace(target.definition,max_hp=10_000_000);target.hp=target.definition.max_hp
                if counter:add(e,"b",counter,1,0,instance="b-90-counter")
                e.start();disabled=0
                for _ in range(900):
                    e.step();disabled+=has_disabling_sabotage(target)
                events=[ev for ev in e.state.events if ev.type=="sabotage_applied" and ev.data["target_module_id"]==target.instance_id]
                output["control"].append({"level":level,"id":key,"counter":counter,"disabled_fraction":disabled/900,
                    "casts_on_target":len(events),"max_duration_ms":max([ev.data["duration_ms"] for ev in events],default=0)})
    return output


def duel(job, max_ticks=2400):
    variant,level,left,right,seed=job;apply_variant(variant)
    pair="|".join(sorted((left,right)))
    digest=int(hashlib.sha256(f"{pair}:{seed}".encode()).hexdigest()[:8],16)
    core=CORES[digest%len(CORES)]
    e=setup(level,talents=True,battle_id=f"audit:{pair}:{seed}",core_type=core)
    for owner,deck in (("a",left),("b",right)):e.set_battle_pool(owner,DECKS[deck])
    e.start()
    overheat=wait=shots=one_shots=core_hits=core_powers=0
    rejected={}
    seen=0
    for tick in range(max_ticks):
        if e.state.status.value=="finished":break
        if tick%10==0:
            for owner,opponent in (("a","b"),("b","a")):
                p=e.state.players[owner]
                if should_use_core_power(p,e.state.players[opponent]):
                    e.enqueue_command(BattleCommand(owner,"use_core_power",{"request_id":f"audit-{owner}-{tick}"}))
                enqueue_ai_actions(e,owner,opponent)
        e.step()
        for event in e.state.events[seen:]:
            if event.type=="module_overheated":overheat+=1
            elif event.type=="action_energy_waiting":wait+=1
            elif event.type=="core_power_used":core_powers+=1
            elif event.type=="command_rejected":
                reason=event.data.get("reason", "unknown")
                rejected[reason]=rejected.get(reason,0)+1
            elif event.type=="attack_performed":
                shots+=1;data=event.data
                target=e.state.players[data["target_player_id"]].modules[data["target_module_id"]]
                core_hits+=target.definition.id=="core"
                if target.definition.id!="core" and data["damage"]>=target.definition.max_hp:one_shots+=1
        seen=len(e.state.events)
    lifetimes=[]
    born={}
    casts={owner:{key:0 for key in DECKS[deck]} for owner,deck in (("a",left),("b",right))}
    for event in e.state.events:
        d=event.data
        if event.type=="module_placed":born[(d.get("player_id"),d.get("module_id"))]=event.at_ms
        elif event.type=="module_destroyed":
            key=(d.get("player_id"),d.get("module_id"))
            if key in born:lifetimes.append(event.at_ms-born[key])
        elif event.type in ("sabotage_applied","module_cycle_pulse","attack_performed"):
            owner=d.get("player_id",d.get("attacker_player_id"));mid=d.get("module_id",d.get("attacker_module_id"))
            p=e.state.players.get(owner);m=p.modules.get(mid) if p else None
            if m and m.definition.id in casts.get(owner,{}):casts[owner][m.definition.id]+=1
    return {"variant":variant,"level":level,"left":left,"right":right,"seed":seed,"core":core,
        "winner":{"a":left,"b":right}.get(e.state.winner_player_id),"duration_ms":e.state.elapsed_ms,
        "timeout":e.state.status.value!="finished","shots":shots,"full_hp_lethal_hits":one_shots,"overheat_events":overheat,
        "core_powers":core_powers,"command_rejections":rejected,
        "energy_wait_events":wait,"core_hits":core_hits,"lifetime_ms":lifetimes,"casts":casts,
        "deployments":{owner:[m.definition.id for m in p.modules.values() if m.definition.id!="core"] for owner,p in e.state.players.items()}}


def summarize(results):
    output={}
    for variant in sorted({r["variant"] for r in results}):
        output[variant]={}
        for level in sorted({r["level"] for r in results}):
            rs=[r for r in results if r["variant"]==variant and r["level"]==level]
            scores={key:{"wins":0,"games":0} for key in DECKS}
            exposure={key:{"games":0,"wins":0,"deployed":0,"casts":0} for key in PROPOSAL["modules"]}
            for r in rs:
                for side in ("left","right"):
                    deck=r[side];scores[deck]["games"]+=1;scores[deck]["wins"]+=r["winner"]==deck
                    owner="a" if side=="left" else "b"
                    for key in DECKS[deck]:
                        exposure[key]["games"]+=1;exposure[key]["wins"]+=r["winner"]==deck
                        exposure[key]["deployed"]+=r["deployments"][owner].count(key)
                        exposure[key]["casts"]+=r["casts"][owner].get(key,0)
            life=[t for r in rs for t in r["lifetime_ms"]]
            output[variant][level]={"matches":len(rs),"timeouts":sum(r["timeout"] for r in rs),
                "median_seconds":median(r["duration_ms"] for r in rs)/1000,"p90_seconds":sorted(r["duration_ms"] for r in rs)[int(.9*(len(rs)-1))]/1000,
                "destroyed_module_lifetime_median_seconds":median(life)/1000 if life else None,
                "full_hp_lethal_hits":sum(r["full_hp_lethal_hits"] for r in rs),"shots":sum(r["shots"] for r in rs),
                "core_powers":sum(r["core_powers"] for r in rs),
                "command_rejections":sum(sum(r["command_rejections"].values()) for r in rs),
                "overheat_events":sum(r["overheat_events"] for r in rs),"energy_wait_events":sum(r["energy_wait_events"] for r in rs),
                "decks":scores,"module_exposure":exposure}
    return output


def main():
    global OUT
    parser=argparse.ArgumentParser();parser.add_argument("--workers",type=int,default=4)
    parser.add_argument("--variants",nargs="+",default=["baseline"],choices=["baseline","curves","roles","lighter_heavy"])
    parser.add_argument("--output",type=Path)
    parser.add_argument("--extended-decks",action="store_true")
    parser.add_argument("--quick",action="store_true")
    parser.add_argument("--mechanics",action="store_true");args=parser.parse_args()
    configure_decks(args.extended_decks)
    if args.output:OUT=args.output.resolve()
    if not OUT.is_dir():OUT.mkdir(parents=True,exist_ok=True)
    assert set(PROPOSAL["modules"])==set(DEFINITIONS)-{"core"}
    assert set().union(*map(set,DECKS.values()))==set(PROPOSAL["modules"])
    if args.mechanics:
        result={variant:mechanics_lab(variant) for variant in args.variants}
        (OUT/"mechanics-lab.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
        print(json.dumps({variant:{key:len(rows) for key,rows in lab.items()} for variant,lab in result.items()},indent=2));return
    rows=inventory(args.variants)
    (OUT/"inventory.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding="utf-8")
    labs=[]
    for variant in args.variants:labs.extend(single_target_lab(variant))
    (OUT/"single-target-lab.json").write_text(json.dumps(labs,indent=2),encoding="utf-8")
    if args.quick:
        print(json.dumps({"cards":36,"inventory_rows":len(rows),"single_target_trials":len(labs)},indent=2));return
    jobs=[]
    for variant in args.variants:
        for level in (1,8,15):
            for first,second in combinations(DECKS,2):
                for seed in range(2 if level==15 else 1):
                    jobs.extend(((variant,level,first,second,seed),(variant,level,second,first,seed)))
    results=[];start=time.monotonic()
    with ProcessPoolExecutor(max_workers=args.workers,initializer=configure_decks,initargs=(args.extended_decks,)) as pool:
        futures={pool.submit(duel,job):job for job in jobs}
        for future in as_completed(futures):
            try:results.append(future.result())
            except Exception as error:
                print("FAILED",futures[future],repr(error),flush=True);raise
            if len(results)%120==0:
                (OUT/"partial-matches.json").write_text(json.dumps(results),encoding="utf-8")
                print(f"{len(results)}/{len(jobs)} matches; {time.monotonic()-start:.1f}s",flush=True)
    results.sort(key=lambda r:(r["variant"],r["level"],r["left"],r["right"],r["seed"]))
    summary=summarize(results)
    (OUT/"matches.json").write_text(json.dumps(results,indent=2),encoding="utf-8")
    (OUT/"summary.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
    print(json.dumps({v:{level:{k:value for k,value in d.items() if k not in ("decks","module_exposure")} for level,d in levels.items()} for v,levels in summary.items()},indent=2),flush=True)


if __name__=="__main__":main()
