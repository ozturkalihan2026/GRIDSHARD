param(
    [string]$ApkPath = ".mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk",
    [string]$ExpectedApiBaseUrl = "",
    [string]$ExpectedPlayGamesId = "",
    [string]$ExpectedPlayGamesServerClientId = "",
    [string]$ExpectedAdMobAppId = "",
    [ValidateSet("", "test", "ump-only")][string]$ExpectedAdMobMode = "",
    [switch]$RemoteDebug
)

$ErrorActionPreference = "Stop"
if ([bool]$ExpectedAdMobAppId -ne [bool]$ExpectedAdMobMode -or
    ($ExpectedAdMobAppId -and (-not $RemoteDebug -or $ExpectedAdMobAppId -notmatch '^ca-app-pub-[0-9]{16}~[0-9]{10}$'))) {
    throw "Publisher AdMob denetimi yalnız açık uzak debug modu ve beklenen test/UMP modu ile yapılabilir."
}
if ([bool]$ExpectedPlayGamesId -ne [bool]$ExpectedPlayGamesServerClientId -or
    ($ExpectedPlayGamesId -and ($ExpectedPlayGamesId -notmatch '^[0-9]{5,24}$' -or
        $ExpectedPlayGamesServerClientId -notmatch '^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$'))) {
    throw "Play Games denetimi için iki geçerli public kimlik birlikte verilmelidir."
}
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$distRoot = Join-Path $projectRoot "dist"
$nativeRelative = if ($RemoteDebug) { ".mobile-debug/remote-android" } else { ".mobile-debug/android" }
$expectedAppId = if ($RemoteDebug) { "com.gridshard.remotedebug" } else { "com.gridshard.localdebug" }
$expectedApk = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "$nativeRelative/app/build/outputs/apk/debug/app-debug.apk"))
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
        $_ -match '(?i)(google-services\.json|GoogleService-Info\.plist|client_secret.*\.json|(?:google|apple)_oauth_client_secret|play_games_client_secret|client-build-manifest\.json|README|gridshard-store-icon-master|audio/mobile/manifest\.json)'
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
    if ($config.appId -ne $expectedAppId -or
        $config.android.path -ne $nativeRelative -or
        $config.server.androidScheme -ne "https" -or
        $config.server.url -or
        $config.plugins.SystemBars.hidden -ne $true -or
        $config.plugins.SystemBars.insetsHandling -ne "disable") {
        throw "APK beklenen geçici kimlik, paket içi web içeriği veya tam ekran ayarını taşımıyor."
    }
    $bundle = @($webEntries | Where-Object { $_.FullName -match '^assets/public/bundles/gridshard-[a-f0-9]{16}\.js$' })
    if ($bundle.Count -ne 1) { throw "APK içinde tek bir derlenmiş JS bekleniyor." }
    $javascript = Read-ApkText $bundle[0].FullName
    if ($javascript -match '__GRIDSHARD_TEST_API|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|com\.example\.gridshard') {
        throw "APK JavaScript'i test kancası, eski kimlik veya özel anahtar içeriyor."
    }
    $runtime = Read-ApkText "assets/public/runtime-config.js"
    if ($runtime -notmatch '^globalThis\.GRIDSHARD_API_BASE_URL = ("[^"\r\n]+");\r?\n?$') {
        throw "APK çalışma zamanı API yapılandırması beklenen biçimde değil."
    }
    $apiBase = $Matches[1] | ConvertFrom-Json
    $apiUri = [uri]$apiBase
    if (-not $apiUri.IsAbsoluteUri -or $apiUri.UserInfo -or $apiUri.Query -or $apiUri.Fragment) {
        throw "APK API adresi mutlak olmalı ve kimlik bilgisi/sorgu/fragment içermemeli."
    }
    if ($ExpectedApiBaseUrl -and $apiBase.TrimEnd('/') -cne $ExpectedApiBaseUrl.TrimEnd('/')) {
        throw "APK, bu deneme için seçilen API adresini taşımıyor."
    }
    $plainHttp = $apiUri.Scheme -eq "http"
    $privateHost = $apiUri.Host -in @("localhost", "[::1]")
    [System.Net.IPAddress]$parsedAddress = $null
    if ([System.Net.IPAddress]::TryParse($apiUri.Host, [ref]$parsedAddress) -and
        $parsedAddress.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork) {
        $octets = $parsedAddress.GetAddressBytes()
        $privateHost = $octets[0] -in @(10, 127) -or
            ($octets[0] -eq 192 -and $octets[1] -eq 168) -or
            ($octets[0] -eq 172 -and $octets[1] -ge 16 -and $octets[1] -le 31)
    }
    if (($apiUri.Scheme -ne "https" -and -not ($plainHttp -and $privateHost)) -or
        ($RemoteDebug -and $plainHttp) -or
        $config.android.allowMixedContent -ne $plainHttp -or
        $config.server.cleartext -ne $plainHttp) {
        throw "APK ağ politikası API ile eşleşmiyor; uzak test yalnız HTTPS ve karma içerik kapalı olmalı."
    }
    $manifestPath = Join-Path $projectRoot "$nativeRelative/app/build/intermediates/merged_manifest/debug/processDebugMainManifest/AndroidManifest.xml"
    $manifest = Get-Content -LiteralPath $manifestPath -Raw
    if ($manifest -notmatch ('package="' + [regex]::Escape($expectedAppId) + '"') -or
        $manifest -notmatch 'android:allowBackup="false"' -or
        $manifest -notmatch ('android:usesCleartextTraffic="' + $plainHttp.ToString().ToLowerInvariant() + '"') -or
        $manifest -match 'android:networkSecurityConfig=') {
        throw "Birleşik Android manifestinde debug kimliği veya güvenlik ayarı yanlış."
    }
    [xml]$manifestXml = $manifest
    $androidNamespace = "http://schemas.android.com/apk/res/android"
    $adMobIds = @($manifestXml.manifest.application.'meta-data' | Where-Object {
        $_.GetAttribute("name", $androidNamespace) -eq "com.google.android.gms.ads.APPLICATION_ID"
    })
    if ($adMobIds.Count -ne 1 -or
        $adMobIds[0].GetAttribute("value", $androidNamespace) -ne $(if ($ExpectedAdMobAppId) { $ExpectedAdMobAppId } else { "ca-app-pub-3940256099942544~3347511713" })) {
        throw "Debug APK AdMob uygulama kimliği açıkça beklenen demo/publisher kimliğiyle eşleşmiyor."
    }
    $adMeasurement = @($manifestXml.manifest.application.'meta-data' | Where-Object {
        $_.GetAttribute("name", $androidNamespace) -eq "com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT"
    })
    if ($adMeasurement.Count -ne 1 -or $adMeasurement[0].GetAttribute("value", $androidNamespace) -ne "true") {
        throw "Reklam ölçümü UMP/çocuk ayarlarından önce başlatılmamalı."
    }
    $adPermissions = @("com.google.android.gms.permission.AD_ID", "android.permission.ACCESS_ADSERVICES_AD_ID",
        "android.permission.ACCESS_ADSERVICES_ATTRIBUTION", "android.permission.ACCESS_ADSERVICES_TOPICS")
    foreach ($permission in $manifestXml.manifest.'uses-permission') {
        if ($permission.GetAttribute("name", $androidNamespace) -in $adPermissions) {
            throw "Çocuk/unknown debug APK reklam kimliği/AdServices izni taşımamalı."
        }
    }
    $nativeAdResource = Join-Path $projectRoot "$nativeRelative/app/src/main/res/values/gridshard_ad_safety.xml"
    [xml]$adConfigXml = Get-Content -LiteralPath $nativeAdResource -Raw
    $expectedMode = if ($ExpectedAdMobMode) { $ExpectedAdMobMode } else { "disabled" }
    $modeResource = @($adConfigXml.resources.string | Where-Object name -EQ "gridshard_ad_mode")
    $deviceResource = @($adConfigXml.resources.string | Where-Object name -EQ "gridshard_ad_test_devices")
    if ($modeResource.Count -ne 1 -or $modeResource[0].InnerText -ne $expectedMode -or
        $deviceResource.Count -ne 1 -or
        ($expectedMode -eq "test" -and $deviceResource[0].InnerText -notmatch '^[A-F0-9]{32}(,[A-F0-9]{32}){0,7}$') -or
        ($expectedMode -ne "test" -and $deviceResource[0].InnerText)) {
        throw "Native test cihazı kaynakları beklenen fail-closed moduyla eşleşmiyor."
    }
    if ($ExpectedPlayGamesId) {
        $metadata = @($manifestXml.manifest.application.'meta-data')
        $gameIds = @($metadata | Where-Object { $_.GetAttribute("name", $androidNamespace) -eq "com.google.android.gms.games.APP_ID" })
        $manualCreation = @($metadata | Where-Object { $_.GetAttribute("name", $androidNamespace) -eq "com.google.android.gms.games.SUPPRESS_GAME_PROFILE_CREATION" })
        if ($manifestXml.manifest.application.GetAttribute("name", $androidNamespace) -ne "com.gridshard.nativeui.GridshardApplication" -or
            $gameIds.Count -ne 1 -or $gameIds[0].GetAttribute("value", $androidNamespace) -ne "@string/gridshard_play_games_id" -or
            $manualCreation.Count -ne 1 -or $manualCreation[0].GetAttribute("value", $androidNamespace) -ne "true") {
            throw "Play Games başlatıcısı, oyun metadata'sı veya açık profil oluşturma politikası yanlış."
        }
        $resource = $archive.GetEntry("resources.arsc")
        if ($null -eq $resource) { throw "APK derlenmiş Android kaynakları eksik." }
        $resourceStream = $resource.Open()
        $resourceMemory = [System.IO.MemoryStream]::new()
        try {
            $resourceStream.CopyTo($resourceMemory)
            $bytes = $resourceMemory.ToArray()
            $texts = @([System.Text.Encoding]::UTF8.GetString($bytes), [System.Text.Encoding]::Unicode.GetString($bytes))
            $expectedNativeResources = @($ExpectedPlayGamesId, $ExpectedPlayGamesServerClientId, "gridshard_ad_mode", $expectedMode)
            if ($ExpectedAdMobAppId) { $expectedNativeResources += $ExpectedAdMobAppId }
            foreach ($publicId in $expectedNativeResources) {
                if (-not ($texts[0].Contains($publicId) -or $texts[1].Contains($publicId))) {
                    throw "APK derlenmiş kaynaklarında beklenen Play Games public kimliği yok."
                }
            }
        } finally { $resourceStream.Dispose(); $resourceMemory.Dispose() }
    }
    $plugins = @(Read-ApkText "assets/capacitor.plugins.json" | ConvertFrom-Json)
    if (@($plugins | Where-Object classpath -EQ "com.aparajita.capacitor.securestorage.SecureStorage").Count -ne 1) {
        throw "APK içinde gerekli güvenli cihaz deposu native köprüsü kayıtlı değil."
    }
    if ($RemoteDebug) {
        foreach ($className in @("com.capacitorjs.plugins.app.AppPlugin", "com.capacitorjs.plugins.browser.BrowserPlugin")) {
            if (@($plugins | Where-Object classpath -EQ $className).Count -ne 1) {
                throw "APK içinde gerekli OAuth native köprüsü kayıtlı değil: $className"
            }
        }
        $mainActivity = @($manifestXml.manifest.application.activity | Where-Object {
            $_.GetAttribute("name", $androidNamespace) -eq "com.gridshard.remotedebug.MainActivity"
        })
        if ($mainActivity.Count -ne 1) { throw "OAuth MainActivity manifest kaydı bulunamadı." }
        $filters = @($mainActivity[0].'intent-filter' | Where-Object {
            $_.GetAttribute("autoVerify", $androidNamespace) -eq "true"
        })
        if ($filters.Count -ne 1) { throw "Tek bir doğrulanmış OAuth HTTPS App Link filtresi gerekli." }
        $dataNodes = @($filters[0].data)
        if ($dataNodes.Count -ne 1 -or
            $dataNodes[0].GetAttribute("scheme", $androidNamespace) -ne "https" -or
            $dataNodes[0].GetAttribute("host", $androidNamespace) -ne $apiUri.Host -or
            $dataNodes[0].GetAttribute("path", $androidNamespace) -ne "/native-auth/android-test" -or
            $dataNodes[0].HasAttribute("pathPrefix", $androidNamespace) -or
            $dataNodes[0].HasAttribute("pathPattern", $androidNamespace)) {
            throw "OAuth bağlantısı API kökenine ve yalnız test dönüş yoluna sınırlandırılmalı."
        }
        $actionNames = @($filters[0].action | ForEach-Object { $_.GetAttribute("name", $androidNamespace) })
        $categoryNames = @($filters[0].category | ForEach-Object { $_.GetAttribute("name", $androidNamespace) })
        if ("android.intent.action.VIEW" -notin $actionNames -or
            "android.intent.category.DEFAULT" -notin $categoryNames -or
            "android.intent.category.BROWSABLE" -notin $categoryNames) { throw "OAuth App Link eylem/kategorileri eksik." }
    }
    $secureStorageCompiled = $false
    $nativeDisplayCompiled = $false
    $appCompiled = $false
    $browserCompiled = $false
    $playGamesCompiled = $false
    $playGamesApplicationCompiled = $false
    $playGamesSdkCompiled = $false
    $adSafetyCompiled = $false
    foreach ($entry in ($entries | Where-Object FullName -Match '^classes\d*\.dex$')) {
        $stream = $entry.Open()
        $memory = [System.IO.MemoryStream]::new()
        try {
            $stream.CopyTo($memory)
            $dexText = [System.Text.Encoding]::UTF8.GetString($memory.ToArray())
            if ($dexText.Contains("Lcom/aparajita/capacitor/securestorage/SecureStorage;")) { $secureStorageCompiled = $true }
            if ($dexText.Contains("Lcom/gridshard/nativeui/GridshardActivity;")) { $nativeDisplayCompiled = $true }
            if ($dexText.Contains("Lcom/capacitorjs/plugins/app/AppPlugin;")) { $appCompiled = $true }
            if ($dexText.Contains("Lcom/capacitorjs/plugins/browser/BrowserPlugin;")) { $browserCompiled = $true }
            if ($dexText.Contains("Lcom/gridshard/nativeui/GridshardPlayGames;")) { $playGamesCompiled = $true }
            if ($dexText.Contains("Lcom/gridshard/nativeui/GridshardApplication;")) { $playGamesApplicationCompiled = $true }
            if ($dexText.Contains("Lcom/google/android/gms/games/PlayGames;")) { $playGamesSdkCompiled = $true }
            if ($dexText.Contains("Lcom/gridshard/nativeui/GridshardAdSafety;")) { $adSafetyCompiled = $true }
        } finally { $stream.Dispose(); $memory.Dispose() }
    }
    if (-not $secureStorageCompiled) { throw "Güvenli cihaz deposunun Android sınıfı APK'da derlenmemiş." }
    if (-not $nativeDisplayCompiled) { throw "Sabit güvenli alan/tam ekran etkinliği APK'da derlenmemiş." }
    if (-not $adSafetyCompiled) { throw "Native reklam test cihazı kapısı APK'da derlenmemiş." }
    if ($RemoteDebug -and (-not $appCompiled -or -not $browserCompiled)) { throw "OAuth App/Browser sınıfları APK'da derlenmemiş." }
    if ($ExpectedPlayGamesId -and (-not $playGamesCompiled -or -not $playGamesApplicationCompiled -or -not $playGamesSdkCompiled)) {
        throw "Play Games native köprüsü/başlatıcısı/resmî SDK sınıfları APK'da derlenmemiş."
    }
    Write-Output "APK paket denetimi geçti: $($webEntries.Count) web dosyası, yasaklı dosya yok, geçici kimlik/API/ağ politikası ve güvenli depo köprüsü doğru."
} finally {
    $archive.Dispose()
}
