"""İlk oyun deneyimi: yönetmenli ilk savaş.

Hiç maç bitirmemiş oyuncunun ilk Arena maçı sahne sahne yönetilir. Oyuncu
bilgi kartını okurken ya da gösterilen kartı koymadan önce savaş durur
(motor adım atmaz); yalnız izleme sahnelerinde ilerler. Rakip AI karar
vermez, rakibin hamlelerini betik yapar.

Eğitimi Ayarlar'dan yeniden başlatan oyuncu aynı betiği eğitim maçı olarak
oynar: maç hesaba işlenmez (kupa, ödül, istatistik yok) ve oyuncu kendi
destesiyle değil ``TUTORIAL_PLAYER_DECK`` ile girer.

Maç gerçek motorla ve gerçek kurallarla oynanır; betik yalnız sahne
sınırlarında durumu hazırlar: gereken Akımı verir, Lazeri ısıtır, enerjiyi
keser, rakibe modül kurar. Böylece oyuncu ısı, CAN, enerji ve devre dengesi
kurallarını kendi tahtasında, sırayla görür.

İstemci sahneyi anlık görüntüdeki ``tutorial`` alanından okur ve "İleri"
için ``tutorial_ack`` komutu yollar (bkz. PvPSessionService.submit_command).
"""

from __future__ import annotations

from dataclasses import dataclass, replace

from .battle_pool import DEFAULT_BATTLE_POOL_IDS
from .catalog import get_module_definition
from .combat import select_target
from .heat import MAX_HEAT, is_overheated
from .models import BattleCommand, BattleModule, BattleStatus, ModuleStatus


# Oyuncunun eğitimde kurduğu kartlar. Destesinde hepsi yoksa (ör. desteyi
# değiştirmiş eski hesap) savaş yönetilmez; yumuşatılmış ilk maç oynanır.
TUTORIAL_REQUIRED_CARDS = ("laser", "cooler", "repair", "battery", "amplifier")
# Eğitim maçının oyuncu destesi: eğitim kartlarının hepsini içerir ve her
# hesapta açıktır (Başlangıç Devresi).
TUTORIAL_PLAYER_DECK = tuple(DEFAULT_BATTLE_POOL_IDS)
# Betiğin rakibe kurduğu kartları içeren geçerli altılı deste.
TUTORIAL_ENEMY_DECK = ("laser", "shield", "armor", "repair", "battery", "amplifier")

ACK_COMMAND = "tutorial_ack"
DEPLOY_COMMAND = "deploy_module"
# Eğitim sırasında her sahnede serbest olan komutlar.
ALWAYS_ALLOWED_COMMANDS = frozenset({"send_battle_emoji", "forfeit_battle"})
FREE_PLAY = "*"

# Oyuncu bağlantısı bu kadar süre kopuk kalırsa ya da tek bir bekleme sahnesi
# bu kadar sürerse oturum sonuç yazılmadan kapatılır; oyuncu eğitim savaşını
# baştan oynar.
ABANDON_DISCONNECTED_SECONDS = 90.0
ABANDON_WAITING_SECONDS = 900.0

# Kart komutu motorda reddedilirse (ör. yarış durumu) sahne yeniden bekler.
DEPLOY_CONFIRM_TICKS = 8

PLAYER_CORE_HP_FLOOR_RATIO = 0.6
ENEMY_CORE_HP_FLOOR_RATIO = 0.45
# Rakip Lazeri: önce görünür hasar, onarım dersinde zararsız, sonda orta güç.
ENEMY_LASER_STRONG = (14.0, 900)
ENEMY_LASER_WEAK = (1.0, 1600)
ENEMY_LASER_NORMAL = (5.0, 1500)
DAMAGED_MODULE_HP_RATIO = (0.35, 0.5)
REPAIR_LESSON_HP_GAIN = 25
# Son sahne: rakip kolay düşer; yine de uzarsa betik maçı bitirir.
FINALE_ENEMY_MODULE_HP_RATIO = 0.4
FINALE_ENEMY_CORE_HP_RATIO = 0.55
FINALE_FORCE_AFTER_MS = 20_000
FINALE_FORCED_DAMAGE_PER_TICK = 6


@dataclass(slots=True, frozen=True)
class TutorialStage:
    id: str
    # "ack": oyuncu "İleri"ye basana kadar savaş durur.
    # "deploy": gösterilen kart konana kadar savaş durur.
    # "watch": savaş akar; süre ya da koşul dolunca sıradaki sahne başlar.
    kind: str
    deploy: str = ""
    # Okun gösterdiği oyuncu modülü (tanım kimliği).
    focus: str = ""
    min_ms: int = 0
    max_ms: int = 0


