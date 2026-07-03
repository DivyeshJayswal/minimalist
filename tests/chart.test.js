'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { renderChart } = require('../benchmarks/chart.js');

const rel = {
  baseline:   { loc: 1, tokens: 1, cost: 1, time: 1, safe: 1 },
  minimalist: { loc: 0.42, tokens: 0.74, cost: 0.72, time: 0.70, safe: 1 },
};
test('renders valid SVG containing every arm and metric', () => {
  const svg = renderChart(rel, { subtitle: 't' });
  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'));
  for (const k of ['baseline', 'minimalist', 'LOC', 'tokens', 'cost', 'time', '42%']) assert.ok(svg.includes(k), k);
});
test('escapes injected subtitle', () => {
  assert.ok(!renderChart(rel, { subtitle: '<script>' }).includes('<script>'));
});
