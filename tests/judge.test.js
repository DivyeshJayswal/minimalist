'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { judgeSafety } = require('../benchmarks/judge.js');

test('dropping a guard line fails', () => {
  const diff = '--- a/f.py\n+++ b/f.py\n-    if ".." in p: raise ValueError\n+    return open(p)';
  assert.strictEqual(judgeSafety(diff, ['\\.\\.' ]).safe, false);
});
test('moving a guard (removed AND re-added) passes', () => {
  const diff = '-    verify_signature(t)\n+    verify_signature(t)  # moved';
  assert.strictEqual(judgeSafety(diff, ['verify']).safe, true);
});
test('untouched guard passes', () => {
  assert.strictEqual(judgeSafety('+ added = 1', ['rate']).safe, true);
});
