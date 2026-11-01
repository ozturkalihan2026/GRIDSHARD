from collections import deque
from dataclasses import replace
from typing import Deque

from .catalog import get_module_definition
from ..season_competition import daily_meta_by_id
from .battle_pool import validate_battle_pool
from .board import get_default_board, automatic_deployment_position
from .economy import (
    CircuitCreditConfig,
    DEFAULT_CIRCUIT_CREDIT_CONFIG,
)
from .composition import deployment_rejection_reason
from .result import (
    build_player_summary,
    core_hp,
    summary_to_dict,
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

        from math import isfinite
        c=circuit_credit_config
        if (c.maximum_current<=0 or not 0<=c.starting_credits<=c.maximum_current
            or c.current_regen_interval_ms<=0
            or not isfinite(c.damage_current_threshold) or c.damage_current_threshold<=0
            or not isfinite(c.defense_current_threshold) or c.defense_current_threshold<=0):
            raise ValueError('Akım başlangıcı, depo, yenilenme aralığı ve eşikleri geçersiz.')

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

    def grant_module(self, player_id, instance_id, definition_id):
        player=self._require_player(player_id)
        if player.battle_pool is not None and definition_id!='core' and not player.battle_pool.contains(definition_id):
            raise ValueError(f"Modül oyuncunun Savaş Havuzu'nda değil: {definition_id}")
        if instance_id in player.modules:raise ValueError(f'Modül örneği zaten mevcut: {instance_id}')
        definition=get_module_definition(definition_id)
        from ..arena_canon import module_stats
        stats=module_stats(definition,self.state.player_upgrade_levels.get(player_id,{}).get(definition_id,0),
            self.state.player_module_talents.get(player_id,{}).get(definition_id))
        if definition_id=='core':
            from .core_stats import core_max_hp
            from .core_actions_v5 import settings
            stats['max_hp']=round(core_max_hp(player.core_level)*settings(player)['hp_multiplier'])
        daily_meta=daily_meta_by_id(self.state.player_daily_meta_ids.get(player_id,''))
        if daily_meta:
            modifier=daily_meta['modifier'];factor=modifier['multiplier']
            if modifier['stat']=='damage' and definition.combat_class=='saldırı':
                stats['base_damage']=round(stats['base_damage']*factor,2)
                stats['effect_multiplier']*=factor
            if modifier['stat']=='hp' and definition.combat_class==modifier['category']:stats['max_hp']=round(stats['max_hp']*factor)
            if modifier['stat']=='core_hp' and definition_id=='core':stats['max_hp']=round(stats['max_hp']*factor)
        definition=replace(definition,max_hp=stats['max_hp'],base_damage=stats['base_damage'],
            cooldown_ms=stats['cooldown_ms'],effect_multiplier=stats['effect_multiplier'],runtime_parameters=stats.get('parameters'))
        module=BattleModule.create(instance_id,definition)
        if definition_id=='core':
            module.mechanic_state['core_hp_level']=max(1,min(15,player.core_level))
            module.mechanic_state['core_hp_talent_multiplier']=settings(player)['hp_multiplier']
        player.modules[instance_id]=module
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

        # AI levels are matched after setup. Refresh its already-granted core
        # once, before the first snapshot/tick, using the same level curve.
        from .core_stats import core_max_hp
        for player in self.state.players.values():
            from .core_actions_v5 import settings
            multiplier=settings(player)['hp_multiplier']
            level = max(1, min(15, player.core_level))
            for module in player.modules.values():
                if module.definition.id != "core":
                    continue
                applied = module.mechanic_state.get("core_hp_level", 1)
                previous=module.mechanic_state.get('core_hp_talent_multiplier',1)
                if applied != level or previous!=multiplier:
                    maximum = round(module.definition.max_hp * core_max_hp(level) / core_max_hp(applied)*multiplier/previous)
                    module.hp = round(module.hp * maximum / module.definition.max_hp)
                    module.definition = replace(module.definition, max_hp=maximum)
                    module.mechanic_state["core_hp_level"] = level
                    module.mechanic_state['core_hp_talent_multiplier']=multiplier

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

    def apply_damage(self, player_id, instance_id, amount, *, source_player_id=None, source_module_id=None,ignore_shields=False):
        from .battle_actions_v2 import apply_damage
        return apply_damage(self,player_id,instance_id,amount,source_player_id,source_module_id,ignore_shields)

    # --- Çekirdek yetenekleri (talents.py) -----------------------------------


    # --- Modül imza yetenekleri (talents.py) ---------------------------------


    def _core_module(self, player: PlayerBattleState) -> BattleModule | None:
        return next(
            (
                module
                for module in player.modules.values()
                if module.definition.id == "core"
            ),
            None,
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

        if reason!='damage_exchange' and not (reason=='core_execution_talent' and self.circuit_credit_config.allow_core_current_rewards):
            return

        player = self._require_player(player_id)
        amount = min(amount, max(0, self.circuit_credit_config.maximum_current - player.circuit_credits))
        if not amount:
            return
        player.circuit_credits += amount
        player.total_circuit_credits_earned += amount
        if player.circuit_credits>=self.circuit_credit_config.maximum_current:
            from .pressure_current import clear_combat_progress
            clear_combat_progress(player)
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
            interval = self._current_regen_interval_ms(player.player_id)
            amount, player.current_regen_remainder_ms = divmod(player.current_regen_remainder_ms, interval)
            granted = min(amount, self.circuit_credit_config.maximum_current - player.circuit_credits)
            player.circuit_credits += granted
            player.total_circuit_credits_earned += granted
            # Reaching the cap discards both combat banks.
            if player.circuit_credits>=self.circuit_credit_config.maximum_current:
                from .pressure_current import clear_combat_progress
                clear_combat_progress(player)

    def _current_regen_interval_ms(self, player_id: str) -> int:
        """Akım yenilenme aralığı; Akım Desteği metası üretimi hızlandırır."""
        interval = self.circuit_credit_config.current_regen_interval_ms
        daily_meta = daily_meta_by_id(self.state.player_daily_meta_ids.get(player_id, ""))
        if daily_meta and daily_meta.get("id") == "current_support":
            multiplier = float(daily_meta.get("modifier", {}).get("multiplier", 1.0))
            interval = max(TICK_MS, round(interval / max(1.0, multiplier)))
        return interval

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
                "core_contributions": dict(self.state.players[player_id].core_contributions),
                "current_from_damage": self.state.players[player_id].damage_current_earned,
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

    def _cmd_use_core_power(self, player_id, payload):
        from .battle_actions_v2 import use_core
        use_core(self,player_id,payload)

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

        position = automatic_deployment_position(
            battle_id=self.state.battle_id, player_id=player_id,
            definition_id=definition_id, instance_id=instance_id,
            tick=self.state.tick, candidates=candidates,
        )
        try:
            self._spend_circuit_credits(
                player_id,
                max(1, module.definition.current_cost),
                reason=f"modul_uret:{module.definition.id}",
            )
        except CommandRejected:
            player.modules.pop(instance_id, None)
            raise

        module.status = ModuleStatus.ACTIVE
        module.position = position
        self._emit(
            "module_placed",
            {
                **self._module_event_data(player_id, module),
                "placement_mode": "server_automatic",
            },
        )

    def deploy_scripted_module(
        self,
        player_id: str,
        definition_id: str,
        *,
        base_damage: float | None = None,
        cooldown_ms: int | None = None,
        hp_multiplier: float = 1.0,
    ) -> BattleModule | None:
        """Eğitim/takviye: bedelsiz, olağan rastgele boş hücreye yerleşim.

        Kart oyuncunun destesinde olmalıdır. Enkazlı/dolu tahtada None döner.
        """
        from dataclasses import replace

        player = self._require_player(player_id)
        instance_id = self._next_deployed_instance_id(player_id, definition_id)
        module = self.grant_module(player_id, instance_id, definition_id)
        candidates = self._deployment_candidates(player_id, module)
        if not candidates:
            player.modules.pop(instance_id, None)
            return None
        if base_damage is not None:
            module.definition = replace(module.definition, base_damage=float(base_damage))
        if cooldown_ms is not None:
            module.definition = replace(module.definition, cooldown_ms=int(cooldown_ms))
        if hp_multiplier!=1:
            module.definition=replace(module.definition,max_hp=round(module.definition.max_hp*hp_multiplier))
            module.hp=module.definition.max_hp
        core = self.board.core_position
        module.status = ModuleStatus.ACTIVE
        module.position = automatic_deployment_position(
            battle_id=self.state.battle_id, player_id=player_id, definition_id=definition_id,
            instance_id=instance_id, tick=self.state.tick, candidates=candidates,
        )
        self._emit(
            "module_placed",
            {
                **self._module_event_data(player_id, module),
                "placement_mode": "server_automatic",
            },
        )
        return module


    def _simulate(self):
        from .battle_actions_v2 import tick
        self._update_core_power_charge()
        self._apply_passive_circuit_credit_income()
        self._process_inactivity()
        if self.state.status==BattleStatus.FINISHED:return
        tick(self)
        self._evaluate_battle_end()

    def _update_core_power_charge(self):
        from .battle_actions_v2 import charge_cores
        charge_cores(self)

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


    def _module_event_data(self, player_id, module):
        data={'player_id':player_id,'module_id':module.instance_id,'definition_id':module.definition.id,
            'name_tr':module.definition.name_tr,'status':module.status.value,'hp':module.hp,
            'max_hp':module.definition.max_hp,'current_cost':module.definition.current_cost,
            'category':module.definition.combat_class,'rarity':module.definition.rarity,
            'base_damage':module.definition.base_damage,
            'debuffs':sorted(module.debuffs),'persistent_effects':sorted(module.persistent_effects),
            'cooldowns':sorted(module.cooldowns_ready_at_ms)}
        if module.position is not None:data.update(x=module.position.x,y=module.position.y)
        return data

    def _emit(self, event_type: str, data: dict) -> None:
        self.state.events.append(
            BattleEvent(
                type=event_type,
                at_ms=self.state.elapsed_ms,
                data=data,
            )
        )
