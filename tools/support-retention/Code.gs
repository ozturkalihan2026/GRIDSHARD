// Private operator script for gridshardgame@gmail.com, not a web app.
// Upload neither this script nor mailbox metadata to the public Pages site.
// Default is read-only: permanent deletion needs separate publisher activation.
const SUPPORT_RETENTION = Object.freeze({
  mailbox: 'gridshardgame@gmail.com',
  days: 90,
  dryRun: true,
  confirmation: '',
  requiredConfirmation: 'DELETE_CLOSED_GRIDSHARD_SUPPORT_AFTER_90_DAYS',
  closeLabel: 'GRIDSHARD_SUPPORT_CLOSE',
  closedLabel: 'GRIDSHARD_SUPPORT_CLOSED',
  openLabel: 'GRIDSHARD_SUPPORT_OPEN',
  keyPrefix: 'gridshard_support_closed_',
  maxThreads: 50,
  maxMessages: 100,
});

function assertSupportMailbox_() {
  const email = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  if (email !== SUPPORT_RETENTION.mailbox) throw new Error('Wrong or unverified support mailbox; no changes made.');
}

function messageIds_(thread) {
  return thread.getMessages().map(function(message) { return message.getId(); }).sort();
}

function validClosure_(record, now) {
  return record && Number.isFinite(record.closedAt) && record.closedAt > 0 && record.closedAt <= now
    && Array.isArray(record.messageIds) && record.messageIds.length > 0
    && record.messageIds.every(function(id) { return typeof id === 'string' && /^[a-f0-9]+$/i.test(id); })
    && new Set(record.messageIds).size === record.messageIds.length;
}

function supportRetentionDecision_(record, currentIds, now) {
  if (!validClosure_(record, now)) return 'invalid';
  const before = record.messageIds.slice().sort();
  const current = currentIds.slice().sort();
  if (JSON.stringify(before) !== JSON.stringify(current)) return 'reopen';
  return now - record.closedAt >= SUPPORT_RETENTION.days * 86400000 ? 'expire' : 'keep';
}

// Run manually once to create three labels, after reviewing Google permissions.
// Applying CLOSE requests closure; the worker records the actual closure time.
function prepareSupportLabels() {
  assertSupportMailbox_();
  [SUPPORT_RETENTION.closeLabel, SUPPORT_RETENTION.closedLabel, SUPPORT_RETENTION.openLabel]
    .forEach(function(name) { if (!GmailApp.getUserLabelByName(name)) GmailApp.createLabel(name); });
  return { labelsPrepared: true, triggerInstalled: false, deletionActivated: false };
}

