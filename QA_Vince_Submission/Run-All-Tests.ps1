param([string]$ClientPath = '', [int]$Port = 5187)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not $ClientPath) {
  $candidates = @(Get-ChildItem (Join-Path $env:USERPROFILE 'Downloads') -Recurse -File -Filter 'vite.config.js' -ErrorAction SilentlyContinue |
    Where-Object { $_.DirectoryName -like '*FIRST_F-V3*' -and (Test-Path (Join-Path $_.DirectoryName 'main.html')) } |
    Select-Object -ExpandProperty DirectoryName)
  if ($candidates.Count -eq 0) { throw 'Could not locate Hope ERP Client. Pass -ClientPath "C:\path\to\Client".' }
  $ClientPath = $candidates[0]
}
if (!(Test-Path (Join-Path $ClientPath 'package.json'))) { throw 'Client folder must contain package.json.' }
if (!(Test-Path (Join-Path $ClientPath '.env.local'))) { Write-Warning 'Missing Client/.env.local. Authentication UI may not be available.' }

function Ask-Credential([string]$prefix, [string]$caption) {
  $e = Read-Host "$caption email (blank = skip this role)"
  if ([string]::IsNullOrWhiteSpace($e)) { return }
  $ss = Read-Host "$caption password" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
  try { $p = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  [Environment]::SetEnvironmentVariable("${prefix}_EMAIL", $e, 'Process')
  [Environment]::SetEnvironmentVariable("${prefix}_PASSWORD", $p, 'Process')
  $p = $null
}

Write-Host "Hope ERP Client: $ClientPath"
Write-Host 'Leave credentials blank to SKIP that role. Tests never create or update ERP records.'
foreach ($spec in @(@('QA_USER','Normal User'),@('QA_ADMIN','Admin'),@('QA_SUPERADMIN','Superadmin'))) {
  if (![Environment]::GetEnvironmentVariable("$($spec[0])_EMAIL",'Process')) { Ask-Credential $spec[0] $spec[1] }
}

if (!(Test-Path 'node_modules/@playwright/test')) { & npm.cmd install; if ($LASTEXITCODE -ne 0) { throw 'npm install failed' } }
& npx.cmd playwright install chromium
if ($LASTEXITCODE -ne 0) { throw 'Chromium installation failed' }

# Run a dedicated port so the test runner never collides with another Vite instance.
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) { throw "Port $Port is already in use. Choose another with -Port 5188." }
$vite = Join-Path $ClientPath 'node_modules/.bin/vite.cmd'
if (!(Test-Path $vite)) { Write-Host 'Installing app dependencies...'; Push-Location $ClientPath; try { & npm.cmd install; if ($LASTEXITCODE -ne 0) {throw 'Client npm install failed'} } finally {Pop-Location} }
$vite = Join-Path $ClientPath 'node_modules/.bin/vite.cmd'
if (!(Test-Path $vite)) { throw 'Vite not found. Run npm.cmd install inside Client.' }

$server = $null
try {
  $serverArgs = '/d /s /c ""' + $vite + '" --host 127.0.0.1 --port ' + $Port + ' --strictPort"'
  $server = Start-Process -FilePath 'cmd.exe' -ArgumentList $serverArgs -WorkingDirectory $ClientPath -PassThru -WindowStyle Minimized
  $url = "http://127.0.0.1:$Port"
  $ready = $false
  foreach ($i in 1..60) {
    Start-Sleep -Milliseconds 500
    try { $r = Invoke-WebRequest "$url/main.html" -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch {}
    if ($server.HasExited) { break }
  }
  if (!$ready) { throw "The application did not start at $url/main.html" }
  $env:ERP_BASE_URL = $url
  Write-Host "Running Playwright against $url/main.html" -ForegroundColor Cyan
  & npm.cmd test
  $exit = $LASTEXITCODE
  Write-Host "Finished. HTML: $PSScriptRoot\playwright-report\index.html" -ForegroundColor Cyan
  Write-Host "JSON: $PSScriptRoot\qa-results.json" -ForegroundColor Cyan
  if ($exit -ne 0) { Write-Warning 'Some tests failed. Review the HTML report.' }
}
finally {
  if ($server -and !$server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  foreach ($prefix in @('QA_USER','QA_ADMIN','QA_SUPERADMIN')) {
    [Environment]::SetEnvironmentVariable("${prefix}_PASSWORD", $null, 'Process')
  }
}
