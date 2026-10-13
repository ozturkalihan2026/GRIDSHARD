"""Arena, modül, ödül ve bot tablolarını sunucu verisinden yeniden üretir.

Üretilen belgeler: docs/ARENA_MODUL_ODUL_KANONU.md, docs/BOT_HAVUZU_120.md,
docs/YETENEK_KANONU.md ve docs/MODUL_CEVRIM_KANONU.md. Kaynak:
server/app/arena_canon.py, server/app/game/talents.py,
server/app/game/module_sheet.py, server/data/arena_progression_v1.json ve
server/data/arena_bot_profiles_v1.json. Açılış sırası, eşikler, duraklar, bot
desteleri, yetenekler ya da modül çevrimleri değişince çalıştırılır:

    python tools/generate_arena_canon_docs.py
"""
from __future__ import annotations

import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.arena_canon import (
    ARENAS, LEAGUE_CHESTS, LEAGUE_FLOOR_RATING, LEAGUE_GROUPS, LEAGUE_STAGES, MODULES,
)
from app.arena_canon import module_stats, module_talent_options
from app.game.catalog import BASIC_MODULE_DEFINITIONS
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
    "oynar. Bot kupaları yeni kupa ölçeğine taşındı (her bot kendi arenasının aynı oranında kaldı). Lig maçlarında "
    "Arena 12 botları efsanevi modüllerle güçlenir; taşıyabildikleri efsanevi modül sayısı ligle artar "
    "(Kıvılcım Ligi'nde en çok 1, Efsanevi Lig'de 7; `league_bot_battle_pool`, `server/app/arena_canon.py`)."
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
    add("**Katalog:** Arena 1'de 6 modül, Arena 2–12'de 23 modül, ilk lige (Kıvılcım Ligi I) girişte 7 efsanevi modül "
        "= **36 modül**.")
    add("")
    add("## Kupa ölçeği")
    add("")
    add(f"Arenalar ileride genişler ve {number(LEAGUE_FLOOR_RATING)} kupada biter; ligler oradan başlar.")
    add("")
    add("| Arena | Ad | Genişlik | Kupa aralığı |")
    add("|---:|---|---:|---:|")
    for arena in ARENAS:
        width = int(arena["maximum_rating"]) - int(arena["minimum_rating"]) + 1
        add(f"| {arena['index']} | {arena['name_tr']} | {width} | "
            f"{number(arena['minimum_rating'])}–{number(arena['maximum_rating'])} |")
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
    floor = number(LEAGUE_FLOOR_RATING)
    add(f"{floor} kupadan sonra beşer kademeli yedi lig ve tek kademeli GRIDSHARD Ligi gelir. Efsanevi modüllerin "
        "yedisi de ilk lige (Kıvılcım Ligi I) girişte açılır; sonraki ligler modül açmaz. Kademeler ara ödül, lig sonu "
        f"o ligin sandığını verir. Sezon değişiminde lig oyuncusu {floor} kupaya (Kıvılcım Ligi I) döner; alınmış "
        "ödüller ve açılmış modüller kalır.")
    add("")
    add("| Lig | Kademe genişliği | Başlangıç | Lige girişte açılan modüller | Lig sandığı |")
    add("|---|---:|---:|---|---|")
    for key, name_tr, _name_en, tiers, width in LEAGUE_GROUPS:
        first = next(stage for stage in LEAGUE_STAGES if stage["league"] == key)
        modules = ", ".join(item["name_tr"] for item in MODULES.values() if item.get("unlock_league") == key) or "—"
        chest = LEAGUE_CHESTS[key][0] if key in LEAGUE_CHESTS else "GRIDSHARD Sandığı"
        add(f"| {name_tr}{' I–V' if tiers > 1 else ''} | {width if width else '—'} | {number(first['minimum_rating'])} | {modules} | {chest} |")
    add("")
    add("### Lig sandıkları")
    add("")
    add("Lig sandığı mağazada ya da başka bir yerde bulunmaz; içeriği şansa bağlı değildir ve alındığında doğrudan "
        "verilir. Parça belirli bir modüle bağlı değildir: her modülde harcanabilen evrensel parçadır. Çekirdek "
        "parçası oyuncunun açık çekirdeklerinden rastgele birine gider; her arenanın son ödülü de 1 çekirdek parçası verir.")
    add("")
    add("| Sandık | Kupa | Devre Kredisi | Akı | Evrensel parça | Çekirdek parçası |")
    add("|---|---:|---:|---:|---|---:|")
    for stage in LEAGUE_STAGES:
        for node in stage["nodes"]:
            if not node.get("league_chest"):
                continue
            rewards = node["rewards"]
            shards = str(rewards["universal_module_shards"])
            if node.get("is_final_reward"):
                shards += " + kozmetik seti"
            add(f"| {node['description_tr']} | {number(node['trophies'])} | {number(rewards['circuit_credits'])} | {number(rewards['flux_shards'])} | {shards} | {rewards['core_shards']} |")
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


