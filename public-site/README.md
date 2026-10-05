# GRIDSHARD public site — Cloudflare Pages

Domain: `gridshardgame.com` (purchased through Cloudflare Registrar). Public support email: `gridshardgame@gmail.com`. The user supplied the public AdMob authorization line in `app-ads.txt`; it is not a secret and must be public.

Current publisher: **`pub-4974825529326987`**, supplied on 2 October 2026 after the user recreated AdMob as an individual account. The earlier deployment/ZIP uses the retired account; rebuild and create a **new production deployment in the existing `gridshard-public` Pages project**, then verify the live `/app-ads.txt`. Do not create another Pages project or change the custom domain. The new Android rewarded ad unit is recorded separately in `.env.example`; the new AdMob app ID is recorded in `docs/STORE_PURCHASES.md`. Neither belongs in this static public site or should be derived from the publisher ID.

Deployment update (2 October 2026): the user reported publishing the replacement package. Read-only HTTPS checks confirmed the live `/app-ads.txt` returns HTTP 200, `text/plain; charset=utf-8`, and the exact new publisher line; `/`, `/privacy/` and `/delete-account/` also return HTTP 200. This is not confirmation of AdMob's crawler/app approval or readiness for live ads. Keep the older archive only as history, not the next deployment candidate.

This is a **separate static informational site**, not the game client or server. No game API URL, profiles, logs, secrets, payment credentials, environment files, login form, tracking script or advertising SDK is included. Original emblem/favicon files are copied byte-for-byte from the existing branding assets. Source/game/server files must not be uploaded to Pages.

## Build and check

```powershell
node tools/build-public-site.js
node --test tools/tests/public-site.test.js
node tools/check-public-site.js
```

Output: `build/public-site/`; only this directory goes to Pages. `build/public-site-manifest.json` is an operator-only file outside the uploaded directory. The builder explicitly allowlists files and refuses symlink output or unexpected existing files rather than deleting/packaging them. No dependency installation is needed.

TR: `/`, `/support/`, `/privacy/`, `/delete-account/`.
EN: `/en/`, `/en/support/`, `/en/privacy/`, `/en/delete-account/`.
Language switching uses ordinary links; the site needs no JavaScript or cookies. The explicit `404.html` prevents missing files such as a missing app-ads.txt from returning a misleading successful SPA page. Security headers are provided through Pages `_headers`.

