# Google Play reviewer / demo access

Status: source access is implemented; the user subsequently authorized the matching build/deployment required to complete reviewer access. A signed **versionCode 2** APK/AAB has been built and audited with the existing upload key. The matching r11 backend deployment, 330-second live HTTPS/worker stability checks, isolated restart/backup-restore tests, and original-player preservation checks all passed. Live HTTPS reviewer login/premium/refill/device refresh also passed. The last USB inspection showed Play versionCode 1. The user subsequently reported successful ordinary Play Games sign-in to the Uç profile, the visible native review-entry button, and successful demo profile sign-in. The phone was no longer connected, so its current versionCode/Play upload could not be independently checked. **Native premium/restart/return verification is still pending**; demo entry is confirmed by the user, not an independent automated device check. Do not mark the full-access attestation complete until the remaining Android checks pass. This intermediate reviewer release uses a frozen source snapshot; concurrent music work is not included.

## Reviewer instructions (English, for Play Console)

Access group name: `GRIDSHARD review demo`

Enter the private username and password in the dedicated Console fields. They are not a Google account or a real player's credentials. Do not place the password in this document, source, an APK, runtime-config.js, a URL or a chat.

Paste the following in “Other information required to access your app” (under 500 characters):

```text
Open GRIDSHARD and tap "REVIEW / DEMO SIGN-IN" on the loading/account screen or in Profile > Settings > Account and Privacy. Enter the supplied username/password and tap "SIGN IN TO REVIEW". No Google account, OTP, subscription or payment is required. The separate demo profile has Season Pass and Battle Premium enabled, all premium tiers unlocked, and currency to inspect paid items. Complete daily meta selection if prompted. Internet is required. Do not link a personal account.
```

After sign-in the app reloads into the demo profile. If the daily-meta dialog appears, tap its selection button, wait for the result, then tap the same button to continue. Open the Season screen to inspect and claim premium tiers; open Shop to inspect products and spend the preloaded currency on chests/items. Battle Premium applies to normal completed battles. Ordinary progression, matchmaking and reward rules remain in effect; this is not an admin mode or a fabricated payment flow. Cash/NFT rewards are not provided. The automatic first-player guide is skipped only for the private demo; reviewers can start it explicitly in Settings. Normal players keep their existing guide.

If currency has been spent, sign in again with the same review credentials to restore a minimum of 1,050 Flux and 9,000 Circuit Credits. Credentials have no time limit, country restriction or one-time verification step. Premium eligibility automatically follows the current season on a successful device-session refresh; no personal provider is required.

If the device already had a profile, use “REVIEW / DEMO SIGN-IN” → “RETURN TO PREVIOUS PROFILE”. The original device proof is verified normally before switching back. A revoked or deleted original account is **not** recreated or reauthorized by demo access; use ordinary recovery for that account. Do not uninstall or clear app storage when preserving an existing unlinked guest.

## Protected operator credentials

