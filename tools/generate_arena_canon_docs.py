"""Arena, modül, ödül ve bot tablolarını sunucu verisinden yeniden üretir.

Üretilen belgeler: docs/ARENA_MODUL_ODUL_KANONU.md ve docs/BOT_HAVUZU_120.md.
Kaynak: server/app/arena_canon.py, server/data/arena_progression_v1.json ve
server/data/arena_bot_profiles_v1.json. Açılış sırası, eşikler, duraklar ya da
bot desteleri değişince çalıştırılır:

    python tools/generate_arena_canon_docs.py
"""
from __future__ import annotations

import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.arena_canon import ARENAS, LEAGUE_CHESTS, LEAGUE_GROUPS, LEAGUE_STAGES, MODULES
from app.meta_progression import CORE_TYPES


CATEGORY = {"saldırı": "Saldırı", "savunma": "Savunma", "destek": "Destek",
            "sabotaj": "Sabotaj", "sistem": "Sistem"}
RARITY = {"common": "Sıradan", "rare": "Ender", "epic": "Destansı", "legendary": "Efsanevi"}
CORE_BY_ARENA = {int(core["unlock_arena"]): core["name_tr"] for core in CORE_TYPES}
CORE_NAME = {core["id"]: core["name_tr"] for core in CORE_TYPES}
LEAGUE_NAME = {key: name for key, name, *_ in LEAGUE_GROUPS}
# Bot belgesinin elle yazılmış giriş satırları korunur; tablo yeniden üretilir.
BOT_DOCUMENT_INTRO_LINES = 5
BOT_DOCUMENT_NOTE = (
    "12 Ekim 2026 (Devre Yolu düzenlemesi): modüller ileri arenalara ve liglere dağıtıldığı için 106 deste yeniden "
    "eşlendi. Her bot yalnız kendi arenasında açık modülleri kullanır; Arena 1 botlarının hepsi aynı altı modülle "
    "oynar. Lig maçlarında Arena 12 botları, oyuncunun liginde açılmış efsanevi modüllerle güçlenir "
    "(`league_bot_battle_pool`, `server/app/arena_canon.py`)."
)


def number(value: int) -> str:
    return f"{int(value):,}".replace(",", ".")


def unlock_label(item: dict) -> str:
    order = int(item["unlock_arena"])
    return f"Arena {order}" if order <= 12 else LEAGUE_NAME[item["unlock_league"]]


