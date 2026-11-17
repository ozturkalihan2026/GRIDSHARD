"""Owned offline prototype registry; production never imports this tool."""
from contextlib import contextmanager


@contextmanager
def candidate_catalog():
    from app.game import catalog,battle_pool
    from app.game.recoil_cannon import IDENTITY,definition
    from app.module_roster import MODULE_SPECS
    if IDENTITY in MODULE_SPECS:
        raise RuntimeError('This prototype tool must not replace a live card')
    old=catalog.BASIC_MODULE_DEFINITIONS.get(IDENTITY)
    selectable=battle_pool.PLAYER_SELECTABLE_MODULE_IDS
    catalog.BASIC_MODULE_DEFINITIONS[IDENTITY]=definition()
    battle_pool.PLAYER_SELECTABLE_MODULE_IDS=(*selectable,IDENTITY)
    try:
        yield
    finally:
        battle_pool.PLAYER_SELECTABLE_MODULE_IDS=selectable
        if old is None:catalog.BASIC_MODULE_DEFINITIONS.pop(IDENTITY,None)
        else:catalog.BASIC_MODULE_DEFINITIONS[IDENTITY]=old
