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

## Deployment — performed by the user, not done by this build

1. On the supplied Pages screen, choose **Drag and drop your files → Get started**.
2. Name the project `gridshard-public` (or an available variant).
3. Upload the contents of `build/public-site/` or the separately generated ZIP; its root must contain `index.html`, not a wrapping project folder.
4. Deploy, check the generated `*.pages.dev` URL, then **Custom domains → Set up a domain → gridshardgame.com**. This attaches the domain and creates its DNS record; do not manually point the domain to an arbitrary IP. Handle any pre-existing DNS conflict deliberately.
5. Verify HTTPS and `/privacy/`, `/delete-account/`, `/app-ads.txt` on the **custom domain**. The last path must return plain text with the exact supplied publisher line. Do not put these paths behind a login, country restriction or challenge blocking the Google crawler.
6. Enter the developer website `https://gridshardgame.com` in the Play store contact details. When the store listing is discoverable, check AdMob app-ads.txt/app verification; publishing the file alone is not proof of app verification or ad readiness.

Direct Upload projects cannot be converted to Git-integrated Pages projects in place; future automatic deployment requires a new Git-integrated project. Wrangler can still deploy updates to this Direct Upload project.

## Release boundaries

- The account deletion page opens an email draft and also publishes the address and manual steps. **It does not submit a form or perform deletion itself.** Support requests need an actual monitored mailbox and minimal ownership verification; never request session/recovery secrets, passwords or payment card details by email. The existing authenticated in-app deletion route is not modified.
- Privacy text reflects the inspected code: opt-in product analytics is off by default, raw events last 30 days, opt-out erases them; production account deletion covers profile/identity/social/push/telemetry/analytics records. Operational telemetry is separately count-limited, not the obsolete environment-comment claim of a 180-day product retention period.
- This is **pre-release copy, not legal advice or production/Play approval**. Backup and support-correspondence retention schedules, audience/age classification, actual enabled providers, Google Play Data safety and SDK/UMP disclosures must be finalized by the publisher before releasing the game. The public privacy page explicitly discloses the outstanding production retention schedule; do not submit this as a final release policy without completing it.
- Live AdMob UMP/consent/device validation, real purchase pricing/receipt/refund validation and Oracle HTTPS/WSS remain open. A public publisher ID is not an AdMob app ID or rewarded ad unit ID.
- `com.gridshardgame.app` is the registered Play Console package and current Capacitor default; changing AdMob accounts does not change it. `play.gridshardgame.com` / `api.gridshardgame.com` are proposed, not live addresses. The root site should not be assumed to be the origin used by the current same-origin game client.
- The advanced clean PostgreSQL/Redis server migration and old-data-exclusion decision are preserved; this site does not touch or import `server/data`.

References: [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [custom domain](https://developers.cloudflare.com/pages/configuration/custom-domains/), [AdMob app-ads.txt](https://support.google.com/admob/answer/9363762), [Google Play user data](https://support.google.com/googleplay/android-developer/answer/10144311), [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111).
