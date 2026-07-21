$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $root "build"
$odin_root = (odin root).Trim()

New-Item -ItemType Directory -Force -Path $out | Out-Null

odin build (Join-Path $root "src") `
    -out:(Join-Path $out "samcan.exe") `
    -debug

if ($LASTEXITCODE -ne 0) {
    throw "odin build failed with exit code $LASTEXITCODE"
}

Copy-Item `
    -LiteralPath (Join-Path $odin_root "vendor\sdl3\SDL3.dll") `
    -Destination (Join-Path $out "SDL3.dll") `
    -Force

Write-Output "built $out\samcan.exe"