The wildcard response header includes `Cache-Control: public, max-age=300,
no-transform`. Cloudflare must preserve the script-free HTML and public mailto
links rather than replacing support addresses with JavaScript-decoded protected
links or injecting a Web Analytics beacon. Do not loosen CSP to make injected
scripts run. See [email obfuscation](https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/)
and [automatic analytics setup](https://developers.cloudflare.com/web-analytics/get-started/).
Local tests check this opt-out, not its actual enforcement at the edge;
verify the live headers, visible addresses, mailto links and absence of injected
scripts after publishing.

## Deployment — performed by the user, not done by this build

1. Open the existing **gridshard-public → Create deployment** screen.
2. Select **Production**. Do not create another project or change the domain/DNS.
3. Upload the contents of `build/public-site/` or the separately generated ZIP; its root must contain `index.html`, not a wrapping project folder.
4. Deploy and check the new deployment and existing custom domain. Its domain is already attached; do not repeat domain setup or point it to an arbitrary IP.
5. Verify HTTPS and `/privacy/`, `/delete-account/`, `/app-ads.txt` on the **custom domain**. The last path must return plain text with the exact supplied publisher line. Do not put these paths behind a login, country restriction or challenge blocking the Google crawler.
6. Enter the developer website `https://gridshardgame.com` in the Play store contact details. When the store listing is discoverable, check AdMob app-ads.txt/app verification; publishing the file alone is not proof of app verification or ad readiness.

Direct Upload projects cannot be converted to Git-integrated Pages projects in place; future automatic deployment requires a new Git-integrated project. Wrangler can still deploy updates to this Direct Upload project.

## Release boundaries

5October16:32TR work-computer handoff: the user confirmed saving the existing
privacy URL in Play Console (user report, not a newly observed Console success
state or Google review approval). The public-site deployment remains verified
by the16:23 evidence below. The user will commit both AI workstreams after the
other work finishes, pull at home, then continue merged tests and the internal
test update. No commit/build/game deploy/internal-test publication is performed
here. Do not redeploy this site or reinstall retention jobs just to resume.
Ignored private receipts/screenshots/ZIPs do not travel through Git; checkpoint
and operational docs preserve the non-secret handoff. Earlier records follow.

5October16:23TR current state: user reported publishing the no-transform ZIP.
Anonymous custom-domain HTTPS verified9/9 responses (8 TR/EN HTML routes plus
app-ads.txt) return200 with exact build-manifest byte counts and SHA256 hashes.
All have `no-transform, public, max-age=300` and unchanged script-free CSP.
The8 HTML responses contain the plain support address and direct mailto links,
with no email-obfuscation markup or injected script tags. Both deletion pages
retain their subject-prefilled mailto link; both privacy translations include
AWS/publisher/recorded-closure90-day text, no Oracle. app-ads.txt is exact plain
text. This is HTTP content/header verification, not a new visual QA or email
client send test. The previous21 local tests and layout evidence remain valid.
The public deployment/contact-link correction is now verified; Play privacy
URL Save is the next step and remains unconfirmed. No game build/deployment,
internal test update or Cloudflare account/DNS/settings change by the agent.
The following16:15 and earlier records are historical.

5October16:15TR current state: the user reported uploading the retention-ready
ZIP. Anonymous HTTPS checks confirmed all8 TR/EN routes and app-ads.txt return
200; both privacy translations now name AWS and the publisher, include the
recorded-closure90-day copy, and contain no Oracle reference. app-ads.txt matches
the supplied line and local digest exactly. Play privacy Save is still pending.

The live HTML hashes did not match the build: Cloudflare added email obfuscation
and an analytics beacon while CSP remained script-free. The live deletion page's
browser DOM and screenshot showed `[email protected]` instead of the public
address, and the email-draft button was rewritten to email-protection rather
than mailto. No Cloudflare account/security/analytics setting was changed and
no tracking script was allowed. Dev logs were empty, so no console error claim.

The new ignored **GRIDSHARD-public-20261005-no-transform.zip** is the next upload
candidate:19 manifest-verified entries,248128bytes; only `_headers` differs from
the already uploaded retention-ready ZIP. HTML/CSS/branding/app-ads are identical.
21/21 public/support tests passed. User must publish this header-only correction
in the existing project's Production environment, then recheck the actual edge
response/contact links before Play Save. Neither the old privacy-draft nor the
previous retention-ready ZIP includes this fix. The live header correction has
not yet been verified. The following earlier stages are historical.

5 October continuation: the user switched networks and the live policy was
read-only verified again (HTTPS200, old Oracle copy, missing publisher/AWS and
pending retention). The local policy now records the approved30/90-day choices,
and now distinguishes the verified backup job from pending support retention.
On5October12:54TR the user-authorized fixed-root30-day backup operator was
installed and verified:22/22 Linux tests,9valid/0expired/0deleted, enabled
daily04:00Europe/Istanbul timer, unchanged game services. `backupVerified`
was true; support evidence was still pending at that earlier stage.
The job creates no new backups or automatic failure notifications; it stops
if no unexpired valid backup exists, so the target may be exceeded pending
operator review. This limit is disclosed in both local translations. The
user prefers automated support expiry. On5October13:30TR the private Apps Script
source under `tools/support-retention/` was saved in a separate support-account
project and verified after reload; label preparation and a real empty-scope
dry-run completed successfully (`dryRun:true`, all counts0, deletedMessages0).
The agent did not click a Google permission approval; successful Gmail calls
prove runtime access, not that an authorization form was observed. There was
no real-request labeling, live expiry or deletion test. Permanent deletion and
daily trigger activation were unapproved at that stage. The private script was not deployed as a web app or shared, and
was not attached to the Play Games Cloud project. See
`docs/PRIVACY_RETENTION_OPERATIONS.md`. Do not upload operator
scripts or claim this draft is a final Play policy. The existing Pages production
upload screen is ready, but no deployment has been made by the agent.

5October15:26TR: the user explicitly authorized the scoped daily permanent
deletion task after its broad Gmail OAuth and irreversible-deletion risk were
explained. The user confirmed support correspondence is held only in the
support Gmail mailbox, with no external copies (user confirmation, not a disk
audit). Only the private script's dryRun/confirmation fields were activated;
the repository template remains safe dry-run. Persisted source readback
matched. The first live-mode manual run succeeded with all counts0 and
deletedMessages0; exactly one runSupportRetention time-based Head trigger was
verified, daily04:00–05:00GMT+03, with daily failure notification. Its first
scheduled run and a real90-day expiry/deletion have not yet been observed.

Both scoped operator evidence flags and privacyRetentionVerified are now true.
The updated TR/EN copy discloses recorded-closure timing, reopening on replies,
unlabeled/external-copy exclusions, processing/failure limits and the lack of
a real90-day deletion observation. This is not proof that every old message
was cleaned, that future runs cannot fail, that the new copy is live or that
Play/general-release preparation is complete. Publisher must mark resolved
support requests with CLOSE; the script never guesses closure from content.

Latest static QA:20/20 public/support tests and12 CUA page checks (8 desktop
routes plus4 TR/EN mobile privacy checks, requested393 and320px;393 measured394
through browser scaling). No overflow/forms/scripts. Temporary browser sizing
reset and loopback server/QA tab closed. One EN full-page screenshot capture
failed; the page's DOM checks and subsequent mobile checks passed. Runtime
screenshots and private setup receipt stay outside the public package.
The new ignored **GRIDSHARD-public-20261005-retention-ready.zip** contains
19files, all names/lengths/SHA matching the static build manifest, with root
index.html; do not upload the old privacy-draft ZIP. The Oracle provider copy
is replaced by AWS in both translations. At15:26 this package was awaiting
upload; by16:15 its policy content was verified live, but the header-only fix
described above and Play Save were still pending.

4 October 2026 read-only check: live `/privacy/` is HTTP200 and identifies
GRIDSHARD, but it still contains the old Oracle provider copy, no AWS provider
copy, and the pending retention schedule. The local AWS copy update has not
been deployed. Finalize publisher/backup/support retention decisions and update
the existing `gridshard-public` project; do not mark the live policy final merely
because the URL loads. The game server itself is already running on AWS; no new
game server or Pages project is needed for this correction.

- The account deletion page opens an email draft and also publishes the address and manual steps. **It does not submit a form or perform deletion itself.** Support requests need an actual monitored mailbox and minimal ownership verification; never request session/recovery secrets, passwords or payment card details by email. The existing authenticated in-app deletion route is not modified.
- Privacy text reflects the inspected code: opt-in product analytics is off by default, raw events last 30 days, opt-out erases them; production account deletion covers profile/identity/social/push/telemetry/analytics records. Operational telemetry is separately count-limited, not the obsolete environment-comment claim of a 180-day product retention period.
- This is **pre-release copy, not legal advice or production/Play approval**. The scoped backup/support jobs and limits are now documented from evidence; audience/age classification, actual enabled providers, Google Play Data safety and SDK/UMP disclosures still need publisher review before releasing the game. Verify the updated policy on the live custom domain after deployment; a local evidence flag is not a live-copy or store-approval claim.
- Real rewarded-ad/SSV match bonus, AdMob app readiness and purchase receipt/refund validation remain open. The SSV Console URL verification/save and Play Games profile restoration were separately user-confirmed; neither is real-ad/billing approval. A public publisher ID is not an AdMob app ID or rewarded ad unit ID.
- `com.gridshardgame.app` is the registered Play Console package and current Capacitor default; changing AdMob accounts does not change it. The Android production API is `https://play.gridshardgame.com` on the existing AWS service. The root public site is separate from the game origin; do not infer that `api.gridshardgame.com` is active.
- The advanced clean PostgreSQL/Redis server migration and old-data-exclusion decision are preserved; this site does not touch or import `server/data`.

References: [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [custom domain](https://developers.cloudflare.com/pages/configuration/custom-domains/), [AdMob app-ads.txt](https://support.google.com/admob/answer/9363762), [Google Play user data](https://support.google.com/googleplay/android-developer/answer/10144311), [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111).
