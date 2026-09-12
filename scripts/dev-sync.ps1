# RepoCensus dev-sync — sync local copy with remote main
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev-sync.ps1 [-Dest F:\path\to\repocensus]
# Downloads the repo tarball via codeload (works where git clone is blocked),
# mirrors it into the destination while preserving node_modules and .git.
param(
  [string]$Dest = (Get-Location).Path
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$tmp = Join-Path $env:TEMP ("repocensus-sync-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

try {
  Write-Host "⬇️  Downloading tarball..."
  $tgz = Join-Path $tmp "repo.tar.gz"
  Invoke-WebRequest -Uri "https://codeload.github.com/Leoli04/repocensus/tar.gz/refs/heads/main" -OutFile $tgz -TimeoutSec 120

  Write-Host "📦 Extracting..."
  tar -xzf $tgz -C $tmp
  $src = Get-ChildItem $tmp -Directory | Where-Object { $_.Name -like 'repocensus-main' } | Select-Object -First 1
  if (-not $src) { throw "extracted dir not found" }

  Write-Host "🔄 Mirroring into $Dest (preserving node_modules / .git / dist)..."
  robocopy $src.FullName $Dest /MIR /XD node_modules .git dist /NFL /NDL /NJH /NJS /NP
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed with code $LASTEXITCODE" }
  $global:LASTEXITCODE = 0

  Write-Host "✅ Sync complete."
} finally {
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