def talent_canon_lines() -> list[str]:
    lines: list[str] = []
    add = lines.append
    add("# GRIDSHARD 2.1 — Yetenek Kanonu")
    add("")
    add("Bu belge `server/app/game/talents.py` verisinden üretilir (Faz 3, 12 Ekim 2026). Çelişki olursa kod geçerlidir.")
    add("")
    add("## Modül yetenekleri")
    add("")
    add("Her modülün dört eşiği vardır; her eşikte iki daldan biri seçilir. Eşik seviyeleri enderliğe göredir: "
        "Sıradan 5 / 8 / 11 / 14, Ender 6 / 9 / 12 / 15, Destansı 7 / 10 / 13 / 15, Efsanevi 8 / 11 / 14 / 15. "
        "Bedel sırasıyla 15, 30, 45 ve 60 Akı.")
    add("")
    add("| Eşik | Tür | Sol dal | Sağ dal |")
    add("|---:|---|---|---|")
    add("| 1 | Temel uzmanlık | Güç +%3 (hasar ya da sınıfın etkisi) | CAN +%5 |")
    add("| 2 | İmza yeteneği | Modüle özel yetenek (aşağıdaki tablo) | Modüle özel yetenek (aşağıdaki tablo) |")
    add("| 3 | İnce ayar | Çevrim −%4 (çevrimi olmayan Akım Dengeleyici'de etki +%4) | Enerji tüketimi −%12 |")
    add("| 4 | Ustalık | 2. eşikte seçilen imza yeteneğini güçlendirir | CAN +%8 |")
    add("")
    add("### İmza yetenekleri")
    add("")
    add("| Modül | Sınıf | Sol dal | Sağ dal |")
    add("|---|---|---|---|")
    for module_id, item in MODULES.items():
        left, right = module_talent_options(module_id)[1]["choices"]
        add(f"| {item['name_tr']} | {CATEGORY[item['category']]} | **{left['name_tr']}** — {left['description_tr']} | "
            f"**{right['name_tr']}** — {right['description_tr']} |")
    add("")
    add("Ustalık imza yeteneğinin ana değerini bir buçuk katına çıkarır: oran ve artışlar ×1,5; dönemsel blok ve "
        "Akım kazancı 1,5 kat sık; onarım ve şok miktarı ×1,5; \"her N. atış\" bir atış erken; yok olunca verilen "
        "Akım +1; yeniden ateş eden yetenekte o atış %30 daha çok hasar verir.")
    add("")
    add("## Çekirdek yetenekleri")
    add("")
    add("Çekirdek üç eşikte (seviye 5, 9 ve 13; bedel 25, 50 ve 75 Akı) iki daldan birini seçer. Her çekirdeğin altı "
        "yeteneği birbirinden farklı bir kuraldır.")
    for core in CORE_TYPES:
        add("")
        add(f"### {core['name_tr']}")
        add("")
        add("| Seviye | Sol dal | Sağ dal |")
        add("|---:|---|---|")
        skills = core["skills"]
        for index in range(0, len(skills), 2):
            left, right = skills[index], skills[index + 1]
            add(f"| {left['level']} | **{left['name_tr']}** — {left['description_tr']} | "
                f"**{right['name_tr']}** — {right['description_tr']} |")
    add("")
    return lines


def _decimal(value: float, digits: int = 2) -> str:
    return f"{float(value):.{digits}f}".rstrip("0").rstrip(".").replace(".", ",")


def _sentence_case(text: str) -> str:
    # Türkçe büyük-küçük harf: "SALDIRI ARALIĞI" → "Saldırı aralığı".
    lowered = text.replace("I", "ı").replace("İ", "i").lower()
    first = {"i": "İ", "ı": "I"}.get(lowered[:1], lowered[:1].upper())
    return first + lowered[1:]


