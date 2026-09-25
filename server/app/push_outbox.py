"""Durable, leased push deliveries stored alongside their owning account.

Provider I/O happens outside the JSON lock. Leases prevent concurrent workers
from claiming the same job; an ambiguous provider timeout can still duplicate a
delivery (at-least-once transport). Stable notification IDs let clients coalesce.
"""

from collections import Counter
import secrets


class PushOutbox:
    PUSH_TTL = 24 * 60 * 60
    PUSH_STALE = 30 * 24 * 60 * 60
    PUSH_LEASE = 120
    PUSH_ATTEMPTS = 6

    def _push_view(self, account):
        return {
            "subscribed_devices": len(account.get("push_subscriptions", {})),
            "device_ids": list(account.get("push_subscriptions", {})),
            "adapter_configured": bool(self.push_sender.platforms),
            "configured_platforms": list(self.push_sender.platforms),
            "deliveries": dict(Counter(job["status"] for job in account.get("push_jobs", []))),
        }

    def _enqueue_push(self, account, item, source_player_id):
        now = int(self.now_func())
        self._prune_push(account, now)
        jobs = account.setdefault("push_jobs", [])
        for device_id, subscription in account.get("push_subscriptions", {}).items():
            # Legacy registrations require a fresh opt-in/token registration.
            if not subscription.get("revision"):
                continue
            jobs.append({
                "job_id": secrets.token_urlsafe(16), "notification_id": item["notification_id"],
                "device_id": device_id, "revision": subscription["revision"],
                "source_player_id": source_player_id, "created_at": now,
                "expires_at": now + self.PUSH_TTL, "next_attempt_at": now,
                "status": "pending", "attempts": 0,
            })
        # There are at most ten subscriptions and one hundred inbox items.
        # Jobs for evicted inbox items are cancelled on the next worker pass.
        account["push_jobs"] = jobs[-1000:]

    def _prune_push(self, account, now):
        subscriptions = account.get("push_subscriptions", {})
        stale = [device for device, sub in subscriptions.items()
                 if device not in account.get("devices", {}) or now - sub.get("updated_at", 0) >= self.PUSH_STALE]
        for device in stale:
            subscriptions.pop(device, None)
        jobs = account.get("push_jobs", [])
        kept = [job for job in jobs if job.get("expires_at", 0) > now - self.PUSH_TTL]
        if len(kept) != len(jobs):
            account["push_jobs"] = kept
        return bool(stale) or len(kept) != len(jobs)

    def _claim_push(self):
        now = int(self.now_func())
        with self._lock:
            data = self._read()
            changed = False
            candidates = []
            for player_id, account in data["accounts"].items():
                changed = self._prune_push(account, now) or changed
                items = {item["notification_id"]: item for item in account.get("notifications", [])}
                for job in account.get("push_jobs", []):
                    if job["status"] not in {"pending", "sending"}:
                        continue
                    subscription = account.get("push_subscriptions", {}).get(job["device_id"], {})
                    source = job.get("source_player_id")
                    blocked = source and (source in account.get("blocked_player_ids", []) or
                        player_id in data["accounts"].get(source, {}).get("blocked_player_ids", []))
                    if (job["expires_at"] <= now or job["notification_id"] not in items or blocked
                            or not subscription or subscription.get("revision") != job["revision"]):
                        job.update(status="cancelled", code="expired_or_unsubscribed")
                        changed = True
                        continue
                    if job["status"] == "sending" and job.get("lease_until", 0) > now:
                        continue
                    if job["attempts"] >= self.PUSH_ATTEMPTS:
                        job.update(status="failed", code="attempt_limit")
                        changed = True
                        continue
                    if job["next_attempt_at"] <= now and subscription.get("platform") in self.push_sender.available_platforms:
                        candidates.append((job["next_attempt_at"], player_id, job, subscription, items[job["notification_id"]]))
            claim = None
            if candidates:
                _, player_id, job, subscription, item = min(candidates, key=lambda candidate: candidate[0])
                job.update(status="sending", lease_id=secrets.token_urlsafe(16), lease_until=now + self.PUSH_LEASE,
                           attempts=job["attempts"] + 1)
                claim = {"player_id": player_id, "job": dict(job), "subscription": dict(subscription), "item": dict(item)}
                changed = True
            if changed:
                self._write(data)
            return claim

    def _finish_push(self, claim, result):
        now = int(self.now_func())
        with self._lock:
            data = self._read()
            account = data["accounts"].get(claim["player_id"])
            if not account:
                return  # Account deletion must never recreate the account.
            job = next((job for job in account.get("push_jobs", []) if job["job_id"] == claim["job"]["job_id"]), None)
            if not job or job.get("lease_id") != claim["job"]["lease_id"] or job["status"] != "sending":
                return
            current = account.get("push_subscriptions", {}).get(job["device_id"], {})
            if current.get("revision") != job["revision"]:
                job.update(status="cancelled", code="subscription_changed")
            elif result.status == "retry" and job["attempts"] < self.PUSH_ATTEMPTS:
                delay = max(result.retry_after, min(3600, 60 * 2 ** (job["attempts"] - 1))) + secrets.randbelow(16)
                job.update(status="pending", code=result.code, next_attempt_at=now + delay)
            else:
                job.update(status="failed" if result.status == "retry" else result.status, code=result.code)
                if result.status == "invalid":
                    # An APNs response older than a freshly registered token
                    # cannot invalidate that new registration, even if equal.
                    registered_ms = current.get("registered_at_ms", 0)
                    if result.invalidated_at is None or result.invalidated_at >= registered_ms:
                        account["push_subscriptions"].pop(job["device_id"], None)
            job.pop("lease_id", None)
            job.pop("lease_until", None)
            self._write(data)

    def process_push_once(self) -> bool:
        claim = self._claim_push()
        if claim is None:
            return False
        result = self.push_sender.send(claim["subscription"], {**claim["item"], "recipient_id": claim["player_id"]}, expires_at=claim["job"]["expires_at"])
        self._finish_push(claim, result)
        return True

    @staticmethod
    def _cancel_device_push(account, device_id):
        account.get("push_subscriptions", {}).pop(device_id, None)
        for job in account.get("push_jobs", []):
            if job["device_id"] == device_id and job["status"] in {"pending", "sending"}:
                job.update(status="cancelled", code="unsubscribed")
