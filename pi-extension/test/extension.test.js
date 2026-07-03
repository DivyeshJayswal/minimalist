'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const os = require('os'); const fs = require('fs'); const path = require('path');
process.env.MINIMALIST_CONFIG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-pi-'));
const ext = require('../index.js');

test('before_agent_start survives null event', () => {
  const out = ext.before_agent_start(null);
  assert.ok(typeof out.systemPrompt === 'string' && out.systemPrompt.includes('Minimalist'));
});
test('before_agent_start never prepends literal undefined', () => {
  const out = ext.before_agent_start({});
  assert.ok(!out.systemPrompt.startsWith('undefined'));
});
test('preserves existing systemPrompt', () => {
  const out = ext.before_agent_start({ systemPrompt: 'KEEP-ME' });
  assert.ok(out.systemPrompt.startsWith('KEEP-ME'));
});
test('on_user_message tolerates missing text', () => {
  assert.doesNotThrow(() => ext.on_user_message({}));
  assert.doesNotThrow(() => ext.on_user_message(null));
});
