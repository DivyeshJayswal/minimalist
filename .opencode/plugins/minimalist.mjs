// OpenCode plugin: injects the minimalist ruleset each turn at the active level
// and registers the /minimalist level switch.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const hooks = (f) => require(path.join(here, '..', '..', 'hooks', f));

const { buildInstructions } = hooks('instructions.js');
const { handlePrompt } = hooks('mode-tracker.js');
const { getLevel } = hooks('config.js');

export const MinimalistPlugin = async () => ({
  'chat.params': async (_input, output) => {
    let level = 'full';
    try { level = getLevel(); } catch {}
    const ctx = buildInstructions(level);
    if (ctx) output.system = [...(output.system || []), ctx];
  },
  'chat.message': async (input) => {
    const text = input?.message?.parts?.map(p => p.text || '').join(' ') || '';
    try { handlePrompt(text); } catch {}
  },
});

export default MinimalistPlugin;
