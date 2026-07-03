'use strict';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-ledger-'));
  process.env.MINIMALIST_CONFIG_DIR = dir;
  delete require.cache[require.resolve('../hooks/config.js')];
  delete require.cache[require.resolve('../hooks/ledger.js')];
});
const ledger = () => require('../hooks/ledger.js');

test('appendEntry then readEntries round-trips', () => {
  const l = ledger();
  l.appendEntry({ step: 'stdlib', item: 'date parsing lib' });
  const entries = l.readEntries();
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].step, 'stdlib');
  assert.strictEqual(entries[0].item, 'date parsing lib');
  assert.ok(entries[0].at);
});

test('appendEntry APPENDS — never clobbers prior entries', () => {
  const l = ledger();
  l.appendEntry({ step: 'yagni', item: 'config option' });
  l.appendEntry({ step: 'platform', item: 'date picker lib', replacedWith: '<input type="date">' });
  const entries = l.readEntries();
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[1].replacedWith, '<input type="date">');
});

test('readEntries on missing ledger returns empty array, not a throw', () => {
  assert.deepStrictEqual(ledger().readEntries(), []);
});

test('readEntries skips corrupt lines but keeps valid ones', () => {
  const l = ledger();
  l.appendEntry({ step: 'yagni', item: 'ok entry' });
  fs.appendFileSync(l.ledgerPath(), 'not json\n');
  l.appendEntry({ step: 'yagni', item: 'second ok entry' });
  const entries = l.readEntries();
  assert.strictEqual(entries.length, 2);
});

test('appendEntry requires step and item', () => {
  assert.throws(() => ledger().appendEntry({ step: 'yagni' }));
  assert.throws(() => ledger().appendEntry({ item: 'thing' }));
});

test('atomic write leaves no tmp files behind', () => {
  const l = ledger();
  l.appendEntry({ step: 'yagni', item: 'x' });
  assert.ok(!fs.readdirSync(dir).some(f => f.includes('.tmp')));
});
