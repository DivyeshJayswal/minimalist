#!/usr/bin/env node
// Agent-facing CLI: before re-deriving a descent decision, check if this
// project already rejected similar scope. Case-insensitive substring match
// over past ledger entries' item/replacedWith text (see hooks/ledger.js).
// Usage:
//   node scripts/check-precedent.js "<keyword>"
'use strict';
const path = require('path');
const { readEntries } = require(path.join(__dirname, '..', 'hooks', 'ledger.js'));

const keyword = process.argv.slice(2).join(' ').trim();
if (!keyword) {
  console.error('Usage: check-precedent.js "<keyword>"');
  process.exit(1);
}

const needle = keyword.toLowerCase();
const matches = readEntries().filter(e =>
  e.item?.toLowerCase().includes(needle) || e.replacedWith?.toLowerCase().includes(needle)
);

if (!matches.length) {
  console.log(`No precedent found for "${keyword}".`);
  process.exit(0);
}

console.log(`${matches.length} precedent${matches.length === 1 ? '' : 's'} found for "${keyword}":\n`);
for (const e of matches) {
  const suffix = e.replacedWith ? ` -> ${e.replacedWith}` : '';
  console.log(`- [${e.step}] ${e.item}${suffix} (logged ${e.at})`);
}
