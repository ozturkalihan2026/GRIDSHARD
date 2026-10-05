param([Parameter(Mandatory = $true)][string]$Directory)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'This credential vault tool requires Windows DPAPI.' }
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$privateRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'secrets')) + [IO.Path]::DirectorySeparatorChar
$destination = [IO.Path]::GetFullPath($Directory)
if (-not $destination.StartsWith($privateRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Use a NEW directory inside the ignored project secrets directory.'
}
if (Test-Path -LiteralPath $destination) { throw 'Destination exists; no credentials were overwritten.' }
New-Item -ItemType Directory -Path $destination | Out-Null
$principal = [Security.Principal.WindowsIdentity]::GetCurrent().Name
# Protect verifier and encrypted vault from other local users; no Everyone grant.
& icacls.exe $destination /inheritance:r /grant:r ('{0}:(OI)(CI)F' -f $principal) | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Private directory ACL could not be applied.' }
function New-RandomBytes([int]$Length) {
    $bytes = New-Object byte[] $Length
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ,$bytes
}
function As-Hex([byte[]]$Bytes) { return ([BitConverter]::ToString($Bytes)).Replace('-', '').ToLowerInvariant() }
$password = [Convert]::ToBase64String((New-RandomBytes 32)).TrimEnd('=').Replace('+','-').Replace('/','_')
$salt = New-RandomBytes 32
$derivation = New-Object Security.Cryptography.Rfc2898DeriveBytes(
    [Text.Encoding]::UTF8.GetBytes($password), $salt, 600000, [Security.Cryptography.HashAlgorithmName]::SHA256)
try { $verifier = As-Hex ($derivation.GetBytes(32)) } finally { $derivation.Dispose() }
$username = 'PlayReview-' + (As-Hex (New-RandomBytes 6))
$config = [ordered]@{
    schema_version = 1; username = $username
    player_id = 'review-' + (As-Hex (New-RandomBytes 16))
    owner_id = As-Hex (New-RandomBytes 32)
    salt = As-Hex $salt; verifier = $verifier
}
$encoding = New-Object Text.UTF8Encoding($false)
$credential = New-Object Management.Automation.PSCredential($username, (ConvertTo-SecureString $password -AsPlainText -Force))
$credential | Export-Clixml -LiteralPath (Join-Path $destination 'credential.dpapi.xml')
[IO.File]::WriteAllText((Join-Path $destination 'review-config.json'), ($config | ConvertTo-Json), $encoding)
$password = $null
Write-Output "Private verifier and Windows-user encrypted credentials prepared in: $destination"
Write-Output 'No server account created, no runtime enabled, no password printed. Back up the vault securely; DPAPI is tied to this Windows user/computer.'
