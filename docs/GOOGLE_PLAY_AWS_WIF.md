# Google Play billing: keyless AWS workload authentication

## Status and scope

Prepared locally on 7 October 2026. The implementation is opt-in; the existing
production environment and default `service_account` mode are unchanged.
Local tests use Google's `google-auth` 2.60.0 with mocked HTTP/EC2 responses.
They do **not** prove a working AWS/Google/Play connection, merchant setup,
RTDN delivery, real purchases, or refunds. No AWS/Cloud IAM configuration,
deployment, product activation, Android build, or credential creation is
performed by this preparation.

Final local verification: server suite **1290 passed, 39 skipped**; tools
**17 passed**. Skips require isolated PostgreSQL/real Redis. `pip check`,
release guard and whitespace checks passed. There is one unrelated
Starlette test-client deprecation warning. An isolated image/database test
and a fresh CI run for these uncommitted changes are still required.

The user's approval covers local implementation/testing. External trust/IAM
changes and live billing activation require separate informed approval.
Keep `iam.disableServiceAccountKeyCreation` enforced. Do not create another
project/account/key to evade it. Keep existing Play app-scoped read-only app
information, financial-data and order/subscription permissions; do not add
Play administrator/publishing or Cloud Owner/Editor privileges.

## Authentication behavior

The AWS EC2 workload's temporary role credentials are retrieved using IMDSv2.
Google's auth library signs an AWS `GetCallerIdentity` request, exchanges it
with Google STS, and impersonates the **existing** Play billing service account
to obtain a short-lived token scoped to `androidpublisher`. No private key or
Google user refresh token is used. Nothing is placed in client JS/APK/AAB.

The backend accepts only an explicitly configured AWS `external_account`
document with an independently pinned provider audience and service-account
email. The credential source must match the standard IPv4 EC2 metadata URLs,
include IMDSv2, and use the standard regional AWS STS signing URL. Only global
Google STS and the exact target IAM Credentials endpoint are accepted.

