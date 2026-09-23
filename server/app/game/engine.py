from collections import deque
import hashlib
from typing import Deque

from .catalog import get_module_definition
from ..laboratory import calibrated_module_definition
from ..season_competition import daily_meta_by_id
from .battle_pool import validate_battle_pool
from .board import get_cell_effects, get_default_board
from .boosters import (
    booster_target_rejection_reason,
    get_booster_definition,
)
from .booster_schedule import booster_offer_due_at_ms, build_booster_offer
from .economy import (
    CircuitCreditConfig,
    DEFAULT_CIRCUIT_CREDIT_CONFIG,
)
from .combat import (
    ATTACK_COOLDOWN_ID,
    has_living_attack_module,
    is_attack_module,
    resolve_attack,
    select_target,
)
from .composition import deployment_rejection_reason
from .energy import process_energy_tick
from .core_balance import core_rarity_profile
from .operations import has_disabling_sabotage, module_is_operational
from .heat import (
    CRITICAL_HEAT_THRESHOLD,
    MAX_HEAT,
    OVERHEAT_DEBUFF_ID,
    OVERHEAT_DURATION_MS,
    OVERHEAT_SELF_DAMAGE,
    apply_passive_cooling,
    attack_heat_gain,
    heat_performance,
)
from .topology import build_energy_topology
from .result import (
    build_player_summary,
    core_hp,
    summary_to_dict,
)
from .sabotage import (
    EMP_DEBUFF_ID,
    ENERGY_LEECH_DEBUFF_ID,
    JAMMER_DEBUFF_ID,
    SABOTAGE_COOLDOWN_ID,
    SabotagePlan,
    SabotageResistance,
    VIRUS_DEBUFF_ID,
    VIRUS_TICK_DAMAGE,
    VIRUS_TICK_INTERVAL_MS,
    effective_sabotage_duration_ms,
    plan_sabotage,
    sabotage_cooldown_ms,
    sabotage_resistance,
)
from .support import (
    COOLER_HEAT_REDUCTION_PER_TICK,
    OVERCLOCK_HEAT_PER_TICK,
    REPAIR_COOLDOWN_ID,
    attack_support_modifiers,
    COOLER_DEBUFF_REDUCTION_MS_PER_TICK,
    cooler_reducible_debuff_targets,
    cooler_targets,
    overclock_targets,
    repair_amount,
    repair_cleanse_target,
    repair_targets,
)
from .models import (
    BattleCommand,
    BattleEvent,
    BattleModule,
    BattleState,
    BattleStatus,
    ModuleStatus,
    PlayerBattleState,
    Position,
    TimedModuleEffect,
)


TICK_RATE = 10
TICK_MS = 1000 // TICK_RATE
OVERTIME_START_MS = 180_000
OVERTIME_PHASE_INTERVAL_MS = 30_000
# Compatibility for historical fixtures and external diagnostics.  This value
# is the normal-phase boundary now; the engine no longer finishes the battle
# when it is reached.
BATTLE_TIME_LIMIT_MS = OVERTIME_START_MS
DEFAULT_MAX_PENDING_COMMANDS = 128
DEFAULT_MAX_PENDING_COMMANDS_PER_PLAYER = 32
DEFAULT_MAX_COMMANDS_PER_TICK = 32


MODULE_INTERACTION_UNLOCK_MS = 0
MAX_ACTIVE_MODULES = 15  # Core + 14 deployable cells.
# Beta 43 exposes the rotating three-choice booster offer in live matches.
# Keeping this switch authoritative on the engine prevents the client-only
# preview from getting out of sync with an online battle.
BOOSTERS_ENABLED = True
DESTROYED_CELL_DEBRIS_DURATION_MS = 3_000
CORE_POWER_MAX_CHARGE = 100.0
CORE_POWER_CHARGE_DURATION_MS = 35_000
CORE_RESONANCE_REPAIR = 45


def overtime_attack_multiplier_for_elapsed_ms(elapsed_ms: int) -> float:
    if elapsed_ms < OVERTIME_START_MS:
        return 1.0
    phase = 1 + (elapsed_ms - OVERTIME_START_MS) // OVERTIME_PHASE_INTERVAL_MS
    return 1.0 + 0.25 * phase


def overtime_repair_multiplier_for_elapsed_ms(elapsed_ms: int) -> float:
    if elapsed_ms < OVERTIME_START_MS:
        return 1.0
    phase = (elapsed_ms - OVERTIME_START_MS) // OVERTIME_PHASE_INTERVAL_MS
    return max(0.10, 0.50 - 0.10 * phase)


def max_active_modules_for_elapsed_ms(
    elapsed_ms: int,
    interaction_unlock_ms: int = MODULE_INTERACTION_UNLOCK_MS,
) -> int | None:
    """Yeni deste akışında on yuva maçın ilk anından itibaren açıktır."""
    del elapsed_ms, interaction_unlock_ms
    return MAX_ACTIVE_MODULES



class CommandRejected(ValueError):
    pass


