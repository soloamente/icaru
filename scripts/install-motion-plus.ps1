# Install motion-plus by downloading the tarball with Invoke-WebRequest, then adding from file.
# Requires $env:MOTION_TOKEN (e.g. set from .env or run: $env:MOTION_TOKEN = "your-token").
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$outFile = Join-Path $root "scripts\motion-plus.tgz"

if (-not $env:MOTION_TOKEN) {
  # Try loading from .env
  $envPath = Join-Path $root ".env"
  if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
      if ($_ -match '^\s*MOTION_TOKEN\s*=\s*(.+)\s*$') { $env:MOTION_TOKEN = $Matches[1].Trim().Trim('"', "'") }
    }
  }
}
if (-not $env:MOTION_TOKEN) {
  Write-Error "Set MOTION_TOKEN (e.g. in .env or `$env:MOTION_TOKEN = 'your-token')"
  exit 1
}

$version = "2.8.0"
$url = "https://api.motion.dev/registry.tgz?package=motion-plus&version=$version&token=$($env:MOTION_TOKEN)"
Write-Host "Downloading motion-plus@$version..."
Invoke-WebRequest -Uri $url -OutFile $outFile -UseBasicParsing
Write-Host "Saved to $outFile"
# Point package.json at the local tarball so bun install does not hit the registry
$pkgPath = Join-Path $root "package.json"
(Get-Content $pkgPath -Raw) -replace '"motion-plus":\s*"[^"]*"', '"motion-plus": "file:./scripts/motion-plus.tgz"' | Set-Content $pkgPath -NoNewline
Push-Location $root
try {
  bun install
} finally {
  Pop-Location
}
Write-Host "Done."
