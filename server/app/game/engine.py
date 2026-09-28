from collections import deque
import hashlib
from typing import Deque

from .catalog import get_module_definition
from ..season_competition import daily_meta_by_id
from .battle_pool import validate_battle_pool
from .board import get_default_board
from .economy import (
    CircuitCreditConfig,
    DEFAULT_CIRCUIT_CREDIT_CONFIG,
)
from .combat import (
    ATTACK_COOLDOWN_ID,
    has_living_attack_module,
    is_attack_module,
    ATTACK_WINDUP_MS,
    PRISM_ENERGY_CONVERSION,
    QUANTUM_CHARGE_DAMAGE_BONUS,
    QUANTUM_REPEAT_ECHO_RATIO,
    QUANTUM_REPEAT_HITS,
    SECONDARY_HIT_RATIOS,
    SWARM_RELEASE_DRONES,
    SWARM_RELEASE_RATIO_PER_TARGET,
    SWARM_RELEASE_TARGETS,
    circuit_guard_multiplier,
    resolve_attack,
    secondary_targets,
    select_target,
)
from .composition import deployment_rejection_reason
from .energy import (
    QUANTUM_CHARGE_MAX,
    core_reserve_capacity,
    process_energy_tick,
    spend_action_energy,
)
from .core_balance import (
    DISCHARGE_BASE_DEPLOYMENTS,
    DISCHARGE_FULL_DEPLOYMENTS,
    DISCHARGE_FULL_RESERVE_RATIO,
    EMBER_REBIRTH_HP_RATIO,
    LAST_STAND_CORE_MULTIPLIER,
    LAST_STAND_HP_RATIO,
    LAST_STAND_MODULE_MULTIPLIER,
    OVERDRIVE_CHAIN_EXTENSION_MS,
    OVERDRIVE_CHAIN_MAX,
    STATIC_CHARGE_BONUS_MS,
    core_power_threshold,
    static_charge_stacks,
)
from .operations import has_disabling_sabotage, module_is_operational
from .heat import (
    CRITICAL_HEAT_THRESHOLD,
    HIGH_HEAT_THRESHOLD,
    MAX_HEAT,
    OVERHEAT_DEBUFF_ID,
    OVERHEAT_RECOVERY_THRESHOLD,
    OVERHEAT_SELF_DAMAGE,
    apply_passive_cooling,
    is_overheated,
    attack_heat_gain,
    heat_performance,
)
from .result import (
    build_player_summary,
    core_hp,
    summary_to_dict,
)
from .sabotage import (
    JAMMER_DEBUFF_ID,
    SABOTAGE_COOLDOWN_ID,
    SabotagePlan,
    SabotageResistance,
    VIRUS_DEBUFF_ID,
    VIRUS_TICK_DAMAGE,
    VIRUS_TICK_ESCALATION,
    VIRUS_TICK_INTERVAL_MS,
    SABOTAGE_ECHO_RATIOS,
    effective_sabotage_duration_ms,
    plan_sabotage,
    select_sabotage_target,
    sabotage_cooldown_ms,
    sabotage_resistance,
)
from .support import (
    CHRONO_BOOST_MS,
    CHRONO_DEBT_MS,
    NANO_MEDIC_REPAIR_RATIO,
    NANO_MEDIC_TARGETS,
    PHOENIX_COOLDOWN_ID,
    PHOENIX_COOLDOWN_MS,
    PHOENIX_REPAIR_RATIO,
    PHOENIX_REVIVE_ENERGY,
    PHOENIX_REVIVE_HP_RATIO,
    PRECISION_MAX_STACKS,
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
DEFAULT_MAX_PENDING_COMMANDS = 128
DEFAULT_MAX_PENDING_COMMANDS_PER_PLAYER = 32
DEFAULT_MAX_COMMANDS_PER_TICK = 32


MAX_ACTIVE_MODULES = 15  # Core + 14 deployable cells.
DESTROYED_CELL_DEBRIS_DURATION_MS = 3_000
# Süre sınırı yoktur; bağlı ama kart basmayan oyuncu maçı sonsuza uzatamaz.
# Akım tavandayken ve yerleşecek boş hücre varken bu süre boyunca kart basmayan
# oyuncu savaştan çekilmiş sayılır. Varsayılan motor kuralı kapalıdır; canlı
# PvP/AI oturumları açar (sabit düzenli simülasyonlar kart basmaz).
INACTIVITY_FORFEIT_MS = 30_000
INACTIVITY_WARNING_MS = 15_000
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


class CommandRejected(ValueError):
    pass


class BattleEngine:
    def __init__(
        self,
        state: BattleState,
        circuit_credit_config: CircuitCreditConfig = DEFAULT_CIRCUIT_CREDIT_CONFIG,
        max_pending_commands: int = DEFAULT_MAX_PENDING_COMMANDS,
        max_pending_commands_per_player: int = DEFAULT_MAX_PENDING_COMMANDS_PER_PLAYER,
        max_commands_per_tick: int = DEFAULT_MAX_COMMANDS_PER_TICK,
        inactivity_forfeit_ms: int | None = None,
    ):
        self.state = state
        self.circuit_credit_config = circuit_credit_config
        self.inactivity_forfeit_ms = (
            max(INACTIVITY_WARNING_MS + TICK_MS, int(inactivity_forfeit_ms))
            if inactivity_forfeit_ms is not None
            else None
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
            and definition_id != "core"
            and not player.battle_pool.contains(definition_id)
        ):
            raise ValueError(
                f"Modül oyuncunun Savaş Havuzu'nda değil: {definition_id}"
            )

        if instance_id in player.modules:
            raise ValueError(f"Modül örneği zaten mevcut: {instance_id}")

        definition = get_module_definition(definition_id)
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
            "battery", "capacitor", "current_balancer"
        }:
            effect_multiplier *= meta_multiplier
        definition = replace(definition, max_hp=max_hp, base_damage=base_damage,
                             cooldown_ms=stats["cooldown_ms"], effect_multiplier=effect_multiplier,
                             energy_consumption=stats["energy_consumption"])
        module = BattleModule.create(
            instance_id=instance_id,
            definition=definition,
        )
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
        Maç başlamadan önce Çekirdeği merkez hücreye yerleştirir. Yerleşik
        testler ve simülasyonlar başka modülleri de doğrudan koyabilir.
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
        reborn = module.hp == 0 and self._try_core_ember_rebirth(player_id, module)

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
        if reborn:
            self._emit_core_signature(
                player_id,
                module,
                "ember_rebirth",
                {"hp": module.hp},
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
            if (
                module.definition.id != "core"
                and source_player_id
                and source_player_id != player_id
            ):
                self._extend_overdrive_chain(source_player_id)

        return applied_damage

    def _core_module(self, player: PlayerBattleState) -> BattleModule | None:
        return next(
            (
                module
                for module in player.modules.values()
                if module.definition.id == "core"
            ),
            None,
        )

    def _emit_core_signature(self, player_id, core, signature_id, data=None) -> None:
        player = self.state.players[player_id]
        self._emit(
            "core_signature_triggered",
            {
                "player_id": player_id,
                "module_id": core.instance_id if core is not None else None,
                "core_type": player.core_type,
                "signature_id": signature_id,
                **(data or {}),
            },
        )

    def _try_core_ember_rebirth(self, player_id: str, module: BattleModule) -> bool:
        """Anka · Küllerden Doğuş: dolum tamken Çekirdek maçta bir kez yok olmaz."""
        if module.definition.id != "core":
            return False
        player = self.state.players.get(player_id)
        if (
            player is None
            or player.core_type != "core_phoenix"
            or player.core_signature_state.get("rebirth_used")
            or player.core_power_charge < CORE_POWER_MAX_CHARGE
        ):
            return False
        module.hp = max(1, round(module.definition.max_hp * EMBER_REBIRTH_HP_RATIO))
        player.core_power_charge = 0.0
        player.core_power_ready_emitted = False
        player.core_signature_state["rebirth_used"] = True
        player.core_signature_state["held_ms"] = 0
        return True

    def _extend_overdrive_chain(self, player_id: str) -> None:
        """Aşırı Yük · Zincir: güç sürerken rakip modül düşerse süre uzar."""
        player = self.state.players.get(player_id)
        if player is None or player.core_type != "core_overdrive":
            return
        chain = int(player.core_signature_state.get("overdrive_chain", 0))
        if chain >= OVERDRIVE_CHAIN_MAX:
            return
        boosted = [
            effect
            for module in player.modules.values()
            if module.status == ModuleStatus.ACTIVE
            and (effect := module.persistent_effects.get("core_overdrive")) is not None
            and effect.expires_at_ms is not None
            and effect.expires_at_ms > self.state.elapsed_ms
        ]
        if not boosted:
            return
        for effect in boosted:
            effect.expires_at_ms += OVERDRIVE_CHAIN_EXTENSION_MS
        chain += 1
        player.core_signature_state["overdrive_chain"] = chain
        self._emit_core_signature(
            player_id,
            self._core_module(player),
            "overdrive_chain",
            {"chain": chain, "extension_ms": OVERDRIVE_CHAIN_EXTENSION_MS},
        )


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

    def max_active_modules(self) -> int:
        return MAX_ACTIVE_MODULES

    def _has_open_deploy_cell(self, player_id: str) -> bool:
        if self.active_module_count(player_id) >= MAX_ACTIVE_MODULES:
            return False
        for position in self.board.placeable_positions:
            try:
                self._ensure_position_available(player_id, position)
            except CommandRejected:
                continue
            return True
        return False

    def _process_inactivity(self) -> None:
        if self.inactivity_forfeit_ms is None or len(self.state.players) < 2:
            return
        cap = self.circuit_credit_config.maximum_current
        expired: list[str] = []
        for player_id in sorted(self.state.players):
            player = self.state.players[player_id]
            # Destesi olmayan (sabit düzen) ya da tahtası dolu oyuncu kart basamaz.
            idle = (
                player.battle_pool is not None
                and player.circuit_credits >= cap
                and self._has_open_deploy_cell(player_id)
            )
            if not idle:
                player.idle_at_cap_ms = 0
                player.inactivity_warned = False
                continue
            player.idle_at_cap_ms += TICK_MS
            remaining_ms = self.inactivity_forfeit_ms - player.idle_at_cap_ms
            if player.idle_at_cap_ms >= INACTIVITY_WARNING_MS and not player.inactivity_warned:
                player.inactivity_warned = True
                self._emit(
                    "inactivity_warning",
                    {"player_id": player_id, "remaining_ms": max(0, remaining_ms)},
                )
            if remaining_ms <= 0:
                expired.append(player_id)
        if not expired:
            return
        if len(expired) >= 2:
            self._finish_battle(
                winner_player_id=None,
                loser_player_id=None,
                is_draw=True,
                reason="mutual_inactivity",
            )
            return
        loser = expired[0]
        winner = next(player_id for player_id in sorted(self.state.players) if player_id != loser)
        self._emit("player_inactive", {"player_id": loser, "winner_player_id": winner})
        self._finish_battle(
            winner_player_id=winner,
            loser_player_id=loser,
            is_draw=False,
            reason="player_inactive",
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
        }


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


    def _try_spend_action_energy(
        self,
        player: PlayerBattleState,
        module: BattleModule,
        *,
        reason: str,
        explicit_cost: float | None = None,
    ) -> bool:
        was_waiting = module.energy_waiting
        result = spend_action_energy(player, module, explicit_cost)
        if not result.success:
            # Bekleme her adımda yeniden denenir; olay yalnız beklemeye
            # girişte yayılır, saniyede on olay üretmez.
            if not was_waiting:
                self._emit(
                    "action_energy_waiting",
                    {
                        "player_id": player.player_id,
                        "module_id": module.instance_id,
                        "definition_id": module.definition.id,
                        "reason": reason,
                        "required": round(result.effective_cost, 2),
                        "shortfall": round(result.shortfall, 2),
                        "energy_stock": round(player.energy_stock, 2),
                    },
                )
            return False
        if was_waiting:
            self._emit(
                "action_energy_resumed",
                {
                    "player_id": player.player_id,
                    "module_id": module.instance_id,
                    "definition_id": module.definition.id,
                    "reason": reason,
                },
            )
        if result.saved > 0 and result.balancer_module_ids:
            share = result.saved / len(result.balancer_module_ids)
            for balancer_id in result.balancer_module_ids:
                key = (player.player_id, balancer_id, "energy_saved")
                self._energy_contribution_accumulator[key] = (
                    self._energy_contribution_accumulator.get(key, 0.0) + share
                )
        return True

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

                # Tırmanan enfeksiyon: her tik bir öncekinden 2 fazla vurur.
                tick_index = int(effect.data.get("virus_tick_index", 0))
                effect.data["virus_tick_index"] = tick_index + 1
                damage = max(
                    1,
                    int(
                        round(
                            (VIRUS_TICK_DAMAGE + VIRUS_TICK_ESCALATION * tick_index)
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
            tuple[str, str, BattleModule, SabotagePlan, SabotageResistance, int, bool]
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
                # Enerji oyuncunun kendi kaynağıdır; planlama anında ödenmesi
                # iki tarafın aynı ön durumdan planlanmasını bozmaz.
                if not self._try_spend_action_energy(
                    attacker_player, module, reason="sabotage"
                ):
                    continue

                planned_actions.append((
                    attacker_player_id, target_player_id, module, plan,
                    resistance, effective_duration_ms, False,
                ))
                # Preserve the old per-side targeting rule: a successful
                # disabling effect removes its target from later choices.
                if not resistance.blocked:
                    reserved_target_ids.add(plan.target_module_id)

                # Kesici/Tekillik yankısı: ikinci bir sisteme kısa kesinti.
                # Birincil etki gibi aynı ön durumdan planlanır.
                echo_ratio = SABOTAGE_ECHO_RATIOS.get(module.definition.id)
                if echo_ratio and not resistance.blocked:
                    echo_target = select_sabotage_target(
                        module,
                        target_player,
                        excluded_target_ids=reserved_target_ids,
                    )
                    if echo_target is not None:
                        echo_resistance = sabotage_resistance(
                            module, echo_target, target_player
                        )
                        if not echo_resistance.blocked:
                            echo_duration_ms = max(
                                500,
                                round(
                                    effective_sabotage_duration_ms(
                                        plan.duration_ms, echo_resistance
                                    )
                                    * echo_ratio
                                ),
                            )
                            planned_actions.append((
                                attacker_player_id,
                                target_player_id,
                                module,
                                SabotagePlan(
                                    plan.effect_id,
                                    f"{plan.name_tr} Yankısı",
                                    plan.duration_ms,
                                    echo_target.instance_id,
                                ),
                                echo_resistance,
                                echo_duration_ms,
                                True,
                            ))
                            reserved_target_ids.add(echo_target.instance_id)

        for (
            attacker_player_id, target_player_id, module, plan,
            resistance, effective_duration_ms, is_echo,
        ) in planned_actions:
            if not is_echo:
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
                data["virus_tick_index"] = 0

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
                    "echo": is_echo,
                },
            )
            if is_echo:
                self._emit(
                    "sabotage_echo_applied",
                    {
                        "attacker_player_id": attacker_player_id,
                        "attacker_module_id": module.instance_id,
                        "target_player_id": target_player_id,
                        "target_module_id": plan.target_module_id,
                        "effect_id": plan.effect_id,
                        "duration_ms": effective_duration_ms,
                        "definition_id": module.definition.id,
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

                if module.definition.id == "nano_medic":
                    self._process_nano_medic(player, module, repaired_target_ids)
                    continue
                if module.definition.id == "phoenix_repair":
                    self._process_phoenix_repair(player, module, repaired_target_ids)
                    continue
                if module.definition.id == "chrono_relay":
                    self._advance_chrono_relay(player, module)
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
                        if not self._try_spend_action_energy(
                            player, module, reason="repair_cleanse"
                        ):
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
                    if not self._try_spend_action_energy(
                        player, module, reason="repair"
                    ):
                        continue
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
                            if before >= HIGH_HEAT_THRESHOLD > target.heat:
                                self._emit(
                                    "thermal_stabilized",
                                    {
                                        "player_id": player.player_id,
                                        "source_module_id": module.instance_id,
                                        "target_module_id": target.instance_id,
                                        "heat_before": before,
                                        "heat_after": target.heat,
                                    },
                                )

                elif module.definition.id == "overclock_unit":
                    for target in overclock_targets(
                        player,
                        module,
                        self.board.core_position,
                    ):
                        if target.instance_id in overclocked_target_ids:
                            continue
                        overclocked_target_ids.add(target.instance_id)
                        target.heat = min(MAX_HEAT, target.heat + OVERCLOCK_HEAT_PER_TICK)
                        self._emit(
                            "module_overclocked",
                            {
                                "player_id": player.player_id,
                                "source_module_id": module.instance_id,
                                "target_module_id": target.instance_id,
                                "heat_after": target.heat,
                            },
                        )

    def _process_nano_medic(self, player, module, repaired_target_ids) -> None:
        if not self.is_cooldown_ready(player.player_id, module.instance_id, REPAIR_COOLDOWN_ID):
            return
        targets = [
            target
            for target in repair_targets(player, module, self.board.core_position)
            if target.instance_id not in repaired_target_ids
        ][:NANO_MEDIC_TARGETS]
        if not targets:
            return
        if not self._try_spend_action_energy(player, module, reason="nano_repair"):
            return
        amount = max(
            1,
            round(
                repair_amount(module)
                * NANO_MEDIC_REPAIR_RATIO
                * player.energy_support_multiplier
                * overtime_repair_multiplier_for_elapsed_ms(self.state.elapsed_ms + TICK_MS)
            ),
        )
        for target in targets:
            before = target.hp
            target.hp = min(target.definition.max_hp, target.hp + amount)
            actual = target.hp - before
            if actual <= 0:
                continue
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
                    "mechanic": "nano_medic",
                },
            )
        self._emit(
            "nano_repair_pulse",
            {
                "player_id": player.player_id,
                "source_module_id": module.instance_id,
                "target_module_ids": [target.instance_id for target in targets],
                "repair_each": amount,
            },
        )
        self.start_cooldown(
            player.player_id, module.instance_id, REPAIR_COOLDOWN_ID, module.definition.cooldown_ms
        )

    def _try_phoenix_revive(self, player, module) -> bool:
        candidates = sorted(
            (
                target
                for target in player.modules.values()
                if target.status == ModuleStatus.DESTROYED
                and target.definition.id != "core"
                and not target.mechanic_state.get("phoenix_revived")
            ),
            key=lambda target: (-target.definition.current_cost, target.instance_id),
        )
        for target in candidates:
            # Diriltme yeni bir yerleştirme gibi sınıf ve kopya sınırlarından
            # geçer; bitmeyen savunma/onarım yığınını geri getiremez.
            if deployment_rejection_reason(player, target.definition) is not None:
                continue
            try:
                self._ensure_active_capacity_for_new_module(player.player_id)
            except CommandRejected:
                return False
            positions = self._deployment_candidates(player.player_id, target)
            if not positions:
                return False
            if not self._try_spend_action_energy(
                player, module, reason="phoenix_rebirth", explicit_cost=PHOENIX_REVIVE_ENERGY
            ):
                return False
            seed = f"{self.state.battle_id}:{player.player_id}:phoenix:{target.instance_id}:{self.state.tick}"
            digest = hashlib.sha256(seed.encode("utf-8")).digest()
            position = positions[int.from_bytes(digest[:8], "big") % len(positions)]
            target.status = ModuleStatus.ACTIVE
            target.position = position
            target.hp = max(1, round(target.definition.max_hp * PHOENIX_REVIVE_HP_RATIO))
            target.heat = 0.0
            target.debuffs.clear()
            target.is_powered = True
            target.energy_waiting = False
            target.mechanic_state["phoenix_revived"] = True
            self.start_cooldown(
                player.player_id, module.instance_id, PHOENIX_COOLDOWN_ID, PHOENIX_COOLDOWN_MS
            )
            self._emit(
                "phoenix_rebirth",
                {
                    "player_id": player.player_id,
                    "source_module_id": module.instance_id,
                    "target_module_id": target.instance_id,
                    "hp": target.hp,
                    "x": position.x,
                    "y": position.y,
                    "cooldown_ms": PHOENIX_COOLDOWN_MS,
                },
            )
            self._emit(
                "module_placed",
                {
                    **self._module_event_data(player.player_id, target),
                    "placement_mode": "phoenix_rebirth",
                },
            )
            return True
        return False

    def _process_phoenix_repair(self, player, module, repaired_target_ids) -> None:
        if self.is_cooldown_ready(
            player.player_id, module.instance_id, PHOENIX_COOLDOWN_ID
        ) and self._try_phoenix_revive(player, module):
            return
        # Diriltilecek uygun modül yoksa Anka pahalı, tek hedefli bir onarım yapar.
        if not self.is_cooldown_ready(player.player_id, module.instance_id, REPAIR_COOLDOWN_ID):
            return
        targets = [
            target
            for target in repair_targets(player, module, self.board.core_position)
            if target.instance_id not in repaired_target_ids
        ]
        if not targets:
            return
        if not self._try_spend_action_energy(player, module, reason="phoenix_repair"):
            return
        target = targets[0]
        amount = max(
            1,
            round(
                repair_amount(module)
                * PHOENIX_REPAIR_RATIO
                * player.energy_support_multiplier
                * overtime_repair_multiplier_for_elapsed_ms(self.state.elapsed_ms + TICK_MS)
            ),
        )
        before = target.hp
        target.hp = min(target.definition.max_hp, target.hp + amount)
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
                    "mechanic": "phoenix_repair",
                },
            )
        self.start_cooldown(
            player.player_id, module.instance_id, REPAIR_COOLDOWN_ID, module.definition.cooldown_ms
        )

    def _advance_chrono_relay(self, player, module) -> None:
        now = self.state.elapsed_ms
        boost_until = int(module.mechanic_state.get("chrono_boost_until_ms", 0))
        debt_until = int(module.mechanic_state.get("chrono_debt_until_ms", 0))
        if now >= debt_until:
            boost_until = now + CHRONO_BOOST_MS
            debt_until = boost_until + CHRONO_DEBT_MS
            module.mechanic_state["chrono_boost_until_ms"] = boost_until
            module.mechanic_state["chrono_debt_until_ms"] = debt_until
            module.mechanic_state["chrono_debt_emitted"] = False
            self._emit(
                "chrono_window_started",
                {
                    "player_id": player.player_id,
                    "source_module_id": module.instance_id,
                    "boost_until_ms": boost_until,
                    "debt_until_ms": debt_until,
                },
            )
        elif now >= boost_until and not module.mechanic_state.get("chrono_debt_emitted"):
            module.mechanic_state["chrono_debt_emitted"] = True
            self._emit(
                "chrono_debt_started",
                {
                    "player_id": player.player_id,
                    "source_module_id": module.instance_id,
                    "debt_until_ms": debt_until,
                },
            )

    def _attack_windup_ready(self, player_id, attacker, target, windup_ms) -> bool:
        """Füze/Plazma hedefe kilitlenir; hedef değişirse kilit yeniden başlar."""
        state = attacker.mechanic_state
        ready_at = int(state.get("windup_ready_at_ms", 0))
        if state.get("windup_target_id") != target.instance_id or ready_at <= 0:
            state["windup_target_id"] = target.instance_id
            state["windup_ready_at_ms"] = self.state.elapsed_ms + windup_ms
            self._emit(
                "attack_windup_started",
                {
                    "player_id": player_id,
                    "module_id": attacker.instance_id,
                    "definition_id": attacker.definition.id,
                    "target_module_id": target.instance_id,
                    "ready_at_ms": self.state.elapsed_ms + windup_ms,
                },
            )
            return False
        if self.state.elapsed_ms < ready_at:
            return False
        state.pop("windup_target_id", None)
        state.pop("windup_ready_at_ms", None)
        return True

    def _consume_quantum_charge(self, attacker) -> float:
        if attacker.definition.id != "quantum_cannon":
            return 1.0
        charge = max(0.0, min(QUANTUM_CHARGE_MAX, float(attacker.mechanic_state.get("quantum_charge", 0.0))))
        attacker.mechanic_state["quantum_charge"] = 0.0
        attacker.mechanic_state["quantum_charge_spent"] = charge
        return 1.0 + QUANTUM_CHARGE_DAMAGE_BONUS * (charge / QUANTUM_CHARGE_MAX)

    def _convert_prism_energy(self, target_player_id, target, resolution) -> None:
        if (
            target.definition.id != "prism_shield"
            or resolution.reduced_damage <= 0
            or not target.is_powered
        ):
            return
        target_player = self.state.players[target_player_id]
        room = max(0.0, core_reserve_capacity(target_player) - target_player.energy_stock)
        converted = min(resolution.reduced_damage * PRISM_ENERGY_CONVERSION, room)
        if converted <= 0:
            return
        target_player.energy_stock += converted
        self._emit(
            "prism_energy_converted",
            {
                "player_id": target_player_id,
                "module_id": target.instance_id,
                "energy": round(converted, 2),
            },
        )

    def _apply_secondary_hit(self, attacker_player_id, attacker, resolution) -> None:
        target_player_id = resolution.target_player_id
        target = self._require_module(target_player_id, resolution.target_module_id)
        if target.status != ModuleStatus.ACTIVE:
            return
        self.apply_damage(
            target_player_id,
            target.instance_id,
            resolution.final_damage,
            source_player_id=attacker_player_id,
            source_module_id=attacker.instance_id,
        )
        self._emit(
            "signature_secondary_hit",
            {
                "player_id": attacker_player_id,
                "module_id": attacker.instance_id,
                "definition_id": attacker.definition.id,
                "target_player_id": target_player_id,
                "target_module_id": target.instance_id,
                "damage": resolution.final_damage,
                "reduced_damage": resolution.reduced_damage,
                "defense_type": resolution.defense_type,
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
        self._convert_prism_energy(target_player_id, target, resolution)

    def _apply_post_attack_signature(
        self,
        attacker_player_id,
        attacker,
        target_player_id,
        target,
        resolution,
        damage_multiplier,
    ) -> None:
        attacker_player = self.state.players[attacker_player_id]
        target_player = self.state.players[target_player_id]
        definition_id = attacker.definition.id
        state = attacker.mechanic_state

        if any(
            module.definition.id == "precision_matrix" and module_is_operational(module)
            for module in attacker_player.modules.values()
        ):
            stacks = int(state.get("precision_focus_stacks", 0))
            stacks = min(PRECISION_MAX_STACKS, stacks + 1) if state.get("precision_focus_target") == target.instance_id else 1
            state["precision_focus_target"] = target.instance_id
            state["precision_focus_stacks"] = stacks
        else:
            state.pop("precision_focus_target", None)
            state.pop("precision_focus_stacks", None)

        spent_charge = float(state.pop("quantum_charge_spent", 0.0))
        if definition_id == "quantum_cannon" and spent_charge > 0:
            self._emit(
                "quantum_collapse",
                {
                    "player_id": attacker_player_id,
                    "module_id": attacker.instance_id,
                    "charge_consumed": round(spent_charge, 2),
                },
            )

        if definition_id == "quantum_repeater":
            stacks = int(state.get("repeat_stacks", 0))
            stacks = stacks + 1 if state.get("repeat_target_id") == target.instance_id else 1
            state["repeat_target_id"] = target.instance_id
            if stacks >= QUANTUM_REPEAT_HITS and target.status == ModuleStatus.ACTIVE:
                state["repeat_stacks"] = 0
                # Yankı, savunmadan geçmiş son hasarın kopyasıdır.
                echo = max(1, round(resolution.final_damage * QUANTUM_REPEAT_ECHO_RATIO))
                self.apply_damage(
                    target_player_id,
                    target.instance_id,
                    echo,
                    source_player_id=attacker_player_id,
                    source_module_id=attacker.instance_id,
                )
                self._emit(
                    "quantum_repeat",
                    {
                        "player_id": attacker_player_id,
                        "module_id": attacker.instance_id,
                        "target_module_id": target.instance_id,
                        "damage": echo,
                    },
                )
            else:
                state["repeat_stacks"] = stacks

        if definition_id == "swarm_fabricator":
            drones = int(state.get("stored_drones", 0)) + 1
            if drones >= SWARM_RELEASE_DRONES:
                state["stored_drones"] = 0
                first = select_target(target_player)
                burst_targets = (
                    ([first] + secondary_targets(target_player, first, SWARM_RELEASE_TARGETS - 1))
                    if first is not None
                    else []
                )
                for burst_target in burst_targets:
                    burst = resolve_attack(
                        attacker_player_id,
                        attacker,
                        target_player_id,
                        burst_target,
                        support_damage_multiplier=damage_multiplier * SWARM_RELEASE_RATIO_PER_TARGET,
                        defense_effectiveness=target_player.energy_support_multiplier,
                        circuit_guard=circuit_guard_multiplier(target_player, burst_target),
                        elapsed_ms=self.state.elapsed_ms,
                    )
                    self.apply_damage(
                        target_player_id,
                        burst_target.instance_id,
                        burst.final_damage,
                        source_player_id=attacker_player_id,
                        source_module_id=attacker.instance_id,
                    )
                self._emit(
                    "swarm_released",
                    {
                        "player_id": attacker_player_id,
                        "module_id": attacker.instance_id,
                        "target_module_ids": [item.instance_id for item in burst_targets],
                    },
                )
            else:
                state["stored_drones"] = drones
                self._emit(
                    "swarm_charge",
                    {
                        "player_id": attacker_player_id,
                        "module_id": attacker.instance_id,
                        "stored_drones": drones,
                        "required": SWARM_RELEASE_DRONES,
                    },
                )

        if definition_id in ATTACK_WINDUP_MS:
            self._emit(
                "missile_impact",
                {
                    "player_id": attacker_player_id,
                    "module_id": attacker.instance_id,
                    "definition_id": definition_id,
                    "target_module_id": target.instance_id,
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

                windup_ms = ATTACK_WINDUP_MS.get(attacker.definition.id, 0)
                if windup_ms and not self._attack_windup_ready(
                    attacker_player_id, attacker, target, windup_ms
                ):
                    continue

                if not self._try_spend_action_energy(
                    attacker_player, attacker, reason="attack"
                ):
                    continue

                support = attack_support_modifiers(
                    attacker_player,
                    attacker,
                    self.board.core_position,
                    self.state.elapsed_ms,
                )
                damage_multiplier = (
                    support.damage_multiplier
                    * heat_state.damage_multiplier
                    * overtime_attack_multiplier_for_elapsed_ms(
                        effective_elapsed_ms
                    )
                    * self._consume_quantum_charge(attacker)
                )
                resolution = resolve_attack(
                    attacker_player_id,
                    attacker,
                    target_player_id,
                    target,
                    support_damage_multiplier=damage_multiplier,
                    defense_effectiveness=target_player.energy_support_multiplier,
                    circuit_guard=circuit_guard_multiplier(target_player, target),
                    elapsed_ms=effective_elapsed_ms,
                )
                # İkincil vuruşlar da savunma, Kubbe ve karşılık kurallarından geçer.
                secondary_resolutions = tuple(
                    resolve_attack(
                        attacker_player_id,
                        attacker,
                        target_player_id,
                        extra,
                        support_damage_multiplier=damage_multiplier * secondary_ratio,
                        defense_effectiveness=target_player.energy_support_multiplier,
                        circuit_guard=circuit_guard_multiplier(target_player, extra),
                        elapsed_ms=effective_elapsed_ms,
                    )
                    for secondary_ratio in (
                        (SECONDARY_HIT_RATIOS[attacker.definition.id],)
                        if attacker.definition.id in SECONDARY_HIT_RATIOS
                        else ()
                    )
                    for extra in secondary_targets(target_player, target)
                )
                effective_cooldown_ms = max(
                    TICK_MS,
                    int(
                        round(
                            attacker.definition.cooldown_ms
                            * support.cooldown_multiplier
                            * heat_state.cooldown_multiplier
                        )
                    )
                    # Hazırlık süresi döngünün içindedir; uyarı DPS'i düşürmez.
                    - windup_ms,
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
                        secondary_resolutions,
                        damage_multiplier,
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
            secondary_resolutions,
            damage_multiplier,
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

            self._convert_prism_energy(target_player_id, target, resolution)
            for extra in secondary_resolutions:
                self._apply_secondary_hit(attacker_player_id, attacker, extra)
            self._apply_post_attack_signature(
                attacker_player_id,
                attacker,
                target_player_id,
                target,
                resolution,
                damage_multiplier,
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
                # Süresiz: modül ısısı toparlanma eşiğinin altına inene kadar susar.
                self.add_debuff(
                    attacker_player_id,
                    attacker.instance_id,
                    OVERHEAT_DEBUFF_ID,
                    "Aşırı Isınma",
                    None,
                    {"reason": "critical_heat"},
                )
                self._emit(
                    "module_overheated",
                    {
                        "player_id": attacker_player_id,
                        "module_id": attacker.instance_id,
                        "heat": attacker.heat,
                        "recovery_heat": OVERHEAT_RECOVERY_THRESHOLD,
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
            for module in sorted(player.modules.values(), key=lambda item: item.instance_id):
                if is_overheated(module) and module.heat < OVERHEAT_RECOVERY_THRESHOLD:
                    del module.debuffs[OVERHEAT_DEBUFF_ID]
                    self._emit(
                        "module_heat_recovered",
                        {
                            "player_id": player.player_id,
                            "module_id": module.instance_id,
                            "heat": module.heat,
                        },
                    )

    def _expire_timed_module_state(self) -> None:
        elapsed_ms = self.state.elapsed_ms

        for player in self.state.players.values():
            for module in player.modules.values():
                for collection_name in (
                    "debuffs",
                    "persistent_effects",
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
        self._require_player(player_id)
        opponent_ids = [
            opponent_id
            for opponent_id in sorted(self.state.players)
            if opponent_id != player_id
        ]
        if not opponent_ids:
            raise CommandRejected("Savaşı bırakmak için etkin bir rakip gerekli.")

        # Akım maça özeldir ve maçla biter; çekilmenin bedeli mağlubiyettir.
        self._emit(
            "battle_forfeited",
            {
                "player_id": player_id,
                "winner_player_id": opponent_ids[0],
            },
        )
        self._finish_battle(
            winner_player_id=opponent_ids[0],
            loser_player_id=player_id,
            is_draw=False,
            reason="player_forfeit",
        )


    def _cmd_send_battle_emoji(self, player_id: str, payload: dict) -> None:
        player = self._require_player(player_id)
        emoji_id = str(payload.get("emoji_id") or "").strip()
        allowed = set(player.battle_emoji_ids) | {player.selected_battle_emoji_id}
        if not emoji_id or emoji_id == "none" or emoji_id not in allowed:
            raise CommandRejected("Kazanılmış bir savaş emojisi gerekli.")
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
        if player.core_power_charge < core_power_threshold(player.core_type):
            raise CommandRejected("Çekirdek Gücü henüz dolmadı.")
        # Kuantum · Yarım Faz: tam dolmadan kullanılan güç yalnız kalkan verir.
        half_phase = (
            player.core_type == "core_quantum"
            and player.core_power_charge < CORE_POWER_MAX_CHARGE
        )

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
        signature_state = player.core_signature_state
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
            "core_quantum": "defense" if half_phase else "hybrid",
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
        if power in {"core_resonance", "core_phoenix"} or (power == "core_quantum" and not half_phase):
            for module in allies:
                heal = (
                    round((45 if module == core else 15) * 1.035 ** (level - 1))
                    if power == "core_resonance"
                    else round(
                        module.definition.max_hp
                        * min(.45, .20 + .005 * (level - 1))
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
            base_shield = 20 * 1.035 ** (level - 1)
            # Muhafız · Son Hat: Çekirdek CAN'ı yarının altındayken kalkan güçlenir.
            last_stand = (
                power == "core_guardian"
                and core.hp < core.definition.max_hp * LAST_STAND_HP_RATIO
            )
            if last_stand:
                self._emit_core_signature(player_id, core, "last_stand", {"core_hp": core.hp})
            if half_phase:
                self._emit_core_signature(player_id, core, "half_phase", {"charge": round(player.core_power_charge)})
            for module in allies:
                multiplier = 1.0
                if last_stand:
                    multiplier = (
                        LAST_STAND_CORE_MULTIPLIER
                        if module == core
                        else LAST_STAND_MODULE_MULTIPLIER
                    )
                shield_amount = round(base_shield * multiplier)
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
            signature_state["overdrive_chain"] = 0
            for module in allies:
                damage_multiplier = 1 + .25 + .01 * (level - 1)
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
            # Kesinti · Statik Birikim: dolu bekletilen süre kesintiyi uzatır.
            static_stacks = static_charge_stacks(int(signature_state.get("held_ms", 0)))
            static_bonus_ms = static_stacks * STATIC_CHARGE_BONUS_MS
            if static_stacks:
                self._emit_core_signature(
                    player_id,
                    core,
                    "static_charge",
                    {"stacks": static_stacks, "bonus_ms": static_bonus_ms},
                )
            for enemy_id, enemy in self.state.players.items():
                if enemy_id == player_id:
                    continue
                for module in enemy.modules.values():
                    if module.status != ModuleStatus.ACTIVE or module.definition.id == "core":
                        continue
                    module.persistent_effects.pop("core_overdrive", None)
                    if module.definition.category == "destek":
                        duration_ms = 2000 + (level - 1) * 50 + static_bonus_ms
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
            # Kapasitör · Deşarj: rezervin tamamı boşalır; yarı dolu rezerv +1 indirim.
            drained = player.energy_stock
            full_discharge = drained >= core_reserve_capacity(player) * DISCHARGE_FULL_RESERVE_RATIO
            player.energy_stock = 0.0
            player.discounted_deployments = (
                DISCHARGE_FULL_DEPLOYMENTS if full_discharge else DISCHARGE_BASE_DEPLOYMENTS
            )
            self._emit_core_signature(
                player_id,
                core,
                "reserve_discharge",
                {
                    "energy_drained": round(drained, 1),
                    "discounted_deployments": player.discounted_deployments,
                },
            )
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
        signature_state["held_ms"] = 0
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
        self._apply_passive_circuit_credit_income()
        self._process_inactivity()
        if self.state.status == BattleStatus.FINISHED:
            return
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
                # Dolu bekleme süresi Kesinti'nin Statik Birikimini ve AI kararını besler.
                held_ms = int(player.core_signature_state.get("held_ms", 0)) + TICK_MS
                player.core_signature_state["held_ms"] = held_ms
                continue
            player.core_power_charge = min(
                CORE_POWER_MAX_CHARGE,
                player.core_power_charge
                + charge_per_tick
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
            "energy_waiting": module.energy_waiting,
            "action_energy_cost": module.definition.action_energy_cost,
            "overheated": is_overheated(module),
            "debuffs": sorted(module.debuffs),
            "persistent_effects": sorted(module.persistent_effects),
            "cooldowns": sorted(module.cooldowns_ready_at_ms),
            "current_cost": module.definition.current_cost,
            "max_hp": module.definition.max_hp,
            "base_damage": module.definition.base_damage,
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
