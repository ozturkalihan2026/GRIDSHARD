from .boosters import BOOSTER_DEFINITIONS
from .models import BoosterOffer

BOOSTER_FIRST_OFFER_MS=30_000
BOOSTER_OFFER_INTERVAL_MS=30_000
BOOSTER_OPTIONS_PER_OFFER=3

def booster_offer_due_at_ms(index:int)->int:
    return BOOSTER_FIRST_OFFER_MS + index*BOOSTER_OFFER_INTERVAL_MS

def build_booster_offer(player_id:str,index:int)->BoosterOffer:
    ids=tuple(BOOSTER_DEFINITIONS.keys())
    if len(ids)<BOOSTER_OPTIONS_PER_OFFER:
        raise ValueError("En az 3 güçlendirici gerekli.")
    offset = index % len(ids)
    rotated = ids[offset:] + ids[:offset]
    return BoosterOffer(
        id=f"{player_id}-booster-{index}",
        booster_ids=tuple(rotated[:BOOSTER_OPTIONS_PER_OFFER]),
        created_at_ms=booster_offer_due_at_ms(index),
    )
