'use strict';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
beforeEach(() => {
  process.env.MINIMALIST_CONFIG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-mt-'));
  delete require.cache[require.resolve('../hooks/config.js')];
  delete require.cache[require.resolve('../hooks/mode-tracker.js')];
});
const mt = () => require('../hooks/mode-tracker.js');

test('parses /minimalist ultra', () => assert.strictEqual(mt().parseCommand('/minimalist ultra'), 'ultra'));
test('bare /minimalist means full', () => assert.strictEqual(mt().parseCommand('/minimalist'), 'full'));
test('"stop minimalist" -> off', () => assert.strictEqual(mt().parseCommand('stop minimalist'), 'off'));
test('"normal mode" -> off', () => assert.strictEqual(mt().parseCommand('Normal Mode'), 'off'));
test('unrelated prompt -> null (no state change)', () => assert.strictEqual(mt().parseCommand('fix the login bug'), null));
test('handlePrompt persists across module reloads', () => {
  mt().handlePrompt('/minimalist lite');
  delete require.cache[require.resolve('../hooks/mode-tracker.js')];
  assert.strictEqual(mt().handlePrompt('write code'), 'lite');
});
