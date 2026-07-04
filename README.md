<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="assets/minimalist_logo_light.png">
    <img src="assets/minimalist_logo.png" alt="Minimalist logo" width="500">
  </picture>
</p>


<p align="center">
  <em>Fewer tokens, same output - and it remembers why, every time!</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT">
  <img src="https://img.shields.io/badge/runtime%20deps-0-111111?style=flat-square" alt="zero deps">
  <img src="https://github.com/DivyeshJayswal/minimalist/actions/workflows/test.yml/badge.svg" alt="tests">
  <img src="https://img.shields.io/github/last-commit/DivyeshJayswal/minimalist?style=flat-square&color=111111" alt="last commit">
</p>

---

**What it does:** makes your AI agent produce less for the same result -
less code, less prose, fewer unnecessary steps, fewer tokens spent getting
there - and keeps a written record of every shortcut it took, so nobody
has to take its word for it. It ships as two separate skills: `/minimalist`
for coding tasks, `/minimalist-general` for everything else (writing,
planning, research, decisions).

Ask your agent for a date picker. Left alone, it installs a library, writes
a wrapper component, a stylesheet, and a paragraph about timezones you
didn't ask for. With minimalist:

```html
<!-- descent step 4: the platform already has one -->
<input type="date">
```

**Minimalist** makes it stop and check first: does this need to exist → is it
already in the codebase → does the stdlib have it → does the platform have it
→ is it one line → *only then* write new code. Every step it skips, it says
so — and now it writes that down too, not just says it once and forgets.
`/minimalist-general` runs the same descent for non-coding work — same
questions, asked about a plan or a document instead of a diff.

<details>
<summary>The longer version, if you want the vibe</summary>

Same task, same result, fewer tokens spent getting there — because the
agent stops reaching for a library, a wrapper, and a config file the moment
a one-liner already does the job. Picture an auditor, not a hype man.
Doesn't get excited about your new dependency. Doesn't say "nice work" to
fifty lines that do the job of five. Reads the diff, asks what's
load-bearing and what's decoration, and only signs off on the version that
survives both questions. Every line it lets through has already been
interrogated; every line it cuts, it writes down — so the audit trail
outlives the conversation, and the same question never gets re-argued
twice.

</details>

> [!TIP]
> **Turn it on:** it's active by default the moment the plugin's installed.
> Switch modes with `/minimalist lite|full|ultra|off`, or say "stop minimalist" /
> "normal mode" to step out any time.

> [!NOTE]
> **Speak your tongue.** Prose-trimming only ever applies to *this skill's own*
> explanations. Your code, your comments, your non-English or mixed-language
> text are never "simplified" — articles and particles carry meaning, and
> minimalist doesn't touch them.