def arena_canon_lines() -> list[str]:
    lines: list[str] = []
    add = lines.append
    add("# GRIDSHARD 2.1 — Arena · Modül · Ödül Kanonu")
    add("")
    add("Bu belge `server/data/arena_progression_v1.json` ve `server/app/arena_canon.py` verisinden üretilir "
        "(12 Ekim 2026 Devre Yolu düzenlemesi). Çelişki olursa kod ve veri geçerlidir.")
    add("")
    add("**Katalog:** Arena 1'de 6 modül, Arena 2–12'de 23 modül, yedi lige girişte 7 efsanevi modül = **36 modül**.")
    add("")
    add("## Arena 1 modülleri (başlangıç destesi)")
    add("")
    add("| Modül | Sınıf | Enderlik | Akım |")
    add("|---|---|---|---:|")
    for item in MODULES.values():
        if int(item["unlock_arena"]) == 1:
            add(f"| {item['name_tr']} | {CATEGORY[item['category']]} | {RARITY[item['rarity']]} | {item['current_cost']} |")
    add("")
    add("## Arena yolu")
    for arena in ARENAS:
        index = int(arena["index"])
        add("")
        add(f"### Arena {index} — {arena['name_tr']} ({number(arena['minimum_rating'])}–{number(arena['maximum_rating'])} Kupa)")
        add("")
        opened = [item["name_tr"] for item in MODULES.values() if int(item["unlock_arena"]) == index]
        add(f"**Açılan modüller:** {', '.join(opened)}")
        if index in CORE_BY_ARENA:
            add("")
            add(f"**Açılan çekirdek:** {CORE_BY_ARENA[index]}")
        add("")
        add("| Kupa | Ödül |")
        add("|---:|---|")
        for node in arena["nodes"]:
            if not node.get("rewards"):
                continue
            add(f"| {number(node['trophies'])} | {node['description_tr']} |")
    add("")
    add("## Ligler")
    add("")
    add("3600 kupadan sonra beşer kademeli yedi lig ve tek kademeli GRIDSHARD Ligi gelir. Modül yalnız lige girişte "
        "(ilk kademede) açılır; kademeler ara ödül, lig sonu o ligin sandığını verir. Sezon değişiminde lig oyuncusu "
        "3600 kupaya (Kıvılcım Ligi I) döner; alınmış ödüller ve açılmış modüller kalır.")
    add("")
    add("| Lig | Kademe genişliği | Başlangıç | Lige girişte açılan modül | Lig sandığı |")
    add("|---|---:|---:|---|---|")
    for key, name_tr, _name_en, tiers, width in LEAGUE_GROUPS:
        first = next(stage for stage in LEAGUE_STAGES if stage["league"] == key)
        module = next((item["name_tr"] for item in MODULES.values() if item.get("unlock_league") == key), "—")
        chest = LEAGUE_CHESTS[key][0] if key in LEAGUE_CHESTS else "GRIDSHARD Sandığı"
        add(f"| {name_tr}{' I–V' if tiers > 1 else ''} | {width if width else '—'} | {number(first['minimum_rating'])} | {module} | {chest} |")
    add("")
    add("### Lig sandıkları")
    add("")
    add("Lig sandığı mağazada ya da başka bir yerde bulunmaz; içeriği şansa bağlı değildir ve alındığında doğrudan verilir.")
    add("")
    add("| Sandık | Kupa | Devre Kredisi | Akı | Modül parçası |")
    add("|---|---:|---:|---:|---|")
    for stage in LEAGUE_STAGES:
        for node in stage["nodes"]:
            if not node.get("league_chest"):
                continue
            rewards = node["rewards"]
            target = rewards.get("module_shard_target")
            shards = (f"{MODULES[target]['name_tr']} × {rewards['module_shards']}" if target
                      else f"{rewards['module_shards']} (rastgele açık modül) + kozmetik seti")
            add(f"| {node['description_tr']} | {number(node['trophies'])} | {number(rewards['circuit_credits'])} | {number(rewards['flux_shards'])} | {shards} |")
    add("")
    add("### Lig durakları")
    add("")
    add("| Kademe | Kupa aralığı | Duraklar |")
    add("|---|---:|---|")
    for position, stage in enumerate(LEAGUE_STAGES):
        following = LEAGUE_STAGES[position + 1]["minimum_rating"] if position + 1 < len(LEAGUE_STAGES) else None
        span = (f"{number(stage['minimum_rating'])}–{number(following - 1)}" if following
                else f"{number(stage['minimum_rating'])}+")
        stops = "; ".join(f"{number(node['trophies'])}: {node['description_tr']}" for node in stage["nodes"])
        add(f"| {stage['name_tr']} | {span} | {stops} |")
    add("")
    add("## 36 modül ana listesi")
    add("")
    add("| # | Modül | Sınıf | Enderlik | Açılış | Kupa | Akım | Temel CAN | Temel Hasar |")
    add("|---:|---|---|---|---|---:|---:|---:|---:|")
    for position, item in enumerate(MODULES.values(), start=1):
        add(f"| {position} | {item['name_tr']} | {CATEGORY[item['category']]} | {RARITY[item['rarity']]} | "
            f"{unlock_label(item)} | {number(item['unlock_trophies'])} | {item['current_cost']} | {item['max_hp']} | {item['base_damage']} |")
    add("")
    return lines


def bot_pool_lines(existing: list[str]) -> list[str]:
    bots = json.loads(
        (ROOT / "server" / "data" / "arena_bot_profiles_v1.json").read_text(encoding="utf-8")
    )["bots"]
    lines = list(existing[:BOT_DOCUMENT_INTRO_LINES])
    lines += ["", BOT_DOCUMENT_NOTE, "",
              "| Arena | Bot | Ad | Arketip | Kupa | Çekirdek | Deste |",
              "|---:|---|---|---|---:|---|---|"]
    for bot in bots:
        deck = ", ".join(MODULES[module_id]["name_tr"] for module_id in bot["battle_pool_ids"])
        lines.append(
            f"| {bot['arena']} | {bot['id']} | {bot['display_name']} | {bot['archetype_tr']} | {bot['rating']} | "
            f"{CORE_NAME.get(bot['core_type'], bot['core_type'])} | {deck} |"
        )
    lines.append("")
    return lines


def write(path: Path, lines: list[str]) -> None:
    # Depodaki belgeler CRLF satır sonu kullanır.
    path.write_bytes("\r\n".join(lines).encode("utf-8"))
    print(f"{path.relative_to(ROOT)}: {len(lines)} satır")


def main() -> None:
    write(ROOT / "docs" / "ARENA_MODUL_ODUL_KANONU.md", arena_canon_lines())
    bot_document = ROOT / "docs" / "BOT_HAVUZU_120.md"
    existing = bot_document.read_text(encoding="utf-8").replace("\r\n", "\n").split("\n")
    write(bot_document, bot_pool_lines(existing))


if __name__ == "__main__":
    main()
