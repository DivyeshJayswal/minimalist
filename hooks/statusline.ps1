# Minimalist statusline (Windows PowerShell 5.1+). Shows active level only.
$dir = if ($env:MINIMALIST_CONFIG_DIR) { $env:MINIMALIST_CONFIG_DIR } else { Join-Path $HOME ".minimalist" }
$cfg = Join-Path $dir "config.json"
$level = "full"
if (Test-Path $cfg) {
  try { $j = Get-Content $cfg -Raw | ConvertFrom-Json; if ($j.level) { $level = $j.level } } catch {}
}
if ($level -eq "off") { Write-Output "minimalist (off)" } else { Write-Output "minimalist > $level" }
