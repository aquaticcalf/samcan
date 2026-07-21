param(
    [string]$output = "",
    [int]$framerate = 12
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$build = Join-Path $root "build"
$capture_exe = Join-Path $build "visual-capture.exe"
New-Item -ItemType Directory -Force $build | Out-Null

if ($output -eq "") {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $output = Join-Path $build ("visual-test-" + $stamp)
} elseif (-not [System.IO.Path]::IsPathRooted($output)) {
    $output = Join-Path $root $output
}

New-Item -ItemType Directory -Force $output | Out-Null

Write-Host "building visual capture..."
& odin build (Join-Path $root "tests/visual_capture.odin") -file "-out:$capture_exe" -debug
if ($LASTEXITCODE -ne 0) {
    throw "visual capture build failed"
}

Write-Host "rendering visual frames..."
& $capture_exe $output
if ($LASTEXITCODE -ne 0) {
    throw "visual capture failed"
}

$ffmpeg_command = Get-Command ffmpeg -ErrorAction SilentlyContinue
if ($null -eq $ffmpeg_command) {
    Write-Warning "png frames written, but ffmpeg was not found"
    Write-Host "frames: $output"
    exit 0
}

$video = Join-Path $output "visual-test.mp4"
Write-Host "encoding video..."
& $ffmpeg_command.Source -y -hide_banner -loglevel warning `
    -framerate $framerate `
    -i (Join-Path $output "frame-%04d.png") `
    -c:v libx264 -pix_fmt yuv420p -movflags +faststart $video
if ($LASTEXITCODE -ne 0) {
    throw "ffmpeg video encoding failed"
}

Write-Host "frames: $output"
Write-Host "video:  $video"
