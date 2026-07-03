'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'); const path = require('path');

const skills = ['minimalist', 'minimalist-review', 'minimalist-audit', 'minimalist-gain', 'minimalist-help'];
test('every skill has valid frontmatter with name + description', () => {
  for (const s of skills) {
    const md = fs.readFileSync(path.join(__dirname, '..', 'skills', s, 'SKILL.md'), 'utf8');
    assert.ok(md.startsWith('---'), s);
    assert.ok(md.includes(`name: ${s}`), s);
    assert.ok(/description:/.test(md), s);
  }
});
test('core skill contains guardrail + coexistence + honesty sections', () => {
  const md = fs.readFileSync(path.join(__dirname, '..', 'skills', 'minimalist', 'SKILL.md'), 'utf8');
  for (const h of ['## Never cut', '## Coexistence', '## Honesty', '## Language awareness']) assert.ok(md.includes(h), h);
});
test('commands exist for every skill', () => {
  for (const s of skills) assert.ok(fs.existsSync(path.join(__dirname, '..', 'commands', `${s}.toml`)), s);
});
