# Uses the private Windows vault in memory; never emits credentials or JWTs.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskCredential = Import-Clixml -LiteralPath (Join-Path $taskRoot 'secrets\play-review-20261005-vault\credential.dpapi.xml')
$taskConfig = Get-Content -LiteralPath (Join-Path $taskRoot 'secrets\play-review-20261005-vault\review-config.json') -Raw | ConvertFrom-Json
$taskOrigin = 'https://play.gridshardgame.com'
$taskBaseHeaders = @{'User-Agent' = 'GRIDSHARD-deployment-health/1.0'}
function Invoke-TaskApi([string]$Path, [string]$Method, [hashtable]$Headers, $Payload) {
    $taskArguments = @{Uri = $taskOrigin + $Path; Method = $Method; Headers = $Headers; TimeoutSec = 20}
    if ($null -ne $Payload) { $taskArguments.ContentType = 'application/json'; $taskArguments.Body = $Payload | ConvertTo-Json -Compress }
    try { return Invoke-RestMethod @taskArguments } catch { throw "Live review API check failed at $Path (response body/credentials suppressed)." }
}
function Assert-TaskPremium($Profile, $Store) {
    if (!$Profile.engagement.premium_pass.active -or !$Store.battle_premium.active) { throw 'Premium content unavailable' }
    if (@($Profile.engagement.premium_reward_track | Where-Object { !$_.unlocked }).Count -ne 0) { throw 'A premium tier is locked' }
}
try {
    $taskProofs = @()
    foreach ($taskIndex in @(0, 1)) {
        $taskProof = @{username = $taskCredential.UserName; password = $taskCredential.GetNetworkCredential().Password;
            device_id = 'operator-review-' + [guid]::NewGuid().ToString('N');
            device_secret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N');
            device_name = 'Private review verification'; platform = 'android'}
        $taskResult = Invoke-TaskApi '/auth/review-session' 'POST' $taskBaseHeaders $taskProof
        if (!$taskResult.review_access -or $taskResult.player_id -ne $taskConfig.player_id) { throw 'Wrong review identity' }
        $taskHeaders = @{'User-Agent' = $taskBaseHeaders['User-Agent']; Authorization = 'Bearer ' + $taskResult.access_token}
        $taskProfile = Invoke-TaskApi ("/profile/" + $taskResult.player_id) 'GET' $taskHeaders $null
        $taskStore = Invoke-TaskApi ("/store/" + $taskResult.player_id) 'GET' $taskHeaders $null
        Assert-TaskPremium $taskProfile $taskStore
        if ($taskProfile.engagement.flux_shards -lt 1050 -or $taskProfile.meta_progression_summary.circuit_credits -lt 9000 -or $taskProfile.rating -ne 0) { throw 'Unexpected demo wallet/trophies' }
        $taskProofs += $taskProof
    }
    # Exercise paid CONTENT using demo currency, not a fabricated billing receipt.
    $taskPurchase = Invoke-TaskApi ("/store/" + $taskConfig.player_id + '/chests/field_3h/buy') 'POST' $taskHeaders @{request_id = [guid]::NewGuid().ToString('N')}
    if (!$taskPurchase.receipt) { throw 'Demo currency content unavailable' }
    $taskTrack = @($taskProfile.engagement.premium_reward_track | Where-Object { !$_.claimed })
    if ($taskTrack.Count -gt 0) {
        $taskTier = $taskTrack[0].tier
        $taskClaim = Invoke-TaskApi ("/profile/" + $taskConfig.player_id + "/engagement/tiers/$taskTier/premium/claim") 'POST' $taskHeaders @{request_id = [guid]::NewGuid().ToString('N')}
        if (!$taskClaim) { throw 'Demo premium tier claim unavailable' }
    }
    $taskResult = Invoke-TaskApi '/auth/review-session' 'POST' $taskBaseHeaders $taskProofs[1]
    $taskHeaders.Authorization = 'Bearer ' + $taskResult.access_token
    $taskProfile = Invoke-TaskApi ("/profile/" + $taskConfig.player_id) 'GET' $taskHeaders $null
    $taskStore = Invoke-TaskApi ("/store/" + $taskConfig.player_id) 'GET' $taskHeaders $null
    Assert-TaskPremium $taskProfile $taskStore
    if ($taskProfile.engagement.flux_shards -lt 1050 -or $taskProfile.meta_progression_summary.circuit_credits -lt 9000) { throw 'Demo wallet refill unavailable' }
    if ($taskTrack.Count -gt 0 -and !(@($taskProfile.engagement.premium_reward_track | Where-Object { $_.tier -eq $taskTier -and $_.claimed }).Count)) { throw 'Claim lost on sign-in' }
    $taskResume = Invoke-TaskApi '/auth/session' 'POST' $taskBaseHeaders @{
        player_id = $taskConfig.player_id; device_id = $taskProofs[1].device_id; device_secret = $taskProofs[1].device_secret;
        device_name = 'Private review verification'; platform = 'android'; existing_only = $true}
    if ($taskResume.player_id -ne $taskConfig.player_id) { throw 'Saved device refresh failed' }
    [ordered]@{live_https_review_access = 'passed'; two_device_proofs = 'passed'; premium_tiers = 'passed';
        battle_premium = 'passed'; demo_currency_purchase = 'passed'; premium_claim_and_refill = 'passed';
        saved_device_refresh = 'passed'; credentials_disclosed = $false; native_device_verified = $false} |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskRoot 'artifacts\play-review-access\live-api-verification.json') -Encoding UTF8
    Write-Output 'Live HTTPS review credentials, two device proofs, premium content, demo currency purchase, premium claim, refill and saved-device refresh passed. No real payment or ordinary-account mutation requested.'
} finally {
    $taskProof = $null; $taskProofs = $null; $taskCredential = $null; $taskConfig = $null;
    $taskResult = $null; $taskHeaders = $null; $taskResume = $null
}
