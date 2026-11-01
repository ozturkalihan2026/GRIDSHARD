"""Actual core outcomes, separate from promised buffs or nominal shield size."""
def record(e,side,kind,value,target_player_id,target_module_id,unit='hp',emit=True):
    if value<=0:return
    p=e.state.players[side]
    p.core_contributions[kind]=round(p.core_contributions.get(kind,0)+value,2)
    if emit:e._emit('core_contribution',{'player_id':side,'power_id':p.core_type,'contribution_kind':kind,
        'value':round(value,2),'unit':unit,'target_player_id':target_player_id,'target_module_id':target_module_id})
