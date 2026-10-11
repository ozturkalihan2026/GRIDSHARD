param([string]$Python = 'python', [string[]]$TestArguments = @('tests', '-q', '--tb=short'), [switch]$Postgres)
$ErrorActionPreference = 'Stop'
$gsTestRoot = Join-Path $env:TEMP ('gridshard-mailbox-tests-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $gsTestRoot | Out-Null
$env:GRIDSHARD_RUNTIME_MODE = 'development'
$env:GRIDSHARD_AUTH_REQUIRED = '0'
$env:GRIDSHARD_RATE_LIMIT_REQUIRED = '0'
$env:GRIDSHARD_RUNTIME_DATA_DIR = $gsTestRoot
foreach ($gsDatabaseVariable in @('DATABASE_URL','DATABASE_URL_FILE','REDIS_URL','REDIS_URL_FILE','GRIDSHARD_TEST_DATABASE_URL','GRIDSHARD_TEST_REDIS_URL')) {
    Remove-Item -LiteralPath ('Env:' + $gsDatabaseVariable) -ErrorAction SilentlyContinue
}
$gsTestPaths = @{
    GRIDSHARD_PRODUCT_ANALYTICS_PATH='analytics.json'; RELAY_PLAYER_DATA_PATH='players.json'
    RELAY_TELEMETRY_PATH='telemetry.json'; RELAY_BATTLE_POOL_PRESET_PATH='presets.json'
    GRIDSHARD_AUTH_IDENTITY_PATH='identities.json'; GRIDSHARD_AUTH_KEY_PATH='auth-signing-key'
    GRIDSHARD_PLATFORM_STATE_PATH='platform_state.json'; RELAY_TEAM_DATA_PATH='teams.json'
}
foreach ($gsTestPath in $gsTestPaths.GetEnumerator()) {
    Set-Item -LiteralPath ('Env:' + $gsTestPath.Key) -Value (Join-Path $gsTestRoot $gsTestPath.Value)
}
$env:PYTHONPATH = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../server')).Path
if ($Postgres) {
    $gsPythonExecutable = (Get-Command $Python -ErrorAction Stop).Source
    $env:PATH = (Split-Path -Parent $gsPythonExecutable) + ';' + $env:PATH
    & (Join-Path $PSScriptRoot 'test-review-postgres.ps1') -FullSuite
    exit $LASTEXITCODE
}
Push-Location (Join-Path $PSScriptRoot '../server')
try {
    & $Python -m pytest @TestArguments -o ('cache_dir=' + (Join-Path $gsTestRoot 'pytest-cache')) --basetemp (Join-Path $gsTestRoot 'pytest-temp')
    exit $LASTEXITCODE
} finally { Pop-Location }
