"""No class, copy or offense/utility quotas. Current and board cells govern play."""
def normalize_battle_category(category):
    return 'enerji' if category=='sistem' else category


def active_deployable_modules(player):
    from .models import ModuleStatus
    return tuple(u for u in player.modules.values() if u.status==ModuleStatus.ACTIVE and u.hp>0 and u.definition.id!='core')


def deployment_rejection_reason(player,definition,*,ignored_instance_id=None):
    return None
