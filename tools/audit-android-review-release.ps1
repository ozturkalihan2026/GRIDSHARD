[CmdletBinding()]
param([string]$Directory = 'D:\Projects\GRIDSHARD\artifacts\android-production-20261005-v2')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskCert = Get-Content -LiteralPath (Join-Path $taskRoot 'secrets\android-release\public-certificate.json') -Raw | ConvertFrom-Json
$taskCredential = Import-Clixml -LiteralPath (Join-Path $taskRoot 'secrets\play-review-20261005-vault\credential.dpapi.xml')
$taskPassword = $taskCredential.GetNetworkCredential().Password
$taskVerifier = Get-Content -LiteralPath (Join-Path $taskRoot 'secrets\play-review-20261005-vault\review-config.json') -Raw | ConvertFrom-Json
$taskApk = Join-Path $Directory 'GRIDSHARD-2.1.0-beta.72-v2.apk'
$taskAab = Join-Path $Directory 'GRIDSHARD-2.1.0-beta.72-v2.aab'
$taskCounts = @{}
try {
    foreach ($taskArchive in @($taskApk, $taskAab)) {
        $taskZip = [IO.Compression.ZipFile]::OpenRead($taskArchive)
        try {
            $taskPrefix = 'assets/'
            if ($taskArchive.EndsWith('.aab')) { $taskPrefix = 'base/assets/' }
            $taskCount = 0
            foreach ($taskEntry in $taskZip.Entries) {
                if ($taskEntry.FullName -match '(?i)(client_secret|credential\.dpapi|play_review_config|review-config\.json|\.(p12|jks|keystore|pem)$|(^|/)\.env($|[./]))') { throw 'Private artifact leaked' }
                if ($taskEntry.FullName -eq ($taskPrefix + 'capacitor.config.json')) {
                    $taskReader = [IO.StreamReader]::new($taskEntry.Open())
                    try { $taskConfig = $taskReader.ReadToEnd() | ConvertFrom-Json } finally { $taskReader.Dispose() }
                    if ($taskConfig.appId -ne 'com.gridshardgame.app' -or $taskConfig.server.cleartext -ne $false -or $taskConfig.server.url) { throw 'Noncanonical or remote-loaded package' }
                }
                if (!$taskEntry.FullName.StartsWith($taskPrefix + 'public/') -or $taskEntry.FullName.EndsWith('/')) { continue }
                $taskRelative = $taskEntry.FullName.Substring(($taskPrefix + 'public/').Length)
                $taskLocal = Join-Path (Join-Path $taskRoot 'dist') $taskRelative
                if (!(Test-Path -LiteralPath $taskLocal -PathType Leaf)) {
                    if ($taskRelative -in @('capacitor.js', 'capacitor.plugins.js', 'cordova.js', 'cordova_plugins.js')) { continue }
                    throw "Unexpected web asset: $taskRelative"
                }
                $taskHasher = [Security.Cryptography.SHA256]::Create()
                $taskStream = $taskEntry.Open()
                try { $taskDigest = [BitConverter]::ToString($taskHasher.ComputeHash($taskStream)).Replace('-', '') } finally { $taskStream.Dispose(); $taskHasher.Dispose() }
                if ($taskDigest -ne (Get-FileHash -LiteralPath $taskLocal -Algorithm SHA256).Hash) { throw 'Stale web asset' }
                if ($taskRelative -match '\.(html|js|json|css)$') {
                    $taskReader = [IO.StreamReader]::new($taskEntry.Open())
                    try { $taskText = $taskReader.ReadToEnd() } finally { $taskReader.Dispose() }
                    foreach ($taskPrivateValue in @($taskPassword, $taskVerifier.verifier, $taskVerifier.owner_id)) {
                        if ($taskText.Contains($taskPrivateValue)) { throw 'Private review material embedded in client' }
                    }
                    if ($taskRelative -eq 'runtime-config.js' -and $taskText -notmatch 'https://play.gridshardgame.com') { throw 'Wrong API origin' }
                    if ($taskRelative -eq 'index.html' -and $taskText -notmatch 'REVIEW / DEMO SIGN-IN') { throw 'Review entry missing from package' }
                }
                $taskCount++
            }
            if ($taskCount -lt 10 -or !$taskConfig) { throw 'Incomplete mobile assets' }
            $taskCounts[[IO.Path]::GetExtension($taskArchive)] = $taskCount
        } finally { $taskZip.Dispose() }
    }
    $taskSignerOutput = & 'C:/Users/S-A/AppData/Local/Android/Sdk/build-tools/36.0.0/apksigner.bat' verify --print-certs $taskApk
    if ($LASTEXITCODE -ne 0 -or ($taskSignerOutput -join "`n") -notmatch $taskCert.sha256.Replace(':', '').ToLower()) { throw 'APK signer mismatch' }
    $taskAabSignature = & 'C:/Program Files/Android/Android Studio/jbr/bin/jarsigner.exe' -verify $taskAab
    if ($LASTEXITCODE -ne 0 -or ($taskAabSignature -join "`n") -notmatch 'jar verified') { throw 'AAB signature invalid' }
    $taskAabCertificate = & 'C:/Program Files/Android/Android Studio/jbr/bin/keytool.exe' -printcert -jarfile $taskAab
    if ($LASTEXITCODE -ne 0 -or ($taskAabCertificate -join "`n") -notmatch [regex]::Escape($taskCert.sha256)) { throw 'AAB signer mismatch' }
    $taskBadging = & 'C:/Users/S-A/AppData/Local/Android/Sdk/build-tools/36.0.0/aapt.exe' dump badging $taskApk
    $taskBadgingText = $taskBadging -join "`n"
    if ($LASTEXITCODE -ne 0 -or $taskBadgingText -notmatch "package: name='com.gridshardgame.app' versionCode='2'" -or $taskBadgingText -match 'application-debuggable|uses-permission.*(AD_ID|ACCESS_ADSERVICES)') { throw 'Release identity/permission gate failed' }
    $taskReceipt = [ordered]@{
        package_name = 'com.gridshardgame.app'; version_code = 2; version_name = '2.1.0-beta.72';
        apk_sha256 = (Get-FileHash -LiteralPath $taskApk -Algorithm SHA256).Hash.ToLower();
        aab_sha256 = (Get-FileHash -LiteralPath $taskAab -Algorithm SHA256).Hash.ToLower();
        certificate_sha256 = $taskCert.sha256; matched_packaged_web_assets = $taskCounts;
        apk_signature_verified = $true; aab_signature_verified = $true;
        private_review_material_embedded = $false; debuggable = $false;
        advertising_id_permissions = $false; uses_remote_web_url = $false;
        device_install_verified = $false; play_uploaded = $false; full_access_attestation_verified = $false
    }
    $taskReceipt | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $Directory 'release-audit.json') -Encoding UTF8
    $taskReceipt | ConvertTo-Json -Depth 4
} finally {
    $taskPassword = $null; $taskPrivateValue = $null; $taskCredential = $null; $taskVerifier = $null
}