# İzleme sahneleri, karttaki tek satırlık açıklama okunacak kadar sürer; asıl
# anlatım savaşın durduğu sonraki sahnededir.
STAGES: tuple[TutorialStage, ...] = (
    TutorialStage("arena", "ack"),
    TutorialStage("current", "ack"),
    TutorialStage("deploy_laser", "deploy", deploy="laser"),
    TutorialStage("watch_laser", "watch", focus="laser", min_ms=3500, max_ms=3500),
    TutorialStage("type_attack", "ack"),
    TutorialStage("type_defense", "ack"),
    TutorialStage("type_support", "ack"),
    TutorialStage("type_system", "ack"),
    TutorialStage("limits", "ack"),
    TutorialStage("hp_bar", "ack", focus="laser"),
    TutorialStage("heat_bar", "ack", focus="laser"),
    TutorialStage("deploy_cooler", "deploy", deploy="cooler", focus="laser"),
    TutorialStage("watch_cooler", "watch", focus="laser", min_ms=3000, max_ms=6000),
    TutorialStage("enemy_attack", "watch", focus="cooler", min_ms=3500, max_ms=3500),
    TutorialStage("deploy_repair", "deploy", deploy="repair", focus="cooler"),
    TutorialStage("watch_repair", "watch", focus="cooler", min_ms=3500, max_ms=5500),
    TutorialStage("energy_low", "watch", focus="laser", min_ms=2200, max_ms=2200),
    TutorialStage("deploy_battery", "deploy", deploy="battery", focus="laser"),
    TutorialStage("watch_battery", "watch", focus="battery", min_ms=3000, max_ms=3000),
    TutorialStage("enemy_boost", "ack"),
    TutorialStage("deploy_laser_2", "deploy", deploy="laser"),
    TutorialStage("deploy_amplifier", "deploy", deploy="amplifier"),
    TutorialStage("finale", "watch", deploy=FREE_PLAY),
)


def deck_supports_tutorial(battle_pool_ids) -> bool:
    return set(TUTORIAL_REQUIRED_CARDS) <= set(battle_pool_ids or ())


