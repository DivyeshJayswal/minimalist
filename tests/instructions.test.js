'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { buildInstructions } = require('../hooks/instructions.js');
const { coexistenceNote } = require('../hooks/deconflict.js');

test('every active level keeps the full guardrail (never-cut section)', () => {
  for (const lvl of ['lite', 'full', 'ultra']) {
    const t = buildInstructions(lvl, { skipDetect: true });
    assert.ok(t.includes('Never cut'), `${lvl} missing guardrail`);
    assert.ok(/validation/i.test(t) && /auth/i.test(t) && /error handling/i.test(t), `${lvl} guard items missing`);
  }
});
test('off injects nothing', () => assert.strictEqual(buildInstructions('off'), ''));
test('levels carry distinct prefixes', () => {
  const a = buildInstructions('lite', { skipDetect: true });
  const b = buildInstructions('ultra', { skipDetect: true });
  assert.ok(a.includes(':lite') && b.includes(':ultra'));
});
test('CJK / language-awareness rule ships in the ruleset', () => {
  assert.ok(buildInstructions('full', { skipDetect: true }).includes('CJK'));
});
test('coexistence note yields prose style to output-style siblings', () => {
  const n = coexistenceNote([{ id: 'caveman', kind: 'output-style' }]);
  assert.ok(n.includes('caveman') && /follow ITS prose/i.test(n));
});
test('no sibling -> no note', () => assert.strictEqual(coexistenceNote([]), ''));
