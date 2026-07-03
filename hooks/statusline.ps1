# Minimalist statusline (Windows PowerShell 5.1+). Level, real session
# cost/tokens (from Claude Code's own stdin payload), and the rejected-scope
# ledger count. No invented savings -- every number here is measured, or
# the field is omitted.
$dir = if ($env:MINIMALIST_CONFIG_DIR) { $env:MINIMALIST_CONFIG_DIR } else { Join-Path $HOME ".minimalist" }
$cfg = Join-Path $dir "config.json"
$ledger = Join-Path $dir "ledger.jsonl"

$level = "full"
if (Test-Path $cfg) {
  try { $j = Get-Content $cfg -Raw | ConvertFrom-Json; if ($j.level) { $level = $j.level } } catch {}
}

$stdinRaw = [Console]::In.ReadToEnd()
$cost = $null; $inTok = $null; $outTok = $null
try {
  $payload = $stdinRaw | ConvertFrom-Json
  if ($payload.cost.total_cost_usd) { $cost = $payload.cost.total_cost_usd }
  if ($payload.context_window.total_input_tokens) { $inTok = $payload.context_window.total_input_tokens }
  if ($payload.context_window.total_output_tokens) { $outTok = $payload.context_window.total_output_tokens }
} catch {}

$rejected = 0
$locEst = 0
if (Test-Path $ledger) {
  $lines = Get-Content $ledger | Where-Object { $_.Trim() }
  $rejected = ($lines | Measure-Object -Line).Lines
  foreach ($line in $lines) {
    try {
      $entry = $line | ConvertFrom-Json
      if ($entry.locAvoidedEstimate) { $locEst += [int]$entry.locAvoidedEstimate }
    } catch {}
  }
}

$out = if ($level -eq "off") { "minimalist (off)" } else { "minimalist > $level" }
if ($null -ne $inTok -and $null -ne $outTok) { $out += " . $($inTok + $outTok) tok" }
if ($null -ne $cost) { $out += " . `$$cost" }
if ($rejected -gt 0) { $out += " . $rejected rejected" }
if ($locEst -gt 0) { $out += " . ~$locEst lines avoided (est.)" }
Write-Output $out