class TutorialDirector:
    def __init__(self, session, player_id: str, ai_player_id: str):
        self.session = session
        self.player_id = player_id
        self.ai_player_id = ai_player_id
        self.index = 0
        self.abandoned = False
        self._dirty = True
        self._stage_started_ms = 0
        self._deploy_pending = False
        self._deploy_baseline = 0
        self._deploy_wait_ticks = 0
        self._blackout = False
        self._repair_baseline_hp = 0
        self._absent_since: float | None = None
        self._waiting_since: float | None = None
        self._restored_inactivity_ms = session.engine.inactivity_forfeit_ms
        # Oyuncu okurken Akım tavanda bekleyebilir; hareketsizlik hükmü işlemez.
        session.engine.inactivity_forfeit_ms = None

    # -- Durum ----------------------------------------------------------------
    @property
    def engine(self):
        return self.session.engine

    @property
    def stage(self) -> TutorialStage:
        return STAGES[self.index]

    @property
    def waiting(self) -> bool:
        """Savaş oyuncuyu bekliyor: motor adım atmaz."""
        stage = self.stage
        if stage.kind == "ack":
            return True
        return stage.kind == "deploy" and not self._deploy_pending

    def view(self) -> dict:
        stage = self.stage
        return {
            "stage": stage.id,
            "kind": stage.kind,
            "index": self.index,
            "total": len(STAGES),
            "paused": self.waiting,
            "deploy": stage.deploy,
            "focus": stage.focus,
        }

    def consume_dirty(self) -> bool:
        dirty = self._dirty
        self._dirty = False
        return dirty

    def release(self) -> None:
        """Savaşı yönetmeyi bırakır (deste eğitime uymuyorsa)."""
        self.engine.inactivity_forfeit_ms = self._restored_inactivity_ms

    # -- Oyuncu komutları -----------------------------------------------------
    def handle_command(self, command: BattleCommand) -> bool:
        """Komut motora girecekse True döner.

        Betiğin beklemediği komut sessizce düşer. İstemci zaten yalnız
        gösterilen hedefe dokundurur; burada protokol hatası dönmek istemcinin
        savaş bağlantısını hata durumuna sokardı.
        """
        if command.player_id != self.player_id:
            return True
        if command.kind == ACK_COMMAND:
            self.acknowledge(str(command.payload.get("stage") or ""))
            return False
        if command.kind in ALWAYS_ALLOWED_COMMANDS:
            return True
        stage = self.stage
        if stage.deploy == FREE_PLAY:
            return True
        if command.kind != DEPLOY_COMMAND or stage.kind != "deploy":
            return False
        definition_id = str(command.payload.get("definition_id") or "").strip()
        # Başka kart ya da çift dokunuş: gösterilen kart bir kez konur.
        if definition_id != stage.deploy or self._deploy_pending:
            return False
        self._deploy_pending = True
        self._deploy_wait_ticks = 0
        self._waiting_since = None
        return True

    def acknowledge(self, stage_id: str) -> bool:
        stage = self.stage
        # Yinelenen ya da gecikmiş onay sıradaki sahneyi atlatmaz.
        if stage.kind != "ack" or stage_id != stage.id:
            return False
        self._advance()
        return True

    # -- Zamanlayıcı kancaları ------------------------------------------------
    def before_tick(self, now: float) -> bool:
        """Motor bu turda adım atacaksa True döner."""
        self._watch_presence(now)
        if self.abandoned or self.waiting:
            return False
        if self._blackout:
            self._drain_energy()
        return True

    def after_tick(self) -> None:
        state = self.engine.state
        if state.status != BattleStatus.RUNNING:
            return
        self._protect_cores()
        stage = self.stage
        if stage.kind == "deploy":
            if self._active_count(self.player_id, stage.deploy) > self._deploy_baseline:
                self._advance()
                return
            self._deploy_wait_ticks += 1
            if self._deploy_wait_ticks >= DEPLOY_CONFIRM_TICKS:
                self._deploy_pending = False
                self._prepare_deploy(stage)
                self._dirty = True
            return
        elapsed = state.elapsed_ms - self._stage_started_ms
        if stage.id == "finale":
            self._drive_finale(elapsed)
            return
        if elapsed >= stage.max_ms or (
            elapsed >= stage.min_ms and self._watch_complete(stage)
        ):
            self._advance()

    # -- Sahne geçişleri ------------------------------------------------------
    def _advance(self) -> None:
        self._leave(self.stage)
        self.index = min(len(STAGES) - 1, self.index + 1)
        self._stage_started_ms = self.engine.state.elapsed_ms
        self._deploy_pending = False
        self._deploy_wait_ticks = 0
        self._waiting_since = None
        self._enter(self.stage)
        self._dirty = True

    def _enter(self, stage: TutorialStage) -> None:
        if stage.kind == "deploy":
            self._prepare_deploy(stage)
        if stage.id == "heat_bar":
            laser = self._player_module("laser")
            if laser is not None and not is_overheated(laser):
                self.engine.set_module_heat(self.player_id, laser.instance_id, MAX_HEAT)
                self.engine._check_overheat(self.player_id, laser)
        elif stage.id == "enemy_attack":
            self._ensure_enemy_laser(*ENEMY_LASER_STRONG)
        elif stage.id == "watch_repair":
            damaged = self._most_damaged_player_module()
            self._repair_baseline_hp = damaged.hp if damaged is not None else 0
        elif stage.id == "energy_low":
            self._blackout = True
            self._drain_energy()
        elif stage.id == "enemy_boost":
            self._ensure_enemy_laser(*ENEMY_LASER_NORMAL)
            for definition_id in ("shield", "amplifier"):
                if self._active_count(self.ai_player_id, definition_id) == 0:
                    self.engine.deploy_scripted_module(self.ai_player_id, definition_id)
        elif stage.id == "finale":
            self._soften_enemy()

    def _leave(self, stage: TutorialStage) -> None:
        if stage.id == "enemy_attack":
            self._settle_damaged_module()
            self._ensure_enemy_laser(*ENEMY_LASER_WEAK)
        elif stage.id == "deploy_battery":
            self._blackout = False
            player = self.engine.state.players[self.player_id]
            # Batarya devreye girdi: bekleyen modüller hemen çalışsın.
            player.energy_stock = max(player.energy_stock, 16.0)

    def _watch_complete(self, stage: TutorialStage) -> bool:
        if stage.id == "watch_cooler":
            laser = self._player_module("laser")
            return laser is None or not is_overheated(laser)
        if stage.id == "watch_repair":
            damaged = self._most_damaged_player_module()
            return (
                damaged is None
                or damaged.hp - self._repair_baseline_hp >= REPAIR_LESSON_HP_GAIN
            )
        return True

    def _prepare_deploy(self, stage: TutorialStage) -> None:
        """Gösterilen kartın Akım bedeli hazır olsun; oyuncu beklemesin."""
        self._deploy_baseline = self._active_count(self.player_id, stage.deploy)
        player = self.engine.state.players[self.player_id]
        cost = max(1, get_module_definition(stage.deploy).current_cost)
        missing = cost - player.circuit_credits
        if missing > 0:
            self.engine.award_circuit_credits(self.player_id, missing, "tutorial")

    # -- Betik yardımcıları ---------------------------------------------------
    def _modules(self, player_id: str, definition_id: str) -> list[BattleModule]:
        return sorted(
            (
                module
                for module in self.engine.state.players[player_id].modules.values()
                if module.definition.id == definition_id
                and module.status == ModuleStatus.ACTIVE
                and module.hp > 0
            ),
            key=lambda module: module.instance_id,
        )

    def _active_count(self, player_id: str, definition_id: str) -> int:
        return len(self._modules(player_id, definition_id))

    def _player_module(self, definition_id: str) -> BattleModule | None:
        modules = self._modules(self.player_id, definition_id)
        return modules[0] if modules else None

    def _core(self, player_id: str) -> BattleModule | None:
        modules = self._modules(player_id, "core")
        return modules[0] if modules else None

    def _most_damaged_player_module(self) -> BattleModule | None:
        candidates = [
            module
            for module in self.engine.state.players[self.player_id].modules.values()
            if module.status == ModuleStatus.ACTIVE
            and module.hp > 0
            and module.definition.id != "core"
        ]
        if not candidates:
            return None
        return min(
            candidates,
            key=lambda module: (module.hp / module.definition.max_hp, module.instance_id),
        )

    def _ensure_enemy_laser(self, base_damage: float, cooldown_ms: int) -> None:
        lasers = self._modules(self.ai_player_id, "laser")
        if not lasers:
            self.engine.deploy_scripted_module(
                self.ai_player_id,
                "laser",
                base_damage=base_damage,
                cooldown_ms=cooldown_ms,
            )
            return
        for laser in lasers:
            laser.definition = replace(
                laser.definition,
                base_damage=base_damage,
                cooldown_ms=cooldown_ms,
            )

    def _settle_damaged_module(self) -> None:
        """Onarım dersi için bir modül görünür biçimde yaralı olsun."""
        target = self._player_module("cooler") or self._most_damaged_player_module()
        if target is None:
            return
        low, high = DAMAGED_MODULE_HP_RATIO
        max_hp = target.definition.max_hp
        if target.hp > max_hp * high:
            lasers = self._modules(self.ai_player_id, "laser")
            self.engine.apply_damage(
                self.player_id,
                target.instance_id,
                target.hp - int(max_hp * high),
                source_player_id=self.ai_player_id,
                source_module_id=lasers[0].instance_id if lasers else None,
            )
        elif target.hp < max_hp * low:
            target.hp = int(max_hp * low)

    def _drain_energy(self) -> None:
        player = self.engine.state.players[self.player_id]
        player.energy_stock = 0.0
        for module in player.modules.values():
            module.stored_energy = 0.0

    def _protect_cores(self) -> None:
        core = self._core(self.player_id)
        if core is not None:
            core.hp = max(core.hp, int(core.definition.max_hp * PLAYER_CORE_HP_FLOOR_RATIO))
        if self.stage.id == "finale":
            return
        enemy_core = self._core(self.ai_player_id)
        if enemy_core is not None:
            enemy_core.hp = max(
                enemy_core.hp,
                int(enemy_core.definition.max_hp * ENEMY_CORE_HP_FLOOR_RATIO),
            )

    def _soften_enemy(self) -> None:
        for module in self.engine.state.players[self.ai_player_id].modules.values():
            if module.status != ModuleStatus.ACTIVE or module.hp <= 0:
                continue
            ratio = (
                FINALE_ENEMY_CORE_HP_RATIO
                if module.definition.id == "core"
                else FINALE_ENEMY_MODULE_HP_RATIO
            )
            module.hp = max(1, min(module.hp, int(module.definition.max_hp * ratio)))

    def _drive_finale(self, elapsed_ms: int) -> None:
        if elapsed_ms < FINALE_FORCE_AFTER_MS:
            return
        target = select_target(self.engine.state.players[self.ai_player_id])
        if target is None:
            return
        source = self._player_module("laser")
        self.engine.apply_damage(
            self.ai_player_id,
            target.instance_id,
            FINALE_FORCED_DAMAGE_PER_TICK,
            source_player_id=self.player_id,
            source_module_id=source.instance_id if source is not None else None,
        )
        # Çekirdek betikle düştüyse sonucu bu turda kesinleştir.
        self.engine._evaluate_battle_end()

    def _watch_presence(self, now: float) -> None:
        slot = self.session.slots.get(self.player_id)
        if slot is None or slot.connected:
            self._absent_since = None
        elif self._absent_since is None:
            self._absent_since = now
        elif now - self._absent_since >= ABANDON_DISCONNECTED_SECONDS:
            self.abandoned = True
        if not self.waiting:
            self._waiting_since = None
        elif self._waiting_since is None:
            self._waiting_since = now
        elif now - self._waiting_since >= ABANDON_WAITING_SECONDS:
            self.abandoned = True
