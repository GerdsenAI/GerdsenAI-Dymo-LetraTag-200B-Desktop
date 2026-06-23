# Assembles a portable Windows build: the app executable + the frozen sidecar in
# one folder (no installer), zipped under release/. Run AFTER:
#   scripts\build-sidecar.ps1   (or scripts/build_sidecar.py)
#   npm run tauri build -- --bundles nsis
#
# The portable build needs the Microsoft Edge WebView2 Runtime, which ships with
# Windows 11 and current Windows 10. Everything else travels in the folder.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$triple = (rustc -Vv | Select-String "^host:").ToString().Split(" ")[1].Trim()

$rel = Join-Path $root "src-tauri\target\release"
$exe = Get-ChildItem $rel -Filter "label-studio.exe" -File -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $exe) { throw "App exe not found in $rel — run 'npm run tauri build' first." }

$sidecar = Join-Path $root "src-tauri\binaries\dymo-sidecar-$triple.exe"
if (-not (Test-Path $sidecar)) { throw "Sidecar not found: $sidecar — run scripts\build-sidecar.ps1 first." }

$stage = Join-Path $root "release\LabelStudio-portable"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Copy-Item $exe.FullName (Join-Path $stage "Label Studio.exe")
Copy-Item $sidecar (Join-Path $stage "dymo-sidecar.exe")

$zip = Join-Path $root "release\LabelStudio-portable-win64.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip
Write-Output "Portable -> $zip"
