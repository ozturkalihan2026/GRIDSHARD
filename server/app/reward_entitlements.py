"""Self-contained earned rights; mutable delivery state is stored separately.

This module does not grant a right based on client input or credit a wallet.
Entitlement creation belongs to an authoritative reward source; transaction
owners must persist the frozen payload and its delivery in the same unit of work.
"""
from copy import deepcopy
from datetime import datetime, timezone
import re

from .reward_definitions import checked, fingerprint, snapshot_contents, RewardDefinitionError

KEY = re.compile(r'^[A-Za-z0-9_.:-]{1,128}$')


class RewardEntitlementError(ValueError):
    pass


def context(player_id, source, period_id, node_id):
    if (not isinstance(player_id,str) or not player_id or player_id.strip()!=player_id
            or len(player_id)>72 or any(ord(c)<32 for c in player_id)):
        raise RewardEntitlementError('Ödülün hesap kimliği geçersiz.')
    for value in (source,period_id,node_id):
        if not isinstance(value,str) or not KEY.fullmatch(value):
            raise RewardEntitlementError('Ödülün kaynak veya dönem kimliği geçersiz.')
    if len(source)>48:
        raise RewardEntitlementError('Ödül kaynağı çok uzun.')
    return dict(player_id=player_id,source=source,period_id=period_id,node_id=node_id)


def entitlement_key(player_id, source, period_id, node_id):
    return fingerprint(dict(format_version=1,**context(player_id,source,period_id,node_id)))


def utc(value):
    try:
        moment=datetime.fromisoformat(value.replace('Z','+00:00')) if isinstance(value,str) else value
        if not isinstance(moment,datetime) or moment.tzinfo is None or moment.utcoffset() is None:
            raise ValueError('Timezone required')
        return moment.astimezone(timezone.utc).isoformat(timespec='microseconds').replace('+00:00','Z')
    except (TypeError,ValueError) as exc:
        raise RewardEntitlementError('Ödül zamanı saat dilimi taşımalıdır.') from exc


def create(*, player_id,source,period_id,node_id,definition_snapshot,earned_at):
    identity=context(player_id,source,period_id,node_id)
    try:
        snapshot=checked(definition_snapshot)
    except RewardDefinitionError as exc:
        raise RewardEntitlementError(str(exc)) from exc
    body=dict(format_version=1,entitlement_id=entitlement_key(**identity),**identity,
        definition_snapshot=snapshot,earned_at=utc(earned_at))
    return dict(body,content_hash=fingerprint(body))


def validate(record, *, player_id=None):
    if not isinstance(record,dict):
        raise RewardEntitlementError('Kazanılmış ödül kaydı geçersiz.')
    keys={'format_version','entitlement_id','player_id','source','period_id','node_id',
          'definition_snapshot','earned_at','content_hash'}
    if set(record)!=keys or type(record['format_version']) is not int or record['format_version']!=1:
        raise RewardEntitlementError('Kazanılmış ödül formatı desteklenmiyor.')
    expected=create(**{k:record[k] for k in ('player_id','source','period_id','node_id','definition_snapshot','earned_at')})
    if record!=expected or (player_id is not None and record['player_id']!=player_id):
        raise RewardEntitlementError('Kazanılmış ödül doğrulanamadı; hakkın korunuyor.')
    return deepcopy(record)


def contents(record, *, option_id=None):
    record=validate(record)
    snapshot=record['definition_snapshot']
    if snapshot['kind'] not in {'fixed','choice'}:
        raise RewardEntitlementError('Rastgele sandık mevcut sandık motorunda açılmalıdır.')
    try:
        return snapshot_contents(snapshot,option_id=option_id)
    except RewardDefinitionError as exc:
        raise RewardEntitlementError(str(exc)) from exc


def receipt(record, *, option_id,delivered_at):
    record=validate(record)
    when=utc(delivered_at)
    if when<record['earned_at']:
        raise RewardEntitlementError('Ödül teslimi kazanımdan önce olamaz.')
    snapshot=record['definition_snapshot']
    body={k:record[k] for k in ('entitlement_id','player_id','source','period_id','node_id')}
    body.update(definition_id=snapshot['id'],definition_revision=snapshot['revision'],
        definition_hash=snapshot['content_hash'],entitlement_hash=record['content_hash'],
        option_id=option_id,rewards=contents(record,option_id=option_id),delivered_at=when)
    return dict(body,receipt_hash=fingerprint(body))


def validate_receipt(record,value):
    if not isinstance(value,dict):
        raise RewardEntitlementError('Ödül teslim makbuzu geçersiz.')
    expected=receipt(record,option_id=value.get('option_id'),delivered_at=value.get('delivered_at'))
    if value!=expected:
        raise RewardEntitlementError('Ödül teslim makbuzu doğrulanamadı; hakkın korunuyor.')
    return deepcopy(value)