def _special_text(special: dict) -> str:
    times = f"{special['times']}×" if special.get("times") else ""
    value = _decimal(special["value"], 1 if special["unit"] in {"percent", "hp", "energy", "damage"} else 2)
    unit = special["unit"]
    if unit in {"percent", "heat"}:
        return f"{times}%{value}"
    if unit == "seconds":
        return f"{times}{value} sn"
    if unit == "per_second":
        return f"{times}{value}/sn"
    return f"{times}{value}"


def cycle_canon_lines() -> list[str]:
    lines: list[str] = []
    add = lines.append
    add("# GRIDSHARD 2.1 — Modül Çevrim Kanonu")
    add("")
    add("Bu belge `server/app/game/catalog.py`, `module_cycles.py` ve `module_sheet.py` verisinden üretilir "
        "(13 Ekim 2026). Çelişki olursa kod geçerlidir.")
    add("")
    add("Her modül kendi çevrimiyle çalışır ve çevrim seviyeyle kısalır (seviye başına %0,8; seviye 15'te yaklaşık "
        "%10,6). CAN seviye başına %3, hasar %5 artar; modüle özgü değerler etki çarpanıyla (seviye başına %3,5; "
        "sabotajda %3) büyür. Yüksek tabanlı oranlar (blok, yansıtma, kubbe, sabotaj direnci, dönüşüm) azalan "
        "hızla büyür ve kendi tavanında durur. Bilgi ekranı aynı sayıları `module_stats` üzerinden gösterir.")
    add("")
    add("Çevrim türleri:")
    add("")
    add("- **Eylem aralığı** (saldırı, onarım, sabotaj): modül çevrimi dolunca işini yapar; enerji yetmezse bekler.")
    add("- **Savunma yükü** (Kalkan, Prizma Kalkanı, Yansıtıcı, Koruyucu Kubbe, Bariyer): çevrim dolunca yük hazır "
        "olur, yükü harcayan olaydan (karşılanan saldırı, uygulanan sabotaj) sonra çevrim yeniden başlar. Yeni "
        "yerleşen modül yüklü başlar.")
    add("- **Destek darbesi** (Güçlendirici, Omega Güçlendirici, Hedefleme Bilgisayarı, Aşırı Hızlandırıcı): çevrimde "
        "bir saldırı modüllerini yükler; yük sıradaki atışta harcanır. Bir atış bütün yükleri harcar ve en güçlü tek "
        "desteği kullanır.")
    add("- **Darbe** (Soğutucu, Zırh, Hassas Matris): çevrimde bir kendi işini yapar; yapacak iş yoksa hazır bekler.")
    add("- **Dönemsel pencere** (Faz Zırhı, Kronos Rölesi): çevrimin belirli bir bölümünde etkindir.")
    add("- **Depo dolumu** (Batarya, Kapasitör): çevrim, boş deponun tam dolma süresidir.")
    add("")
    add("| Modül | Sınıf | Çevrim | Sv 1 | Sv 15 | Modüle özgü değerler (Sv 1 → Sv 15) |")
    add("|---|---|---|---:|---:|---|")
    for module_id, item in MODULES.items():
        definition = BASIC_MODULE_DEFINITIONS[module_id]
        first, last = module_stats(definition, 0), module_stats(definition, 14)
        upcoming = {special["key"]: special for special in last["specials"]}
        values = []
        for special in first["specials"]:
            start, end = _special_text(special), _special_text(upcoming[special["key"]])
            label = _sentence_case(special["label_tr"])
            values.append(f"{label} {start}" if start == end else f"{label} {start} → {end}")
        cycle = _sentence_case(first["cycle_label_tr"]) or "Sürekli"
        cells = (
            (f"{_decimal(first['cooldown_ms'] / 1000)} sn", f"{_decimal(last['cooldown_ms'] / 1000)} sn")
            if first["cooldown_ms"] else ("—", "—")
        )
        add(f"| {item['name_tr']} | {CATEGORY[item['category']]} | {cycle} | {cells[0]} | {cells[1]} | "
            f"{'; '.join(values)} |")
    add("")
    add("## Modüllerin kuralları")
    add("")
    for module_id, item in MODULES.items():
        definition = BASIC_MODULE_DEFINITIONS[module_id]
        add(f"- **{item['name_tr']}** — {definition.description_tr}")
    add("")
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
    write(ROOT / "docs" / "YETENEK_KANONU.md", talent_canon_lines())
    write(ROOT / "docs" / "MODUL_CEVRIM_KANONU.md", cycle_canon_lines())


if __name__ == "__main__":
    main()
