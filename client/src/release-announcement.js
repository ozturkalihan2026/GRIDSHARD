(function (global) {
  'use strict';
  function create({document, storage, playerId, acknowledge, canPresent}) {
    if (storage === undefined) { try { storage = global.localStorage; } catch (_) {} }
    const dialog = document.getElementById('release-announcement-dialog');
    const button = document.getElementById('release-announcement-confirm');
    const records = new Map(), inFlight = new Set(), attemptedAt = new Map();
    let pending = null, timer = null, openedFor = null;
    const key = owner => 'project-relay.release-announcement.v1:' + owner;
    function record(owner) {
      if (!records.has(owner)) {
        let saved;
        try { saved = JSON.parse(storage?.getItem(key(owner)) || '{}'); } catch (_) {}
        records.set(owner, {acked:new Set(Array.isArray(saved?.acked) ? saved.acked : []),
          pending:new Set(Array.isArray(saved?.pending) ? saved.pending : [])});
      }
      return records.get(owner);
    }
    function save(owner) {
      const entry = record(owner);
      try { storage?.setItem(key(owner), JSON.stringify({acked:[...entry.acked], pending:[...entry.pending]})); } catch (_) {}
    }
    function flush(owner) {
      for (const id of record(owner).pending) {
        const identity = owner + ':' + id;
        if (inFlight.has(identity) || Date.now() - (attemptedAt.get(identity) || 0) < 15000) continue;
        inFlight.add(identity); attemptedAt.set(identity, Date.now());
        Promise.resolve().then(() => acknowledge(owner, id)).then(() => {
          record(owner).pending.delete(id); save(owner);
        }).catch(() => { /* A non-critical announcement never blocks entry; retry on the next inbox refresh. */ })
          .finally(() => inFlight.delete(identity));
      }
    }
    function render() {
      if (!pending) return;
      const english = document.documentElement.lang === 'en';
      document.getElementById('release-announcement-title').textContent = english ? pending.item.title_en : pending.item.title_tr;
      document.getElementById('release-announcement-body').textContent = english ? pending.item.body_en : pending.item.body_tr;
      document.getElementById('release-announcement-label').textContent = pending.item.phase === 'season-preview'
        ? (english ? 'SEASON AND TOURNAMENTS' : 'SEZON VE TURNUVALAR')
        : (english ? 'COMING TO GRIDSHARD' : 'GRIDSHARD’DA YAKINDA');
      document.getElementById('release-announcement-note').textContent = english
        ? 'You can read this again in Inbox → System.' : 'Mesaj Kutusu → Sistem bölümünden tekrar okuyabilirsin.';
      button.textContent = english ? 'OK' : 'TAMAM';
    }
    function present() {
      timer = null;
      if (!pending || pending.owner !== playerId() || record(pending.owner).acked.has(pending.item.notice_id)) return;
      if (dialog.open) return;
      if (!canPresent()) { timer = global.setTimeout(present, 400); return; }
      render(); openedFor = pending.owner;
      dialog.showModal(); button.focus();
    }
    function offer(item, owner) {
      if (!dialog || !owner) return;
      if (openedFor && openedFor !== owner) { dialog.close(); openedFor = null; }
      flush(owner);
      const previous = pending;
      pending = item?.notice_id && !record(owner).acked.has(item.notice_id) ? {item, owner} : null;
      dialog.dataset.delivery = pending ? 'pending' : 'idle';
      if (dialog.open && (!pending || previous?.item.notice_id !== item.notice_id)) dialog.close();
      if (timer) { global.clearTimeout(timer); timer = null; }
      if (pending) { render(); present(); }
    }
    button?.addEventListener('click', () => {
      if (!pending || openedFor !== playerId()) return;
      const {owner, item} = pending;
      record(owner).acked.add(item.notice_id); record(owner).pending.add(item.notice_id); save(owner);
      pending = null; openedFor = null; dialog.close(); flush(owner);
      dialog.dataset.delivery = 'idle';
    });
    dialog?.addEventListener('cancel', event => event.preventDefault());
    dialog?.addEventListener('close', () => {
      if (pending && !timer) timer = global.setTimeout(present, 400);
    });
    const observer = new global.MutationObserver(render);
    observer.observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
    function unavailable(owner) {
      if (openedFor && openedFor !== owner) { pending = null; openedFor = null; dialog.close(); }
      if (dialog?.dataset.delivery === 'loading') dialog.dataset.delivery = 'idle';
      if (owner) flush(owner);
    }
    return {offer, unavailable};
  }
  global.GridshardReleaseAnnouncement = {create};
  if (typeof module !== 'undefined') module.exports = {create};
})(typeof globalThis !== 'undefined' ? globalThis : window);