No ADC, `GOOGLE_APPLICATION_CREDENTIALS`, arbitrary URL/file/executable source,
custom universe, delegate, quota project, or static AWS credential environment
fallback is accepted. `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and
`AWS_SESSION_TOKEN` must be unset, including when a token is already cached.
The auth HTTP client ignores environment
proxies, verifies TLS, never follows redirects, and uses a 10-second timeout
per request. Configuration errors fail startup; token/network/IAM errors are
sanitized and retryable without accepting receipts or falling back to keys.
Non-200 auth response bodies are not passed to the SDK or error logs.
Final tokens are cached in process memory under a lock, refreshed before
expiry, and invalidated on Publisher 401/403 (including consumption/refunds).
Token lifetime is bounded to 300–3600 seconds; normal default is one hour.

## Operator progress — 7–8 October 2026

The local preparation above was followed by separately approved external
setup. A dedicated `gridshard-play-billing-wif` EC2 role/profile was created
and attached only to the verified GRIDSHARD instance; the role has zero AWS
permission policies and IMDSv2 remains required. The user then created the
Google pool and restricted service-account binding manually in Edge, with
separate action-time approval for each final IAM write.

Read-only Cloud Shell output supplied by the user verifies provider
`projects/376018782491/locations/global/workloadIdentityPools/gridshard-play-billing/providers/aws-ec2`
is ACTIVE for AWS account `583365237571`. Its condition is:

```text
assertion.account == '583365237571' && assertion.arn.startsWith('arn:aws:sts::583365237571:assumed-role/gridshard-play-billing-wif/')
```

The existing service account
`gridshard-play-billing@project-37a84396-b930-4141-b4d.iam.gserviceaccount.com`
resource policy contains one binding: `roles/iam.workloadIdentityUser`, only
for pool subject
`arn:aws:sts::583365237571:assumed-role/gridshard-play-billing-wif/i-0c00d7409aa5dcff1`.
The ARN is the expected EC2 identity derived from the verified role and
instance, not yet an observed `GetCallerIdentity` response. All five APIs
(IAM, IAM Credentials, STS, Cloud Resource Manager and Android Publisher)
are already enabled; no new API or billing/free-trial enrollment was needed.

The user generated and downloaded the IMDSv2 configuration. On 8 October,
the 966-byte local download and its protected operator copy both matched the
Cloud Shell SHA256. Offline validation accepted the independently verified
provider audience and service-account email, required IMDSv2, found no private
key and bounded the token lifetime to 3600 seconds. It made zero network calls
and explicitly reported `external_connection_verified: false`. The protected
copy is Git-ignored and excluded from actual release inputs. Eleven additional
preflight/release-boundary tests passed with a fresh workspace temporary
directory after Windows sandbox TEMP/cache permission failures; no test or
application code was changed. The source/version guard also passed.

The initial bounded SSH/IMDS probe did not connect (sandbox permission denied,
then an eight-second network-authorized connect timeout). On 8 October, the
user supplied the SSH rule editor screenshots. A direct public-IP read found
that the current source was absent from the displayed single-IP SSH rules.
After the exact TCP22 `/32` addition was proposed, the user reported saving it.
The agent did not write AWS rules; the persisted final rule set was not
independently queried. A fresh source match and pinned-host-key SSH probe then
succeeded. Host IMDSv2 metadata independently confirmed instance
`i-0c00d7409aa5dcff1`, role `gridshard-play-billing-wif`, and profile
`arn:aws:iam::583365237571:instance-profile/gridshard-play-billing-wif`.
IMDSv2 was available and required; role-name-list and iam-info returned 200.
The probe made zero role-credential-body requests and zero Google requests.

No real AWS `GetCallerIdentity` or Google token exchange was tested. Host
metadata reachability does not prove bridged-container IMDS reachability,
service-account impersonation or Play authorization. Config transfer and an
isolated real token/read-only Play API test require separate approval before
execution. No production mount/env, deployment, metadata option, player data,
product activation, purchase or Android build was changed. Never open SSH to
everyone. The Cloud Shell user session must not substitute for the intended
EC2 workload identity.

## External setup gates — NOT executed by this local preparation

1. Verify the exact production EC2 instance, its attached instance profile,
   AWS account, role ARN, and IMDS options read-only. Do not retrieve or print
   role credential bodies. If no appropriate role exists, propose a dedicated
   least-privilege EC2 role/instance profile and obtain approval before creating
   or attaching it. Do not replace a role that other services depend on.
2. Verify Google's current project and the existing Play billing service
   account. Propose a dedicated AWS workload identity pool/provider, required
   API enables, and exact restricted impersonation binding. Get approval
   before creating resources or changing IAM. Neither financial-data access
   nor local config validation proves these IAM permissions exist.
3. Bind only the exact approved AWS account and dedicated assumed-role
   identity. Use an explicit provider condition restricting both
   `assertion.account` and the dedicated assumed-role identity, using either
   mapped `attribute.aws_role` equality or an exact `assertion.arn` role
   prefix ending with `/`. Confirm the
   normalized ARN from the verified role; do not invent it. Do not grant all
   identities in a pool or all AWS roles. On the existing billing service
   account, grant `roles/iam.workloadIdentityUser` only to that restricted
   federated principal. No broad Token Creator, Owner/Editor or AWS admin role.
4. Ensure EC2 IMDSv2 remains required. Verify metadata reachability from the
   intended Docker network separately. A metadata response hop-limit change
   may be needed for a bridged container; it requires a separately approved
   bounded change. Do not switch to IMDSv1, host networking, privileged Docker,
   static AWS keys, or removal of existing security restrictions.
5. After trust setup is approved/completed, generate a credential **config**,
   not a service-account key, with the command below. Do not request token
   lifetime extension or set `--sts-location`: this implementation pins the
   global Google STS endpoint. Verify email/audience against the approved
   resources independently of the downloaded config.

```text
gcloud iam workload-identity-pools create-cred-config \
  projects/<VERIFIED_PROJECT_NUMBER>/locations/global/workloadIdentityPools/<APPROVED_POOL>/providers/<APPROVED_PROVIDER> \
  --service-account=<VERIFIED_PLAY_BILLING_SERVICE_ACCOUNT_EMAIL> \
  --aws --enable-imdsv2 \
  --output-file=<PRIVATE_OPERATOR_DIRECTORY>/google_play_wif_config.json
