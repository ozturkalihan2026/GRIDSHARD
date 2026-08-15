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
