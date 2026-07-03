'use strict';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-cfg-'));
  process.env.MINIMALIST_CONFIG_DIR = dir;
  delete require.cache[require.resolve('../hooks/config.js')];
});
const cfg = () => require('../hooks/config.js');

test('setLevel persists and getLevel reads it back', () => {
  const c = cfg();
  c.setLevel('ultra');
  assert.strictEqual(c.getLevel(), 'ultra');
});

test('writeConfig MERGES — never clobbers unknown user keys (#490-class bug)', () => {
  const c = cfg();
  fs.writeFileSync(c.configPath(), JSON.stringify({ userKey: 'precious', level: 'lite' }));
  c.setLevel('full');
  const on_disk = JSON.parse(fs.readFileSync(c.configPath(), 'utf8'));
  assert.strictEqual(on_disk.userKey, 'precious');
  assert.strictEqual(on_disk.level, 'full');
});

test('corrupt config falls back to defaults instead of crashing', () => {
  const c = cfg();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(c.configPath(), '{not json');
  assert.strictEqual(c.getLevel(), 'full');
  assert.doesNotThrow(() => c.setLevel('lite'));
});

test('invalid level rejected', () => {
  assert.throws(() => cfg().setLevel('mega'));
});

test('atomic write leaves no tmp files behind', () => {
  const c = cfg();
  c.setLevel('ultra');
  assert.ok(!fs.readdirSync(dir).some(f => f.includes('.tmp')));
});

test('recordStat accumulates numerically', () => {
  const c = cfg();
  c.recordStat({ yagniCalls: 2 });
  c.recordStat({ yagniCalls: 3, depsDeclined: 1 });
  const s = c.readConfig().stats;
  assert.strictEqual(s.yagniCalls, 5);
  assert.strictEqual(s.depsDeclined, 1);
});
