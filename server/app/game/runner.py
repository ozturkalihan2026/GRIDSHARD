import asyncio

from .engine import BattleEngine, TICK_RATE
from .models import BattleStatus


TICK_SECONDS = 1 / TICK_RATE


class BattleRunner:
    def __init__(self, engine: BattleEngine):
        self.engine = engine

    async def run(self) -> None:
        """
        Savaş tamamlanana kadar motoru kesintisiz çalıştırır.
        Kullanıcı etkileşimleri bu döngüyü durdurmaz.
        """
        loop = asyncio.get_running_loop()
        next_tick = loop.time()

        while self.engine.state.status == BattleStatus.RUNNING:
            self.engine.step()
            next_tick += TICK_SECONDS
            sleep_for = next_tick - loop.time()

            if sleep_for > 0:
                await asyncio.sleep(sleep_for)
            else:
                await asyncio.sleep(0)
