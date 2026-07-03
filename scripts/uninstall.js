#!/usr/bin/env node
// Removes minimalist config and prints per-agent uninstall commands.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const dir = process.env.MINIMALIST_CONFIG_DIR || path.join(os.homedir(), '.minimalist');
try { fs.rmSync(dir, { recursive: true, force: true }); console.log('removed', dir); } catch {}
console.log(`
Per-agent removal:
  Claude Code : /plugin uninstall minimalist@minimalist
  Codex       : /plugins -> Minimalist -> uninstall
  Copilot CLI : copilot plugin uninstall minimalist@minimalist
  Gemini CLI  : gemini extensions uninstall minimalist
  Pi          : pi uninstall minimalist
  OpenCode    : remove "minimalist" from the "plugin" array in opencode.json
  Rule-file agents (Cursor/Windsurf/Cline/Kiro): delete the minimalist rule file from the project.
`);
