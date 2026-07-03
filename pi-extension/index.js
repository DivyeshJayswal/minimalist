// Pi agent-harness extension. Defensive against null/missing event fields —
// a shipped crash class in sibling extensions.
'use strict';
const path = require('path');
const hooks = (f) => require(path.join(__dirname, '..', 'hooks', f));
const { buildInstructions } = hooks('instructions.js');
const { handlePrompt } = hooks('mode-tracker.js');
const { getLevel } = hooks('config.js');

function safeLevel(prompt) {
  try { return prompt ? handlePrompt(prompt) : getLevel(); } catch { return 'full'; }
}

module.exports = {
  name: 'minimalist',
  before_agent_start(event) {
    const e = event && typeof event === 'object' ? event : {};
    const level = safeLevel(null);
    const ctx = buildInstructions(level);
    if (!ctx) return e;
    const existing = typeof e.systemPrompt === 'string' ? e.systemPrompt : '';
    return { ...e, systemPrompt: existing ? existing + '\n\n' + ctx : ctx };
  },
  on_user_message(event) {
    const text = event && typeof event.text === 'string' ? event.text : '';
    safeLevel(text);
    return event;
  },
};