```

The config has no private key, but still controls authentication destinations
and identity. Protect its integrity, keep it outside the repo/client image,
and do not paste or log raw config/token/credential/receipt bodies.

## Offline validation and planned server settings

Offline validation does not request credentials, tokens, or any network URL:

```text
python tools/google_play_wif_preflight.py \
  --config <PRIVATE_CONFIG_PATH> \
  --email <INDEPENDENTLY_VERIFIED_SERVICE_ACCOUNT_EMAIL> \
  --audience <INDEPENDENTLY_VERIFIED_FULL_PROVIDER_AUDIENCE>
```

Exit 0 means only the config/pins are valid; output always explicitly reports
`external_connection_verified: false`. Exit 2 rejects the config without
printing its contents. A forged config with attacker-selected pins is not
proof of an authorized resource: verify those pins first.

The future API-only configuration is:

| Variable | Planned value |
| --- | --- |
| `GRIDSHARD_GOOGLE_PLAY_AUTH_MODE` | `aws_wif` |
| `GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME` | `com.gridshardgame.app` |
| `GRIDSHARD_GOOGLE_PLAY_WIF_CONFIG_FILE` | `/run/secrets/google_play_wif_config` |
| `GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL` | Verified existing billing account |
| `GRIDSHARD_GOOGLE_PLAY_WIF_AUDIENCE` | `//iam.googleapis.com/projects/<NUMBER>/locations/global/workloadIdentityPools/<POOL>/providers/<PROVIDER>` |
| `GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_FILE` | Unset/empty; not a second auth path |

`docker-compose.google-play-wif.yml` is an optional **unapplied** layer. It
mounts config only into the API, from the existing external secrets directory.
Use read-only mounting and production UID10001 readability (root-managed
parent directory and appropriate ownership/0400 file), not world-readable
permissions. Preserve the existing four production/Cloudflare/PGS/review
layers, volumes, player data and current ad `live`/SSV/test0 settings. Do not
merge this layer into the frozen r13 package or its operator flow silently.
Source/dependency changes require a fresh, separately audited billing
candidate/image and CI verification; the earlier frozen r13 ZIP is unchanged.

## Before any purchase testing or live billing activation

- Verify the scoped external IAM/role/config and real token refresh on an
  isolated candidate without exposing tokens; confirm the target Play app
  authorization. Do not grant/refund/consume an actual order as an auth probe.
- Revalidate deployment/Compose/security boundaries and cold/restart/expiry
  behavior in the isolated image with PostgreSQL17/Redis and backup/restore.
  These production-image/external tests are not covered by local mocked HTTP.
- Complete authenticated Pub/Sub RTDN, package/audience/sender verification
  and voided-purchase reconciliation. WIF replaces outbound billing auth,
  **not** the RTDN push OIDC verification or its subscription setup.
- Confirm license-test users and the actual test payment banner. A testing
  track alone does not make payments free. Product/offer activation is a
  separate decision; do not activate drafts or launch real sales implicitly.
- Test pending payment, interruption/retry, correct account binding, a single
  durable delivery, consumption, replay, and revocation after refund. Existing
  ordinary/reviewer accounts must not be altered for these preparations.
- Get explicit live-transition approval, take/verify a fresh backup, preserve
  live state, and use the production runbook. Do not deploy/apply IAM changes,
  build APK/AAB, or commit/push simply because local tests pass.

References: [Google AWS federation guide](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds),
[Google auth library AWS credentials](https://google-auth.readthedocs.io/en/latest/reference/google.auth.aws.html),
[Google Play API access](https://developers.google.com/android-publisher/getting_started).
