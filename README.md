<h1 align="center">◇ Minimalist</h1>

<p align="center">
  <em>Every line your agent didn't write is a line nobody has to fix at 3 a.m.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT">
  <img src="https://img.shields.io/badge/runtime%20deps-0-111111?style=flat-square" alt="zero deps">
  <img src="https://img.shields.io/badge/tests-49%20passing-111111?style=flat-square" alt="tests">
  <img src="https://img.shields.io/badge/receipts-not%20vibes-111111?style=flat-square" alt="receipts, not vibes">
</p>

---

Ask your agent for a date picker. It installs a library, writes a wrapper
component, a stylesheet, and a paragraph about timezones you didn't ask for.

**Minimalist** makes it stop and check first: does this need to exist → is it
already in the codebase → does the stdlib have it → does the platform have it
→ is it one line → *only then* write new code. Every step it skips, it says
so — and now it writes that down too, not just says it once and forgets.

```html
<!-- descent step 4: the platform already has one -->
<input type="date">
```

## The part nobody else ships: receipts

Every "less code" tool tells you to trust the vibes. Minimalist keeps a
ledger. Every time the descent rejects a dependency, an abstraction, or a
speculative config option, it's logged — not just mentioned once in chat and
gone:

```
$ node scripts/log-rejection.js --report
3 rejected-scope entries in ~/.minimalist/ledger.jsonl

- [platform] date picker library -> <input type="date">
- [yagni] config flag for a value that never changes
- [stdlib] custom debounce helper -> AbortController + setTimeout

By step:
  platform: 1
  yagni: 1
  stdlib: 1
```

`/minimalist-gain` reads that file, not the model's memory of the last five
minutes. Cross-session, inspectable, `grep`-able. If your tech lead wants to
know what the agent talked itself out of building this sprint, that's a
ten-second `cat`, not a re-prompt and a shrug.

## Not lazy — accountable

Minimal never means unsafe. These are never cut, at any level: input
validation, authN/authZ, rate limits, error handling on fallible ops,
resource cleanup, tests. If a shorter version drops one of these, the shorter
version is wrong — and it doesn't ship.

## Install

Node.js 18+ on PATH (for the two lifecycle hooks; skills work without it).

**Claude Code**
```
/plugin marketplace add DivyeshJayswal/minimalist
/plugin install minimalist@minimalist
```
Desktop app: Customize → personal plugins → Add from repository → repo URL.

**Codex**
```bash
codex plugin marketplace add DivyeshJayswal/minimalist
```
`/plugins` → install Minimalist → `/hooks` → trust its two hooks → new thread.

**GitHub Copilot CLI**
```bash
copilot plugin marketplace add DivyeshJayswal/minimalist
copilot plugin install minimalist@minimalist
```
Commands are namespaced: `/minimalist:minimalist ultra`.

**Gemini CLI**
```bash
gemini extensions install https://github.com/DivyeshJayswal/minimalist
```

**Antigravity CLI**
```bash
agy plugin install https://github.com/DivyeshJayswal/minimalist
```
Reuses the Gemini extension; also ships `.agents/rules/` for always-on rules.

**Pi agent harness**
```bash
pi install git:github.com/DivyeshJayswal/minimalist
```

**OpenCode**
```json
{ "plugin": ["minimalist-skill"] }
```
Or from a checkout: `{ "plugin": ["./.opencode/plugins/minimalist.mjs"] }`.
OpenCode also auto-loads this repo's `AGENTS.md`.

**Hermes**
```bash
hermes plugins install DivyeshJayswal/minimalist --enable
```

**OpenClaw**
```bash
clawhub install @divyeshjayswal/minimalist
```
The review, audit, gain, and help skills install the same way
(`clawhub install @divyeshjayswal/minimalist-review`, and so on — the `@divyeshjayswal/`
prefix disambiguates from unrelated same-named skills on the registry). Without
ClawHub, skills ship in `.openclaw/skills/`; point your skills path at the repo.

**Cursor · Windsurf · Cline · Kiro · Devin · CodeWhale · Swival** — rule files
are pre-generated, copy the one you need: `.cursor/rules/minimalist.mdc`,
`.windsurf/rules/minimalist.md`, `.clinerules/minimalist.md`,
`.kiro/steering/minimalist.md`, `.github/copilot-instructions.md`,
`.devin-plugin/`, or generic `AGENTS.md`.

**Uninstall**
```bash
node scripts/uninstall.js
```

## Commands

| command | does |
|---|---|
| `/minimalist [lite\|full\|ultra\|off]` | set intensity (default **full**) |
| `/minimalist-review` | review a diff for bloat — and for missing guards |
| `/minimalist-audit` | ranked deletion candidates across the codebase |
| `/minimalist-gain` | the ledger, read back — measured, never invented |
| `/minimalist-help` | the whole tool in 15 lines |

lite advises, full enforces, ultra ships the diff with ≤3 lines of prose. The
guardrail holds at all three. `stop minimalist` / `normal mode` also works.

## Numbers, reproduced by you

```bash
node benchmarks/run.js --repo <target-repo> --model haiku --n 4   # real run
node benchmarks/run.js --mock                                      # free pipeline check
```

Scores the `git diff` a real agent leaves behind, not a single-shot prompt:
LOC, tokens, cost, wall time, plus a 6-task adversarial safety tier (path
traversal, SQLi, token forgery, malformed input, rate limits, authz) that
fails a run if a guard line is deleted and not restored. Mock runs are
watermarked "do not publish" — only real runs are. Every `benchmarks/arms/*.txt`
becomes an arm, so you can drop in another project's ruleset and compare
directly, yourself, on your own repo. We don't publish a number we didn't
run.

## How it works

One skill file (`skills/minimalist/SKILL.md`) is the source of truth; every
per-agent copy is generated from it (`npm run mirrors`), and CI fails on
drift — across ubuntu, macOS, and Windows. For Claude Code/Codex/Copilot it
rides two lifecycle hooks (`UserPromptSubmit` injects the ruleset and parses
`/minimalist` switches; `SubagentStart` makes subagents inherit the level).
For Gemini/OpenCode/Pi it loads as extension context. For rule-file agents
it's a generated copy. Level state lives in `~/.minimalist/config.json`,
written atomically, merged never overwritten. Rejected scope lives in
`~/.minimalist/ledger.jsonl`, appended never truncated.

If another instruction-injecting skill is detected (output-style or
code-minimal), minimalist yields prose-style decisions to it and keeps code
volume for itself, or applies the stricter rule on overlap — never
contradictory instructions.

## Development

```bash
npm test              # 49 tests, node:test, zero dependencies
npm run mirrors       # regenerate per-agent rule copies from SKILL.md
npm run mirrors:check # CI drift gate
npm run bench:mock    # validate the benchmark pipeline for free
```

CI runs ubuntu / macos / windows × Node 18/20/22.

---

<p align="center"><em>Write less. Prove it. Break nothing.</em></p>