The local preparation tool creates a NEW directory only inside the ignored `secrets/` directory:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/new-play-review-access.ps1 -Directory 'D:\Projects\GRIDSHARD\secrets\play-review-NEW'
```

Run in the operator's own Windows session, not an impersonated sandbox. It restricts the directory ACL, generates a random 256-bit password, writes only a salted PBKDF2-SHA256 verifier (600,000 iterations) to `review-config.json`, and stores the username/password in `credential.dpapi.xml` using Windows user-bound encryption. It prints no password, never overwrites credentials and does not contact a server. The verifier is written only after encrypted-vault creation succeeds.

Prepared on the home PC: `D:\Projects\GRIDSHARD\secrets\play-review-20261005-vault\`. The vault is bound to the Windows user **and this PC**. It cannot simply be copied and decrypted on the work PC. Preserve the credentials in your approved encrypted password manager for cross-PC use; never put plaintext in Git or a release archive. A first sandbox attempt in `secrets/play-review-20261005/` failed DPAPI and is **not usable for activation**.

To retrieve the credentials, run the following yourself in a private, non-recorded Windows terminal. Do not ask an AI tool to print the result. Paste only into the private Play Console fields:

```powershell
$reviewCredential = Import-Clixml -LiteralPath 'D:\Projects\GRIDSHARD\secrets\play-review-20261005-vault\credential.dpapi.xml'
$reviewCredential.UserName
$reviewCredential.GetNetworkCredential().Password
```

## Authorized activation checklist

1. Keep `review-config.json` outside the deployed source, static client and release archives. Mount this single verifier file read-only into the API, e.g. `/run/secrets/play_review_config`; file permissions must allow only the operator/API service to read it. `secrets/` is ignored by Git and Docker; the client build reads client sources only.
2. Set the API-only variable `GRIDSHARD_PLAY_REVIEW_CONFIG_FILE` to that **absolute** file path. It defaults to unset/disabled. Never send this configuration to the browser/native app. Startup fails closed for unreadable/malformed configuration. Do not turn off ordinary authentication, rate limiting, store receipt verification or provider proof.
   The opt-in `docker-compose.play-review.yml` layer mounts the verifier alongside the existing production, Cloudflare and Play Games layers. Production defaults remain unchanged without this layer. Use a private external verifier owned/readable by API UID 10001, mode 0400.
3. Deploy the matching backend and Android sources together during the approved release. Expose the API only over HTTPS through the existing trusted proxy; do not expose a plaintext API listener publicly. The client refuses remote HTTP for the credential POST (loopback HTTP is permitted for local tests only).
4. On the first correct credential sign-in, a server-selected, randomly reserved `review-...` identity is created. If an existing unmarked profile/identity or a different owner marker occupies that ID, access is rejected; no existing account is promoted or reset. The durable private marker lives in identity `devices` JSON/JSONB; no database schema migration is needed.
5. Verify from a clean install AND an existing guest device: successful sign-in, app restart, premium tiers, Battle Premium, currency spending, another device sign-in, and return to the untouched original profile. Then enter the credentials and English instructions in Console and save the all-features-access declaration. **This runtime/device gate is still pending.**

For production PostgreSQL, provisioning, entitlement persistence and device registration join the existing transaction/worker-ownership boundary. Both real PostgreSQL review commit/rollback cases passed on an isolated local PostgreSQL 16 cluster and an isolated remote PostgreSQL 17 cluster. Native SecureStorage behavior is unit-tested through the bridge contract; the installed versionCode 2 binary must still be checked on-device. Do not uninstall or clear the existing guest to resolve upload-key versus Google Play signing-key differences: update through the same Google Play test track.

The connected Android phone was inspected read-only on 5 October: versionCode 1, installed by Google Play. Its APK signature matches the configured Play signing certificate (SHA-1 `7C:FD:F8:68:FE:78:6E:BA:DF:B0:3B:31:D8:E6:15:5B:05:55:B0:0F`) and differs from the local upload-key APK. Do **not** attempt to replace it with the local APK or remove it to resolve that mismatch. Upload the versionCode 2 AAB to the existing internal-test track and update through Play, preserving app data. First verify the ordinary player's Play Games sign-in; then test demo entry, restart, premium access and return. A previously signed-out/revoked player must recover through normal authentication, not through demo access. The user reproduced the previously diagnosed revoked-device startup failure on versionCode 1. Inspection of all packaged JS/HTML confirmed the old APK lacks the recovery endpoint, reauthentication gate and recovery dialog; all are present in versionCode 2. The new ordinary sign-in flow must still be tested on the actual phone.

## Security and lifecycle

- No magic query string, anonymous grant, global premium switch or client-side shared secret. The login accepts only username/password and device metadata; client-selected player IDs or entitlements are rejected. Validation errors never echo passwords or device secrets. Successful responses are `Cache-Control: no-store`; the password field is cleared on completion/close and is never written to client storage.
- Existing players' IDs, names, teams, trophies, wallet and provider links are not imported, merged or changed by provisioning. The demo receives its own season XP/entitlements/wallet; it has zero seeded trophies. Ordinary server-side authorization and cross-account checks apply to demo tokens too. Demo activity uses normal game/social services; private credentials should be shared with reviewers only, not general testers or bots.
- The previous profile/device proof is backed up in native SecureStorage before switching (web development uses the existing web secret-store adapter). Demo sign-in reuses this device's normal generated device secret; the reviewer password is separate and not stored. No personal Google password is needed. Personal provider/email linking and ordinary secret-reset recovery are blocked **only for the marked demo identity**, preventing loss of its access-control marker.
- Credential attempts are limited to five per source IP per minute and forty globally per minute, regardless of spoofed Authorization headers. The existing single active production worker enforces the local bound; ensure the trusted proxy supplies real client addresses. There are at most 128 active review tokens and 128 registered review devices. No existing normal-player rate policy changes.
- To disable: unset `GRIDSHARD_PLAY_REVIEW_CONFIG_FILE` and restart the API in the authorized maintenance workflow. Marked demo token use and saved-device refresh are rejected, not just the password entry point. Normal accounts continue normally. Do not disable during an active Google review without supplying working replacement access.
- To rotate while retaining the demo profile: keep `player_id`, `username` and `owner_id`, generate a new random password/salt/verifier with the same KDF, update the protected operator vault/config, and restart. Old token/device credential-version entries are rejected. Only a new correct password sign-in enrolls a device under the new version. Changing the owner ID does not take over an existing marked account. Do not hand-edit a user's ID into the config.
- The configuration is loaded at startup; editing the file alone does not activate, disable or rotate a running process. Production activation is a separate, explicitly authorized maintenance step with fresh offline backup and prior-image rollback; never restore a historical dump over live player progress.

## Local verification

```powershell
python -m pytest server/tests/test_review_access.py server/tests/test_review_access_postgres.py -q -p no:cacheprovider
# Run the following from client/:
node --test tests/review-access.test.js tests/account-session-controls.test.js
# Source-only, temporary loopback server and isolated fixture credentials:
$env:GRIDSHARD_TEST_BROWSER_CHANNEL = 'msedge'
node tools/check-play-review-access.js
```

Frozen reviewer release verified locally on 5 October 2026: client suite 203 passed; tool suite 30 passed; full server suite with a fresh loopback PostgreSQL cluster **1,154 passed / 1 skipped** (local Redis unavailable). The focused review-access server cases include credential rotation, disablement, existing-account collision safety, cold JSON-backend restart, and PostgreSQL commit/rollback. The PostgreSQL concurrency test now compares against its actual fixture balance rather than the obsolete 321-credit fixture; no game balance was changed for this correction.

Remote isolated PostgreSQL 17/Redis suite: **1,152 passed / 1 skipped** (host dump tools unavailable; actual maintenance-container backup/restore is separately exercised). Two Windows QA-report tests passed locally and were not rerun remotely because those reports are intentionally excluded from source releases. No fabricated QA reports were added.

Signed artifacts: `artifacts/android-production-20261005-v2/GRIDSHARD-2.1.0-beta.72-v2.aab` and `.apk`. Audit confirmed matching APK/AAB upload certificates, versionCode 2, HTTPS API, non-debuggable manifest, no advertising-ID permissions, 61 matching web assets in each package, and no private reviewer password/verifier/owner marker embedded. `release-audit.json` explicitly leaves native installation, Play upload and full-access attestation false. Build ID: `2b56167427155dda`.

Live HTTPS checks used the protected Windows vault in memory, never stdout: the server-selected separate review profile, two device proofs, all premium tiers/Battle Premium, a real demo-currency chest purchase, a premium-tier claim, wallet refill with preserved claims, and normal saved-device refresh passed. No billing receipt was invented and no real payment was made. Receipt: `artifacts/play-review-access/live-api-verification.json`. This does not replace Android SecureStorage/device testing.

Production r11 was activated on 5 October 2026 after a fresh offline backup (`/var/backups/gridshard-production/20261005-before-play-review-r11`). The previous image remains available for image/config rollback; no historical database was restored over current progress. Both isolated and live 330-second stability checks passed, with zero critical log markers. Deployment comparison preserved the installation ID and all original player/identity/team rows. A second comparison after real reviewer API checks confirmed all 11 original profiles and 11 identities remained unchanged, and exactly one separate review profile/identity was added. Safe receipts are in `artifacts/play-review-access/server-receipts/`. Real ad/payment rollout and test-payment modes remain disabled.

The browser harness uses a fresh temporary data directory, no real players, no live API/provider requests and no APK/AAB build. It verifies the English entry, dialog layout at 1280×900, 393×852, 320×740 and 740×320, persistent demo identity, server-confirmed premium rights, and return to the original guest through actual visible Profile → Settings → Account and Privacy buttons. It waits for normal startup/deferred daily-meta selection; it never force-dismisses a modal or bypasses authentication. All four sizes passed. Screenshots are written under ignored `artifacts/play-review-access/layout/`; passwords are masked. Temporary fixture data remains in the OS temp directory for diagnosis and must never be used for deployment.

Google's reviewer-access requirements: [Provide information for Google Play app review](https://support.google.com/googleplay/android-developer/answer/15748846?hl=en).
