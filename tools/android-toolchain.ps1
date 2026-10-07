# Resolve a machine-local JDK/SDK without installing tools or changing PATH.
function Resolve-GridshardAndroidToolchain {
    [CmdletBinding()]
    param([string]$JavaHome, [string]$AndroidSdkRoot, [string]$BuildToolsVersion = '36.0.0')
    if (!$JavaHome) {
        $JavaHome = $env:JAVA_HOME
        if (!$JavaHome) { $JavaHome = Join-Path $env:ProgramFiles 'Android\Android Studio\jbr' }
    }
    if (!$AndroidSdkRoot) {
        $AndroidSdkRoot = $env:ANDROID_HOME
        if (!$AndroidSdkRoot) { $AndroidSdkRoot = $env:ANDROID_SDK_ROOT }
        if (!$AndroidSdkRoot) { $AndroidSdkRoot = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
    }
    if ($BuildToolsVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid Android build-tools version.' }
    foreach ($taskJavaTool in @('java.exe', 'javac.exe', 'keytool.exe', 'jarsigner.exe')) {
        if (!(Test-Path -LiteralPath (Join-Path $JavaHome "bin\$taskJavaTool") -PathType Leaf)) {
            throw 'JDK 21 is unavailable. Pass -JavaHome or set JAVA_HOME to an installed JDK; Java 8 is not sufficient.'
        }
    }
    $taskRelease = Join-Path $JavaHome 'release'
    if (!(Test-Path -LiteralPath $taskRelease -PathType Leaf)) { throw 'JDK release metadata is unavailable.' }
    $taskReleaseText = Get-Content -LiteralPath $taskRelease -Raw
    $taskJavaVersion = [regex]::Match($taskReleaseText, '(?m)^JAVA_VERSION="(\d+)')
    if (!$taskJavaVersion.Success -or [int]$taskJavaVersion.Groups[1].Value -lt 21) { throw 'JDK 21 or newer is required.' }
    $taskBuildTools = Join-Path $AndroidSdkRoot "build-tools\$BuildToolsVersion"
    foreach ($taskAndroidTool in @('apksigner.bat', 'aapt.exe')) {
        if (!(Test-Path -LiteralPath (Join-Path $taskBuildTools $taskAndroidTool) -PathType Leaf)) {
            throw "Android build-tools $BuildToolsVersion unavailable. Pass -AndroidSdkRoot or set ANDROID_HOME."
        }
    }
    if (!(Test-Path -LiteralPath (Join-Path $AndroidSdkRoot 'platforms\android-36\android.jar') -PathType Leaf)) {
        throw 'Android SDK platform 36 is unavailable.'
    }
    [pscustomobject]@{
        JavaHome = (Resolve-Path -LiteralPath $JavaHome).Path
        AndroidSdkRoot = (Resolve-Path -LiteralPath $AndroidSdkRoot).Path
        Keytool = Join-Path $JavaHome 'bin\keytool.exe'
        JarSigner = Join-Path $JavaHome 'bin\jarsigner.exe'
        ApkSigner = Join-Path $taskBuildTools 'apksigner.bat'
        Aapt = Join-Path $taskBuildTools 'aapt.exe'
    }
}
