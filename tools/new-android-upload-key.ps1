[CmdletBinding()]
param([string]$Keytool = 'C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskKeyDirectory = Join-Path $taskRoot 'secrets\android-release'
$taskKeyFile = Join-Path $taskKeyDirectory 'gridshard-upload.p12'
$taskCredentialFile = Join-Path $taskKeyDirectory 'credential.dpapi.xml'
if (Test-Path -LiteralPath $taskKeyDirectory) { throw 'Key directory already exists. Never regenerate or overwrite the permanent key.' }
if (!(Test-Path -LiteralPath $Keytool -PathType Leaf)) { throw 'Java keytool unavailable.' }
New-Item -ItemType Directory -Path $taskKeyDirectory | Out-Null
$taskAcl = New-Object System.Security.AccessControl.DirectorySecurity
$taskAcl.SetAccessRuleProtection($true, $false)
foreach ($taskSid in @([System.Security.Principal.WindowsIdentity]::GetCurrent().User,
    [System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'),
    [System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))) {
    $taskAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($taskSid,
        'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
}
Set-Acl -LiteralPath $taskKeyDirectory -AclObject $taskAcl
$taskRandom = New-Object byte[] 48
$taskRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$taskRng.GetBytes($taskRandom)
$taskPassword = [Convert]::ToBase64String($taskRandom)
$taskSecurePassword = ConvertTo-SecureString $taskPassword -AsPlainText -Force
# DPAPI is bound to this Windows user; this is not a portable/off-machine backup.
[System.Management.Automation.PSCredential]::new('gridshard-upload',$taskSecurePassword) | Export-Clixml -LiteralPath $taskCredentialFile
try {
    $env:GRIDSHARD_KEYTOOL_PASSWORD = $taskPassword
    # keytool writes normal progress to stderr; suppress it without treating
    # that stream as a PowerShell terminating error. Exit status is checked.
    $ErrorActionPreference = 'Continue'
    & $Keytool -genkeypair -keystore $taskKeyFile -storetype PKCS12 -alias gridshard-upload `
        -keyalg RSA -keysize 3072 -sigalg SHA256withRSA -validity 10000 -dname 'CN=GRIDSHARD Upload' `
        -storepass:env GRIDSHARD_KEYTOOL_PASSWORD -keypass:env GRIDSHARD_KEYTOOL_PASSWORD 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Upload key generation failed; preserve partial directory for review.' }
    $taskCertificateFile = Join-Path $taskKeyDirectory 'upload-certificate.der'
    & $Keytool -exportcert -keystore $taskKeyFile -alias gridshard-upload `
        -storepass:env GRIDSHARD_KEYTOOL_PASSWORD -file $taskCertificateFile 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Public certificate export failed.' }
    $ErrorActionPreference = 'Stop'
    $taskCertificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($taskCertificateFile)
    $taskSha256 = [System.Security.Cryptography.SHA256]::Create()
    $taskDigest = [BitConverter]::ToString($taskSha256.ComputeHash($taskCertificate.RawData)).Replace('-',':')
    $taskSha256.Dispose()
    [ordered]@{package_name='com.gridshardgame.app';alias='gridshard-upload';
        sha1=([BitConverter]::ToString($taskCertificate.GetCertHash()).Replace('-',':'));
        sha256=$taskDigest;expires_utc=$taskCertificate.NotAfter.ToUniversalTime().ToString('o');
        portable_backup_completed=$false} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskKeyDirectory 'public-certificate.json') -Encoding UTF8
    Write-Output 'Permanent RSA3072 upload key created. Password not printed; DPAPI-bound credential saved. Portable backup still required.'
} finally {
    Remove-Item Env:\GRIDSHARD_KEYTOOL_PASSWORD -ErrorAction SilentlyContinue
    $taskPassword = $null
    [Array]::Clear($taskRandom,0,$taskRandom.Length)
    $taskRng.Dispose()
    $taskSecurePassword.Dispose()
}
