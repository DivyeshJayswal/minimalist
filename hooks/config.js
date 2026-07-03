// Config store for minimalist. Atomic writes, merge-only updates.
// Fixes the classic "writeDefaultMode overwrites entire config" bug class:
// we never write a config we didn't first read and merge.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const LEVELS = ['lite', 'full', 'ultra', 'off'];
const DEFAULT_LEVEL = 'full';

function configDir() {
  if (process.env.MINIMALIST_CONFIG_DIR) return process.env.MINIMALIST_CONFIG_DIR;
  return path.join(os.homedir(), '.minimalist');
}
function configPath() { return path.join(configDir(), 'config.json'); }

function readConfig() {
  try {
    const raw = fs.readFileSync(configPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

// Merge patch into existing config and write atomically (tmp + rename).
function writeConfig(patch) {
  const dir = configDir();
  fs.mkdirSync(dir, { recursive: true });
  const merged = { ...readConfig(), ...patch };
  const tmp = path.join(dir, `.config.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, configPath()); // atomic on POSIX and NTFS same-volume
  return merged;
}

function getLevel() {
  const c = readConfig();
  return LEVELS.includes(c.level) ? c.level : DEFAULT_LEVEL;
}
function setLevel(level) {
  if (!LEVELS.includes(level)) throw new Error(`invalid level: ${level}`);
  return writeConfig({ level, updatedAt: new Date().toISOString() });
}

// Session stats: measured only, never invented.
function recordStat(delta) {
  const c = readConfig();
  const s = c.stats && typeof c.stats === 'object' ? c.stats : {};
  const merged = {};
  for (const k of new Set([...Object.keys(s), ...Object.keys(delta)])) {
    merged[k] = (Number(s[k]) || 0) + (Number(delta[k]) || 0);
  }
  return writeConfig({ stats: merged });
}

module.exports = { LEVELS, DEFAULT_LEVEL, configDir, configPath, readConfig, writeConfig, getLevel, setLevel, recordStat };
