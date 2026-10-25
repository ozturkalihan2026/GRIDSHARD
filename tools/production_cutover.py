"""Offline, backup-required, transactional one-time player progression reset."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"server"))
import psycopg
from psycopg.types.json import Jsonb
from app.production_config import environment_secret
from app.postgres_worker_guard import WORKER_LOCK_ID
from app.production_cutover import reset_snapshot

OPERATION = "production-reset-20261025-v1"


def apply(connection, owner_id, *, expected_count, backup_sha256, execute=False):
    if not connection.execute("SELECT pg_try_advisory_lock(%s)",(WORKER_LOCK_ID,)).fetchone()[0]:
        raise ValueError("Stop the live worker before running the cutover")
    key=hashlib.sha256(OPERATION.encode()).hexdigest()
    with connection.transaction():
        done=connection.execute("SELECT outcome FROM player_economic_operations WHERE player_id=%s AND request_hash=%s",(owner_id,key)).fetchone()
        if done:return {"replayed":True,"summary":done[0]}
        records=connection.execute("SELECT player_id,profile,settings FROM player_data ORDER BY player_id FOR UPDATE").fetchall()
        if len(records)!=expected_count:raise ValueError("Player count differs from the reviewed plan")
        if owner_id not in {r[0] for r in records}:raise ValueError("Owner account not found")
        if connection.execute("SELECT count(*) FROM store_receipts WHERE environment='production' AND NOT refunded").fetchone()[0]:
            raise ValueError("Real purchases need entitlement migration before reset")
        payloads=[(pid,reset_snapshot(pid,profile,settings,owner=pid==owner_id)) for pid,profile,settings in records]
        summary={"operation":OPERATION,"players":len(records),"reset":len(records)-1,"owner_id":owner_id,"backup_sha256":backup_sha256}
        if not execute:return {"dry_run":True,**summary}
        if len(backup_sha256)!=64:raise ValueError("Verified backup SHA256 is required")
        for pid,record in payloads:
            connection.execute("UPDATE player_data SET profile=%s,statistics=%s,settings=%s,revision=revision+1,updated_at=NOW() WHERE player_id=%s",
                               (Jsonb(record["profile"]),Jsonb(record["statistics"]),Jsonb(record["settings"]),pid))
        # Do not discard authentication, friendships, receipts or purchase ledgers.
        # Old match outcomes must never reapply beta rewards after the reset.
        connection.execute("DELETE FROM battle_participant_results")
        connection.execute("DELETE FROM battle_results")
        connection.execute("UPDATE team_document SET state=jsonb_set(state,'{tournaments}','{}'::jsonb),revision=revision+1,updated_at=NOW()")
        connection.execute("INSERT INTO player_economic_operations(player_id,request_hash,operation_kind,payload_hash,outcome) VALUES(%s,%s,%s,%s,%s)",
                           (owner_id,key,OPERATION,backup_sha256,Jsonb(summary)))
        return summary


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--owner-id",required=True);p.add_argument("--expected-count",required=True,type=int)
    p.add_argument("--backup",type=Path);p.add_argument("--apply",action="store_true")
    args=p.parse_args()
    sha=hashlib.sha256(args.backup.read_bytes()).hexdigest() if args.backup else ""
    if args.apply and not args.backup:raise ValueError("Backup file required")
    url=environment_secret("DATABASE_URL",os.environ)
    with psycopg.connect(url,autocommit=True) as c:
        print(json.dumps(apply(c,args.owner_id,expected_count=args.expected_count,backup_sha256=sha,execute=args.apply)))


if __name__=="__main__":main()
