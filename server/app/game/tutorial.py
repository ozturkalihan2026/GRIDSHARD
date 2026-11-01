"""Short, skippable first-battle cues. Combat never waits for reading."""
from dataclasses import dataclass
from .battle_pool import DEFAULT_BATTLE_POOL_IDS
from .models import BattleStatus

TUTORIAL_SCRIPT_VERSION=5
TUTORIAL_REQUIRED_CARDS=('laser',)
TUTORIAL_PLAYER_DECK=tuple(DEFAULT_BATTLE_POOL_IDS)
TUTORIAL_ENEMY_DECK=tuple(DEFAULT_BATTLE_POOL_IDS)
ACK_COMMAND='tutorial_ack'
DEPLOY_COMMAND='deploy_module'
FREE_PLAY='*'
ALWAYS_ALLOWED_COMMANDS=frozenset({'send_battle_emoji','forfeit_battle','use_core_power'})


@dataclass(frozen=True)
class TutorialStage:
    id:str
    kind:str='watch'
    deploy:str='*'
    focus:str=''
    min_ms:int=0
    max_ms:int=0


STAGES=(TutorialStage('deploy_laser','deploy','laser','laser',0,4000),
        TutorialStage('watch_laser','watch','*','laser',0,8000),
        TutorialStage('deploy_defense','deploy','shield','shield',0,12000),
        TutorialStage('current_pressure','watch','*','shield',0,20000),
        TutorialStage('core_power','watch','*','core',0,24000))


def deck_supports_tutorial(ids):return 'laser' in (ids or ())


class TutorialDirector:
    def __init__(self,session,player_id,ai_player_id):
        self.session=session;self.player_id=player_id;self.ai_player_id=ai_player_id
        self.index=0;self.abandoned=False;self._dirty=True;self._enemy_placed=False

    @property
    def engine(self):return self.session.engine
    @property
    def stage(self):return STAGES[self.index]
    @property
    def waiting(self):return False

    def view(self):
        return {'stage':self.stage.id,'kind':self.stage.kind,'index':self.index,'total':len(STAGES),
                'paused':False,'deploy':self.stage.deploy,'focus':self.stage.focus,'skippable':True}

    def consume_dirty(self):
        dirty=self._dirty;self._dirty=False;return dirty

    def release(self):self.session.tutorial=None
    def acknowledge(self,stage=''):self.release()

    def handle_command(self,command):
        if command.kind==ACK_COMMAND:self.release();return False
        return True

    def before_tick(self,now):return not self.abandoned

    def after_tick(self):
        e=self.engine
        if e.state.status!=BattleStatus.RUNNING:self.release();return
        if e.state.elapsed_ms>=1000 and not self._enemy_placed:
            e.deploy_scripted_module(self.ai_player_id,'laser');self._enemy_placed=True
        player=e.state.players[self.player_id]
        if self.index==0 and (any(u.definition.id!='core' and u.hp>0 for u in player.modules.values()) or e.state.elapsed_ms>=4000):
            self.index=1;self._dirty=True
        if e.state.elapsed_ms>=24000:self.release();return
        while self.index<len(STAGES)-1 and e.state.elapsed_ms>=self.stage.max_ms:
            self.index+=1;self._dirty=True
