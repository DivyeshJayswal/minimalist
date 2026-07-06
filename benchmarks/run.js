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
//   node benchmarks/run.js --repo /path/to/clone --n 10 --model haiku
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
  const a = { mock: false, smoke: false, n: 1, model: 'haiku', repo: null, agentCmd: null, testCmd: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--mock') a.mock = true;
    else if (k === '--smoke') a.smoke = true;
    else if (k === '--n') a.n = Number(argv[++i]) || 1;
    else if (k === '--model') a.model = argv[++i];
    else if (k === '--repo') a.repo = argv[++i];
    else if (k === '--agent-cmd') a.agentCmd = argv[++i];
    else if (k === '--test-cmd') a.testCmd = argv[++i];
  }
  return a;
}

function loadArms() {
  // regenerate minimalist arm from the single source of truth
  let skill = fs.readFileSync(path.join(ROOT, 'skills', 'minimalist', 'SKILL.md'), 'utf8')
    .replace(/^---[\s\S]*?---\s*/, '');
  // The agent runs inside a clone of the TARGET repo, where the shipped
  // relative `scripts/*.js` paths don't exist. Pin them to minimalist's real
  // absolute scripts so Step 0 (precedent) and rejection-logging actually run —
  // against the real persistent home-dir ledger, so precedent carries across
  // tasks. Without this, the memoization mechanism is silently dead in real mode
  // and minimalist collapses to a plain ladder. Ship-path stays relative.
  const scriptsAbs = path.join(ROOT, 'scripts').replace(/\\/g, '/');
  skill += `\n\n## Benchmark harness override (real run)\n\n` +
    `The precedent and rejection scripts live at an absolute path here — use these exact commands:\n` +
    `- precedent check: \`node ${JSON.stringify(scriptsAbs + '/check-precedent.js')} "<keyword>"\`\n` +
    `- log rejection: \`node ${JSON.stringify(scriptsAbs + '/log-rejection.js')} "<step>" "<item>" ["<replaced with>"] [--loc <n>]\`\n` +
    `Run these regardless of your current working directory.\n`;
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
  if (res.error || res.status !== 0) {
    const msg = (res.stderr || res.error?.message || 'agent failed').trim();
    throw new Error(`${arm.name}/${task.id} failed: ${msg}`);
  }
  try {
    const j = JSON.parse(res.stdout.trim().split('\n').pop());
    const u = j.usage || {};
    const tokens = (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_read_input_tokens || 0);
    const cost = j.total_cost_usd || 0;
    if (!tokens) throw new Error('missing usage tokens');
    return { seconds, tokens, cost };
  } catch (e) {
    throw new Error(`${arm.name}/${task.id} returned unusable JSON: ${e.message}`);
  }
}

// ---------- mock agent: deterministic per (task, arm, rep) ----------
function seeded(str) {
  const h = crypto.createHash('sha256').update(str).digest();
  return (lo, hi) => lo + (h.readUInt32BE((seeded._i = ((seeded._i || 0) + 4) % 28)) % (hi - lo + 1));
}
// mock profiles: baseline (1.0, no skill) and minimalist (this repo's own
// skill, self-measured) are known. caveman/ponytail use published-ladder
// approximations for the *per-task-done* cost only — NOT for the memoization
// mechanism, which they structurally lack (stateless ladders). Any other arm
// falls back to an unbiased generic default. Mock output is watermarked
// "do not publish"; only real runs are publishable.
const PROFILES = {
  baseline:   { loc: 1.00, tok: 1.00, sec: 1.00, guardDrop: 0.00, memoizes: false },
  caveman:    { loc: 0.22, tok: 0.55, sec: 0.45, guardDrop: 0.15, memoizes: false },
  ponytail:   { loc: 0.10, tok: 0.40, sec: 0.35, guardDrop: 0.08, memoizes: false },
  minimalist: { loc: 0.12, tok: 0.42, sec: 0.36, guardDrop: 0.00, memoizes: true },
};
const GENERIC_PROFILE = { loc: 0.9, tok: 0.95, sec: 0.95, guardDrop: 0.02, memoizes: false };