> [!IMPORTANT]
> **Honest numbers, not vibes.** Minimalist never invents a savings figure.
> Every claim under [Numbers, reproduced by you](#numbers-reproduced-by-you)
> is either a real measured run or explicitly marked as not yet run — see that
> section for the current status.

## Recent updates

- **`/minimalist-general`** — the same subtraction discipline, as a
  separate skill for non-coding work (writing, planning, research). Doesn't
  touch the coding skill's rules; use whichever one matches the task.
- **Precedent check** — before reasoning about scope from scratch, the
  agent checks this project's own rejection history (`scripts/check-precedent.js`)
  and reuses a past decision instead of re-arguing it.
- **The ledger** — every rejected dependency or abstraction gets logged to
  a real file (`~/.minimalist/ledger.jsonl`), readable across sessions —
  see [The ledger](#the-ledger-a-file-not-a-promise) below.
- **Statusline** — shows real session cost/tokens and the ledger's
  rejection count, no invented "saved" figure.

## The ledger: a file, not a promise

**In short:** every time the agent decides not to add a dependency or write
extra code, that decision gets saved to a file on your machine — so you (or
anyone on your team) can check later what it skipped and why, instead of
just trusting it said so once in chat.

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

<img src="assets/claude_logo.png" width="12" alt=""> **Claude Code**
```
/plugin marketplace add DivyeshJayswal/minimalist
/plugin install minimalist@minimalist
```
Desktop app: Customize → personal plugins → Add from repository → repo URL.

<img src="assets/chatgpt_logo.png" width="12" alt=""> **Codex**
```bash
codex plugin marketplace add DivyeshJayswal/minimalist
```
`/plugins` → install Minimalist → `/hooks` → trust its two hooks → new thread.

<img src="assets/github_copilot_logo.png" width="12" alt=""> **GitHub Copilot CLI**
```bash
copilot plugin marketplace add DivyeshJayswal/minimalist
copilot plugin install minimalist@minimalist
```
Commands are namespaced: `/minimalist:minimalist ultra`.

<img src="assets/gemini_logo.png" width="20" alt=""> **Gemini CLI**
```bash
gemini extensions install https://github.com/DivyeshJayswal/minimalist
```

<img src="assets/gemini_logo.png" width="20" alt=""> **Antigravity CLI**
```bash
agy plugin install https://github.com/DivyeshJayswal/minimalist
```
Reuses the Gemini extension; also ships `.agents/rules/` for always-on rules.

π **Pi agent harness**
```bash
pi install git:github.com/DivyeshJayswal/minimalist
```

<img src="assets/opencode_logo.png" width="20" alt=""> **OpenCode**
```json
{ "plugin": ["minimalist-skill"] }
```
Or from a checkout: `{ "plugin": ["./.opencode/plugins/minimalist.mjs"] }`.
OpenCode also auto-loads this repo's `AGENTS.md`.

☰ **Hermes**
```bash
hermes plugins install DivyeshJayswal/minimalist --enable
```

🦞 **OpenClaw**
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

## Update

Most installs point back to this repo. After a release, Git-based installs
update by pulling/reinstalling from GitHub; registry installs update from the
registry they came from.

| install type | examples | update path |
|---|---|---|
| Git-based | Gemini, Antigravity, Pi, local OpenCode, copied rule files | pull or reinstall from GitHub; copy rule files again if needed |
| Marketplace/plugin wrapper | Claude Code, Codex, Copilot CLI, Hermes | update/reinstall through that tool's plugin command |
| Registry copy | npm/OpenCode package, ClawHub/OpenClaw | publish the new package there, then update through that registry |

**Uninstall**
```bash
node scripts/uninstall.js
```

## Commands

| command | does |
|---|---|
| `/minimalist [lite\|full\|ultra\|off]` | for coding tasks — set intensity (default **full**) |
| `/minimalist-general [lite\|full\|ultra\|off]` | for everything else: writing, planning, research |
| `/minimalist-review` | review a diff for bloat — and for missing guards |
| `/minimalist-audit` | ranked deletion candidates across the codebase |
| `/minimalist-gain` | the ledger, read back — measured, never invented |
| `/minimalist-help` | the whole tool in 15 lines |

**lite** just flags over-engineering and lets you decide. **full** (the
default) actually enforces the rules. **ultra** goes further and keeps its
own explanations to almost nothing. The safety guardrail never turns off,
at any of the three. Say "stop minimalist" or "normal mode" to switch it
off entirely.

## Numbers, reproduced by you

**In short:** we haven't published a real "X% less code" number yet, on
purpose — the tool to measure it exists and you can run it yourself right
now, on your own repo.

**Status: no real run published yet.** The harness is built and mock-validated;
a real benchmark run hasn't happened. This section stays here so the day it
does run, the number lands next to the command that reproduced it — not before.

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

**In short:** one instructions file gets copied into whatever format each AI
tool expects, so you get the same rules everywhere without maintaining nine
different versions by hand.

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
npm test              # node:test, zero dependencies
npm run mirrors       # regenerate per-agent rule copies from SKILL.md
npm run mirrors:check # CI drift gate
npm run bench:mock    # validate the benchmark pipeline for free
```

CI runs ubuntu / macos / windows × Node 18/20/22.

## Release

1. Edit `skills/minimalist/SKILL.md`.
2. Run `npm run mirrors`.
3. Bump versions in `package.json`, `plugin.yaml`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and `gemini-extension.json`.
4. Commit, tag, and push to GitHub.
5. Republish only registries that package a copy, such as npm/OpenCode packages or ClawHub. Git-based installs update from GitHub.

## Star this repo

Costs nothing, helps someone else find the smaller version of what they were
about to build. Fair trade. ⭐

---

<p align="center"><em>Write less. Prove it. Break nothing.</em></p>
