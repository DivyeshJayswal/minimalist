#!/usr/bin/env node
// Lifecycle hook: reads the hook event JSON on stdin, updates level if the
// prompt is a /minimalist command, and injects instructions as additionalContext.
// Robust to null/missing event fields (a documented failure mode in siblings).
'use strict';
const { handlePrompt } = require('./mode-tracker');
const { buildInstructions } = require('./instructions');

let raw = '';
process.stdin.on('data', d => raw += d);
process.stdin.on('end', () => {
  let event = {};
  try { event = JSON.parse(raw || '{}') || {}; } catch { event = {}; }
  const prompt = typeof event.prompt === 'string' ? event.prompt : '';
  let level = 'full';
  try { level = handlePrompt(prompt); } catch { /* config unreadable: stay default */ }
  const context = buildInstructions(level);
  // additionalContext is honored by Claude Code (incl. macOS app) and Codex.
  const out = context
    ? { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context } }
    : {};
  process.stdout.write(JSON.stringify(out));
});
