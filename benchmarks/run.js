#!/usr/bin/env node
// Agentic benchmark harness.
//
// Real mode:  runs a headless coding agent (default: `claude -p`) once per
//             task x arm x repetition inside a fresh clone of the target repo,
//             then scores the git diff it leaves behind.
// Mock mode:  --mock replaces the agent with a deterministic simulator so the
//             whole pipeline (scoring, safety judge, chart, report) can be
//             tested end-to-end with zero API cost.
//
// Usage:
//   node benchmarks/run.js --mock
//   node benchmarks/run.js --repo /path/to/clone --n 4 --model haiku
//   node benchmarks/run.js --agent-cmd 'claude -p {PROMPT} --append-system-prompt-file {ARM} --output-format json --dangerously-skip-permissions'
//
// Output: benchmarks/results/<date>-agentic.json + .md + assets/benchmark-agentic.svg
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');
const { locFromNumstat } = require('./loc');
const { judgeSafety } = require('./judge');
const { renderChart } = require('./chart');

const ROOT = path.join(__dirname, '..');
const args = parseArgs(process.argv.slice(2));

function parseArgs(argv) {
  const a = { mock: false, n: 1, model: 'haiku', repo: null, agentCmd: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--mock') a.mock = true;
    else if (k === '--n') a.n = Number(argv[++i]) || 1;
    else if (k === '--model') a.model = argv[++i];
    else if (k === '--repo') a.repo = argv[++i];
    else if (k === '--agent-cmd') a.agentCmd = argv[++i];
  }
  return a;
}

function loadArms() {
  // regenerate minimalist arm from the single source of truth
  const skill = fs.readFileSync(path.join(ROOT, 'skills', 'minimalist', 'SKILL.md'), 'utf8')
    .replace(/^---[\s\S]*?---\s*/, '');
  fs.writeFileSync(path.join(__dirname, 'arms', 'minimalist.txt'), skill);
  const armsDir = path.join(__dirname, 'arms');
  return fs.readdirSync(armsDir).filter(f => f.endsWith('.txt'))
    .map(f => ({ name: path.basename(f, '.txt'), file: path.join(armsDir, f) }))
    .sort((x, y) => (x.name === 'baseline' ? -1 : y.name === 'baseline' ? 1 : x.name.localeCompare(y.name)));
}

// ---------- real agent ----------
function runAgentReal(task, arm, workdir) {
  const cmdTpl = args.agentCmd ||
    `claude -p {PROMPT} --model ${args.model} --append-system-prompt-file {ARM} --output-format json --dangerously-skip-permissions`;
  const cmd = cmdTpl
    .replace('{PROMPT}', JSON.stringify(task.prompt))
    .replace('{ARM}', JSON.stringify(arm.file));
  const t0 = Date.now();
  const res = spawnSync(cmd, { shell: true, cwd: workdir, encoding: 'utf8', timeout: 15 * 60 * 1000 });
  const seconds = (Date.now() - t0) / 1000;
  let tokens = 0, cost = 0;
  try {
    const j = JSON.parse(res.stdout.trim().split('\n').pop());
    const u = j.usage || {};
    tokens = (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_read_input_tokens || 0);
    cost = j.total_cost_usd || 0;
  } catch { /* agent output unparsable: tokens/cost stay 0, still score the diff */ }
  return { seconds, tokens, cost };
}

// ---------- mock agent: deterministic per (task, arm, rep) ----------
function seeded(str) {
  const h = crypto.createHash('sha256').update(str).digest();
  return (lo, hi) => lo + (h.readUInt32BE((seeded._i = ((seeded._i || 0) + 4) % 28)) % (hi - lo + 1));
}
function runAgentMock(task, arm, workdir, rep) {
  const rnd = seeded(`${task.id}:${arm.name}:${rep}`);
  // mock profiles: only baseline (1.0, no skill) and minimalist (this repo's own
  // skill, self-measured) are known. Any other arm (e.g. a competitor's ruleset
  // dropped into benchmarks/arms/) uses an unbiased generic default — never an
  // invented number for another project.
  const profile = {
    baseline:   { loc: 1.00, tok: 1.00, sec: 1.00, guardDrop: 0.00 },
    minimalist: { loc: 0.42, tok: 0.74, sec: 0.70, guardDrop: 0.00 },
  }[arm.name] || { loc: 0.9, tok: 0.95, sec: 0.95, guardDrop: 0.02 };
  const baseLoc = rnd(8, 60), noise = rnd(90, 110) / 100;
  const addLines = Math.max(1, Math.round(baseLoc * profile.loc * noise));
  // write a fake file and commit-less diff
  const f = path.join(workdir, `${task.id}.py`);
  fs.writeFileSync(f, Array.from({ length: addLines }, (_, i) => `line_${i} = ${i}`).join('\n') + '\n');
  execSync('git add -A', { cwd: workdir });
  // safety tasks: guard-dropping arms remove a guard line
  if (task.guard_patterns && rnd(1, 100) <= profile.guardDrop * 100) {
    const g = path.join(workdir, 'guarded.py');
    const existing = fs.readFileSync(g, 'utf8').split('\n');
    fs.writeFileSync(g, existing.filter(l => !/validate|verify|rate|auth|\.\./i.test(l)).join('\n'));
    execSync('git add -A', { cwd: workdir });
  }
  const tokens = Math.round(29000 * profile.tok * noise);
  return { seconds: +(5.7 * profile.sec * noise).toFixed(2), tokens, cost: +(tokens * 3e-7).toFixed(5) };
}

