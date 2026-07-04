'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');

function freshEnv() {
  return { ...process.env, MINIMALIST_CONFIG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'mini-precedent-')) };
}
function run(env, ...args) {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'check-precedent.js'), ...args], { encoding: 'utf8', env });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
function logRejection(env, ...args) {
  spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'log-rejection.js'), ...args], { encoding: 'utf8', env });
}

test('no args exits nonzero with usage', () => {
  const { code, err } = run(freshEnv());
  assert.notStrictEqual(code, 0);
  assert.ok(err.includes('Usage'));
});

test('empty ledger reports no precedent for a given keyword', () => {
  const { code, out } = run(freshEnv(), 'date picker');
  assert.strictEqual(code, 0);
  assert.ok(out.includes('No precedent found'));
});

test('finds a match via item text', () => {
  const env = freshEnv();
  logRejection(env, 'platform', 'date picker library', '<input type="date">');
  const { code, out } = run(env, 'date picker');
  assert.strictEqual(code, 0);
  assert.ok(out.includes('1 precedent found'));
  assert.ok(out.includes('date picker library'));
});

test('finds a match via replacedWith text', () => {
  const env = freshEnv();
  logRejection(env, 'platform', 'date picker library', '<input type="date">');
  const { out } = run(env, 'input type');
  assert.ok(out.includes('1 precedent found'));
});

test('reports no precedent when nothing matches', () => {
  const env = freshEnv();
  logRejection(env, 'yagni', 'config flag for a value that never changes');
  const { code, out } = run(env, 'csv export');
  assert.strictEqual(code, 0);
  assert.ok(out.includes('No precedent found'));
});

test('match is case-insensitive', () => {
  const env = freshEnv();
  logRejection(env, 'platform', 'Date Picker Library', '<input type="date">');
  const { out } = run(env, 'DATE picker');
  assert.ok(out.includes('1 precedent found'));
});
