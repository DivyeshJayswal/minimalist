#!/usr/bin/env node
// Generates every per-agent rule copy from skills/minimalist/SKILL.md.
// One source, zero drift (drift between adapter copies is the top bug class
// in sibling projects). Run: node scripts/build-mirrors.js [--check]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'skills', 'minimalist', 'SKILL.md');

function body() {
  return fs.readFileSync(SRC, 'utf8').replace(/^---[\s\S]*?---\s*/, '').trim() + '\n';
}

const HEADER = (fmt) => ({
  md: '<!-- AUTO-GENERATED from skills/minimalist/SKILL.md — edit there, then run scripts/build-mirrors.js -->\n\n',
  mdc: '---\ndescription: Subtraction-first engineering — smallest correct change wins\nglobs: ["**/*"]\nalwaysApply: true\n---\n\n<!-- AUTO-GENERATED from skills/minimalist/SKILL.md -->\n\n',
})[fmt];

const TARGETS = [
  ['AGENTS.md', 'md'],                                  // OpenCode/Gemini/generic
  ['.cursor/rules/minimalist.mdc', 'mdc'],              // Cursor
  ['.windsurf/rules/minimalist.md', 'md'],              // Windsurf
  ['.clinerules/minimalist.md', 'md'],                  // Cline
  ['.github/copilot-instructions.md', 'md'],            // Copilot
  ['.kiro/steering/minimalist.md', 'md'],               // Kiro
  ['.agents/rules/minimalist.md', 'md'],                // Antigravity rules dir
];

function render(fmt) { return HEADER(fmt) + body(); }

function build() {
  for (const [rel, fmt] of TARGETS) {
    const p = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, render(fmt), 'utf8');
    console.log('wrote', rel);
  }
  // OpenClaw skills = verbatim copies of skills/
  const skillsDir = path.join(ROOT, 'skills');
  for (const s of fs.readdirSync(skillsDir)) {
    const src = path.join(skillsDir, s, 'SKILL.md');
    if (!fs.existsSync(src)) continue;
    const dst = path.join(ROOT, '.openclaw', 'skills', s, 'SKILL.md');
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    console.log('wrote', path.relative(ROOT, dst));
  }
}

function check() {
  let dirty = 0;
  for (const [rel, fmt] of TARGETS) {
    const p = path.join(ROOT, rel);
    const want = render(fmt);
    const have = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    if (have !== want) { console.error('DRIFT:', rel); dirty++; }
  }
  if (dirty) { console.error(`${dirty} mirror(s) drifted — run scripts/build-mirrors.js`); process.exit(1); }
  console.log('mirrors in sync');
}

(process.argv.includes('--check') ? check : build)();