function freshWorkdir(taskId) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `minibench-${taskId}-`));
  if (args.mock) {
    execSync('git init -q && git -c user.email=b@b -c user.name=b commit -q --allow-empty -m init', { cwd: dir, shell: true });
    fs.writeFileSync(path.join(dir, 'guarded.py'),
      ['def download(p):', '    if ".." in p: raise ValueError  # path traversal guard',
       'def login(u):', '    rate_limiter.check(u)', '    verify_signature(u.token)',
       'def parse(b):', '    schema.validate(b)'].join('\n') + '\n');
    execSync('git add -A && git -c user.email=b@b -c user.name=b commit -qm seed', { cwd: dir, shell: true });
  } else {
    const src = args.repo;
    if (!src) { console.error('Real mode needs --repo <path-or-url> (a git repo the agent will edit).'); process.exit(1); }
    execSync(`git clone -q --depth 1 ${JSON.stringify(src)} ${JSON.stringify(dir)}`, { shell: true });
  }
  return dir;
}

function score(workdir, task) {
  const numstat = execSync('git diff --numstat HEAD', { cwd: workdir, encoding: 'utf8' });
  const unified = execSync('git diff HEAD', { cwd: workdir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const loc = locFromNumstat(numstat);
  const safety = task.guard_patterns ? judgeSafety(unified, task.guard_patterns) : { safe: true };
  return { loc, safe: safety.safe, dropped: safety.dropped || null };
}

function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }

(function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'tasks.json'), 'utf8'));
  const arms = loadArms();
  console.log(`arms: ${arms.map(a => a.name).join(', ')} | n=${args.n} | mode=${args.mock ? 'MOCK' : 'REAL'}`);

  const raw = [];
  for (const arm of arms) {
    for (const task of cfg.feature_tasks) {
      for (let rep = 0; rep < args.n; rep++) {
        const wd = freshWorkdir(task.id);
        const run = args.mock ? runAgentMock(task, arm, wd, rep) : runAgentReal(task, arm, wd);
        const s = score(wd, task);
        raw.push({ arm: arm.name, task: task.id, kind: 'feature', rep, ...run, ...s });
        fs.rmSync(wd, { recursive: true, force: true });
        process.stdout.write('.');
      }
    }
    for (const task of cfg.safety_tasks) {
      const wd = freshWorkdir(task.id);
      const run = args.mock ? runAgentMock(task, arm, wd, 0) : runAgentReal(task, arm, wd);
      const s = score(wd, task);
      raw.push({ arm: arm.name, task: task.id, kind: 'safety', rep: 0, ...run, ...s });
      fs.rmSync(wd, { recursive: true, force: true });
      process.stdout.write('s');
    }
  }
  console.log('');

  // aggregate vs baseline
  const armNames = arms.map(a => a.name);
  const agg = {};
  for (const a of armNames) {
    const feats = raw.filter(r => r.arm === a && r.kind === 'feature');
    const safes = raw.filter(r => r.arm === a && r.kind === 'safety');
    agg[a] = {
      loc: mean(feats.map(r => r.loc)),
      tokens: mean(feats.map(r => r.tokens)),
      cost: mean(feats.map(r => r.cost)),
      time: mean(feats.map(r => r.seconds)),
      safe: safes.length ? safes.filter(r => r.safe).length / safes.length : 1,
    };
  }
  const base = agg.baseline || agg[armNames[0]];
  const rel = {};
  for (const a of armNames) rel[a] = {
    loc: agg[a].loc / base.loc, tokens: agg[a].tokens / base.tokens,
    cost: agg[a].cost / base.cost, time: agg[a].time / base.time, safe: agg[a].safe,
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const outJson = path.join(__dirname, 'results', `${stamp}-agentic.json`);
  fs.writeFileSync(outJson, JSON.stringify({ args, agg, rel, raw }, null, 2));

  // markdown report
  const fmtPct = v => `${v < 1 ? '' : '+'}${Math.round((v - 1) * 100)}%`;
  let md = `# Agentic benchmark — ${stamp} (${args.mock ? 'MOCK pipeline run' : `real, model=${args.model}, n=${args.n}`})\n\n`;
  md += `| vs no-skill baseline | LOC | tokens | cost | time | safe |\n|---|---|---|---|---|---|\n`;
  for (const a of armNames.filter(x => x !== 'baseline'))
    md += `| **${a}** | ${fmtPct(rel[a].loc)} | ${fmtPct(rel[a].tokens)} | ${fmtPct(rel[a].cost)} | ${fmtPct(rel[a].time)} | ${Math.round(rel[a].safe * 100)}% |\n`;
  md += `\nBase means — LOC ${base.loc.toFixed(0)}, tokens ${Math.round(base.tokens)}, cost $${base.cost.toFixed(2)}, time ${base.time.toFixed(0)}s.\n`;
  if (args.mock) md += `\n> MOCK run: numbers are simulated to validate the pipeline. Publish only REAL runs.\n`;
  fs.writeFileSync(path.join(__dirname, 'results', `${stamp}-agentic.md`), md);

  // chart
  const svg = renderChart(rel, { subtitle: args.mock ? 'MOCK pipeline validation — do not publish' : `Claude Code, ${args.model}, ${cfg.feature_tasks.length} tasks, n=${args.n}`, baseline: { loc: base.loc, tokens: base.tokens, cost: base.cost, time: base.time } });
  fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'assets', 'benchmark-agentic.svg'), svg);
  console.log(`wrote ${path.relative(ROOT, outJson)}, .md and assets/benchmark-agentic.svg`);
})();
