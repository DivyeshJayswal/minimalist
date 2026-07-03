#!/usr/bin/env node
// Agent-facing CLI for the rejected-scope ledger (see hooks/ledger.js).
// Usage:
//   node scripts/log-rejection.js "<step>" "<item>" ["<replacedWith>"]
//   node scripts/log-rejection.js --report
'use strict';
const path = require('path');
const { appendEntry, readEntries, ledgerPath } = require(path.join(__dirname, '..', 'hooks', 'ledger.js'));

const args = process.argv.slice(2);

if (args[0] === '--report') {
  const entries = readEntries();
  if (!entries.length) {
    console.log('No rejected-scope entries logged yet.');
    process.exit(0);
  }
  const byStep = {};
  for (const e of entries) byStep[e.step] = (byStep[e.step] || 0) + 1;
  console.log(`${entries.length} rejected-scope entr${entries.length === 1 ? 'y' : 'ies'} in ${ledgerPath()}\n`);
  for (const e of entries) {
    const suffix = e.replacedWith ? ` -> ${e.replacedWith}` : '';
    console.log(`- [${e.step}] ${e.item}${suffix}`);
  }
  console.log('\nBy step:');
  for (const [step, n] of Object.entries(byStep)) console.log(`  ${step}: ${n}`);
  process.exit(0);
}

const [step, item, replacedWith] = args;
if (!step || !item) {
  console.error('Usage: log-rejection.js "<step>" "<item>" ["<replacedWith>"]  |  --report');
  process.exit(1);
}
appendEntry({ step, item, replacedWith, task: process.env.MINIMALIST_TASK || null });
