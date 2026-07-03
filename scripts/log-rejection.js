#!/usr/bin/env node
// Agent-facing CLI for the rejected-scope ledger (see hooks/ledger.js).
// Usage:
//   node scripts/log-rejection.js "<step>" "<item>" ["<replacedWith>"] [--loc <estimate>]
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
  let locTotal = 0, locCount = 0;
  for (const e of entries) {
    byStep[e.step] = (byStep[e.step] || 0) + 1;
    if (e.locAvoidedEstimate) { locTotal += e.locAvoidedEstimate; locCount++; }
  }
  console.log(`${entries.length} rejected-scope entr${entries.length === 1 ? 'y' : 'ies'} in ${ledgerPath()}\n`);
  for (const e of entries) {
    const suffix = e.replacedWith ? ` -> ${e.replacedWith}` : '';
    const loc = e.locAvoidedEstimate ? ` (~${e.locAvoidedEstimate} lines, agent estimate)` : '';
    console.log(`- [${e.step}] ${e.item}${suffix}${loc}`);
  }
  console.log('\nBy step:');
  for (const [step, n] of Object.entries(byStep)) console.log(`  ${step}: ${n}`);
  if (locCount) console.log(`\n~${locTotal} lines avoided across ${locCount} entr${locCount === 1 ? 'y' : 'ies'} with an estimate (agent estimate, not measured).`);
  process.exit(0);
}

const locFlagIndex = args.indexOf('--loc');
const locAvoidedEstimate = locFlagIndex !== -1 ? args[locFlagIndex + 1] : undefined;
const positional = locFlagIndex !== -1 ? args.slice(0, locFlagIndex) : args;

const [step, item, replacedWith] = positional;
if (!step || !item) {
  console.error('Usage: log-rejection.js "<step>" "<item>" ["<replacedWith>"] [--loc <estimate>]  |  --report');
  process.exit(1);
}
appendEntry({ step, item, replacedWith, locAvoidedEstimate, task: process.env.MINIMALIST_TASK || null });
