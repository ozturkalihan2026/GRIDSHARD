"""Permanent reward rights joined to the caller's player/wallet transaction.

Writes never own an implicit commit. Locking player_data first serializes both
entitlement keys and request reuse for an account across workers. The grant
callback must write the wallet through this same PostgresPool transaction.
"""
from copy import deepcopy
from hashlib import sha256
import re

from psycopg.types.json import Jsonb

from . import reward_entitlements as rights


class PostgresRewardEntitlements:
    def __init__(self,pool):
        self.pool=pool

    def _transaction(self):
        if not self.pool.in_transaction:
            raise RuntimeError('Ödül hakkı cüzdanla aynı açık PostgreSQL işlemini gerektirir.')

    @staticmethod
    def _request(request_id):
        if not isinstance(request_id,str) or not request_id.strip() or len(request_id)>160:
            raise rights.RewardEntitlementError('Geçerli ödül talep kimliği zorunludur.')
        return sha256(request_id.strip().encode('utf-8')).hexdigest()

    @staticmethod
    def _identity(player_id,entitlement_id):
        rights.context(player_id,'validation','validation','validation')
        if not isinstance(entitlement_id,str) or not re.fullmatch(r'[0-9a-f]{64}',entitlement_id):
            raise rights.RewardEntitlementError('Ödül hakkı kimliği geçersiz.')

    @staticmethod
    def _lock_player(connection,player_id):
        row=connection.execute('SELECT player_id FROM player_data WHERE player_id=%s FOR UPDATE',(player_id,)).fetchone()
        if row is None:
            raise rights.RewardEntitlementError('Ödülün hesabı bulunamadı.')

    @staticmethod
    def _decoded(row,player_id):
        if row is None:return None
        identity,source,period,node,body,earned_at,delivered_at,option_id,request_hash,stored_receipt=row
        record=rights.validate(body,player_id=player_id)
        if (identity!=record['entitlement_id'] or source!=record['source'] or period!=record['period_id']
                or node!=record['node_id'] or rights.utc(earned_at)!=record['earned_at']):
            raise rights.RewardEntitlementError('Ödül hakkının kalıcı kaydı uyuşmuyor.')
        if delivered_at is None:
            if any(x is not None for x in (option_id,request_hash,stored_receipt)):
                raise rights.RewardEntitlementError('Ödül teslim kaydı eksik; hakkın korunuyor.')
            receipt=None
        else:
            receipt=rights.validate_receipt(record,stored_receipt)
            if receipt['option_id']!=option_id or receipt['delivered_at']!=rights.utc(delivered_at) or not request_hash:
                raise rights.RewardEntitlementError('Ödül teslim makbuzu uyuşmuyor.')
        return dict(record=record,receipt=receipt)

    @staticmethod
    def _select():
        return ('SELECT entitlement_key,source,period_id,node_id,earned_document,earned_at,'
                'delivered_at,selected_option_id,request_hash,receipt FROM player_reward_entitlements ')

    def earn(self,*,player_id,source,period_id,node_id,definition_snapshot,earned_at):
        self._transaction()
        record=rights.create(player_id=player_id,source=source,period_id=period_id,node_id=node_id,
                             definition_snapshot=definition_snapshot,earned_at=earned_at)
        with self.pool.connection() as connection:
            self._lock_player(connection,player_id)
            # The player lock has already opened the outer transaction; this
            # is a savepoint, never an independent wallet commit.
            with connection.transaction():
                connection.execute(
                    'INSERT INTO player_reward_entitlements '
                    '(player_id,entitlement_key,source,period_id,node_id,earned_document,earned_at) '
                    'VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING',
                    (player_id,record['entitlement_id'],source,period_id,node_id,Jsonb(record),record['earned_at']))
                row=connection.execute(self._select()+'WHERE player_id=%s AND entitlement_key=%s FOR UPDATE',
                                       (player_id,record['entitlement_id'])).fetchone()
                existing=self._decoded(row,player_id)
                if existing is None:
                    raise rights.RewardEntitlementError('Ödül hakkı kaydedilemedi.')
                return deepcopy(existing)

    def get(self,player_id,entitlement_id):
        self._identity(player_id,entitlement_id)
        with self.pool.connection() as connection:
            row=connection.execute(self._select()+'WHERE player_id=%s AND entitlement_key=%s',
                                   (player_id,entitlement_id)).fetchone()
            return self._decoded(row,player_id)

    def pending(self,player_id,*,limit=100,after=None,source=None):
        rights.context(player_id,'validation','validation','validation')
        if type(limit) is not int or not 1<=limit<=100:
            raise rights.RewardEntitlementError('Ödül liste sınırı geçersiz.')
        if after is not None:self._identity(player_id,after)
        if source is not None:rights.context(player_id,source,'validation','validation')
        with self.pool.connection() as connection:
            rows=connection.execute(self._select()+
                'WHERE player_id=%s AND delivered_at IS NULL AND (%s::text IS NULL OR entitlement_key>%s) '
                'AND (%s::text IS NULL OR source=%s) ORDER BY entitlement_key LIMIT %s',
                (player_id,after,after,source,source,limit)).fetchall()
            return [self._decoded(row,player_id)['record'] for row in rows]

    def deliver(self,player_id,entitlement_id,*,request_id,option_id=None,delivered_at,grant):
        self._transaction()
        self._identity(player_id,entitlement_id)
        request_hash=self._request(request_id)
        if not callable(grant):raise TypeError('Reward grant callback required')
        with self.pool.connection() as connection:
            self._lock_player(connection,player_id)
            reused=connection.execute(
                'SELECT entitlement_key,selected_option_id FROM player_reward_entitlements '
                'WHERE player_id=%s AND request_hash=%s',(player_id,request_hash)).fetchone()
            if reused and (reused[0]!=entitlement_id or reused[1]!=option_id):
                raise rights.RewardEntitlementError('Talep kimliği farklı bir ödüle veya seçime ait.')
            row=connection.execute(self._select()+'WHERE player_id=%s AND entitlement_key=%s FOR UPDATE',
                                   (player_id,entitlement_id)).fetchone()
            previous=self._decoded(row,player_id)
            if previous is None:
                raise rights.RewardEntitlementError('Bu hesaba ait ödül hakkı bulunamadı.')
            if previous['receipt'] is not None:
                if previous['receipt']['option_id']!=option_id:
                    raise rights.RewardEntitlementError('Bu ödül başka bir seçenekle teslim edilmiş.')
                return deepcopy(previous['receipt'])
            result=rights.receipt(previous['record'],option_id=option_id,delivered_at=delivered_at)
            with connection.transaction():
                grant(deepcopy(result['rewards']))
                connection.execute(
                    'UPDATE player_reward_entitlements SET delivered_at=%s,selected_option_id=%s,request_hash=%s,receipt=%s '
                    'WHERE player_id=%s AND entitlement_key=%s AND delivered_at IS NULL',
                    (result['delivered_at'],option_id,request_hash,Jsonb(result),player_id,entitlement_id))
            return deepcopy(result)
