from collections import deque
from typing import Deque

from .catalog import get_module_definition
from .battle_pool import validate_battle_pool
from .board import get_cell_effects, get_default_board
from .boosters import get_booster_definition
from .booster_schedule import booster_offer_due_at_ms, build_booster_offer
from .economy import (
    CircuitCreditConfig,
    DEFAULT_CIRCUIT_CREDIT_CONFIG,
)
from .combat import (
    ATTACK_COOLDOWN_ID,
    is_attack_module,
    resolve_attack,
    select_target,
)
from .energy import process_energy_tick
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
from .topology import build_energy_topology, module_port_directions
from .result import (
    build_player_summary,
    core_hp,
    summary_rank,
    summary_to_dict,
)
from .sabotage import (
    EMP_DEBUFF_ID,
    ENERGY_LEECH_DEBUFF_ID,
    JAMMER_DEBUFF_ID,
    SABOTAGE_COOLDOWN_ID,
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
    repair_target,
)
from .models import (
    BattleCommand,
    BattleEvent,
    BattleModule,
    BattleState,
    BattleStatus,
    Direction,
    ModuleStatus,
    PlayerBattleState,
    Position,
    TimedModuleEffect,
)


TICK_RATE = 10
TICK_MS = 1000 // TICK_RATE
BATTLE_TIME_LIMIT_MS = 180_000


MODULE_INTERACTION_UNLOCK_MS = 15_000


def max_active_modules_for_elapsed_ms(elapsed_ms: int) -> int | None:
    """
    Maç süresine göre aynı anda aktif olabilecek modül üst sınırını döndürür.

    0–15 saniye başlangıç düzenidir; bu aralıkta dinamik modül yerleştirme
    kapalı olduğundan None döner.

    15–25 sn: 4
    25–35 sn: 5
    35–45 sn: 6
    45–55 sn: 7
    55–65 sn: 8
    65–75 sn: 9
    75 sn ve sonrası: 10
    """
    if elapsed_ms < MODULE_INTERACTION_UNLOCK_MS:
        return None
    if elapsed_ms < 25_000:
        return 4
    if elapsed_ms < 35_000:
        return 5
    if elapsed_ms < 45_000:
        return 6
    if elapsed_ms < 55_000:
        return 7
    if elapsed_ms < 65_000:
        return 8
    if elapsed_ms < 75_000:
        return 9
    return 10



class CommandRejected(ValueError):
    pass


