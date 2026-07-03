// Builds the instruction block injected each turn, derived from the single
// source of truth (skills/minimalist/SKILL.md), trimmed per level.
'use strict';
const fs = require('fs');
const path = require('path');
const { detectSiblings, coexistenceNote } = require('./deconflict');

function skillPath() {
  return path.join(__dirname, '..', 'skills', 'minimalist', 'SKILL.md');
}

function coreRules() {
  const md = fs.readFileSync(skillPath(), 'utf8');
  return md.replace(/^---[\s\S]*?---\s*/, ''); // strip frontmatter
}

const LEVEL_PREFIX = {
  lite:  '[minimalist:lite] Advisory mode: apply the descent, flag over-engineering, respect user-specified structure.',
  full:  '[minimalist:full] Enforce the descent and rules below on every coding response.',
  ultra: '[minimalist:ultra] The diff is the deliverable: minimum code, ≤3 lines of prose, guardrail absolute.',
};

function buildInstructions(level = 'full', opts = {}) {
  if (level === 'off') return '';
  const prefix = LEVEL_PREFIX[level] || LEVEL_PREFIX.full;
  const siblings = opts.skipDetect ? [] : detectSiblings();
  return [prefix, '', coreRules().trim(), coexistenceNote(siblings)].join('\n').trim() + '\n';
}

module.exports = { buildInstructions, coreRules, LEVEL_PREFIX };
