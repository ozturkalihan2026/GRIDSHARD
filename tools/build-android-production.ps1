[CmdletBinding()]
param([switch]$PrepareOnly, [switch]$Offline)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskConfig = Get-Content -LiteralPath (Join-Path $taskRoot 'config\android-production.json') -Raw | ConvertFrom-Json
$taskEnvNames = @('GRIDSHARD_ANDROID_PRODUCTION','GRIDSHARD_APP_ID','GRIDSHARD_API_BASE_URL',
    'GRIDSHARD_PLAY_GAMES_ID','GRIDSHARD_PLAY_GAMES_SERVER_CLIENT_ID','GRIDSHARD_LOCAL_DEBUG',
    'GRIDSHARD_REMOTE_DEBUG','GRIDSHARD_ADMOB_TEST_CONFIG','GRIDSHARD_ALLOW_INSECURE_MOBILE_API',
    'GRIDSHARD_ANDROID_KEYSTORE','GRIDSHARD_ANDROID_STORE_PASSWORD','GRIDSHARD_ANDROID_KEY_ALIAS',
    'GRIDSHARD_ANDROID_KEY_PASSWORD','JAVA_HOME','ANDROID_HOME')
$taskPrevious = @{}
foreach ($taskName in $taskEnvNames) { $taskPrevious[$taskName] = [Environment]::GetEnvironmentVariable($taskName,'Process') }
function Invoke-TaskChecked([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Build command failed: $Executable ($LASTEXITCODE)" }
}
Push-Location $taskRoot
try {
    $env:GRIDSHARD_ANDROID_PRODUCTION = '1'
    $env:GRIDSHARD_APP_ID = $taskConfig.appId
    $env:GRIDSHARD_API_BASE_URL = $taskConfig.apiBaseUrl
    $env:GRIDSHARD_PLAY_GAMES_ID = $taskConfig.playGamesId
    $env:GRIDSHARD_PLAY_GAMES_SERVER_CLIENT_ID = $taskConfig.playGamesServerClientId
    foreach ($taskName in @('GRIDSHARD_LOCAL_DEBUG','GRIDSHARD_REMOTE_DEBUG','GRIDSHARD_ADMOB_TEST_CONFIG','GRIDSHARD_ALLOW_INSECURE_MOBILE_API')) {
        [Environment]::SetEnvironmentVariable($taskName,$null,'Process')
    }
    if ($taskConfig.appId -ne 'com.gridshardgame.app' -or $taskConfig.apiBaseUrl -ne 'https://play.gridshardgame.com' `
        -or $taskConfig.versionCode -lt 1 -or $taskConfig.versionName -notmatch '^[a-zA-Z0-9.\-]+$') { throw 'Invalid canonical release configuration.' }
    $env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
    $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    Invoke-TaskChecked 'node' @('tools/build-mobile-web.js')
    if (!(Test-Path -LiteralPath (Join-Path $taskRoot 'android'))) {
        Invoke-TaskChecked 'node' @('node_modules/@capacitor/cli/bin/capacitor','add','android')
    }
    Invoke-TaskChecked 'node' @('node_modules/@capacitor/cli/bin/capacitor','sync','android')
    Invoke-TaskChecked 'node' @('tools/configure-native-orientation.js','android')
    $taskGradleFile = Join-Path $taskRoot 'android\app\build.gradle'
    $taskGradle = Get-Content -LiteralPath $taskGradleFile -Raw
    if ($taskGradle -notmatch 'applicationId "com.gridshardgame.app"') { throw 'Android project has a different identity. No automatic replacement.' }
    $taskGradle = $taskGradle -replace '(?m)versionCode \d+', "versionCode $($taskConfig.versionCode)"
    $taskGradle = $taskGradle -replace 'versionName "[^"]+"', "versionName `"$($taskConfig.versionName)`""
    # Mechanical build metadata rewrite, not application source editing.
    [IO.File]::WriteAllText($taskGradleFile,$taskGradle,[Text.UTF8Encoding]::new($false))
    $taskVariables = Join-Path $taskRoot 'android\variables.gradle'
    $taskVariablesText = Get-Content -LiteralPath $taskVariables -Raw
    if ($taskVariablesText -notmatch 'playServicesAdsVersion\s*=') {
        [IO.File]::AppendAllText($taskVariables,"`n// Pin the certified Google SDK; no floating ad dependency.`next { playServicesAdsVersion = '25.4.0' }`n",[Text.UTF8Encoding]::new($false))
    }
    if ($PrepareOnly) { Write-Output 'Canonical native project prepared; not signed, installed or published.'; return }
    $taskKeyDirectory = Join-Path $taskRoot 'secrets\android-release'
    $taskCredential = Import-Clixml -LiteralPath (Join-Path $taskKeyDirectory 'credential.dpapi.xml')
    $env:GRIDSHARD_ANDROID_KEYSTORE = Join-Path $taskKeyDirectory 'gridshard-upload.p12'
    $env:GRIDSHARD_ANDROID_KEY_ALIAS = $taskCredential.UserName
    $env:GRIDSHARD_ANDROID_STORE_PASSWORD = $taskCredential.GetNetworkCredential().Password
    $env:GRIDSHARD_ANDROID_KEY_PASSWORD = $env:GRIDSHARD_ANDROID_STORE_PASSWORD
    Push-Location (Join-Path $taskRoot 'android')
    try {
        $taskArguments = @('assembleRelease','bundleRelease','--no-daemon','--console=plain')
        if ($Offline) { $taskArguments += '--offline' }
        Invoke-TaskChecked '.\gradlew.bat' $taskArguments
    } finally { Pop-Location }
    Write-Output 'Signed APK/AAB built. This does not confirm Play approval, PGS binding, billing access or live advertising readiness.'
} finally {
    foreach ($taskName in $taskEnvNames) { [Environment]::SetEnvironmentVariable($taskName,$taskPrevious[$taskName],'Process') }
    $taskCredential = $null
    Pop-Location
}
