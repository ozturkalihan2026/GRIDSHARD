"""Approved main-game roster; legacy category is only a preserved target profile."""
import json
from pathlib import Path

ROSTER=json.loads((Path(__file__).resolve().parent.parent/'data/module_roster_v2.json').read_text(encoding='utf-8'))
MODULE_SPECS={m['id']:m for m in ROSTER['modules']}
RETIRED_MODULE_IDS=frozenset(m['id'] for m in ROSTER['retired'])
STARTER_IDS=tuple(ROSTER['arenas'][0]['new_cards'])
COMBAT_CLASSES=('saldırı','savunma','taktik')

if len(MODULE_SPECS)!=len(ROSTER['modules']) or len(MODULE_SPECS)<24:
    raise ValueError('Ana modül kataloğu eksik veya tekrarlı.')
if any(m['category'] not in COMBAT_CLASSES for m in MODULE_SPECS.values()):
    raise ValueError('Ana oyunda yalnız üç sınıf vardır.')
if RETIRED_MODULE_IDS.intersection(MODULE_SPECS):
    raise ValueError('Kaldırılan modül aktif kataloğa giremez.')