class BattleEngine:
    def __init__(
        self,
        state: BattleState,
        circuit_credit_config: CircuitCreditConfig = DEFAULT_CIRCUIT_CREDIT_CONFIG,
    ):
        self.state = state
        self.circuit_credit_config = circuit_credit_config
        self.board = get_default_board()
        self._command_queue: Deque[BattleCommand] = deque()

        if circuit_credit_config.passive_credits_per_second % TICK_RATE != 0:
            raise ValueError(
                "passive_credits_per_second, TICK_RATE değerine tam bölünmelidir."
            )

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

        module = BattleModule.create(
            instance_id=instance_id,
            definition=get_module_definition(definition_id),
        )
        player.modules[instance_id] = module
        return module

    def set_initial_active_module(
        self,
        player_id: str,
        instance_id: str,
        x: int,
        y: int,
        direction: Direction = Direction.UP,
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

        if (
            module.definition.id == "generator"
            and position not in self.board.generator_gate_positions
        ):
            raise ValueError(
                "Jeneratör yalnızca Çekirdek kapılarından birine yerleştirilebilir."
            )

        self._ensure_position_available(player_id, position)

        module.status = ModuleStatus.ACTIVE
        module.position = position
        module.direction = direction

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
        self._command_queue.append(command)

    def step(self) -> None:
        if self.state.status != BattleStatus.RUNNING:
            return

        self._process_commands()
        self._simulate()

        self.state.tick += 1
        self.state.elapsed_ms = self.state.tick * TICK_MS

    def apply_damage(
        self,
        player_id: str,
        instance_id: str,
        amount: int,
    ) -> None:
        if amount < 0:
            raise ValueError("Hasar negatif olamaz.")

        module = self._require_module(player_id, instance_id)

        if module.status == ModuleStatus.DESTROYED:
            return

        module.hp = max(0, module.hp - amount)

        self._emit(
            "module_damaged",
            {
                "player_id": player_id,
                "module_id": instance_id,
                "damage": amount,
                "hp": module.hp,
            },
        )

        if module.hp == 0:
            module.status = ModuleStatus.DESTROYED
            module.position = None
            self._emit(
                "module_destroyed",
                {
                    "player_id": player_id,
                    "module_id": instance_id,
                },
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
                f"Yetersiz Devre Kredisi: gerekli {amount} DK, mevcut {player.circuit_credits} DK."
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
        amount = self.circuit_credit_config.passive_credits_per_second // TICK_RATE
        if amount <= 0:
            return

        # Pasif gelir her tick güncellenir fakat olay günlüğünü 10 Hz kredi
        # kayıtlarıyla doldurmamak için burada ayrıca event üretilmez.
        for player in self.state.players.values():
            player.circuit_credits += amount
            player.total_circuit_credits_earned += amount

    def max_active_modules(self) -> int | None:
        return max_active_modules_for_elapsed_ms(self.state.elapsed_ms)

    def active_module_count(self, player_id: str) -> int:
        player = self._require_player(player_id)
        return sum(
            1
            for module in player.modules.values()
            if module.status == ModuleStatus.ACTIVE
        )

    def _ensure_module_interaction_unlocked(self) -> None:
        if self.state.elapsed_ms < MODULE_INTERACTION_UNLOCK_MS:
            remaining_ms = MODULE_INTERACTION_UNLOCK_MS - self.state.elapsed_ms
            raise CommandRejected(
                f"Modül müdahalesi henüz açık değil. Kalan süre: {remaining_ms} ms."
            )

    def _ensure_active_capacity_for_new_module(self, player_id: str) -> None:
        self._ensure_module_interaction_unlocked()

        limit = self.max_active_modules()
        if limit is None:
            raise CommandRejected("Aktif modül kapasitesi henüz açılmadı.")

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
            process_energy_tick(player, self.board.core_position)

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

            sabotage_modules = sorted(
                (
                    module
                    for module in attacker_player.modules.values()
                    if module.status == ModuleStatus.ACTIVE
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

                if plan.effect_id == EMP_DEBUFF_ID:
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
            support_modules = sorted(
                (
                    module
                    for module in player.modules.values()
                    if module.status == ModuleStatus.ACTIVE
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

                if module.definition.id == "repair":
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
                        del cleanse_target.debuffs[effect_id]
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

                    target = repair_target(
                        player,
                        module,
                        self.board.core_position,
                    )
                    if target is None:
                        continue

                    amount = repair_amount(module)
                    before = target.hp
                    target.hp = min(
                        target.definition.max_hp,
                        target.hp + amount,
                    )
                    actual = target.hp - before

                    if actual > 0:
                        self._emit(
                            "module_repaired",
                            {
                                "player_id": player.player_id,
                                "source_module_id": module.instance_id,
                                "target_module_id": target.instance_id,
                                "repair": actual,
                                "hp_before": before,
                                "hp_after": target.hp,
                            },
                        )

                    self.start_cooldown(
                        player.player_id,
                        module.instance_id,
                        REPAIR_COOLDOWN_ID,
                        module.definition.cooldown_ms,
                    )

                elif module.definition.id == "cooler":
                    for target, effect_id in cooler_reducible_debuff_targets(
                        player,
                        module,
                        self.board.core_position,
                    ):
                        effect = target.debuffs.get(effect_id)
                        if effect is None or effect.expires_at_ms is None:
                            continue

                        before_expires = effect.expires_at_ms
                        effect.expires_at_ms = max(
                            self.state.elapsed_ms,
                            effect.expires_at_ms
                            - COOLER_DEBUFF_REDUCTION_MS_PER_TICK,
                        )

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
                                    before_expires
                                    - effect.expires_at_ms
                                ),
                                "cleanser": "cooler",
                            },
                        )

                        if effect.expires_at_ms <= self.state.elapsed_ms:
                            del target.debuffs[effect_id]
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
                        before = target.heat
                        target.heat = max(
                            0.0,
                            target.heat - COOLER_HEAT_REDUCTION_PER_TICK,
                        )
                        if target.heat != before:
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

                elif module.definition.id == "overclock_unit":
                    for target in overclock_targets(
                        player,
                        module,
                        self.board.core_position,
                    ):
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
                    ),
                )
                effective_cooldown_ms = max(
                    TICK_MS,
                    int(
                        round(
                            attacker.definition.cooldown_ms
                            * support.cooldown_multiplier
                            * heat_state.cooldown_multiplier
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
                },
            )
            self.apply_damage(
                target_player_id,
                target.instance_id,
                resolution.final_damage,
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
            player_id: summary_to_dict(summary)
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

        should_rank = (
            len(destroyed_core_players) >= 2
            or self.state.elapsed_ms + TICK_MS >= BATTLE_TIME_LIMIT_MS
        )
        if not should_rank:
            return

        summaries = {
            player_id: build_player_summary(
                self.state.players[player_id],
                self.state.events,
            )
            for player_id in player_ids
        }
        ranks = {
            player_id: summary_rank(summary)
            for player_id, summary in summaries.items()
        }
        best_rank = max(ranks.values())
        winners = [
            player_id for player_id in player_ids
            if ranks[player_id] == best_rank
        ]
        is_time_limit = not destroyed_core_players

        if len(winners) == 1:
            winner = winners[0]
            loser = next(
                player_id for player_id in player_ids
                if player_id != winner
            )
            self._finish_battle(
                winner_player_id=winner,
                loser_player_id=loser,
                is_draw=False,
                reason=(
                    "time_limit_tiebreak"
                    if is_time_limit
                    else "simultaneous_core_tiebreak"
                ),
            )
        else:
            self._finish_battle(
                winner_player_id=None,
                loser_player_id=None,
                is_draw=True,
                reason=(
                    "time_limit_draw"
                    if is_time_limit
                    else "simultaneous_core_draw"
                ),
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
        while self._command_queue:
            command = self._command_queue.popleft()
            self._process_command(command)

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
                "place_module": self._cmd_place_module,
                "remove_module": self._cmd_remove_module,
                "move_module": self._cmd_move_module,
                "replace_module": self._cmd_replace_module,
                "rotate_module": self._cmd_rotate_module,
                "apply_booster": self._cmd_apply_booster,
                "select_booster": self._cmd_select_booster,
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

    def _cmd_place_module(self, player_id: str, payload: dict) -> None:
        self._ensure_active_capacity_for_new_module(player_id)
        module = self._require_module(player_id, payload["module_id"])

        if module.status == ModuleStatus.DESTROYED:
            raise CommandRejected("Yok edilmiş modül yeniden devreye alınamaz.")
        if module.status != ModuleStatus.RESERVE:
            raise CommandRejected("Yalnızca rezervdeki modül yerleştirilebilir.")

        position = self._position_from_payload(payload)
        self._ensure_board_position_placeable(position)
        self._ensure_position_available(player_id, position)

        self._spend_circuit_credits(
            player_id,
            module.definition.circuit_credit_cost,
            reason=f"modul_yerlestir:{module.definition.id}",
        )

        module.status = ModuleStatus.ACTIVE
        module.position = position

        self._emit(
            "module_placed",
            self._module_event_data(player_id, module),
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

        self._emit(
            "module_moved",
            self._module_event_data(player_id, module),
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

        position = outgoing.position

        self._spend_circuit_credits(
            player_id,
            incoming.definition.circuit_credit_cost,
            reason=f"modul_degistir:{incoming.definition.id}",
        )

        outgoing.status = ModuleStatus.RESERVE
        outgoing.position = None

        incoming.status = ModuleStatus.ACTIVE
        incoming.position = position

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

    def _cmd_rotate_module(self, player_id: str, payload: dict) -> None:
        self._ensure_module_interaction_unlocked()
        module = self._require_active_module(player_id, payload["module_id"])

        if not module.definition.rotatable:
            raise CommandRejected(f"{module.definition.name_tr} döndürülemez.")

        self._spend_circuit_credits(
            player_id,
            self.circuit_credit_config.rotate_cost,
            reason=f"modul_dondur:{module.definition.id}",
        )

        clockwise = payload.get("clockwise", True)
        if clockwise:
            module.direction = module.direction.rotate_clockwise()
        else:
            module.direction = module.direction.rotate_counterclockwise()

        self._emit(
            "module_rotated",
            self._module_event_data(player_id, module),
        )

    def _cmd_select_booster(self, player_id: str, payload: dict) -> None:
        player = self._require_player(player_id)
        offer = player.pending_booster_offer
        booster_id = payload.get("booster_id")
        if offer is None:
            raise CommandRejected("Aktif güçlendirici seçim hakkı yok.")
        if booster_id not in offer.booster_ids:
            raise CommandRejected("Seçilen güçlendirici mevcut üç seçenek arasında değil.")
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

        if booster.target_categories and module.definition.category not in booster.target_categories:
            raise CommandRejected(
                f"{booster.name_tr}, {module.definition.name_tr} modülüne uygulanamaz."
            )

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

        if player.pending_booster_offer is not None:
            offer_id = player.pending_booster_offer.id
            player.pending_booster_offer = None
            player.next_booster_offer_index += 1
            self._emit("booster_offer_consumed", {
                "player_id": player_id,
                "offer_id": offer_id,
                "next_offer_due_at_ms": booster_offer_due_at_ms(player.next_booster_offer_index),
            })
    def _update_booster_offers(self) -> None:
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
        self._update_booster_offers()
        self._apply_passive_circuit_credit_income()
        self._process_energy_flow()
        self._process_sabotage_actions()
        self._process_virus_effects()
        self._process_support_actions()
        self._process_combat_actions()
        self._process_passive_heat()
        self._expire_timed_module_state()
        self._evaluate_battle_end()

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

    def _ensure_position_available(
        self,
        player_id: str,
        position: Position,
        ignore_module_id: str | None = None,
    ) -> None:
        player = self._require_player(player_id)

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
            "direction": module.direction.value,
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
            "ports": [
                direction.value
                for direction in module_port_directions(
                    module,
                    self.board.core_position,
                )
            ],
            "debuffs": sorted(module.debuffs),
            "persistent_effects": sorted(module.persistent_effects),
            "cooldowns": sorted(module.cooldowns_ready_at_ms),
            "temporary_boosters": sorted(module.temporary_boosters),
            "circuit_credit_cost": module.definition.circuit_credit_cost,
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