function runSupportRetention() {
  assertSupportMailbox_();
  if (!SUPPORT_RETENTION.dryRun && SUPPORT_RETENTION.confirmation !== SUPPORT_RETENTION.requiredConfirmation)
    throw new Error('Permanent-deletion activation confirmation is missing; no changes made.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Another retention run is active.');
  try {
    const now = Date.now();
    const properties = PropertiesService.getScriptProperties();
    const close = GmailApp.getUserLabelByName(SUPPORT_RETENTION.closeLabel);
    const closed = GmailApp.getUserLabelByName(SUPPORT_RETENTION.closedLabel);
    const open = GmailApp.getUserLabelByName(SUPPORT_RETENTION.openLabel);
    if (!close || !closed || !open) throw new Error('Prepare the three support labels first.');
    const result = { dryRun: SUPPORT_RETENTION.dryRun, closureRequests: 0, kept: 0, expired: 0,
      reopened: 0, invalid: 0, missing: 0, deletedMessages: 0, limited: 0 };

    close.getThreads(0, SUPPORT_RETENTION.maxThreads).forEach(function(thread) {
      const key = SUPPORT_RETENTION.keyPrefix + thread.getId();
      // Existing records are never silently re-dated to postpone expiry.
      if (properties.getProperty(key)) { result.invalid++; return; }
      const ids = messageIds_(thread);
      if (!ids.length) { result.invalid++; return; }
      result.closureRequests++;
      if (!SUPPORT_RETENTION.dryRun) {
        properties.setProperty(key, JSON.stringify({ closedAt: now, messageIds: ids }));
        thread.addLabel(closed).removeLabel(close).removeLabel(open);
      }
    });

    let inspected = 0;
    const all = properties.getProperties();
    Object.keys(all).filter(function(key) { return key.indexOf(SUPPORT_RETENTION.keyPrefix) === 0; })
      .sort(function(a, b) {
        function age(key) { try { return JSON.parse(all[key]).closedAt || 0; } catch (_) { return 0; } }
        return age(a) - age(b);
      }).forEach(function(key) {
        if (inspected++ >= SUPPORT_RETENTION.maxThreads) { result.limited++; return; }
        const id = key.slice(SUPPORT_RETENTION.keyPrefix.length);
        if (!/^[a-f0-9]+$/i.test(id)) { result.invalid++; return; }
        let record;
        try { record = JSON.parse(all[key]); } catch (_) { result.invalid++; return; }
        if (!validClosure_(record, now)) { result.invalid++; return; }
        const thread = GmailApp.getThreadById(id);
        if (!thread) { result.missing++; return; }
        if (!thread.getLabels().some(function(label) { return label.getName() === SUPPORT_RETENTION.closedLabel; })) {
          result.invalid++; return;
        }
        const decision = supportRetentionDecision_(record, messageIds_(thread), now);
        if (decision === 'keep') { result.kept++; return; }
        if (decision === 'reopen') {
          result.reopened++;
          if (!SUPPORT_RETENTION.dryRun) {
            thread.addLabel(open).removeLabel(closed);
            properties.deleteProperty(key);
          }
          return;
        }
        if (decision !== 'expire') { result.invalid++; return; }
        result.expired++;
        if (SUPPORT_RETENTION.dryRun) return;
        if (result.deletedMessages + record.messageIds.length > SUPPORT_RETENTION.maxMessages) {
          result.limited++; return;
        }
        // Refresh before deletion. Delete only the saved message IDs, never the
        // entire thread: a new reply arriving during this run must survive.
        thread.refresh();
        if (supportRetentionDecision_(record, messageIds_(thread), Date.now()) !== 'expire') {
          result.reopened++; return;
        }
        record.messageIds.slice().forEach(function(messageId) {
          Gmail.Users.Messages.remove('me', messageId);
          result.deletedMessages++;
          // Preserve the original closure date if a later API call fails.
          record.messageIds = record.messageIds.filter(function(id) { return id !== messageId; });
          if (record.messageIds.length) properties.setProperty(key, JSON.stringify(record));
        });
        properties.deleteProperty(key);
        const remaining = GmailApp.getThreadById(id);
        if (remaining) {
          remaining.refresh();
          if (remaining.getMessages().length) remaining.addLabel(open).removeLabel(closed);
        }
      });
    // Never log mailbox contents, subjects, sender addresses or message IDs.
    console.log(JSON.stringify(result));
    if (result.invalid || result.missing || result.limited)
      throw new Error('Retention requires operator attention; inspect labels/metadata and limits privately.');
    return result;
  } finally {
    lock.releaseLock();
  }
}

// Publisher runs this only after dry-run review and explicit deletion activation.
function installSupportRetentionTrigger() {
  assertSupportMailbox_();
  if (SUPPORT_RETENTION.dryRun || SUPPORT_RETENTION.confirmation !== SUPPORT_RETENTION.requiredConfirmation)
    throw new Error('Review dry-run results and approve permanent deletion before installing a trigger.');
  const existing = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === 'runSupportRetention';
  });
  if (existing.length > 1) throw new Error('Duplicate retention triggers require publisher review.');
  if (existing.length === 1) return { triggerAlreadyInstalled: true };
  ScriptApp.newTrigger('runSupportRetention').timeBased().everyDays(1).atHour(4).create();
  return { triggerInstalled: true };
}
