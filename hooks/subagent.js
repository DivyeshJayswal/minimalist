#!/usr/bin/env node
// SubagentStart hook: subagents inherit the active minimalist level.
'use strict';
const { getLevel } = require('./config');
const { buildInstructions } = require('./instructions');

let raw = '';
process.stdin.on('data', d => raw += d);
process.stdin.on('end', () => {
  let level = 'full';
  try { level = getLevel(); } catch {}
  const context = buildInstructions(level);
  const out = context
    ? { hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: context } }
    : {};
  process.stdout.write(JSON.stringify(out));
});
