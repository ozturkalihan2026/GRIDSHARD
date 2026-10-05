[CmdletBinding()]
param([switch]$FullSuite)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskPgBin = 'C:\Program Files\PostgreSQL\16\bin'
foreach ($taskExecutable in @('initdb.exe', 'pg_ctl.exe', 'createdb.exe')) {
    if (!(Test-Path -LiteralPath (Join-Path $taskPgBin $taskExecutable))) {
        throw 'This isolated fixture runner requires local PostgreSQL 16 binaries.'
    }
}
$taskFixture = Join-Path $taskRoot ('artifacts\play-review-access\postgres-' + [guid]::NewGuid().ToString('N'))
if (Test-Path -LiteralPath $taskFixture) { throw 'Refusing to reuse a fixture directory.' }
New-Item -ItemType Directory -Path $taskFixture | Out-Null
$taskListener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$taskListener.Start()
$taskPort = $taskListener.LocalEndpoint.Port
$taskListener.Stop()
$taskPreviousUrl = [Environment]::GetEnvironmentVariable('GRIDSHARD_TEST_DATABASE_URL', 'Process')
$taskStarted = $false
function Invoke-TaskChecked([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Fixture command failed: $Executable ($LASTEXITCODE)" }
}
Push-Location $taskRoot
try {
    # A new disposable cluster; trust is limited to an unexposed loopback listener.
    Invoke-TaskChecked (Join-Path $taskPgBin 'initdb.exe') @('-D', "$taskFixture\data", '-U', 'postgres', '--auth=trust', '--encoding=UTF8', '--locale=C')
    Invoke-TaskChecked (Join-Path $taskPgBin 'pg_ctl.exe') @('-D', "$taskFixture\data", '-l', "$taskFixture\postgres.log", '-o', "-h 127.0.0.1 -p $taskPort", '-w', 'start')
    $taskStarted = $true
    Invoke-TaskChecked (Join-Path $taskPgBin 'createdb.exe') @('-h', '127.0.0.1', '-p', "$taskPort", '-U', 'postgres', 'gridshard_test')
    $env:GRIDSHARD_TEST_DATABASE_URL = "postgresql://postgres@127.0.0.1:$taskPort/gridshard_test"
    $taskTests = @('server/tests/test_review_access.py', 'server/tests/test_review_access_postgres.py')
    if ($FullSuite) { $taskTests = @('server/tests') }
    Invoke-TaskChecked 'python' (@('-m', 'pytest') + $taskTests + @('-q', '-p', 'no:cacheprovider'))
} finally {
    [Environment]::SetEnvironmentVariable('GRIDSHARD_TEST_DATABASE_URL', $taskPreviousUrl, 'Process')
    if ($taskStarted) {
        Invoke-TaskChecked (Join-Path $taskPgBin 'pg_ctl.exe') @('-D', "$taskFixture\data", '-m', 'fast', '-w', 'stop')
    }
    Pop-Location
}
