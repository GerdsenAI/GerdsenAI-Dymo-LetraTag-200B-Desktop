# Freezes the Python sidecar (engine/dymo_bluetooth/sidecar.py) into a single
# self-contained binary and places it where Tauri expects an external binary:
#   src-tauri/binaries/dymo-sidecar-<target-triple>[.exe]
#
# Run on each target OS (PyInstaller cannot cross-compile). Requires the engine
# venv (engine/.venv) with bleak, pillow, python-barcode and pyinstaller.

param([string]$Triple = "")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$engine = Join-Path $root "engine"
$py = Join-Path $engine ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) { $py = Join-Path $engine ".venv/bin/python" }

if (-not $Triple) {
    $hostLine = (rustc -Vv | Select-String "^host:").ToString()
    $Triple = $hostLine.Split(" ")[1].Trim()
}
Write-Output "Target triple: $Triple"

$work = Join-Path $env:TEMP "dymo-sidecar-build"
if (Test-Path $work) { Remove-Item -Recurse -Force $work }
New-Item -ItemType Directory -Force -Path $work | Out-Null

& $py -m PyInstaller --noconfirm --onefile --console --name dymo-sidecar `
    --collect-all bleak `
    --collect-submodules dymo_bluetooth `
    --hidden-import PIL.Image --hidden-import PIL.ImageChops `
    --paths $engine `
    --distpath (Join-Path $work "dist") --workpath (Join-Path $work "build") --specpath $work `
    (Join-Path $engine "dymo_bluetooth\sidecar.py")
if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed ($LASTEXITCODE)" }

$ext = if ($IsWindows -or $env:OS -eq "Windows_NT") { ".exe" } else { "" }
$src = Join-Path $work "dist/dymo-sidecar$ext"
$dstDir = Join-Path $root "src-tauri/binaries"
New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
$dst = Join-Path $dstDir "dymo-sidecar-$Triple$ext"
Copy-Item $src $dst -Force
Write-Output "Sidecar -> $dst ($([math]::Round((Get-Item $dst).Length/1MB,1)) MB)"
