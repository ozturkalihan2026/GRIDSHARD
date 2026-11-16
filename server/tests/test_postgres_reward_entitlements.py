"""Real loopback PostgreSQL acceptance; never accepts a production DSN."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import shutil
import subprocess
from urllib.parse import urlsplit
from uuid import uuid4

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from psycopg.types.json import Jsonb
import pytest

from app.player_data_store import PlayerDataStoreService
from app.player_profile import PlayerProfileService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.postgres_repository import PostgresPool,PostgresPlayerDataRepository,MIGRATIONS_DIR
from app.postgres_reward_entitlements import PostgresRewardEntitlements
from app.reward_definitions import seal
from app.reward_delivery import apply_fixed_contents
from app.reward_entitlements import RewardEntitlementError

NOW=datetime(2026,11,16,tzinfo=timezone.utc)


def database_url():
    url=os.environ.get('GRIDSHARD_TEST_DATABASE_URL','').strip()
    if not url:pytest.skip('İzole PostgreSQL veritabanı tanımlı değil.')
    parsed=urlsplit(url)
    if parsed.hostname not in {'127.0.0.1','localhost'} or parsed.path!='/gridshard_test':
        pytest.fail('Reward tests only accept loopback /gridshard_test')
    return url


def player_store(pool):
    profiles=PlayerProfileService()
    store=PlayerDataStoreService(profile_service=profiles,statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(),repository=PostgresPlayerDataRepository(pool))
    return store,profiles


@pytest.fixture
def database():
    pool=PostgresPool(database_url(),min_size=1,max_size=8)
    pool.open()
    owner='entitlement-'+uuid4().hex
    store,profiles=player_store(pool)
    profile=profiles.get_or_create(owner);profile.circuit_credits=profile.flux_shards=0
    store.save_player(owner)
    try:yield pool,owner,PostgresRewardEntitlements(pool)
    finally:
        with pool.connection() as connection:connection.execute('DELETE FROM player_data WHERE player_id=%s',(owner,))
        pool.close()


def fixed(credits=10,flux=2,revision=1):
    return seal(identity='test.reward',revision=revision,kind='fixed',payload={'circuit_credits':credits,'flux_shards':flux})


def choice():
    return seal(identity='test.choice',revision=1,kind='choice',payload={'options':[
        {'option_id':name,'contents':{'circuit_credits':amount,'flux_shards':2}}
        for name,amount in [('attack',10),('defense',20),('tactical',30)]]})


def earn(pool,owner,repo,*,node='one',snapshot=None):
    with pool.transaction():
        return repo.earn(player_id=owner,source='choice_crate',period_id='closed-season',node_id=node,
                         definition_snapshot=snapshot or fixed(),earned_at=NOW)['record']


def grant(pool,owner):
    def apply(contents):
        store,profiles=player_store(pool)
        store.load_player(owner)
        apply_fixed_contents(profiles.get(owner),contents)
        store.save_player(owner)
    return apply


def wallet(pool,owner):
    store,profiles=player_store(pool);store.load_player(owner)
    p=profiles.get(owner)
    return p.circuit_credits,p.flux_shards


def test_earning_is_unique_and_freezes_old_contents_after_definition_revision_changes(database):
    pool,owner,repo=database
    before=PostgresPlayerDataRepository(pool).load(owner).profile
    original=earn(pool,owner,repo)
    repeated=earn(pool,owner,repo,snapshot=fixed(999,999,2))
    assert repeated==original
    assert PostgresPlayerDataRepository(pool).load(owner).profile==before
    assert repo.pending(owner)==[original]
    with pytest.raises(RuntimeError):
        repo.earn(player_id=owner,source='choice_crate',period_id='closed-season',node_id='other',definition_snapshot=fixed(),earned_at=NOW)


def test_parallel_earning_and_parallel_delivery_pay_the_wallet_once(database):
    pool,owner,repo=database
    with ThreadPoolExecutor(max_workers=8) as executor:
        records=list(executor.map(lambda _:earn(pool,owner,repo),range(12)))
    assert all(record==records[0] for record in records)
    key=records[0]['entitlement_id']
    def deliver(number):
        with pool.transaction():
            return repo.deliver(owner,key,request_id='parallel-'+str(number),delivered_at=NOW+timedelta(seconds=1),grant=grant(pool,owner))
    with ThreadPoolExecutor(max_workers=8) as executor:receipts=list(executor.map(deliver,range(12)))
    assert all(row==receipts[0] for row in receipts)
    assert wallet(pool,owner)==(10,2)
    assert repo.pending(owner)==[]
    assert repo.get(owner,key)['receipt']==receipts[0]


def test_racing_choices_allow_only_one_option_and_one_delivery(database):
    pool,owner,repo=database
    key=earn(pool,owner,repo,snapshot=choice())['entitlement_id']
    def deliver(option):
        try:
            with pool.transaction():
                return repo.deliver(owner,key,request_id='choice-'+option,option_id=option,
                                    delivered_at=NOW,grant=grant(pool,owner))
        except RewardEntitlementError:return None
    with ThreadPoolExecutor(max_workers=2) as executor:results=list(executor.map(deliver,['attack','defense']))
    winner=next(row for row in results if row is not None)
    assert len([row for row in results if row is not None])==1
    assert wallet(pool,owner)==(winner['rewards']['circuit_credits'],2)


def test_grant_failure_rolls_back_even_if_the_outer_caller_catches_it(database):
    pool,owner,repo=database
    key=earn(pool,owner,repo)['entitlement_id']
    def broken(contents):
        grant(pool,owner)(contents)
        raise RuntimeError('failure after wallet save')
    with pool.transaction():
        with pytest.raises(RuntimeError,match='after wallet'):
            repo.deliver(owner,key,request_id='failed',delivered_at=NOW,grant=broken)
        assert wallet(pool,owner)==(0,0)
        assert repo.get(owner,key)['receipt'] is None
    with pool.transaction():
        repo.deliver(owner,key,request_id='retry',delivered_at=NOW,grant=grant(pool,owner))
    assert wallet(pool,owner)==(10,2)


def test_outer_rollback_preserves_both_wallet_and_pending_right(database):
    pool,owner,repo=database
    key=earn(pool,owner,repo)['entitlement_id']
    with pytest.raises(RuntimeError,match='abort outer'):
        with pool.transaction():
            repo.deliver(owner,key,request_id='outer',delivered_at=NOW,grant=grant(pool,owner))
            raise RuntimeError('abort outer')
    assert wallet(pool,owner)==(0,0)
    assert repo.get(owner,key)['receipt'] is None


def test_foreign_owner_and_request_reuse_cannot_claim_another_right(database):
    pool,owner,repo=database
    one=earn(pool,owner,repo,node='one')['entitlement_id']
    two=earn(pool,owner,repo,node='two')['entitlement_id']
    assert repo.get('other-account',one) is None
    with pool.transaction():
        with pytest.raises(RewardEntitlementError):
            repo.deliver('other-account',one,request_id='foreign',delivered_at=NOW,grant=lambda _:pytest.fail('Foreign grant'))
        repo.deliver(owner,one,request_id='shared',delivered_at=NOW,grant=grant(pool,owner))
        with pytest.raises(RewardEntitlementError,match='farklı'):
            repo.deliver(owner,two,request_id='shared',delivered_at=NOW,grant=lambda _:pytest.fail('Repeated request'))
    assert wallet(pool,owner)==(10,2)


def test_tampered_earned_document_or_receipt_fails_before_any_wallet_change(database):
    pool,owner,repo=database
    record=earn(pool,owner,repo)
    corrupt=deepcopy(record);corrupt['definition_snapshot']['payload']['circuit_credits']=999
    with pool.connection() as connection:
        connection.execute('UPDATE player_reward_entitlements SET earned_document=%s WHERE player_id=%s',
                           (Jsonb(corrupt),owner))
    with pool.transaction():
        with pytest.raises(RewardEntitlementError):
            repo.deliver(owner,record['entitlement_id'],request_id='corrupt',delivered_at=NOW,grant=lambda _:pytest.fail('Corrupt grant'))
    assert wallet(pool,owner)==(0,0)


def test_pending_pagination_never_deletes_or_hides_remaining_rights(database):
    pool,owner,repo=database
    expected=[earn(pool,owner,repo,node=str(i)) for i in range(5)]
    page1=repo.pending(owner,limit=2)
    page2=repo.pending(owner,limit=2,after=page1[-1]['entitlement_id'])
    page3=repo.pending(owner,limit=2,after=page2[-1]['entitlement_id'])
    assert {r['entitlement_id'] for r in page1+page2+page3}=={r['entitlement_id'] for r in expected}


def test_downgrade_refuses_to_delete_claimed_or_unclaimed_reward_witnesses(database):
    pool,owner,repo=database
    key=earn(pool,owner,repo)['entitlement_id']
    down=(MIGRATIONS_DIR/'015_reward_entitlements.down.sql').read_text(encoding='utf-8')
    for claimed in (False,True):
        if claimed:
            with pool.transaction():repo.deliver(owner,key,request_id='down-guard',delivered_at=NOW,grant=grant(pool,owner))
        with pool.connection() as connection:
            with pytest.raises(psycopg.errors.RaiseException,match='refuse destructive'):
                with connection.transaction():connection.execute(down)
        assert repo.get(owner,key) is not None


def test_account_erasure_cascades_its_reward_rights(database):
    pool,owner,repo=database
    earn(pool,owner,repo)
    with pool.connection() as connection:connection.execute('DELETE FROM player_data WHERE player_id=%s',(owner,))
    assert repo.pending(owner)==[]


def test_restart_and_real_dump_restore_preserve_wallet_pending_and_claimed_rights(database,tmp_path):
    pool,owner,repo=database
    pending=earn(pool,owner,repo,node='pending')
    claimed=earn(pool,owner,repo,node='claimed')
    with pool.transaction():
        receipt=repo.deliver(owner,claimed['entitlement_id'],request_id='before-backup',delivered_at=NOW,grant=grant(pool,owner))
    restarted=PostgresPool(database_url(),min_size=1,max_size=2);restarted.open()
    try:assert PostgresRewardEntitlements(restarted).get(owner,pending['entitlement_id'])==repo.get(owner,pending['entitlement_id'])
    finally:restarted.close()
    pg_bin=os.environ.get('GRIDSHARD_TEST_PG_BIN','')
    def binary(name):
        path=Path(pg_bin)/(name+('.exe' if os.name=='nt' else '')) if pg_bin else None
        found=str(path) if path and path.is_file() else shutil.which(name)
        if not found:pytest.skip('Matching PostgreSQL client tools required for real dump/restore')
        return found
    dump=tmp_path/'entitlements.dump'
    restore_name='gridshard_reward_restore_'+uuid4().hex
    url=database_url()
    admin=make_conninfo(url,dbname='postgres')
    restored=None
    with psycopg.connect(admin,autocommit=True) as connection:
        connection.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(restore_name)))
    try:
        subprocess.run([binary('pg_dump'),'--format=custom','--no-owner','--no-acl','--file',str(dump),'--dbname',url],check=True,capture_output=True,timeout=60)
        restore_url=make_conninfo(url,dbname=restore_name)
        subprocess.run([binary('pg_restore'),'--no-owner','--no-acl','--exit-on-error','--single-transaction','--dbname',restore_url,str(dump)],check=True,capture_output=True,timeout=60)
        restored=PostgresPool(restore_url,min_size=1,max_size=2);restored.open()
        restored_repo=PostgresRewardEntitlements(restored)
        assert restored_repo.get(owner,pending['entitlement_id'])==repo.get(owner,pending['entitlement_id'])
        assert restored_repo.get(owner,claimed['entitlement_id'])['receipt']==receipt
        assert wallet(restored,owner)==wallet(pool,owner)==(10,2)
        with restored.transaction():
            restored_repo.deliver(owner,claimed['entitlement_id'],request_id='after-restore',delivered_at=NOW,
                                 grant=lambda _:pytest.fail('Delivered right was paid twice after restore'))
            restored_repo.deliver(owner,pending['entitlement_id'],request_id='pending-after-restore',delivered_at=NOW,grant=grant(restored,owner))
        assert wallet(restored,owner)==(20,4)
        assert wallet(pool,owner)==(10,2)
    finally:
        if restored is not None:restored.close()
        with psycopg.connect(admin,autocommit=True) as connection:
            connection.execute(sql.SQL('DROP DATABASE {} WITH (FORCE)').format(sql.Identifier(restore_name)))
