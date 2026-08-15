from collections import deque
from typing import Deque

from .catalog import get_module_definition
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
    def __init__(self, state: BattleState):
        self.state = state
        self._command_queue: Deque[BattleCommand] = deque()

    def add_player(self, player_id: str) -> PlayerBattleState:
        if player_id in self.state.players:
            return self.state.players[player_id]

        player = PlayerBattleState(player_id=player_id)
        self.state.players[player_id] = player
        return player

    def grant_module(
        self,
        player_id: str,
        instance_id: str,
        definition_id: str,
    ) -> BattleModule:
        player = self._require_player(player_id)

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
        alpha.2 savaş motoru dinamik modül işlemlerini destekler.
        Enerji, Devre Kredisi, saldırı ve özel hücre hesapları sonraki
        paketlerde ayrı sistemler olarak eklenecektir.
        """
        pass

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
