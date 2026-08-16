from collections import deque
from typing import Deque

from .catalog import get_module_definition
from .battle_pool import validate_battle_pool
from .economy import (
    CircuitCreditConfig,
    DEFAULT_CIRCUIT_CREDIT_CONFIG,
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

    def _simulate(self) -> None:
        """
        alpha.5:
        - Dinamik modül işlemleri çalışır.
        - Zaman tabanlı modül durumları savaş saatiyle ilerler.
        - Isı ve depolanmış enerji rezerv/aktif geçişinde aynen korunur.

        Devre Kredisi, gerçek enerji akışı, saldırı ve özel hücre hesapları
        sonraki paketlerde ayrı sistemler olarak eklenecektir.
        """
        self._apply_passive_circuit_credit_income()
        self._expire_timed_module_state()

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

    @staticmethod
    def _module_event_data(
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
            "stored_energy": module.stored_energy,
            "debuffs": sorted(module.debuffs),
            "persistent_effects": sorted(module.persistent_effects),
            "cooldowns": sorted(module.cooldowns_ready_at_ms),
            "temporary_boosters": sorted(module.temporary_boosters),
            "circuit_credit_cost": module.definition.circuit_credit_cost,
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
