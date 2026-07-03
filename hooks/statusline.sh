#!/usr/bin/env sh
# Minimalist statusline: level, real session cost/tokens (from Claude Code's
# own stdin payload), and the rejected-scope ledger count. No invented
# savings — every number here is measured, or the field is omitted.
DIR="${MINIMALIST_CONFIG_DIR:-$HOME/.minimalist}"
CFG="$DIR/config.json"
LEDGER="$DIR/ledger.jsonl"

LEVEL="full"
if [ -f "$CFG" ]; then
  L=$(sed -n 's/.*"level"[[:space:]]*:[[:space:]]*"\([a-z]*\)".*/\1/p' "$CFG" | head -1)
  [ -n "$L" ] && LEVEL="$L"
fi

INPUT=$(cat)
COST=$(printf '%s' "$INPUT" | sed -n 's/.*"total_cost_usd"[[:space:]]*:[[:space:]]*\([0-9.]*\).*/\1/p' | head -1)
IN_TOK=$(printf '%s' "$INPUT" | sed -n 's/.*"total_input_tokens"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)
OUT_TOK=$(printf '%s' "$INPUT" | sed -n 's/.*"total_output_tokens"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' | head -1)

REJECTED=0
LOC_EST=0
if [ -f "$LEDGER" ]; then
  REJECTED=$(grep -c . "$LEDGER" 2>/dev/null || echo 0)
  LOC_EST=$(sed -n 's/.*"locAvoidedEstimate"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$LEDGER" | awk '{s+=$1} END {print s+0}')
fi

if [ "$LEVEL" = "off" ]; then
  OUT="minimalist ∅"
else
  OUT="minimalist ▸ $LEVEL"
fi
[ -n "$IN_TOK" ] && [ -n "$OUT_TOK" ] && OUT="$OUT · $((IN_TOK + OUT_TOK)) tok"
[ -n "$COST" ] && OUT="$OUT · \$$COST"
[ "$REJECTED" -gt 0 ] 2>/dev/null && OUT="$OUT · $REJECTED rejected"
[ "$LOC_EST" -gt 0 ] 2>/dev/null && OUT="$OUT · ~$LOC_EST lines avoided (est.)"
printf '%s' "$OUT"
