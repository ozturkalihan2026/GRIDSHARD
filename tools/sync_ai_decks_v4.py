"""Refresh the 120 source bots; their 120 generated peers inherit legal decks."""
from pathlib import Path
import sys,json,hashlib
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'server'))
from app.arena_canon import MODULES,unlocked_module_ids
from app.game.ai_archetypes import get_ai_archetype,BOT_ARCHETYPE_IDS

path=ROOT/'server/data/arena_bot_profiles_v1.json'
data=json.loads(path.read_text(encoding='utf8'))
for bot in data['bots']:
    bot['archetype_tr']={'Destek Zinciri':'Taktik Zinciri','Akım Ekonomisi':'Taktik Denge'}.get(bot['archetype_tr'],bot['archetype_tr'])
    style=get_ai_archetype(BOT_ARCHETYPE_IDS.get(bot['archetype_tr'],'balanced'))
    available=set(unlocked_module_ids(bot['rating']));deck=[]
    for wanted in style.battle_pool_ids:
        role=MODULES[wanted]['category']
        candidates=sorted(available-set(deck),key=lambda key:(key!=wanted,MODULES[key]['category']!=role,
            -MODULES[key]['unlock_trophies'],hashlib.sha256(f"{bot['id']}:{key}".encode()).hexdigest()))
        if candidates:deck.append(candidates[0])
    assert len(set(deck))==6 and any(MODULES[k]['category']=='saldırı' for k in deck)
    bot['battle_pool_ids']=deck
data['ruleset']='current_only_readable_v4'
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f"{len(data['bots'])} source decks updated; generated peers inherit these decks")
