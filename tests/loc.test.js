'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { locFromMarkdown, locFromNumstat, churnFromNumstat } = require('../benchmarks/loc.js');

test('counts fenced code lines', () => {
  assert.strictEqual(locFromMarkdown('x\n```js\na\nb\n\nc\n```\ny'), 3);
});
test('CRLF fences are counted, not the whole response (#339-class bug)', () => {
  const md = 'intro\r\n```py\r\nline1\r\nline2\r\n```\r\nlots of prose after';
  assert.strictEqual(locFromMarkdown(md), 2);
});
test('multiple fences sum', () => {
  assert.strictEqual(locFromMarkdown('```\na\n```\ntext\n```\nb\nc\n```'), 3);
});
test('numstat added lines', () => {
  assert.strictEqual(locFromNumstat('10\t2\tsrc/a.py\n5\t0\tsrc/b.py\n-\t-\tbin.png'), 15);
});
test('numstat churn = added+deleted', () => {
  assert.strictEqual(churnFromNumstat('10\t2\ta\n5\t1\tb'), 18);
});
