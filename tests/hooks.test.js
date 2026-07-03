'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');

function runHook(script, input) {
  const env = { ...process.env, MINIMALIST_CONFIG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'mini-hk-')) };
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'hooks', script)], { input, encoding: 'utf8', env });
  return { code: r.status, out: r.stdout };
}

test('activate.js injects additionalContext for a normal prompt', () => {
  const { code, out } = runHook('activate.js', JSON.stringify({ prompt: 'add a date picker' }));
  assert.strictEqual(code, 0);
  const j = JSON.parse(out);
  assert.ok(j.hookSpecificOutput.additionalContext.includes('Minimalist'));
});
test('activate.js survives empty stdin (null-event class bug)', () => {
  const { code, out } = runHook('activate.js', '');
  assert.strictEqual(code, 0);
  assert.doesNotThrow(() => JSON.parse(out));
});
test('activate.js survives garbage stdin', () => {
  const { code } = runHook('activate.js', '{{{{');
  assert.strictEqual(code, 0);
});
test('activate.js: "/minimalist off" yields empty injection', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-hk2-'));
  const env = { ...process.env, MINIMALIST_CONFIG_DIR: dir };
  spawnSync(process.execPath, [path.join(__dirname, '..', 'hooks', 'activate.js')], { input: JSON.stringify({ prompt: '/minimalist off' }), encoding: 'utf8', env });
  const r2 = spawnSync(process.execPath, [path.join(__dirname, '..', 'hooks', 'activate.js')], { input: JSON.stringify({ prompt: 'now write code' }), encoding: 'utf8', env });
  assert.deepStrictEqual(JSON.parse(r2.stdout), {});
});
test('subagent.js inherits persisted level', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-hk3-'));
  const env = { ...process.env, MINIMALIST_CONFIG_DIR: dir };
  spawnSync(process.execPath, [path.join(__dirname, '..', 'hooks', 'activate.js')], { input: JSON.stringify({ prompt: '/minimalist ultra' }), encoding: 'utf8', env });
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'hooks', 'subagent.js')], { input: '{}', encoding: 'utf8', env });
  assert.ok(JSON.parse(r.stdout).hookSpecificOutput.additionalContext.includes(':ultra'));
});
