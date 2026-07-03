'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');

test('agent rule mirrors are in sync with SKILL.md (zero-drift invariant)', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'build-mirrors.js'), '--check'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
});
