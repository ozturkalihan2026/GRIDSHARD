param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$uiRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot 'client/assets/ui')).Path
$qaRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot 'qa_reports')).Path
$archiveRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'artifacts/asset-archive-20261015'))
if (-not $archiveRoot.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Archive escaped project' }

# Never follow directory junctions, including inside an otherwise valid root.
foreach ($root in @($uiRoot, $qaRoot)) {
  if ((Get-Item -LiteralPath $root).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked root: $root" }
  $links = @(Get-ChildItem -LiteralPath $root -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })
  if ($links.Count) { throw 'Linked source found; manual audit required' }
}
$files = @(Get-ChildItem -LiteralPath $uiRoot,$qaRoot -Recurse -File -Force)
$beforeBytes = ($files | Measure-Object Length -Sum).Sum
$html = Get-Content -LiteralPath (Join-Path $projectRoot 'client/index.html') -Raw
$css = Get-Content -LiteralPath (Join-Path $projectRoot 'client/src/canon.css') -Raw
$app = Get-Content -LiteralPath (Join-Path $projectRoot 'client/src/app.js') -Raw
$runtimeReferences = @{}
foreach ($match in [regex]::Matches($html + $css + $app, 'assets/ui/[a-zA-Z0-9_./-]+\.(?:webp|png|svg|jpg|jpeg)')) {
  $runtimeReferences['client/' + $match.Value] = $true
}
$plan = @(
  foreach ($file in $files) {
    $absolute = [IO.Path]::GetFullPath($file.FullName)
    if (-not ($absolute.StartsWith($uiRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or $absolute.StartsWith($qaRoot + '\', [StringComparison]::OrdinalIgnoreCase))) { throw "Out-of-scope source: $absolute" }
    $relative = $absolute.Substring($projectRoot.Length + 1).Replace('\','/')
    $reason = $null
    if ($relative -match '^client/assets/ui/(chests-casual-v1|chests-painted-v1|dock-painted-v1)/') { $reason = 'Retired design; no runtime references' }
    elseif ($relative -match '^client/assets/ui/dock-casual-v1/(shop|battle)\.webp$') { $reason = 'Superseded by chamfer shop / crossed swords' }
    elseif ($relative -match '^qa_reports/(chests-casual-pilot-20261014|chests-chamfer-pilot-20261015|visual-atmosphere-20261014)/') { $reason = 'Historical visual pilot output' }
    elseif ($file.Extension -eq '.png') { $reason = if ($relative.StartsWith('client/')) { 'High-resolution authoring master; runtime WebP retained' } else { 'Generated artwork master or historical screenshot' } }
    if (-not $reason) { continue }
    if ($runtimeReferences.ContainsKey($relative)) { throw "Refusing to archive referenced game asset: $relative" }
    [pscustomobject]@{ path=$relative; bytes=$file.Length; sha256=(Get-FileHash -LiteralPath $absolute -Algorithm SHA256).Hash.ToLowerInvariant(); reason=$reason }
  }
)
$removedBytes = ($plan | Measure-Object bytes -Sum).Sum
if (-not $Apply) {
  [pscustomobject]@{ files=$plan.Count; bytes=$removedBytes; beforeBytes=$beforeBytes; archive=$archiveRoot; paths=$plan.path } | ConvertTo-Json -Depth 4
  return
}
if (Test-Path -LiteralPath $archiveRoot) { throw 'Archive already exists; do not overwrite recovery material' }
# Confirm archive content cannot accidentally become part of the next commit.
$ignored = & git -C $projectRoot check-ignore 'artifacts/asset-archive-20261015/manifest.json'
if ($LASTEXITCODE -ne 0 -or -not $ignored) { throw 'Archive must be gitignored' }
New-Item -ItemType Directory -Path $archiveRoot | Out-Null

# Copy and hash-verify ALL files before removing ANY originals.
foreach ($entry in $plan) {
  $source = Join-Path $projectRoot $entry.path
  $target = [IO.Path]::GetFullPath((Join-Path $archiveRoot $entry.path))
  if (-not $target.StartsWith($archiveRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "Invalid archive destination: $target" }
  New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($target)) -Force | Out-Null
  Copy-Item -LiteralPath $source -Destination $target
  if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw "Backup mismatch: $target" }
}
$report = [ordered]@{ date='2026-10-15'; archive='artifacts/asset-archive-20261015'; archivedCount=$plan.Count; archivedBytes=$removedBytes; beforeBytes=$beforeBytes; remainingBytes=($beforeBytes - $removedBytes); files=$plan }
$json = $report | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText((Join-Path $archiveRoot 'manifest.json'), $json, [Text.UTF8Encoding]::new($false))
foreach ($entry in $plan) {
  $source = [IO.Path]::GetFullPath((Join-Path $projectRoot $entry.path))
  # Exact files, no wildcard/recursive deletion, and recheck changed sources.
  if (-not ($source.StartsWith($uiRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or $source.StartsWith($qaRoot + '\', [StringComparison]::OrdinalIgnoreCase))) { throw "Invalid removal: $source" }
  if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw "Source changed during cleanup: $source" }
  Remove-Item -LiteralPath $source
}
[IO.File]::WriteAllText((Join-Path $qaRoot 'asset-cleanup-20261015.json'), $json, [Text.UTF8Encoding]::new($false))
[pscustomobject]@{ archivedCount=$plan.Count; archivedBytes=$removedBytes; remainingBytes=($beforeBytes - $removedBytes); archive=$archiveRoot } | ConvertTo-Json
