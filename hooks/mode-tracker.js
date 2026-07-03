// Parses level switches out of user prompts and persists them (merge-only).
'use strict';
const { LEVELS, setLevel, getLevel } = require('./config');

// Accepts "/minimalist ultra", "minimalist off", "stop minimalist", "normal mode"
function parseCommand(prompt) {
  if (typeof prompt !== 'string') return null;
  const p = prompt.trim().toLowerCase();
  if (/^(stop minimalist|normal mode)$/.test(p)) return 'off';
  const m = p.match(/^\/?minimalist(?:\s+(lite|full|ultra|off))?$/);
  if (!m) return null;
  return m[1] || 'full';
}

function handlePrompt(prompt) {
  const lvl = parseCommand(prompt);
  if (lvl && LEVELS.includes(lvl)) { setLevel(lvl); return lvl; }
  return getLevel();
}

module.exports = { parseCommand, handlePrompt };
