"""100 new Attack HP damage AND 50 new Defense HP lost earn +1 Current.

Both banks consume together, carrying surplus until the cap. Healing, overkill,
friendly damage, reflection and shield prevention cannot manufacture income.
"""

def clear_combat_progress(player):
    player.damage_current_progress=0
    player.defense_current_progress=0

def settle_combat_current(e,side):
    c=e.circuit_credit_config;p=e.state.players[side]
    if p.circuit_credits>=c.maximum_current:
        clear_combat_progress(p);return
    pairs=min(int((p.damage_current_progress+1e-8)/c.damage_current_threshold),
              int((p.defense_current_progress+1e-8)/c.defense_current_threshold))
    grant=min(pairs,c.maximum_current-p.circuit_credits)
    if grant<=0:return
    p.damage_current_progress=max(0,p.damage_current_progress-grant*c.damage_current_threshold)
    p.defense_current_progress=max(0,p.defense_current_progress-grant*c.defense_current_threshold)
    p.damage_current_earned+=grant
    e.award_circuit_credits(side,grant,'damage_exchange')
    if p.circuit_credits>=c.maximum_current:clear_combat_progress(p)

def credit_weapon_damage(e,side,enemy,target,applied,source=None):
    if applied<=0 or side==enemy or source is None or source.definition.combat_class!='saldırı':return
    floor=target.mechanic_state.get('pressure_lowest_hp',target.definition.max_hp)
    fresh=max(0,min(applied,floor-target.hp))
    target.mechanic_state['pressure_lowest_hp']=min(floor,target.hp)
    if not fresh:return
    p=e.state.players[side]
    p.attack_current_total+=fresh;p.damage_current_progress+=fresh
    settle_combat_current(e,side)

def credit_received_damage(e,side,target,attacker_side,attacker_id,applied):
    if applied<=0 or attacker_side==side or target.definition.combat_class!='savunma':return
    owner=e.state.players.get(attacker_side)
    attacker=owner.modules.get(attacker_id) if owner else None
    if attacker is None or attacker.definition.combat_class not in {'saldırı','çekirdek'}:return
    floor=target.mechanic_state.get('received_current_lowest_hp',target.definition.max_hp)
    fresh=max(0,min(applied,floor-target.hp))
    target.mechanic_state['received_current_lowest_hp']=min(floor,target.hp)
    if not fresh:return
    p=e.state.players[side]
    p.defense_current_total+=fresh;p.defense_current_progress+=fresh
    settle_combat_current(e,side)
