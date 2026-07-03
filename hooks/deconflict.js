// Detects other instruction-injecting skills so minimalist can yield instead
// of emitting contradictory rules (the #1 cross-plugin bug in this space).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const KNOWN = [
  { id: 'caveman',  kind: 'output-style', markers: ['caveman'] },
  { id: 'ponytail', kind: 'code-minimal', markers: ['ponytail'] },
  { id: 'genshijin', kind: 'output-style', markers: ['genshijin'] },
];

function existsAny(dir, names) {
  try { const ls = fs.readdirSync(dir); return names.some(n => ls.some(e => e.toLowerCase().includes(n))); }
  catch { return false; }
}

// Scan common skill/plugin locations for known siblings.
function detectSiblings(homedir = os.homedir(), cwd = process.cwd()) {
  const roots = [
    path.join(homedir, '.claude', 'skills'),
    path.join(homedir, '.claude', 'plugins'),
    path.join(homedir, '.codex', 'plugins'),
    path.join(homedir, '.gemini', 'extensions'),
    path.join(cwd, '.claude', 'skills'),
    path.join(cwd, '.opencode', 'plugins'),
    path.join(cwd, '.cursor', 'rules'),
  ];
  const found = [];
  for (const k of KNOWN) {
    if (roots.some(r => existsAny(r, k.markers))) found.push(k);
  }
  return found;
}

// One extra paragraph appended to instructions when siblings are present.
function coexistenceNote(siblings) {
  if (!siblings.length) return '';
  const names = siblings.map(s => s.id).join(', ');
  const hasStyle = siblings.some(s => s.kind === 'output-style');
  return [
    '',
    `## Active coexistence (detected: ${names})`,
    hasStyle
      ? 'An output-style skill is active: follow ITS prose/formatting rules; minimalist governs code volume and scope only.'
      : 'Another code-minimal skill is active: apply the stricter rule when they agree, and this guardrail section when they conflict. Do not restate overlapping rules.',
  ].join('\n');
}

module.exports = { KNOWN, detectSiblings, coexistenceNote };
