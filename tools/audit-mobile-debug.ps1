param(
    [string]$ApkPath = ".mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk"
)

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$distRoot = Join-Path $projectRoot "dist"
$expectedApk = [System.IO.Path]::GetFullPath((Join-Path $projectRoot ".mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk"))
$actualApk = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $ApkPath))
if ($actualApk -ne $expectedApk -or -not (Test-Path -LiteralPath $actualApk -PathType Leaf)) {
    throw "Yalnız yönetilen yerel debug APK'sı denetlenebilir: $expectedApk"
}
if (-not (Test-Path -LiteralPath $distRoot -PathType Container)) {
    throw "Önce mobil web paketini derleyin."
}

$archive = [System.IO.Compression.ZipFile]::OpenRead($actualApk)
try {
    $entries = @($archive.Entries | Where-Object { -not $_.FullName.EndsWith("/") })
    $names = @($entries | ForEach-Object FullName)
    $forbidden = @($names | Where-Object {
        $_ -match '(?i)(^|/)(tests?|__pycache__|node_modules|secrets?)(/|$)' -or
        $_ -match '(?i)\.(env|pem|key|p8|p12|jks|keystore|map)$' -or
        $_ -match '(?i)(google-services\.json|GoogleService-Info\.plist|client-build-manifest\.json|README|gridshard-store-icon-master|audio/mobile/manifest\.json)'
    })
    if ($forbidden.Count) { throw "APK içinde yasaklı dosyalar var: $($forbidden -join ', ')" }

    $webEntries = @($entries | Where-Object { $_.FullName.StartsWith("assets/public/") })
    $distFiles = @(Get-ChildItem -LiteralPath $distRoot -Recurse -File)
    $distNames = @($distFiles | ForEach-Object { $_.FullName.Substring($distRoot.Length + 1).Replace('\', '/') })
    $missing = @($distNames | Where-Object { "assets/public/$_" -notin $webEntries.FullName })
    $nativeRuntime = @("assets/public/cordova.js", "assets/public/cordova_plugins.js")
    $extra = @($webEntries.FullName | Where-Object { $_.Substring(14) -notin $distNames -and $_ -notin $nativeRuntime })
    if ($missing.Count -or $extra.Count) {
        throw "APK web içeriği derlemeyle eşleşmiyor. Eksik: $($missing -join ', '); fazlalık: $($extra -join ', ')"
    }

    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        foreach ($file in $distFiles) {
            $relative = $file.FullName.Substring($distRoot.Length + 1).Replace('\', '/')
            $entry = $archive.GetEntry("assets/public/$relative")
            $stream = $entry.Open()
            try { $apkHash = [Convert]::ToHexString($sha.ComputeHash($stream)) }
            finally { $stream.Dispose() }
            $sourceHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
            if ($apkHash -ne $sourceHash) { throw "APK içinde eski veya değişmiş web dosyası: $relative" }
        }
    } finally { $sha.Dispose() }

    function Read-ApkText([string]$name) {
        $entry = $archive.GetEntry($name)
        if ($null -eq $entry) { throw "APK içinde gerekli dosya yok: $name" }
        $reader = [System.IO.StreamReader]::new($entry.Open())
        try { return $reader.ReadToEnd() }
        finally { $reader.Dispose() }
    }
    $config = Read-ApkText "assets/capacitor.config.json" | ConvertFrom-Json
    if ($config.appId -ne "com.gridshard.localdebug" -or
        $config.android.path -ne ".mobile-debug/android" -or
        $config.android.allowMixedContent -ne $true -or
        $config.server.cleartext -ne $true) {
        throw "APK beklenen geçici debug kimliği ve ağ ayarlarını taşımıyor."
    }
    $bundle = @($webEntries | Where-Object { $_.FullName -match '^assets/public/bundles/gridshard-[a-f0-9]{16}\.js$' })
    if ($bundle.Count -ne 1) { throw "APK içinde tek bir derlenmiş JS bekleniyor." }
    $javascript = Read-ApkText $bundle[0].FullName
    if ($javascript -match '__GRIDSHARD_TEST_API|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|com\.example\.gridshard') {
        throw "APK JavaScript'i test kancası, eski kimlik veya özel anahtar içeriyor."
    }
    $runtime = Read-ApkText "assets/public/runtime-config.js"
    if ($runtime -notmatch '^globalThis\.GRIDSHARD_API_BASE_URL = "http://(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|127\.|localhost)') {
        throw "Yerel debug APK'sı özel ağdaki HTTP API adresini içermeli."
    }
    $manifestPath = Join-Path $projectRoot ".mobile-debug/android/app/build/intermediates/merged_manifest/debug/processDebugMainManifest/AndroidManifest.xml"
    $manifest = Get-Content -LiteralPath $manifestPath -Raw
    if ($manifest -notmatch 'package="com\.gridshard\.localdebug"' -or
        $manifest -notmatch 'android:allowBackup="false"' -or
        $manifest -notmatch 'android:usesCleartextTraffic="true"') {
        throw "Birleşik Android manifestinde debug kimliği veya güvenlik ayarı yanlış."
    }
    Write-Output "APK paket denetimi geçti: $($webEntries.Count) web dosyası, yasaklı dosya yok, kimlik ve yerel API doğru."
} finally {
    $archive.Dispose()
}