function runAgentMock(task, arm, workdir, rep) {
  const rnd = seeded(`${task.id}:${arm.name}:${rep}`);
  const profile = PROFILES[arm.name] || GENERIC_PROFILE;
  const noise = rnd(90, 110) / 100;

  // Mechanism the memoizing arm has and the stateless ladders don't:
  //  - repeat task  → precedent short-circuit: reuse prior decision, ~no work
  //  - nobuild task → reject-and-stop: one line, zero diff
  // A stateless arm runs every task fully, every time.
  const shortCircuit = profile.memoizes && (task.kind === 'repeat' || task.kind === 'nobuild');

  if (shortCircuit) {
    // reject-and-stop / precedent-reuse: a one-line answer, no code emitted.
    execSync('git commit -q --allow-empty -m noop', { cwd: workdir });
    const tokens = Math.round(rnd(400, 900) * noise); // read prompt + ledger, emit one line
    return { seconds: +(rnd(60, 130) / 100 * noise).toFixed(2), tokens, cost: +(tokens * 3e-7).toFixed(5) };
  }

  const baseLoc = rnd(8, 60);
  const addLines = Math.max(1, Math.round(baseLoc * profile.loc * noise));
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

function resetLedger(armName) {
  // Real mode: clear the home-dir ledger so this arm starts with no precedent
  // and its repeats fire only on precedent this arm itself recorded. Mock mode
  // simulates the mechanism via task.kind and never touches the real ledger.
  if (args.mock) return;
  try {
    const { ledgerPath } = require(path.join(ROOT, 'hooks', 'ledger.js'));
    fs.rmSync(ledgerPath(), { force: true });
  } catch { /* ledger module/file absent: nothing to reset */ }
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
  if (!args.testCmd) return { loc, safe: safety.safe, dropped: safety.dropped || null, testsPassed: null };
  const test = spawnSync(args.testCmd, { shell: true, cwd: workdir, encoding: 'utf8', timeout: 15 * 60 * 1000 });
  const testsPassed = !test.error && test.status === 0;
  return { loc, safe: safety.safe && testsPassed, dropped: safety.dropped || (testsPassed ? null : 'test-cmd'), testsPassed };
}

function mean(xs) {
  if (!xs.length) return 0;
  return xs.reduce((sum, x) => sum + x, 0) / xs.length;
}

// $0.10 pre-flight: run the minimalist arm on ONE novel task + its repeat and
// show whether the precedent mechanism actually fired. Not for publishing —
// just to confirm, before the full spend, that the real agent obeys Step 0 and
// that the OpenRouter/Claude route does tool-use (leaves a diff, returns cost).
function runSmoke(cfg, arms) {
  if (args.mock) { console.error('--smoke is a real-run pre-flight; drop --mock.'); process.exit(1); }
  const arm = arms.find(a => a.name === 'minimalist');
  if (!arm) { console.error('minimalist arm missing'); process.exit(1); }
  const novel = cfg.feature_tasks.find(t => t.kind === 'novel');
  const repeat = cfg.feature_tasks.find(t => t.precedent_of === novel.id);
  if (!repeat) { console.error('no repeat task references the first novel task'); process.exit(1); }

  resetLedger('minimalist');
  const rows = [];
  for (const task of [novel, repeat]) {
    const wd = freshWorkdir(task.id);
    console.log(`\n=== ${task.kind.toUpperCase()} task: ${task.id} ===`);
    const run = runAgentReal(task, arm, wd);
    const s = score(wd, task);
    const diff = execSync('git diff --stat HEAD', { cwd: wd, encoding: 'utf8' }).trim() || '(no diff)';
    console.log(`loc=${s.loc}  tokens=${run.tokens}  cost=$${run.cost}  time=${run.seconds}s`);
    console.log(diff);
    rows.push({ task: task.id, kind: task.kind, ...run, loc: s.loc });
    fs.rmSync(wd, { recursive: true, force: true });
  }

  // The proof: after the novel task, did anything land in the ledger? And did
  // the repeat cost far less than the novel (short-circuit) rather than ~same?
  let ledger = [];
  try { ledger = require(path.join(ROOT, 'hooks', 'ledger.js')).readEntries(); } catch {}
  console.log(`\n--- ledger (${ledger.length} entr${ledger.length === 1 ? 'y' : 'ies'}) ---`);
  for (const e of ledger) console.log(`  [${e.step}] ${e.item}${e.replacedWith ? ' -> ' + e.replacedWith : ''}`);

  const [n, r] = rows;
  const tokRatio = n.tokens ? (r.tokens / n.tokens) : NaN;
  console.log(`\n--- verdict ---`);
  console.log(`tool-use working: ${n.tokens > 0 ? 'yes (got usage)' : 'NO — 0 tokens, route may not be agent-capable'}`);
  console.log(`repeat/novel token ratio: ${Number.isFinite(tokRatio) ? tokRatio.toFixed(2) : 'n/a'}  ${tokRatio < 0.5 ? '(short-circuit likely fired ✓)' : '(NOT clearly firing — check the repeat transcript)'}`);
  console.log(`ledger populated: ${ledger.length > 0 ? 'yes ✓' : 'NO — Step 0 logging did not run'}`);
  console.log(`\nGreenlight the full run only if all three look right. If not, the Step 0 wording needs a nudge before you spend.`);
}

(function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'tasks.json'), 'utf8'));
  let arms = loadArms();

  if (args.smoke) return runSmoke(cfg, arms);

  console.log(`arms: ${arms.map(a => a.name).join(', ')} | n=${args.n} | mode=${args.mock ? 'MOCK' : 'REAL'}`);

  const raw = [];
  for (const arm of arms) {
    // Ledger is per-arm: precedent may carry across this arm's tasks (so the
    // memoization mechanism can fire on repeats) but never leaks into the next
    // arm. Feature tasks run in listed order so a repeat sees its precedent.
    resetLedger(arm.name);
    for (const task of cfg.feature_tasks) {
      for (let rep = 0; rep < args.n; rep++) {
        const wd = freshWorkdir(task.id);
        try {
          const run = args.mock ? runAgentMock(task, arm, wd, rep) : runAgentReal(task, arm, wd);
          const s = score(wd, task);
          raw.push({ arm: arm.name, task: task.id, kind: 'feature', taskKind: task.kind || 'novel', rep, ...run, ...s });
        } finally {
          fs.rmSync(wd, { recursive: true, force: true });
        }
        process.stdout.write('.');
      }
    }
    for (const task of cfg.safety_tasks) {
      const wd = freshWorkdir(task.id);
      try {
        const run = args.mock ? runAgentMock(task, arm, wd, 0) : runAgentReal(task, arm, wd);
        const s = score(wd, task);
        raw.push({ arm: arm.name, task: task.id, kind: 'safety', rep: 0, ...run, ...s });
      } finally {
        fs.rmSync(wd, { recursive: true, force: true });
      }
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
  fs.writeFileSync(outJson, JSON.stringify({ args, aggregation: 'mean', agg, rel, raw }, null, 2));

  // markdown report
  const fmtPct = v => `${v < 1 ? '' : '+'}${Math.round((v - 1) * 100)}%`;
  let md = `# Agentic benchmark — ${stamp} (${args.mock ? 'MOCK pipeline run' : `real, model=${args.model}, n=${args.n}`})\n\n`;
  md += `| vs no-skill baseline | LOC | tokens | cost | time | safe |\n|---|---|---|---|---|---|\n`;
  for (const a of armNames.filter(x => x !== 'baseline'))
    md += `| **${a}** | ${fmtPct(rel[a].loc)} | ${fmtPct(rel[a].tokens)} | ${fmtPct(rel[a].cost)} | ${fmtPct(rel[a].time)} | ${Math.round(rel[a].safe * 100)}% |\n`;
  md += `\nBase averages — LOC ${base.loc.toFixed(0)}, tokens ${Math.round(base.tokens)}, cost $${base.cost.toFixed(2)}, time ${base.time.toFixed(0)}s.\n`;

  // Per-task-kind breakdown: shows where any margin comes from (novel = the
  // stateless ladders' home turf; repeat/nobuild = the memoization mechanism).
  // A tie on novel + a win on repeat/nobuild is an honest, defensible story;
  // a blended headline alone hides which axis is doing the work.
  const kinds = [...new Set(cfg.feature_tasks.map(t => t.kind || 'novel'))];
  if (kinds.length > 1) {
    md += `\n## By task kind (cost vs baseline)\n\n| arm | ${kinds.join(' | ')} |\n|${'---|'.repeat(kinds.length + 1)}\n`;
    for (const a of armNames) {
      const cells = kinds.map(k => {
        const feats = raw.filter(r => r.arm === a && r.kind === 'feature' && r.taskKind === k);
        const baseK = raw.filter(r => r.arm === 'baseline' && r.kind === 'feature' && r.taskKind === k);
        const bc = mean(baseK.map(r => r.cost));
        return bc ? fmtPct(mean(feats.map(r => r.cost)) / bc) : 'n/a';
      });
      md += `| ${a} | ${cells.join(' | ')} |\n`;
    }
    md += `\n_novel = cold task (stateless ladders' strength); repeat = precedent short-circuit; nobuild = reject-and-stop. The memoizing arm's margin lives in the last two columns._\n`;
  }

  if (args.mock) md += `\n> MOCK run: numbers are simulated to validate the pipeline. Publish only REAL runs.\n`;
  fs.writeFileSync(path.join(__dirname, 'results', `${stamp}-agentic.md`), md);

  // chart
  const svg = renderChart(rel, { subtitle: args.mock ? 'MOCK pipeline validation — do not publish' : `Claude Code, ${args.model}, ${cfg.feature_tasks.length} tasks, n=${args.n}`, baseline: { loc: base.loc, tokens: base.tokens, cost: base.cost, time: base.time }, aggregation: 'mean' });
  fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'assets', 'benchmark-agentic.svg'), svg);
  console.log(`wrote ${path.relative(ROOT, outJson)}, .md and assets/benchmark-agentic.svg`);
})();
