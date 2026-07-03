#!/usr/bin/env sh
# Minimalist statusline: shows the ACTIVE level only. No invented savings.
CFG="${MINIMALIST_CONFIG_DIR:-$HOME/.minimalist}/config.json"
LEVEL="full"
if [ -f "$CFG" ]; then
  L=$(sed -n 's/.*"level"[[:space:]]*:[[:space:]]*"\([a-z]*\)".*/\1/p' "$CFG" | head -1)
  [ -n "$L" ] && LEVEL="$L"
fi
[ "$LEVEL" = "off" ] && printf "minimalist ∅" || printf "minimalist ▸ %s" "$LEVEL"
