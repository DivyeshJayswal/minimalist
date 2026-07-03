// Rejected-scope ledger: persists each descent step that skipped work, so
// /minimalist-gain reports real history instead of session-only recall.
// Same atomic-write discipline as config.js: never truncate, always append.
'use strict';
const fs = require('fs');
const path = require('path');
const { configDir } = require('./config');

function ledgerPath() { return path.join(configDir(), 'ledger.jsonl'); }

function appendEntry({ step, item, replacedWith, task, locAvoidedEstimate }) {
  if (!step || !item) throw new Error('ledger entry needs step and item');
  const dir = configDir();
  fs.mkdirSync(dir, { recursive: true });
  const loc = Number(locAvoidedEstimate);
  const line = JSON.stringify({
    at: new Date().toISOString(),
    step, item,
    replacedWith: replacedWith || null,
    task: task || null,
    // agent's estimate of the rejected approach's size, never a measurement
    locAvoidedEstimate: Number.isFinite(loc) && loc > 0 ? loc : null,
  }) + '\n';
  const tmp = path.join(dir, `.ledger.${process.pid}.${Date.now()}.tmp`);
  const existing = fs.existsSync(ledgerPath()) ? fs.readFileSync(ledgerPath(), 'utf8') : '';
  fs.writeFileSync(tmp, existing + line, 'utf8');
  fs.renameSync(tmp, ledgerPath()); // atomic on POSIX and NTFS same-volume
}

function readEntries() {
  let raw = '';
  try { raw = fs.readFileSync(ledgerPath(), 'utf8'); } catch { return []; }
  const out = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip corrupt line, keep the rest */ }
  }
  return out;
}

module.exports = { ledgerPath, appendEntry, readEntries };