class BattleEngine:
    def __init__(
        self,
        state: BattleState,
        circuit_credit_config: CircuitCreditConfig = DEFAULT_CIRCUIT_CREDIT_CONFIG,
        module_interaction_unlock_ms: int = MODULE_INTERACTION_UNLOCK_MS,
        max_pending_commands: int = DEFAULT_MAX_PENDING_COMMANDS,
        max_pending_commands_per_player: int = DEFAULT_MAX_PENDING_COMMANDS_PER_PLAYER,
        max_commands_per_tick: int = DEFAULT_MAX_COMMANDS_PER_TICK,
    ):
        self.state = state
        self.circuit_credit_config = circuit_credit_config
        self.module_interaction_unlock_ms = max(
            0,
            int(module_interaction_unlock_ms),
        )
        self.board = get_default_board()
        self._command_queue: Deque[BattleCommand] = deque()
        self.max_pending_commands = max(1, int(max_pending_commands))
        self.max_pending_commands_per_player = max(
            1,
            int(max_pending_commands_per_player),
        )
        self.max_commands_per_tick = max(1, int(max_commands_per_tick))
        self._energy_contribution_accumulator: dict[
            tuple[str, str, str],
            float,
        ] = {}

        if circuit_credit_config.current_regen_interval_ms <= 0:
            raise ValueError("Akım yenilenme aralığı pozitif olmalıdır.")

    def add_player(self, player_id: str) -> PlayerBattleState:
        if player_id in self.state.players:
            return self.state.players[player_id]

        starting_credits = self.circuit_credit_config.starting_credits
        player = PlayerBattleState(
            player_id=player_id,
            circuit_credits=starting_credits,
            total_circuit_credits_earned=starting_credits,
        )
        self.state.players[player_id] = player
        return player

    def set_battle_pool(
        self,
        player_id: str,
        module_definition_ids: list[str] | tuple[str, ...],
    ) -> None:
        player = self._require_player(player_id)

        if self.state.status != BattleStatus.WAITING:
            raise ValueError("Savaş Havuzu yalnızca maç başlamadan önce ayarlanabilir.")

        player.battle_pool = validate_battle_pool(module_definition_ids)
        self._emit(
            "battle_pool_set",
            {
                "player_id": player_id,
                "module_definition_ids": list(
                    player.battle_pool.module_definition_ids
                ),
            },
        )

    def grant_module(
        self,
        player_id: str,
        instance_id: str,
        definition_id: str,
    ) -> BattleModule:
        player = self._require_player(player_id)

        if (
            player.battle_pool is not None
            and definition_id not in {"core", "generator"}
            and not player.battle_pool.contains(definition_id)
        ):
            raise ValueError(
                f"Modül oyuncunun Savaş Havuzu'nda değil: {definition_id}"
            )

        if instance_id in player.modules:
            raise ValueError(f"Modül örneği zaten mevcut: {instance_id}")

        base_definition = get_module_definition(definition_id)
        calibration_level = int(
            self.state.player_calibrations
            .get(player_id, {})
            .get(definition_id, 0)
        )
        calibration_applied = bool(
            calibration_level > 0
            and self.state.laboratory_effects_enabled
            and not self.state.normalized
            and not self.state.ranked_eligible
        )
        definition = (
            calibrated_module_definition(base_definition, calibration_level)
            if calibration_applied
            else base_definition
        )
        from dataclasses import replace
        from ..arena_canon import module_stats
        stats = module_stats(definition, self.state.player_upgrade_levels.get(player_id, {}).get(definition_id, 0),
                             self.state.player_module_talents.get(player_id, {}).get(definition_id, {}))
        daily_meta = daily_meta_by_id(
            self.state.player_daily_meta_ids.get(player_id, "")
        )
        meta_id = daily_meta.get("id") if daily_meta else ""
        meta_multiplier = float(
            (daily_meta or {}).get("modifier", {}).get("multiplier", 1.0)
        )
        max_hp = stats["max_hp"]
        base_damage = stats["base_damage"]
        effect_multiplier = stats["effect_multiplier"]
        if meta_id == "damage" and definition.category == "saldırı":
            base_damage = round(base_damage * meta_multiplier)
        elif meta_id == "defense" and definition.category == "savunma":
            max_hp = round(max_hp * meta_multiplier)
            effect_multiplier *= meta_multiplier
        elif meta_id == "support" and definition.category == "destek":
            effect_multiplier *= meta_multiplier
        elif meta_id == "sabotage" and definition.category == "sabotaj":
            effect_multiplier *= meta_multiplier
        elif meta_id == "system" and definition.category == "enerji":
            effect_multiplier *= meta_multiplier
        elif meta_id == "core" and definition_id == "core":
            max_hp = round(max_hp * meta_multiplier)
        elif meta_id == "current_support" and definition_id in {
            "generator", "battery", "capacitor", "current_balancer"
        }:
            effect_multiplier *= meta_multiplier
        definition = replace(definition, max_hp=max_hp, base_damage=base_damage,
                             cooldown_ms=stats["cooldown_ms"], effect_multiplier=effect_multiplier,
                             energy_consumption=stats["energy_consumption"])
        module = BattleModule.create(
            instance_id=instance_id,
            definition=definition,
        )
        module.calibration_level = calibration_level
        module.calibration_applied = calibration_applied
        player.modules[instance_id] = module
        return module

    def set_initial_active_module(
        self,
        player_id: str,
        instance_id: str,
        x: int,
        y: int,
    ) -> None:
        """
        Maç başlamadan önce Çekirdek/Jeneratör gibi başlangıç modüllerini
        doğrudan savaş alanına yerleştirmek için kullanılır.
        """
        if self.state.status != BattleStatus.WAITING:
            raise ValueError("Başlangıç modülü yalnızca savaş başlamadan yerleştirilebilir.")

        module = self._require_module(player_id, instance_id)
        position = Position(x=x, y=y)

        if module.definition.id == "core":
            if position != self.board.core_position:
                raise ValueError(
                    "Çekirdek yalnızca merkez Çekirdek hücresine yerleştirilebilir."
                )
        else:
            self._ensure_board_position_placeable(position)
            self._ensure_module_allowed_in_cell(module, position)

        self._ensure_position_available(player_id, position)

        module.status = ModuleStatus.ACTIVE
        module.position = position

    def start(self) -> None:
        if self.state.status != BattleStatus.WAITING:
            return

        self.state.status = BattleStatus.RUNNING
        self._emit("battle_started", {})

    def finish(self, reason: str) -> None:
        if self.state.status != BattleStatus.RUNNING:
            return

        self.state.status = BattleStatus.FINISHED
        self._emit("battle_finished", {"reason": reason})

    def enqueue_command(self, command: BattleCommand) -> None:
        """
        Oyuncu komutunu kuyruğa ekler.

        Komut kuyruğa girdiği anda savaş durumu değiştirilmez.
        Komut bir sonraki step() içinde, o anki gerçek savaş durumuna göre
        doğrulanır ve uygulanır.
        """
        if len(self._command_queue) >= self.max_pending_commands:
            raise CommandRejected(
                "Savaş komut kuyruğu dolu; istemci daha sonra yeniden denemeli."
            )
        pending_for_player = sum(
            1
            for queued in self._command_queue
            if queued.player_id == command.player_id
        )
        if pending_for_player >= self.max_pending_commands_per_player:
            raise CommandRejected(
                "Oyuncunun bekleyen komut sınırı aşıldı."
            )
        self._command_queue.append(command)

    @property
    def pending_command_count(self) -> int:
        return len(self._command_queue)

    def step(self) -> None:
        if self.state.status != BattleStatus.RUNNING:
            return

        self._process_commands()
        if self.state.status != BattleStatus.RUNNING:
            # A terminating command must freeze combat, income and the clock
            # on the exact authoritative tick where it was accepted.
            return
        self._simulate()

        self.state.tick += 1
        self.state.elapsed_ms = self.state.tick * TICK_MS

    def apply_damage(
        self,
        player_id: str,
        instance_id: str,
        amount: int,
        *,
        source_player_id: str | None = None,
        source_module_id: str | None = None,
    ) -> int:
        if amount < 0:
            raise ValueError("Hasar negatif olamaz.")

        module = self._require_module(player_id, instance_id)

        if module.status == ModuleStatus.DESTROYED:
            return 0

        shield = module.persistent_effects.get("core_guardian")
        if shield is not None and shield.expires_at_ms > self.state.elapsed_ms:
            absorbed = min(amount, int(shield.data.get("shield_hp", 0)))
            shield.data["shield_hp"] = max(0, int(shield.data.get("shield_hp", 0)) - absorbed)
            amount -= absorbed
        applied_damage = min(module.hp, amount)
        module.hp = max(0, module.hp - applied_damage)

        self._emit(
            "module_damaged",
            {
                "player_id": player_id,
                "module_id": instance_id,
                "damage": applied_damage,
                "attempted_damage": amount,
                "hp": module.hp,
                "source_player_id": source_player_id,
                "source_module_id": source_module_id,
            },
        )

        if module.hp == 0:
            destroyed_position = module.position
            module.status = ModuleStatus.DESTROYED
            module.position = None
            debris_until_ms = None
            if (
                destroyed_position is not None
                and module.definition.id != "core"
            ):
                debris_until_ms = (
                    self.state.elapsed_ms
                    + DESTROYED_CELL_DEBRIS_DURATION_MS
                )
                player = self._require_player(player_id)
                player.cell_debris_until_ms[
                    self._position_key(destroyed_position)
                ] = debris_until_ms
            self._emit(
                "module_destroyed",
                {
                    "player_id": player_id,
                    "module_id": instance_id,
                    "x": (
                        destroyed_position.x
                        if destroyed_position is not None
                        else None
                    ),
                    "y": (
                        destroyed_position.y
                        if destroyed_position is not None
                        else None
                    ),
                    "debris_until_ms": debris_until_ms,
                },
            )

        return applied_damage


    def award_circuit_credits(
        self,
        player_id: str,
        amount: int,
        reason: str,
    ) -> None:
        if amount < 0:
            raise ValueError("Devre Kredisi ödülü negatif olamaz.")
        if amount == 0:
            return

        player = self._require_player(player_id)
        amount = min(amount, max(0, self.circuit_credit_config.maximum_current - player.circuit_credits))
        if not amount:
            return
        player.circuit_credits += amount
        player.total_circuit_credits_earned += amount
        self._emit(
            "circuit_credits_awarded",
            {
                "player_id": player_id,
                "amount": amount,
                "reason": reason,
                "balance": player.circuit_credits,
            },
        )

    def _spend_circuit_credits(
        self,
        player_id: str,
        amount: int,
        reason: str,
    ) -> None:
        if amount < 0:
            raise ValueError("Devre Kredisi maliyeti negatif olamaz.")
        if amount == 0:
            return

        player = self._require_player(player_id)
        if player.circuit_credits < amount:
            raise CommandRejected(
                f"Yetersiz Akım: gerekli {amount}, mevcut {player.circuit_credits}."
            )

        player.circuit_credits -= amount
        player.total_circuit_credits_spent += amount
        self._emit(
            "circuit_credits_spent",
            {
                "player_id": player_id,
                "amount": amount,
                "reason": reason,
                "balance": player.circuit_credits,
            },
        )

    def circuit_credits(self, player_id: str) -> int:
        return self._require_player(player_id).circuit_credits

    def _apply_passive_circuit_credit_income(self) -> None:
        for player in self.state.players.values():
            if player.circuit_credits >= self.circuit_credit_config.maximum_current:
                player.current_regen_remainder_ms = 0
                continue
            player.current_regen_remainder_ms += TICK_MS
            interval = self.circuit_credit_config.current_regen_interval_ms
            amount, player.current_regen_remainder_ms = divmod(player.current_regen_remainder_ms, interval)
            granted = min(amount, self.circuit_credit_config.maximum_current - player.circuit_credits)
            player.circuit_credits += granted
            player.total_circuit_credits_earned += granted

    def max_active_modules(self) -> int | None:
        return max_active_modules_for_elapsed_ms(
            self.state.elapsed_ms,
            self.module_interaction_unlock_ms,
        )

    def active_module_count(self, player_id: str) -> int:
        player = self._require_player(player_id)
        return sum(
            1
            for module in player.modules.values()
            if module.status == ModuleStatus.ACTIVE
        )

    def module_capacity_view(self, player_id: str) -> dict[str, int | None]:
        """Return the authoritative, timer-free module capacity view."""
        active_count = self.active_module_count(player_id)
        active_limit = MAX_ACTIVE_MODULES
        return {
            "active_module_count": active_count,
            "active_module_limit": active_limit,
            "available_module_slots": max(0, active_limit - active_count),
            "next_module_slot_at_ms": None,
            "next_module_slot_in_ms": None,
        }

    def _ensure_module_interaction_unlocked(self) -> None:
        if self.state.elapsed_ms < self.module_interaction_unlock_ms:
            remaining_ms = (
                self.module_interaction_unlock_ms
                - self.state.elapsed_ms
            )
            raise CommandRejected(
                f"Modül müdahalesi henüz açık değil. Kalan süre: {remaining_ms} ms."
            )

    def _ensure_active_capacity_for_new_module(self, player_id: str) -> None:
        limit = MAX_ACTIVE_MODULES

        active_count = self.active_module_count(player_id)
        if active_count >= limit:
            raise CommandRejected(
                f"Aktif modül sınırına ulaşıldı: {active_count}/{limit}."
            )

    def set_module_heat(
        self,
        player_id: str,
        instance_id: str,
        heat: float,
    ) -> None:
        module = self._require_module(player_id, instance_id)
        module.heat = max(0.0, float(heat))
        self._emit(
            "module_heat_changed",
            {
                "player_id": player_id,
                "module_id": instance_id,
                "heat": module.heat,
            },
        )

    def set_module_stored_energy(
        self,
        player_id: str,
        instance_id: str,
        stored_energy: float,
    ) -> None:
        module = self._require_module(player_id, instance_id)
        module.stored_energy = max(0.0, float(stored_energy))
        self._emit(
            "module_stored_energy_changed",
            {
                "player_id": player_id,
                "module_id": instance_id,
                "stored_energy": module.stored_energy,
            },
        )

    def add_debuff(
        self,
        player_id: str,
        instance_id: str,
        effect_id: str,
        name_tr: str,
        duration_ms: int | None = None,
        data: dict | None = None,
    ) -> None:
        module = self._require_module(player_id, instance_id)
        expires_at_ms = (
            None
            if duration_ms is None
            else self.state.elapsed_ms + max(0, int(duration_ms))
        )
        module.debuffs[effect_id] = TimedModuleEffect(
            id=effect_id,
            name_tr=name_tr,
            expires_at_ms=expires_at_ms,
            data=dict(data or {}),
        )
        self._emit(
            "module_debuff_added",
            {
                "player_id": player_id,
                "module_id": instance_id,
                "effect_id": effect_id,
                "expires_at_ms": expires_at_ms,
            },
        )

    def add_persistent_effect(
        self,
        player_id: str,
        instance_id: str,
        effect_id: str,
        name_tr: str,
        duration_ms: int | None = None,
        data: dict | None = None,
    ) -> None:
        module = self._require_module(player_id, instance_id)
        expires_at_ms = (
            None
            if duration_ms is None
            else self.state.elapsed_ms + max(0, int(duration_ms))
        )
        module.persistent_effects[effect_id] = TimedModuleEffect(
            id=effect_id,
            name_tr=name_tr,
            expires_at_ms=expires_at_ms,
            data=dict(data or {}),
        )
        self._emit(
            "module_persistent_effect_added",
            {
                "player_id": player_id,
                "module_id": instance_id,
                "effect_id": effect_id,
                "expires_at_ms": expires_at_ms,
            },
        )

    def start_cooldown(
        self,
        player_id: str,
        instance_id: str,
        cooldown_id: str,
        duration_ms: int,
    ) -> None:
        module = self._require_module(player_id, instance_id)
        module.cooldowns_ready_at_ms[cooldown_id] = (
            self.state.elapsed_ms + max(0, int(duration_ms))
        )
        self._emit(
            "module_cooldown_started",
            {
                "player_id": player_id,
                "module_id": instance_id,
                "cooldown_id": cooldown_id,
                "ready_at_ms": module.cooldowns_ready_at_ms[cooldown_id],
            },
        )

    def is_cooldown_ready(
        self,
        player_id: str,
        instance_id: str,
        cooldown_id: str,
    ) -> bool:
        module = self._require_module(player_id, instance_id)
        ready_at_ms = module.cooldowns_ready_at_ms.get(cooldown_id)
        return ready_at_ms is None or self.state.elapsed_ms >= ready_at_ms

    def add_temporary_booster_state(
        self,
        player_id: str,
        instance_id: str,
        booster_id: str,
        name_tr: str,
        duration_ms: int,
        data: dict | None = None,
    ) -> None:
        """
        alpha.5 yalnızca geçici güçlendirici DURUMUNUN kalıcılığını tanımlar.
        Gerçek güçlendirici seçim/ekonomi/etki sistemi FAZ 12'de gelecektir.
        """
        module = self._require_module(player_id, instance_id)
        module.temporary_boosters[booster_id] = TimedModuleEffect(
            id=booster_id,
            name_tr=name_tr,
            expires_at_ms=self.state.elapsed_ms + max(0, int(duration_ms)),
            data=dict(data or {}),
        )
        self._emit(
            "module_temporary_booster_added",
            {
                "player_id": player_id,
                "module_id": instance_id,
                "booster_id": booster_id,
                "expires_at_ms": module.temporary_boosters[booster_id].expires_at_ms,
            },
        )

    def energy_topology_for_player(self, player_id: str):
        player = self._require_player(player_id)
        return build_energy_topology(
            player,
            self.board.core_position,
        )

    def _process_energy_flow(self) -> None:
        for player in self.state.players.values():
            result = process_energy_tick(player, self.board.core_position)
            for contribution in result.module_contributions:
                key = (
                    player.player_id,
                    str(contribution["module_id"]),
                    str(contribution["contribution_kind"]),
                )
                self._energy_contribution_accumulator[key] = (
                    self._energy_contribution_accumulator.get(key, 0.0)
                    + max(0.0, float(contribution["value"]))
                )

        # Sürekli enerji akışı saniyede on olay üretmesin. Gerçek tick
        # değerlerini bir saniyelik okunabilir bir katkı sayısında birleştir.
        if (self.state.tick + 1) % TICK_RATE:
            return
        for (
            player_id,
            module_id,
            contribution_kind,
        ), value in sorted(self._energy_contribution_accumulator.items()):
            if value <= 0:
                continue
            self._emit(
                "module_contribution",
                {
                    "player_id": player_id,
                    "source_player_id": player_id,
                    "source_module_id": module_id,
                    "target_player_id": player_id,
                    "target_module_id": module_id,
                    "category": "enerji",
                    "contribution_kind": contribution_kind,
                    "value": round(value, 2),
                    "unit": "energy",
                },
            )
        self._energy_contribution_accumulator.clear()

    def _process_virus_effects(self) -> None:
        for player in self.state.players.values():
            for module in sorted(
                player.modules.values(),
                key=lambda current: current.instance_id,
            ):
                effect = module.debuffs.get(VIRUS_DEBUFF_ID)
                if effect is None:
                    continue
                if module.status != ModuleStatus.ACTIVE:
                    continue

                next_tick_at_ms = int(
                    effect.data.get("next_tick_at_ms", 0)
                )
                if self.state.elapsed_ms < next_tick_at_ms:
                    continue

                damage = max(
                    1,
                    int(
                        round(
                            VIRUS_TICK_DAMAGE
                            * float(
                                effect.data.get(
                                    "effect_strength_multiplier",
                                    1.0,
                                )
                            )
                        )
                    ),
                )

                self.apply_damage(
                    player.player_id,
                    module.instance_id,
                    damage,
                    source_player_id=effect.data.get("source_player_id"),
                    source_module_id=effect.data.get("source_module_id"),
                )
                effect.data["next_tick_at_ms"] = (
                    self.state.elapsed_ms
                    + VIRUS_TICK_INTERVAL_MS
                )

                self._emit(
                    "virus_damage",
                    {
                        "player_id": player.player_id,
                        "module_id": module.instance_id,
                        "source_player_id": effect.data.get("source_player_id"),
                        "source_module_id": effect.data.get("source_module_id"),
                        "damage": damage,
                        "next_tick_at_ms": effect.data["next_tick_at_ms"],
                    },
                )

    def _process_sabotage_actions(self) -> None:
        if len(self.state.players) < 2:
            return

        player_ids = sorted(self.state.players)
        planned_actions: list[
            tuple[str, str, BattleModule, SabotagePlan, SabotageResistance, int]
        ] = []

        # As with attacks, both sides act from the same pre-effect state.
        # Otherwise a lexically earlier player ID can disable a ready enemy
        # saboteur before that player's actions have even been considered.
        for attacker_player_id in player_ids:
            attacker_player = self.state.players[attacker_player_id]
            opponent_ids = [
                player_id
                for player_id in player_ids
                if player_id != attacker_player_id
            ]
            if not opponent_ids:
                continue

            target_player_id = opponent_ids[0]
            target_player = self.state.players[target_player_id]
            reserved_target_ids: set[str] = set()

            sabotage_modules = sorted(
                (
                    module
                    for module in attacker_player.modules.values()
                    if module_is_operational(module)
                    and module.definition.category == "sabotaj"
                ),
                key=lambda module: module.instance_id,
            )

            for module in sabotage_modules:
                if not module.is_powered:
                    self._emit(
                        "sabotage_skipped_unpowered",
                        {
                            "player_id": attacker_player_id,
                            "module_id": module.instance_id,
                        },
                    )
                    continue

                if not self.is_cooldown_ready(
                    attacker_player_id,
                    module.instance_id,
                    SABOTAGE_COOLDOWN_ID,
                ):
                    continue

                plan = plan_sabotage(
                    module,
                    target_player,
                    excluded_target_ids=reserved_target_ids,
                )
                if plan is None:
                    continue

                target_module = self._require_module(
                    target_player_id,
                    plan.target_module_id,
                )
                resistance = sabotage_resistance(
                    module,
                    target_module,
                    target_player,
                )
                effective_duration_ms = (
                    effective_sabotage_duration_ms(
                        plan.duration_ms,
                        resistance,
                    )
                )

                planned_actions.append((
                    attacker_player_id, target_player_id, module, plan,
                    resistance, effective_duration_ms,
                ))
                # Preserve the old per-side targeting rule: a successful
                # disabling effect removes its target from later choices.
                if not resistance.blocked:
                    reserved_target_ids.add(plan.target_module_id)

        for (
            attacker_player_id, target_player_id, module, plan,
            resistance, effective_duration_ms,
        ) in planned_actions:
            self.start_cooldown(
                attacker_player_id,
                module.instance_id,
                SABOTAGE_COOLDOWN_ID,
                sabotage_cooldown_ms(module),
            )

            if resistance.blocked:
                self._emit(
                    "sabotage_blocked",
                    {
                        "attacker_player_id": attacker_player_id,
                        "attacker_module_id": module.instance_id,
                        "target_player_id": target_player_id,
                        "target_module_id": plan.target_module_id,
                        "effect_id": plan.effect_id,
                        "reasons": list(resistance.reasons),
                    },
                )
                continue

            data = {
                "source_player_id": attacker_player_id,
                "source_module_id": module.instance_id,
                "effect_strength_multiplier": resistance.effect_strength_multiplier,
                "resistance_reasons": list(resistance.reasons),
            }
            if plan.effect_id == VIRUS_DEBUFF_ID:
                data["next_tick_at_ms"] = self.state.elapsed_ms

            self.add_debuff(
                target_player_id,
                plan.target_module_id,
                plan.effect_id,
                plan.name_tr,
                effective_duration_ms,
                data,
            )

            # Every sabotage family suspends the affected card. The card
            # stays visible for feedback/cleansing, but cannot attack,
            # defend, support, generate energy or attract targeting.
            target_module = self._require_module(target_player_id, plan.target_module_id)
            target_module.is_powered = False
            target_module.energy_received_last_tick = 0.0

            self._emit(
                "sabotage_applied",
                {
                    "attacker_player_id": attacker_player_id,
                    "attacker_module_id": module.instance_id,
                    "target_player_id": target_player_id,
                    "target_module_id": plan.target_module_id,
                    "effect_id": plan.effect_id,
                    "base_duration_ms": plan.duration_ms,
                    "duration_ms": effective_duration_ms,
                    "duration_multiplier": resistance.duration_multiplier,
                    "effect_strength_multiplier": resistance.effect_strength_multiplier,
                    "resistance_reasons": list(resistance.reasons),
                    "cooldown_ms": sabotage_cooldown_ms(module),
                    "contribution_event_emitted": True,
                    "simultaneous_tick": True,
                },
            )
            self._emit(
                "module_contribution",
                {
                    "player_id": attacker_player_id,
                    "source_player_id": attacker_player_id,
                    "source_module_id": module.instance_id,
                    "target_player_id": target_player_id,
                    "target_module_id": plan.target_module_id,
                    "category": "sabotaj",
                    "contribution_kind": "control_duration",
                    "value": round(effective_duration_ms / 1000, 2),
                    "unit": "seconds",
                },
            )

            if effective_duration_ms != plan.duration_ms:
                self._emit(
                    "sabotage_resisted",
                    {
                        "target_player_id": target_player_id,
                        "target_module_id": plan.target_module_id,
                        "effect_id": plan.effect_id,
                        "base_duration_ms": plan.duration_ms,
                        "effective_duration_ms": effective_duration_ms,
                        "reasons": list(resistance.reasons),
                    },
                )

    def _process_support_actions(self) -> None:
        for player in self.state.players.values():
            repaired_target_ids: set[str] = set()
            cooled_target_ids: set[str] = set()
            overclocked_target_ids: set[str] = set()
            support_modules = sorted(
                (
                    module
                    for module in player.modules.values()
                    if module_is_operational(module)
                    and module.definition.category == "destek"
                ),
                key=lambda module: module.instance_id,
            )

            for module in support_modules:
                if not module.is_powered:
                    continue

                if JAMMER_DEBUFF_ID in module.debuffs:
                    self._emit(
                        "support_skipped_jammed",
                        {
                            "player_id": player.player_id,
                            "module_id": module.instance_id,
                        },
                    )
                    continue

                if module.definition.mechanic_id == "repair":
                    if not self.is_cooldown_ready(
                        player.player_id,
                        module.instance_id,
                        REPAIR_COOLDOWN_ID,
                    ):
                        continue

                    cleanse = repair_cleanse_target(
                        player,
                        module,
                        self.board.core_position,
                    )
                    if cleanse is not None:
                        cleanse_target, effect_id = cleanse
                        if cleanse_target.instance_id in repaired_target_ids:
                            continue
                        del cleanse_target.debuffs[effect_id]
                        repaired_target_ids.add(cleanse_target.instance_id)
                        cleanse_target.is_powered = not has_disabling_sabotage(
                            cleanse_target
                        )
                        self._emit(
                            "sabotage_cleansed",
                            {
                                "player_id": player.player_id,
                                "source_module_id": module.instance_id,
                                "target_module_id": cleanse_target.instance_id,
                                "effect_id": effect_id,
                                "cleanser": "repair",
                            },
                        )
                        self.start_cooldown(
                            player.player_id,
                            module.instance_id,
                            REPAIR_COOLDOWN_ID,
                            module.definition.cooldown_ms,
                        )
                        continue

                    targets = repair_targets(
                        player,
                        module,
                        self.board.core_position,
                    )
                    targets = [
                        target
                        for target in targets
                        if target.instance_id not in repaired_target_ids
                    ]
                    if not targets:
                        continue

                    target = targets[0]
                    repair_multiplier = overtime_repair_multiplier_for_elapsed_ms(
                        self.state.elapsed_ms + TICK_MS
                    )
                    amount = max(
                        1,
                        round(
                            repair_amount(module)
                            * player.energy_support_multiplier
                            * repair_multiplier
                        ),
                    )
                    before = target.hp
                    target.hp = min(
                        target.definition.max_hp,
                        target.hp + amount,
                    )
                    actual = target.hp - before

                    if actual > 0:
                        repaired_target_ids.add(target.instance_id)
                        self._emit(
                            "module_repaired",
                            {
                                "player_id": player.player_id,
                                "source_module_id": module.instance_id,
                                "target_module_id": target.instance_id,
                                "module_id": target.instance_id,
                                "repair": actual,
                                "hp_before": before,
                                "hp_after": target.hp,
                                "overtime_multiplier": repair_multiplier,
                            },
                        )

                    self.start_cooldown(
                        player.player_id,
                        module.instance_id,
                        REPAIR_COOLDOWN_ID,
                        module.definition.cooldown_ms,
                    )

                elif module.definition.mechanic_id == "cooler":
                    for target, effect_id in cooler_reducible_debuff_targets(
                        player,
                        module,
                        self.board.core_position,
                    ):
                        if target.instance_id in cooled_target_ids:
                            continue
                        effect = target.debuffs.get(effect_id)
                        if effect is None or effect.expires_at_ms is None:
                            continue

                        before_expires = effect.expires_at_ms
                        reduction_ms = max(
                            1,
                            round(
                                COOLER_DEBUFF_REDUCTION_MS_PER_TICK
                                * module.definition.effect_multiplier
                                * player.energy_support_multiplier
                            ),
                        )
                        effect.expires_at_ms = max(
                            self.state.elapsed_ms,
                            effect.expires_at_ms
                            - reduction_ms,
                        )
                        cooled_target_ids.add(target.instance_id)

                        self._emit(
                            "sabotage_duration_reduced",
                            {
                                "player_id": player.player_id,
                                "source_module_id": module.instance_id,
                                "target_module_id": target.instance_id,
                                "effect_id": effect_id,
                                "before_expires_at_ms": before_expires,
                                "after_expires_at_ms": effect.expires_at_ms,
                                "reduction_ms": (
                                    before_expires - effect.expires_at_ms
                                ),
                                "cleanser": "cooler",
                            },
                        )

                        if effect.expires_at_ms <= self.state.elapsed_ms:
                            del target.debuffs[effect_id]
                            target.is_powered = not has_disabling_sabotage(
                                target
                            )
                            self._emit(
                                "sabotage_cleansed",
                                {
                                    "player_id": player.player_id,
                                    "source_module_id": module.instance_id,
                                    "target_module_id": target.instance_id,
                                    "effect_id": effect_id,
                                    "cleanser": "cooler",
                                },
                            )

                    for target in cooler_targets(
                        player,
                        module,
                        self.board.core_position,
                    ):
                        if target.instance_id in cooled_target_ids:
                            continue
                        before = target.heat
                        target.heat = max(
                            0.0,
                            target.heat - COOLER_HEAT_REDUCTION_PER_TICK * module.definition.effect_multiplier * player.energy_support_multiplier,
                        )
                        if target.heat != before:
                            cooled_target_ids.add(target.instance_id)
                            self._emit(
                                "module_cooled",
                                {
                                    "player_id": player.player_id,
                                    "source_module_id": module.instance_id,
                                    "target_module_id": target.instance_id,
                                    "heat_before": before,
                                    "heat_after": target.heat,
                                },
                            )

                elif module.definition.mechanic_id == "overclock_unit":
                    for target in overclock_targets(
                        player,
                        module,
                        self.board.core_position,
                    ):
                        if target.instance_id in overclocked_target_ids:
                            continue
                        overclocked_target_ids.add(target.instance_id)
                        target.heat += OVERCLOCK_HEAT_PER_TICK
                        self._emit(
                            "module_overclocked",
                            {
                                "player_id": player.player_id,
                                "source_module_id": module.instance_id,
                                "target_module_id": target.instance_id,
                                "heat_after": target.heat,
                            },
                        )

    def _process_combat_actions(self) -> None:
        if len(self.state.players) < 2:
            return

        player_ids = sorted(self.state.players)
        planned_attacks = []

        for attacker_player_id in player_ids:
            attacker_player = self.state.players[attacker_player_id]
            if not has_living_attack_module(
                attacker_player
            ):
                continue
            opponent_ids = [
                player_id for player_id in player_ids
                if player_id != attacker_player_id
            ]
            if not opponent_ids:
                continue

            target_player_id = opponent_ids[0]
            target_player = self.state.players[target_player_id]

            attackers = sorted(
                (
                    module
                    for module in attacker_player.modules.values()
                    if is_attack_module(module)
                ),
                key=lambda module: module.instance_id,
            )

            for attacker in attackers:
                if not attacker.is_powered:
                    self._emit(
                        "attack_skipped_unpowered",
                        {"player_id": attacker_player_id, "module_id": attacker.instance_id},
                    )
                    continue

                heat_state = heat_performance(attacker, self.state.elapsed_ms)
                if heat_state.overheated:
                    self._emit(
                        "attack_skipped_overheated",
                        {
                            "player_id": attacker_player_id,
                            "module_id": attacker.instance_id,
                            "heat": attacker.heat,
                        },
                    )
                    continue

                if not self.is_cooldown_ready(
                    attacker_player_id,
                    attacker.instance_id,
                    ATTACK_COOLDOWN_ID,
                ):
                    continue

                effective_elapsed_ms = self.state.elapsed_ms + TICK_MS
                # Elapsed time never exposes the Core. Attackers must disable
                # the deployable modules and system line before target
                # selection can naturally reach it.
                target = select_target(target_player)
                if target is None:
                    continue

                support = attack_support_modifiers(
                    attacker_player,
                    attacker,
                    self.board.core_position,
                )
                resolution = resolve_attack(
                    attacker_player_id,
                    attacker,
                    target_player_id,
                    target,
                    support_damage_multiplier=(
                        support.damage_multiplier
                        * heat_state.damage_multiplier
                        * attacker_player.energy_damage_multiplier
                        * overtime_attack_multiplier_for_elapsed_ms(
                            effective_elapsed_ms
                        )
                    ),
                    defense_effectiveness=target_player.energy_support_multiplier,
                )
                effective_cooldown_ms = max(
                    TICK_MS,
                    int(
                        round(
                            attacker.definition.cooldown_ms
                            * support.cooldown_multiplier
                            * heat_state.cooldown_multiplier
                            / attacker_player.energy_speed_multiplier
                        )
                    ),
                )

                planned_attacks.append(
                    (
                        attacker_player_id,
                        attacker,
                        target_player_id,
                        target,
                        support,
                        resolution,
                        effective_cooldown_ms,
                    )
                )

        for (
            attacker_player_id,
            attacker,
            target_player_id,
            target,
            support,
            resolution,
            effective_cooldown_ms,
        ) in planned_attacks:
            self._emit(
                "attack_performed",
                {
                    "attacker_player_id": resolution.attacker_player_id,
                    "attacker_module_id": resolution.attacker_module_id,
                    "target_player_id": resolution.target_player_id,
                    "target_module_id": resolution.target_module_id,
                    "base_damage": resolution.base_damage,
                    "attack_multiplier": resolution.attack_multiplier,
                    "counter_multiplier": resolution.counter_multiplier,
                    "raw_damage": resolution.raw_damage,
                    "defense_type": resolution.defense_type,
                    "defense_multiplier": resolution.defense_multiplier,
                    "reduced_damage": resolution.reduced_damage,
                    "damage": resolution.final_damage,
                    "reflected_damage": resolution.reflected_damage,
                    "simultaneous_tick": True,
                    "contribution_event_emitted": resolution.reduced_damage > 0,
                },
            )
            if resolution.reduced_damage > 0:
                self._emit(
                    "module_contribution",
                    {
                        "player_id": target_player_id,
                        "source_player_id": target_player_id,
                        "source_module_id": target.instance_id,
                        "target_player_id": target_player_id,
                        "target_module_id": target.instance_id,
                        "category": "savunma",
                        "contribution_kind": "damage_prevented",
                        "value": resolution.reduced_damage,
                        "unit": "damage",
                    },
                )
            self.apply_damage(
                target_player_id,
                target.instance_id,
                resolution.final_damage,
                source_player_id=attacker_player_id,
                source_module_id=attacker.instance_id,
            )

            if resolution.reflected_damage > 0:
                self._emit(
                    "damage_reflected",
                    {
                        "source_player_id": target_player_id,
                        "source_module_id": target.instance_id,
                        "target_player_id": attacker_player_id,
                        "target_module_id": attacker.instance_id,
                        "damage": resolution.reflected_damage,
                    },
                )
                self.apply_damage(
                    attacker_player_id,
                    attacker.instance_id,
                    resolution.reflected_damage,
                    source_player_id=target_player_id,
                    source_module_id=target.instance_id,
                )

            self.start_cooldown(
                attacker_player_id,
                attacker.instance_id,
                ATTACK_COOLDOWN_ID,
                effective_cooldown_ms,
            )

            self._emit(
                "attack_support_applied",
                {
                    "player_id": attacker_player_id,
                    "module_id": attacker.instance_id,
                    "damage_multiplier": support.damage_multiplier,
                    "cooldown_multiplier": support.cooldown_multiplier,
                    "amplifier_active": support.amplifier_active,
                    "targeting_active": support.targeting_active,
                    "overclock_active": support.overclock_active,
                    "contributions": list(support.contributions),
                },
            )
            for contribution in support.contributions:
                self._emit(
                    "module_contribution",
                    {
                        "player_id": attacker_player_id,
                        "source_player_id": attacker_player_id,
                        "source_module_id": contribution["source_module_id"],
                        "target_player_id": attacker_player_id,
                        "target_module_id": attacker.instance_id,
                        "category": "destek",
                        "contribution_kind": contribution["contribution_kind"],
                        "value": round(float(contribution["value"]), 2),
                        "unit": "percent",
                    },
                )

            heat_before = attacker.heat
            attacker.heat = min(
                MAX_HEAT,
                attacker.heat + attack_heat_gain(attacker),
            )
            self._emit(
                "module_heat_changed",
                {
                    "player_id": attacker_player_id,
                    "module_id": attacker.instance_id,
                    "heat_before": heat_before,
                    "heat_after": attacker.heat,
                },
            )

            if attacker.heat >= CRITICAL_HEAT_THRESHOLD:
                self.add_debuff(
                    attacker_player_id,
                    attacker.instance_id,
                    OVERHEAT_DEBUFF_ID,
                    "Aşırı Yük",
                    OVERHEAT_DURATION_MS,
                    {"reason": "critical_heat"},
                )
                self._emit(
                    "module_overheated",
                    {
                        "player_id": attacker_player_id,
                        "module_id": attacker.instance_id,
                        "heat": attacker.heat,
                        "duration_ms": OVERHEAT_DURATION_MS,
                        "self_damage": OVERHEAT_SELF_DAMAGE,
                    },
                )
                self.apply_damage(
                    attacker_player_id,
                    attacker.instance_id,
                    OVERHEAT_SELF_DAMAGE,
                )

    def _finish_battle(
        self,
        winner_player_id: str | None,
        loser_player_id: str | None,
        is_draw: bool,
        reason: str,
    ) -> None:
        if self.state.status == BattleStatus.FINISHED:
            return

        summaries = {
            player_id: build_player_summary(
                player,
                self.state.events,
                self.state.player_upgrade_levels.get(player_id, {}),
            )
            for player_id, player in self.state.players.items()
        }

        self.state.status = BattleStatus.FINISHED
        self.state.winner_player_id = winner_player_id
        self.state.loser_player_id = loser_player_id
        self.state.is_draw = is_draw
        self.state.finish_reason = reason
        self.state.finished_at_ms = (
            self.state.elapsed_ms + TICK_MS
        )
        self.state.result_summary = {
            player_id: {
                **summary_to_dict(summary),
                "core_power_uses": self.state.players[player_id].core_power_uses,
            }
            for player_id, summary in summaries.items()
        }

        self._emit(
            "battle_finished",
            {
                "winner_player_id": winner_player_id,
                "loser_player_id": loser_player_id,
                "is_draw": is_draw,
                "reason": reason,
                "finished_at_ms": self.state.finished_at_ms,
                "summary": self.state.result_summary,
            },
        )

    def overtime_view(self) -> dict[str, int | float | bool | None]:
        elapsed_ms = self.state.elapsed_ms
        return {
            "active": elapsed_ms >= OVERTIME_START_MS,
            "started_at_ms": OVERTIME_START_MS,
            "core_exposed": False,
            "core_exposed_at_ms": None,
            "core_decay_active": False,
            "core_decay_started_at_ms": None,
            "attack_multiplier": overtime_attack_multiplier_for_elapsed_ms(
                elapsed_ms
            ),
            "repair_multiplier": overtime_repair_multiplier_for_elapsed_ms(
                elapsed_ms
            ),
        }

    def _process_overtime_pressure(self) -> None:
        effective_elapsed_ms = self.state.elapsed_ms + TICK_MS

        if effective_elapsed_ms == OVERTIME_START_MS:
            self._emit(
                "battle_overtime_started",
                {
                    "started_at_ms": OVERTIME_START_MS,
                    "attack_multiplier": (
                        overtime_attack_multiplier_for_elapsed_ms(
                            effective_elapsed_ms
                        )
                    ),
                    "repair_multiplier": (
                        overtime_repair_multiplier_for_elapsed_ms(
                            effective_elapsed_ms
                        )
                    ),
                },
            )
        # No timed Core exposure or automatic Core damage. Overtime only
        # helps attacks break utility-heavy module lines; it cannot skip the
        # circuit-clear objective.

    def _evaluate_battle_end(self) -> None:
        if self.state.status != BattleStatus.RUNNING:
            return
        if len(self.state.players) < 2:
            return

        player_ids = sorted(self.state.players)
        destroyed_core_players = [
            player_id
            for player_id in player_ids
            if core_hp(self.state.players[player_id]) <= 0
        ]

        if len(destroyed_core_players) == 1:
            loser = destroyed_core_players[0]
            winner = next(
                player_id for player_id in player_ids
                if player_id != loser
            )
            self._finish_battle(
                winner_player_id=winner,
                loser_player_id=loser,
                is_draw=False,
                reason="core_destroyed",
            )
            return

        if len(destroyed_core_players) >= 2:
            self._finish_battle(
                winner_player_id=None,
                loser_player_id=None,
                is_draw=True,
                reason="simultaneous_core_destroyed",
            )

    def _process_passive_heat(self) -> None:
        for player in self.state.players.values():
            apply_passive_cooling(player)

    def _expire_timed_module_state(self) -> None:
        elapsed_ms = self.state.elapsed_ms

        for player in self.state.players.values():
            for module in player.modules.values():
                for collection_name in (
                    "debuffs",
                    "persistent_effects",
                    "temporary_boosters",
                ):
                    collection = getattr(module, collection_name)
                    expired = [
                        effect_id
                        for effect_id, effect in collection.items()
                        if effect.is_expired(elapsed_ms)
                    ]
                    for effect_id in expired:
                        del collection[effect_id]
                        self._emit(
                            "module_timed_effect_expired",
                            {
                                "player_id": player.player_id,
                                "module_id": module.instance_id,
                                "collection": collection_name,
                                "effect_id": effect_id,
                            },
                        )

                ready_cooldowns = [
                    cooldown_id
                    for cooldown_id, ready_at_ms in module.cooldowns_ready_at_ms.items()
                    if elapsed_ms >= ready_at_ms
                ]
                for cooldown_id in ready_cooldowns:
                    del module.cooldowns_ready_at_ms[cooldown_id]
                    self._emit(
                        "module_cooldown_ready",
                        {
                            "player_id": player.player_id,
                            "module_id": module.instance_id,
                            "cooldown_id": cooldown_id,
                        },
                    )

    def _process_commands(self) -> None:
        processed = 0
        while (
            self._command_queue
            and self.state.status == BattleStatus.RUNNING
            and processed < self.max_commands_per_tick
        ):
            command = self._command_queue.popleft()
            self._process_command(command)
            processed += 1
        if self.state.status != BattleStatus.RUNNING:
            self._command_queue.clear()

    def _process_command(self, command: BattleCommand) -> None:
        self._emit(
            "command_received",
            {
                "player_id": command.player_id,
                "kind": command.kind,
                "payload": command.payload,
            },
        )

        try:
            handlers = {
                "deploy_module": self._cmd_deploy_module,
                "place_module": self._cmd_place_module_legacy,
                "remove_module": self._cmd_remove_module,
                "move_module": self._cmd_move_module,
                "swap_modules": self._cmd_swap_modules,
                "replace_module": self._cmd_replace_module,
                "apply_booster": self._cmd_apply_booster,
                "select_booster": self._cmd_select_booster,
                "use_booster": self._cmd_use_booster,
                "use_core_power": self._cmd_use_core_power,
                "send_battle_emoji": self._cmd_send_battle_emoji,
                "forfeit_battle": self._cmd_forfeit_battle,
            }
            handler = handlers.get(command.kind)
            if handler is None:
                raise CommandRejected(f"Bilinmeyen komut: {command.kind}")

            handler(command.player_id, command.payload)

        except (CommandRejected, ValueError) as exc:
            self._emit(
                "command_rejected",
                {
                    "player_id": command.player_id,
                    "kind": command.kind,
                    "reason": str(exc),
                },
            )

    def _cmd_forfeit_battle(self, player_id: str, payload: dict) -> None:
        player = self._require_player(player_id)
        opponent_ids = [
            opponent_id
            for opponent_id in sorted(self.state.players)
            if opponent_id != player_id
        ]
        if not opponent_ids:
            raise CommandRejected("Savaşı bırakmak için etkin bir rakip gerekli.")

        battle_earnings = max(
            0,
            player.total_circuit_credits_earned
            - self.circuit_credit_config.starting_credits,
        )
        penalty = min(player.circuit_credits, battle_earnings)
        player.circuit_credits -= penalty
        player.forfeit_credit_penalty = penalty

        self._emit(
            "battle_forfeited",
            {
                "player_id": player_id,
                "winner_player_id": opponent_ids[0],
                "earned_during_battle": battle_earnings,
                "credit_penalty": penalty,
                "resource": "current",
                "remaining_circuit_credits": player.circuit_credits,
            },
        )
        self._finish_battle(
            winner_player_id=opponent_ids[0],
            loser_player_id=player_id,
            is_draw=False,
            reason="player_forfeit",
        )

    def _cmd_reject_manual_placement(self, player_id: str, payload: dict) -> None:
        del player_id, payload
        raise CommandRejected(
            "Hücre seçerek yerleştirme kapalıdır; destedeki karta tıklayın."
        )

    def _cmd_reject_reposition(self, player_id: str, payload: dict) -> None:
        del player_id, payload
        raise CommandRejected("Yerleştirilen modüllerin konumu değiştirilemez.")

    def _cmd_reject_booster(self, player_id: str, payload: dict) -> None:
        del player_id, payload
        raise CommandRejected("Güçlendiriciler bu savaş kuralında kapalıdır.")

    def _cmd_send_battle_emoji(self, player_id: str, payload: dict) -> None:
        player = self._require_player(player_id)
        emoji_id = str(payload.get("emoji_id") or "").strip()
        if emoji_id == "none" or emoji_id != player.selected_battle_emoji_id:
            raise CommandRejected("Seçili ve kazanılmış bir savaş emojisi gerekli.")
        if self.state.elapsed_ms - player.last_battle_emoji_at_ms < 3000:
            raise CommandRejected("Savaş emojisi yeniden kullanım beklemesinde.")
        player.last_battle_emoji_at_ms = self.state.elapsed_ms
        self._emit(
            "battle_emoji",
            {
                "player_id": player_id,
                "emoji_id": emoji_id,
            },
        )

    def _cmd_use_core_power(self, player_id: str, payload: dict) -> None:
        player = self._require_player(player_id)
        request_id = str(payload.get("request_id") or "").strip()
        target_module_id = str(payload.get("target_module_id") or "").strip()
        if not request_id:
            raise CommandRejected("Çekirdek Gücü için istek kimliği gerekli.")
        if request_id in player.consumed_core_power_request_ids:
            self._emit(
                "core_power_replayed",
                {"player_id": player_id, "request_id": request_id},
            )
            return
        if player.core_power_charge < CORE_POWER_MAX_CHARGE:
            raise CommandRejected("Çekirdek Gücü henüz dolmadı.")

        core = next(
            (
                module
                for module in player.modules.values()
                if module.definition.id == "core"
            ),
            None,
        )
        if core is None or core.status != ModuleStatus.ACTIVE:
            raise CommandRejected("Etkin Çekirdek bulunamadı.")
        if target_module_id and target_module_id != core.instance_id:
            raise CommandRejected("Çekirdek gücü merkez Çekirdekten kullanılır.")
        level = max(1, min(15, player.core_level))
        rarity_profile = core_rarity_profile(player.core_type)
        rarity_effect = rarity_profile["effect"]
        allies = [
            module
            for module in player.modules.values()
            if module.definition.id == "core" or module_is_operational(module)
        ]
        power = player.core_type
        repaired = 0
        effect_kind = {
            "core_resonance": "heal",
            "core_guardian": "defense",
            "core_overdrive": "attack",
            "core_disruptor": "sabotage",
            "core_capacitor": "energy",
            "core_phoenix": "heal",
            "core_quantum": "hybrid",
        }.get(power, "heal")
        if power in {"core_resonance", "core_phoenix"} and not any(
            module.hp < module.definition.max_hp for module in allies
        ):
            raise CommandRejected("Tüm devre tam canlı; dolum korunuyor.")
        affected_targets = [
            {"player_id": player_id, "module_id": module.instance_id}
            for module in allies
        ]
        if power == "core_disruptor":
            affected_targets = [
                {"player_id": enemy_id, "module_id": module.instance_id}
                for enemy_id, enemy in self.state.players.items()
                if enemy_id != player_id
                for module in enemy.modules.values()
                if module.status == ModuleStatus.ACTIVE
                and module.hp > 0
                and module.definition.category == "destek"
            ]
        elif power == "core_capacitor":
            affected_targets = [
                {"player_id": player_id, "module_id": core.instance_id}
            ]
        self._emit(
            "core_power_activated",
            {
                "player_id": player_id,
                "request_id": request_id,
                "power_id": power,
                "target_module_id": core.instance_id,
                "effect_kind": effect_kind,
                "affected_module_ids": [
                    target["module_id"] for target in affected_targets
                ],
                "affected_targets": affected_targets,
            },
        )
        if power in {"core_resonance", "core_phoenix", "core_quantum"}:
            for module in allies:
                heal = (
                    round((45 if module == core else 15) * 1.035 ** (level - 1) * rarity_effect)
                    if power == "core_resonance"
                    else round(
                        module.definition.max_hp
                        * min(.45, (.20 + .005 * (level - 1)) * rarity_effect)
                    )
                )
                actual = min(heal, module.definition.max_hp - module.hp)
                module.hp += actual
                repaired += actual
                if actual > 0:
                    self._emit(
                        "module_repaired",
                        {
                            "player_id": player_id,
                            "source_module_id": core.instance_id,
                            "target_module_id": module.instance_id,
                            "module_id": module.instance_id,
                            "repair": actual,
                            "hp": module.hp,
                        },
                    )
        if power in {"core_guardian", "core_quantum"}:
            for module in allies:
                shield_amount = round(20 * 1.035 ** (level - 1) * rarity_effect)
                self.add_persistent_effect(
                    player_id,
                    module.instance_id,
                    "core_guardian",
                    "Çekirdek Kalkanı",
                    4000,
                    {"shield_hp": shield_amount},
                )
                self._emit(
                    "core_effect_applied",
                    {
                        "player_id": player_id,
                        "source_module_id": core.instance_id,
                        "target_player_id": player_id,
                        "target_module_id": module.instance_id,
                        "power_id": power,
                        "effect_kind": "defense",
                        "value": shield_amount,
                    },
                )
        if power == "core_overdrive":
            for module in allies:
                damage_multiplier = 1 + (.25 + .01 * (level - 1)) * rarity_effect
                self.add_persistent_effect(
                    player_id,
                    module.instance_id,
                    "core_overdrive",
                    "Aşırı Yük",
                    3000 + ((level - 1) // 3) * 100,
                    {"damage_multiplier": damage_multiplier},
                )
                self._emit(
                    "core_effect_applied",
                    {
                        "player_id": player_id,
                        "source_module_id": core.instance_id,
                        "target_player_id": player_id,
                        "target_module_id": module.instance_id,
                        "power_id": power,
                        "effect_kind": "attack",
                        "value": round((damage_multiplier - 1) * 100),
                        "unit": "%",
                    },
                )
        if power == "core_disruptor":
            for enemy_id, enemy in self.state.players.items():
                if enemy_id == player_id:
                    continue
                for module in enemy.modules.values():
                    if module.status != ModuleStatus.ACTIVE or module.definition.id == "core":
                        continue
                    module.persistent_effects.pop("core_overdrive", None)
                    if module.definition.category == "destek":
                        duration_ms = round((2000 + (level - 1) * 50) * rarity_effect)
                        self.add_debuff(
                            enemy_id,
                            module.instance_id,
                            JAMMER_DEBUFF_ID,
                            "Çekirdek Kesintisi",
                            duration_ms,
                        )
                        module.is_powered = False
                        module.energy_received_last_tick = 0.0
                        self._emit(
                            "core_effect_applied",
                            {
                                "player_id": player_id,
                                "source_module_id": core.instance_id,
                                "target_player_id": enemy_id,
                                "target_module_id": module.instance_id,
                                "power_id": power,
                                "effect_kind": "sabotage",
                                "value": round(duration_ms / 1000, 1),
                            },
                        )
        if power == "core_capacitor":
            player.discounted_deployments = 2 + int(rarity_effect >= 1.20)
            self._emit(
                "core_effect_applied",
                {
                    "player_id": player_id,
                    "source_module_id": core.instance_id,
                    "target_player_id": player_id,
                    "target_module_id": core.instance_id,
                    "power_id": power,
                    "effect_kind": "energy",
                    "value": player.discounted_deployments,
                },
            )
        player.core_power_charge = 0.0
        player.core_power_ready_emitted = False
        player.core_power_uses += 1
        player.consumed_core_power_request_ids.add(request_id)
        self._emit(
            "core_power_used",
            {
                "player_id": player_id,
                "request_id": request_id,
                "power_id": player.core_type,
                "target_module_id": core.instance_id,
                "effect_kind": effect_kind,
                "repair": repaired,
                "affected_module_ids": [
                    target["module_id"] for target in affected_targets
                ],
                "affected_targets": affected_targets,
                "hp": core.hp,
                "charge": 0,
            },
        )

    def _next_deployed_instance_id(
        self,
        player_id: str,
        definition_id: str,
    ) -> str:
        player = self._require_player(player_id)
        serial = 1 + sum(
            module.definition.id == definition_id
            for module in player.modules.values()
        )
        safe_definition_id = definition_id.replace("_", "-")
        candidate = f"{player_id}-{safe_definition_id}-{serial}"
        while candidate in player.modules:
            serial += 1
            candidate = f"{player_id}-{safe_definition_id}-{serial}"
        return candidate

    def _deployment_candidates(
        self,
        player_id: str,
        module: BattleModule,
    ) -> list[Position]:
        candidates: list[Position] = []
        for position in self.board.placeable_positions:
            try:
                self._ensure_module_allowed_in_cell(module, position)
                self._ensure_position_available(player_id, position)
            except CommandRejected:
                continue
            candidates.append(position)
        return sorted(
            candidates,
            key=lambda item: (item.y, item.x),
        )

    def _cmd_deploy_module(self, player_id: str, payload: dict) -> None:
        """Create a fresh deck-card instance and place it server-authoritatively."""
        self._ensure_active_capacity_for_new_module(player_id)
        definition_id = str(payload.get("definition_id") or "").strip()
        player = self._require_player(player_id)
        if not definition_id:
            raise CommandRejected("Yerleştirilecek deste kartı gerekli.")
        if player.battle_pool is None or not player.battle_pool.contains(definition_id):
            raise CommandRejected("Seçilen modül oyuncunun altı kartlık destesinde değil.")

        instance_id = self._next_deployed_instance_id(player_id, definition_id)
        module = self.grant_module(player_id, instance_id, definition_id)
        composition_rejection = deployment_rejection_reason(
            player,
            module.definition,
        )
        if composition_rejection is not None:
            player.modules.pop(instance_id, None)
            raise CommandRejected(composition_rejection)

        candidates = self._deployment_candidates(player_id, module)
        if not candidates:
            player.modules.pop(instance_id, None)
            raise CommandRejected(
                "Bu kart için uygun ve boş bir hücre bulunamadı."
            )

        seed = (
            f"{self.state.battle_id}:{player_id}:{definition_id}:"
            f"{instance_id}:{self.state.tick}"
        )
        digest = hashlib.sha256(seed.encode("utf-8")).digest()
        position = candidates[
            int.from_bytes(digest[:8], "big") % len(candidates)
        ]
        try:
            self._spend_circuit_credits(
                player_id,
                max(1, module.definition.current_cost - (1 if player.discounted_deployments else 0)),
                reason=f"modul_uret:{module.definition.id}",
            )
        except CommandRejected:
            player.modules.pop(instance_id, None)
            raise

        if player.discounted_deployments:
            player.discounted_deployments -= 1
        module.status = ModuleStatus.ACTIVE
        module.position = position
        module.is_powered = True
        self._emit(
            "module_placed",
            {
                **self._module_event_data(player_id, module),
                "placement_mode": "server_automatic",
            },
        )

    def _cmd_place_module_legacy(self, player_id: str, payload: dict) -> None:
        """Place an existing reserve copy without trusting client coordinates."""
        self._ensure_active_capacity_for_new_module(player_id)
        module = self._require_module(player_id, payload["module_id"])

        if module.status == ModuleStatus.DESTROYED:
            raise CommandRejected("Yok edilmiş modül yeniden devreye alınamaz.")
        if module.status != ModuleStatus.RESERVE:
            raise CommandRejected("Yalnızca rezervdeki modül yerleştirilebilir.")

        composition_rejection = deployment_rejection_reason(
            self._require_player(player_id),
            module.definition,
        )
        if composition_rejection is not None:
            raise CommandRejected(composition_rejection)

        candidates = self._deployment_candidates(player_id, module)
        if not candidates:
            raise CommandRejected(
                "Bu kart için uygun ve boş bir hücre bulunamadı."
            )
        seed = (
            f"{self.state.battle_id}:{player_id}:{module.definition.id}:"
            f"{module.instance_id}:{self.state.tick}:legacy"
        )
        digest = hashlib.sha256(seed.encode("utf-8")).digest()
        position = candidates[
            int.from_bytes(digest[:8], "big") % len(candidates)
        ]

        self._spend_circuit_credits(
            player_id,
            module.definition.circuit_credit_cost,
            reason=f"modul_yerlestir:{module.definition.id}",
        )

        module.status = ModuleStatus.ACTIVE
        module.position = position
        module.is_powered = True

        self._emit(
            "module_placed",
            {
                **self._module_event_data(player_id, module),
                "placement_mode": "server_automatic_legacy",
            },
        )

    def _cmd_remove_module(self, player_id: str, payload: dict) -> None:
        self._ensure_module_interaction_unlocked()
        module = self._require_active_module(player_id, payload["module_id"])

        if not module.definition.removable:
            raise CommandRejected(f"{module.definition.name_tr} devreden çıkarılamaz.")

        self._spend_circuit_credits(
            player_id,
            self.circuit_credit_config.remove_cost,
            reason=f"modul_rezerve_al:{module.definition.id}",
        )

        module.status = ModuleStatus.RESERVE
        module.position = None

        self._emit(
            "module_removed",
            self._module_event_data(player_id, module),
        )

    def _cmd_move_module(self, player_id: str, payload: dict) -> None:
        self._ensure_module_interaction_unlocked()
        module = self._require_active_module(player_id, payload["module_id"])

        if not module.definition.movable:
            raise CommandRejected(f"{module.definition.name_tr} taşınamaz.")

        new_position = self._position_from_payload(payload)
        self._ensure_board_position_placeable(new_position)
        self._ensure_module_allowed_in_cell(module, new_position)

        self._ensure_position_available(
            player_id,
            new_position,
            ignore_module_id=module.instance_id,
        )

        self._spend_circuit_credits(
            player_id,
            self.circuit_credit_config.move_cost,
            reason=f"modul_tasi:{module.definition.id}",
        )

        module.position = new_position
        module.is_powered = False

        self._emit(
            "module_moved",
            self._module_event_data(player_id, module),
        )

    def _cmd_swap_modules(self, player_id: str, payload: dict) -> None:
        """İki yaşayan aktif modülün konumunu tek, atomik hamlede değiştirir."""
        self._ensure_module_interaction_unlocked()
        first = self._require_active_module(player_id, payload["module_id"])
        second = self._require_active_module(player_id, payload["target_module_id"])

        if first.instance_id == second.instance_id:
            raise CommandRejected("Bir modül kendi konumuyla değiştirilemez.")
        if first.hp <= 0 or second.hp <= 0:
            raise CommandRejected("Yok edilmiş modüller yer değiştiremez.")
        if not first.definition.movable:
            raise CommandRejected(f"{first.definition.name_tr} taşınamaz.")
        if not second.definition.movable:
            raise CommandRejected(f"{second.definition.name_tr} taşınamaz.")
        if {
            first.definition.id,
            second.definition.id,
        } & {"core"}:
            raise CommandRejected(
                "Çekirdek normal modül takasına dahil edilemez."
            )
        if first.position is None or second.position is None:
            raise CommandRejected("Yer değiştirilecek modüllerin konumu bulunamadı.")

        self._ensure_module_allowed_in_cell(first, second.position)
        self._ensure_module_allowed_in_cell(second, first.position)

        self._spend_circuit_credits(
            player_id,
            self.circuit_credit_config.move_cost,
            reason=(
                f"modul_takas:{first.definition.id}:{second.definition.id}"
            ),
        )

        first_position = first.position
        second_position = second.position
        first.position = second_position
        second.position = first_position
        first.is_powered = False
        second.is_powered = False

        self._emit(
            "modules_swapped",
            {
                "player_id": player_id,
                "first": self._module_event_data(player_id, first),
                "second": self._module_event_data(player_id, second),
            },
        )

    def _cmd_replace_module(self, player_id: str, payload: dict) -> None:
        self._ensure_module_interaction_unlocked()
        outgoing = self._require_active_module(
            player_id,
            payload["outgoing_module_id"],
        )
        incoming = self._require_module(
            player_id,
            payload["incoming_module_id"],
        )

        if not outgoing.definition.removable:
            raise CommandRejected(f"{outgoing.definition.name_tr} değiştirilemez.")
        if incoming.status == ModuleStatus.DESTROYED:
            raise CommandRejected("Yok edilmiş modül değişim için kullanılamaz.")
        if incoming.status != ModuleStatus.RESERVE:
            raise CommandRejected("Gelen modül rezervde olmalıdır.")
        if outgoing.position is None:
            raise CommandRejected("Değiştirilecek modülün konumu bulunamadı.")

        composition_rejection = deployment_rejection_reason(
            self._require_player(player_id),
            incoming.definition,
            ignored_instance_id=outgoing.instance_id,
        )
        if composition_rejection is not None:
            raise CommandRejected(composition_rejection)

        position = outgoing.position
        self._ensure_module_allowed_in_cell(incoming, position)

        self._spend_circuit_credits(
            player_id,
            incoming.definition.circuit_credit_cost,
            reason=f"modul_degistir:{incoming.definition.id}",
        )

        outgoing.status = ModuleStatus.RESERVE
        outgoing.position = None

        incoming.status = ModuleStatus.ACTIVE
        incoming.position = position
        incoming.is_powered = False

        self._emit(
            "module_replaced",
            {
                "player_id": player_id,
                "outgoing_module_id": outgoing.instance_id,
                "outgoing_hp": outgoing.hp,
                "incoming_module_id": incoming.instance_id,
                "incoming_hp": incoming.hp,
                "x": position.x,
                "y": position.y,
            },
        )

    def _cmd_select_booster(self, player_id: str, payload: dict) -> None:
        player = self._require_player(player_id)
        offer = player.pending_booster_offer
        booster_id = payload.get("booster_id")
        if offer is None:
            raise CommandRejected("Aktif güçlendirici seçim hakkı yok.")
        if booster_id not in offer.booster_ids:
            raise CommandRejected("Seçilen güçlendirici mevcut seçenekler arasında değil.")
        player.pending_booster_offer = type(offer)(
            id=offer.id,
            booster_ids=(booster_id,),
            created_at_ms=offer.created_at_ms,
        )
        self._emit("booster_selected", {
            "player_id": player_id,
            "offer_id": offer.id,
            "booster_id": booster_id,
        })

    def _cmd_apply_booster(self, player_id: str, payload: dict) -> None:
        player = self._require_player(player_id)
        booster_id = payload.get("booster_id")
        target_module_id = payload.get("target_module_id")
        if not booster_id or not target_module_id:
            raise CommandRejected("Güçlendirici ve hedef modül bilgisi gerekli.")

        if player.pending_booster_offer is not None:
            selected = player.pending_booster_offer.booster_ids
            if len(selected) != 1 or selected[0] != booster_id:
                raise CommandRejected("Önce mevcut tekliften bir güçlendirici seçilmelidir.")

        booster = get_booster_definition(booster_id)
        module = self._require_active_module(player_id, target_module_id)

        rejection_reason = booster_target_rejection_reason(booster, module)
        if rejection_reason is not None:
            raise CommandRejected(rejection_reason)

        self._apply_booster_effect(player_id, booster, module)

        if player.pending_booster_offer is not None:
            self._consume_booster_offer(player_id, player.pending_booster_offer.id)

    def _cmd_use_booster(self, player_id: str, payload: dict) -> None:
        player = self._require_player(player_id)
        offer_id = payload.get("offer_id")
        booster_id = payload.get("booster_id")
        target_module_id = payload.get("target_module_id")
        if not offer_id or not booster_id or not target_module_id:
            raise CommandRejected("Teklif, güçlendirici ve hedef modül bilgisi gerekli.")
        if offer_id in player.consumed_booster_offer_ids:
            raise CommandRejected("Bu güçlendirici teklifi daha önce kullanıldı.")

        offer = player.pending_booster_offer
        if offer is None or offer.id != offer_id:
            raise CommandRejected("Aktif güçlendirici teklifi bulunamadı.")
        if booster_id not in offer.booster_ids:
            raise CommandRejected("Seçilen güçlendirici mevcut seçenekler arasında değil.")

        booster = get_booster_definition(booster_id)
        module = self._require_active_module(player_id, target_module_id)
        rejection_reason = booster_target_rejection_reason(booster, module)
        if rejection_reason is not None:
            raise CommandRejected(rejection_reason)

        self._apply_booster_effect(player_id, booster, module)
        self._consume_booster_offer(player_id, offer_id)

    def eligible_booster_target_ids(
        self,
        player_id: str,
        booster_id: str,
    ) -> list[str]:
        player = self._require_player(player_id)
        booster = get_booster_definition(booster_id)
        return sorted(
            module.instance_id
            for module in player.modules.values()
            if booster_target_rejection_reason(booster, module) is None
        )

    def _apply_booster_effect(self, player_id, booster, module) -> None:

        if booster.id == "emergency_repair":
            amount = int(module.definition.max_hp * float(booster.effect_data["instant_repair_ratio"]))
            before = module.hp
            module.hp = min(module.definition.max_hp, module.hp + amount)
            self._emit("booster_applied", {
                "player_id": player_id,
                "booster_id": booster.id,
                "target_module_id": module.instance_id,
                "instant": True,
                "hp_before": before,
                "hp_after": module.hp,
            })
        elif booster.id == "cooling_burst":
            before = module.heat
            module.heat = 0.0
            self._emit("booster_applied", {
                "player_id": player_id,
                "booster_id": booster.id,
                "target_module_id": module.instance_id,
                "instant": True,
                "heat_before": before,
                "heat_after": module.heat,
            })
            self._emit("module_heat_changed", {
                "player_id": player_id,
                "module_id": module.instance_id,
                "heat_before": before,
                "heat_after": module.heat,
                "reason": "cooling_burst",
            })
        elif booster.id == "signal_cleanser":
            removed_effect_ids = sorted(module.debuffs.keys())
            module.debuffs.clear()
            self._emit("booster_applied", {
                "player_id": player_id,
                "booster_id": booster.id,
                "target_module_id": module.instance_id,
                "instant": True,
                "removed_effect_ids": removed_effect_ids,
            })
        else:
            self.add_temporary_booster_state(
                player_id, module.instance_id, booster.id, booster.name_tr,
                booster.duration_ms, booster.effect_data
            )
            self._emit("booster_applied", {
                "player_id": player_id,
                "booster_id": booster.id,
                "target_module_id": module.instance_id,
                "instant": False,
            })

    def _consume_booster_offer(self, player_id: str, offer_id: str) -> None:
        player = self._require_player(player_id)
        player.consumed_booster_offer_ids.add(offer_id)
        player.pending_booster_offer = None
        player.next_booster_offer_index += 1
        self._emit("booster_offer_consumed", {
            "player_id": player_id,
            "offer_id": offer_id,
            "next_offer_due_at_ms": booster_offer_due_at_ms(player.next_booster_offer_index),
        })
    def _update_booster_offers(self) -> None:
        if not BOOSTERS_ENABLED:
            for player in self.state.players.values():
                player.pending_booster_offer = None
            return
        # _simulate mevcut tick'in sonunda çalışacak durumu hazırlar.
        effective_elapsed_ms = self.state.elapsed_ms + TICK_MS

        for player in self.state.players.values():
            if player.pending_booster_offer is not None:
                continue

            due = booster_offer_due_at_ms(player.next_booster_offer_index)
            if effective_elapsed_ms < due:
                continue

            offer = build_booster_offer(
                player.player_id,
                player.next_booster_offer_index,
            )
            player.pending_booster_offer = offer
            self._emit("booster_offer_created", {
                "player_id": player.player_id,
                "offer_id": offer.id,
                "booster_ids": list(offer.booster_ids),
                "created_at_ms": offer.created_at_ms,
            })

    def _simulate(self) -> None:
        """
        alpha.5:
        - Dinamik modül işlemleri çalışır.
        - Zaman tabanlı modül durumları savaş saatiyle ilerler.
        - Isı ve depolanmış enerji rezerv/aktif geçişinde aynen korunur.

        Devre Kredisi, enerji akışı ve gerçek saldırı/hasar döngüsü
        savaş durmadan aynı tick akışında ilerler.
        """
        self._update_core_power_charge()
        self._update_booster_offers()
        self._apply_passive_circuit_credit_income()
        self._process_energy_flow()
        self._process_sabotage_actions()
        self._process_virus_effects()
        self._process_support_actions()
        self._process_overtime_pressure()
        self._evaluate_battle_end()
        if self.state.status == BattleStatus.FINISHED:
            return
        self._process_combat_actions()
        self._process_passive_heat()
        self._expire_timed_module_state()
        self._evaluate_battle_end()

    def _update_core_power_charge(self) -> None:
        charge_per_tick = (
            CORE_POWER_MAX_CHARGE
            * TICK_MS
            / CORE_POWER_CHARGE_DURATION_MS
        )
        for player in self.state.players.values():
            if player.core_power_charge >= CORE_POWER_MAX_CHARGE:
                continue
            player.core_power_charge = min(
                CORE_POWER_MAX_CHARGE,
                player.core_power_charge
                + charge_per_tick
                * core_rarity_profile(player.core_type)["charge"]
                * (1 + .03 * sum(s.endswith("_charge") for s in player.core_skills)),
            )
            if (
                player.core_power_charge >= CORE_POWER_MAX_CHARGE
                and not player.core_power_ready_emitted
            ):
                player.core_power_ready_emitted = True
                self._emit(
                    "core_power_ready",
                    {
                        "player_id": player.player_id,
                        "power_id": player.core_type,
                        "charge": 100,
                    },
                )

    def _require_player(self, player_id: str) -> PlayerBattleState:
        try:
            return self.state.players[player_id]
        except KeyError as exc:
            raise ValueError(f"Bilinmeyen oyuncu: {player_id}") from exc

    def _require_module(self, player_id: str, instance_id: str) -> BattleModule:
        player = self._require_player(player_id)
        try:
            return player.modules[instance_id]
        except KeyError as exc:
            raise ValueError(f"Bilinmeyen modül örneği: {instance_id}") from exc

    def _require_active_module(
        self,
        player_id: str,
        instance_id: str,
    ) -> BattleModule:
        module = self._require_module(player_id, instance_id)

        if module.status != ModuleStatus.ACTIVE:
            raise CommandRejected("İşlem için modül aktif devrede olmalıdır.")

        return module

    @staticmethod
    def _position_from_payload(payload: dict) -> Position:
        try:
            x = int(payload["x"])
            y = int(payload["y"])
        except (KeyError, TypeError, ValueError) as exc:
            raise CommandRejected("Geçerli x/y hücre koordinatı gerekli.") from exc

        if x < 0 or y < 0:
            raise CommandRejected("Hücre koordinatları negatif olamaz.")

        return Position(x=x, y=y)

    def _ensure_board_position_placeable(self, position: Position) -> None:
        if not self.board.contains(position):
            raise CommandRejected(
                f"Hedef hücre savaş alanında değil: ({position.x}, {position.y})."
            )

        cell = self.board.get_cell(position)
        if not cell.placeable:
            raise CommandRejected(
                f"Hedef hücre modül yerleşimine kapalı: ({position.x}, {position.y})."
            )

    def _ensure_module_allowed_in_cell(
        self,
        module: BattleModule,
        position: Position,
    ) -> None:
        cell = self.board.get_cell(position)
        if (
            cell.allowed_definition_ids
            and module.definition.id not in cell.allowed_definition_ids
        ):
            raise CommandRejected(
                f"{cell.bonus.name_tr if cell.bonus else 'Özel hücre'} yalnızca "
                "uygun özel modülü kabul eder."
            )
        if (
            cell.allowed_categories
            and module.definition.category not in cell.allowed_categories
        ):
            expected = ", ".join(cell.allowed_categories)
            raise CommandRejected(
                f"{cell.bonus.name_tr if cell.bonus else 'Özel hücre'} yalnızca "
                f"{expected} sınıfı modülleri kabul eder."
            )

    @staticmethod
    def _position_key(position: Position) -> str:
        return f"{position.x},{position.y}"

    @staticmethod
    def _position_from_key(key: str) -> Position:
        x_text, y_text = key.split(",", 1)
        return Position(x=int(x_text), y=int(y_text))

    def cell_debris_view(self, player_id: str) -> list[dict[str, int]]:
        player = self._require_player(player_id)
        active: list[dict[str, int]] = []
        expired: list[str] = []
        for key, until_ms in player.cell_debris_until_ms.items():
            remaining_ms = int(until_ms) - self.state.elapsed_ms
            if remaining_ms <= 0:
                expired.append(key)
                continue
            position = self._position_from_key(key)
            active.append({
                "x": position.x,
                "y": position.y,
                "until_ms": int(until_ms),
                "remaining_ms": remaining_ms,
            })
        for key in expired:
            player.cell_debris_until_ms.pop(key, None)
        return sorted(active, key=lambda item: (item["y"], item["x"]))

    def _ensure_position_available(
        self,
        player_id: str,
        position: Position,
        ignore_module_id: str | None = None,
    ) -> None:
        player = self._require_player(player_id)

        debris = {
            (item["x"], item["y"]): item
            for item in self.cell_debris_view(player_id)
        }
        blocked = debris.get((position.x, position.y))
        if blocked is not None:
            remaining_seconds = max(
                1,
                (blocked["remaining_ms"] + 999) // 1000,
            )
            raise CommandRejected(
                "Hedef hücrede enkaz var. "
                f"{remaining_seconds} sn sonra yeniden kullanılabilir."
            )

        for module in player.modules.values():
            if module.instance_id == ignore_module_id:
                continue
            if module.status != ModuleStatus.ACTIVE:
                continue
            if module.position == position:
                raise CommandRejected("Hedef hücre dolu.")

    def cell_effects_for_module(
        self,
        player_id: str,
        instance_id: str,
    ) -> dict[str, float]:
        module = self._require_module(player_id, instance_id)

        if module.position is None:
            return {}

        return get_cell_effects(module.position)

    def _module_event_data(
        self,
        player_id: str,
        module: BattleModule,
    ) -> dict:
        data = {
            "player_id": player_id,
            "module_id": module.instance_id,
            "definition_id": module.definition.id,
            "name_tr": module.definition.name_tr,
            "status": module.status.value,
            "hp": module.hp,
            "heat": module.heat,
            "heat_state": (
                "critical" if module.heat >= 100
                else "high" if module.heat >= 70
                else "normal"
            ),
            "stored_energy": module.stored_energy,
            "is_powered": module.is_powered,
            "energy_received_last_tick": module.energy_received_last_tick,
            "energy_required_last_tick": module.energy_required_last_tick,
            "debuffs": sorted(module.debuffs),
            "persistent_effects": sorted(module.persistent_effects),
            "cooldowns": sorted(module.cooldowns_ready_at_ms),
            "temporary_boosters": sorted(module.temporary_boosters),
            "circuit_credit_cost": module.definition.current_cost,
            "current_cost": module.definition.current_cost,
            "max_hp": module.definition.max_hp,
            "base_damage": module.definition.base_damage,
            "cell_effects": (
                get_cell_effects(module.position)
                if module.position is not None
                else {}
            ),
        }

        if module.position is not None:
            data["x"] = module.position.x
            data["y"] = module.position.y

        return data

    def _emit(self, event_type: str, data: dict) -> None:
        self.state.events.append(
            BattleEvent(
                type=event_type,
                at_ms=self.state.elapsed_ms,
                data=data,
            )
        )
