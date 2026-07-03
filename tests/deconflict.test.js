'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { detectSiblings } = require('../hooks/deconflict.js');

test('detects caveman + ponytail installed in fake HOME', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-home-'));
  fs.mkdirSync(path.join(home, '.claude', 'skills', 'caveman'), { recursive: true });
  fs.mkdirSync(path.join(home, '.claude', 'plugins', 'ponytail'), { recursive: true });
  const found = detectSiblings(home, home).map(s => s.id).sort();
  assert.deepStrictEqual(found, ['caveman', 'ponytail']);
});
test('clean HOME -> nothing detected', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-home2-'));
  assert.deepStrictEqual(detectSiblings(home, home), []);
});
