from dataclasses import replace
from types import SimpleNamespace

import pytest

from app.game.catalog import get_module_definition
from app.game.composition import deployment_rejection_reason
from app.game.models import ModuleStatus


def active(definition, instance):
    return SimpleNamespace(definition=definition, instance_id=instance, hp=100, status=ModuleStatus.ACTIVE)


@pytest.mark.parametrize("category", ["enerji", "sistem"])
def test_system_alias_keeps_same_copy_limit(category):
    battery = replace(get_module_definition("battery"), category=category)
    player = SimpleNamespace(modules={str(i): active(battery, str(i)) for i in range(2)})
    assert "2 kopya" in deployment_rejection_reason(player, battery)


@pytest.mark.parametrize("incoming", ["enerji", "sistem"])
def test_mixed_aliases_share_one_category_limit(incoming):
    modules = {str(i): active(replace(get_module_definition("battery"), id="system-"+str(i),
        category="sistem" if i % 2 else "enerji"), str(i)) for i in range(3)}
    candidate = replace(get_module_definition("capacitor"), category=incoming)
    assert "Sistem sınırı dolu: 3/3" == deployment_rejection_reason(SimpleNamespace(modules=modules), candidate).rstrip(".")


def test_system_alias_counts_towards_utility_attack_balance():
    battery = replace(get_module_definition("battery"), category="sistem")
    repair = get_module_definition("repair")
    player = SimpleNamespace(modules={"a":active(battery,"a"),"b":active(repair,"b")})
    assert "Devre dengesi" in deployment_rejection_reason(player, get_module_definition("shield"))
