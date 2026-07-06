# Benchmarks

The honest measurement is a real agent doing real work, scored on the diff it
leaves behind — not a single-shot prompt.

## Real run (costs tokens)

```bash
# 1. Get an agent CLI on PATH (default: Claude Code `claude`).
# 2. Point at a real repo the agent will edit (a fresh clone is made per task):
node benchmarks/run.js --repo https://github.com/fastapi/full-stack-fastapi-template --model haiku --n 10
# optional: also run the target repo's test command after each agent edit
node benchmarks/run.js --repo . --model haiku --n 10 --test-cmd "npm test"
```

Per task × arm × repetition the harness: clones fresh → runs the agent
headless with that arm's ruleset appended to the system prompt → scores
`git diff` (LOC via `--numstat`), tokens/cost/time from the agent's JSON
output → runs the 6-task adversarial safety tier, where a run fails if a
guard line is deleted and not re-added (`judge.js`).
Reports use arithmetic means ("average run"). Real runs fail fast if the agent command exits nonzero
or does not return usage JSON. When `--test-cmd` is set, that command must
pass too.

## Ponytail agentic benchmark

This runs Ponytail's own agentic benchmark harness, with `minimalist` added as
a real plugin arm. It clones Ponytail's repo and the pinned FastAPI template
under ignored local directories, then uses `--plugin-dir` for `caveman`,
`ponytail`, and `minimalist`.

```powershell
# no API spend: validates the deterministic scorers and plugin-dir wiring
.\benchmarks\run-ponytail-agentic.ps1 -TaskSet selftest

# real spend: same task tiers Ponytail reports. By default this compares
# baseline, caveman, ponytail, minimalist, token-efficient, and yagni-oneliner.
.\benchmarks\run-ponytail-agentic.ps1 -TaskSet loc -Runs 4 -Workers 6
.\benchmarks\run-ponytail-agentic.ps1 -TaskSet safety -Runs 4 -Workers 6
```

For a cheap proof run before the full spend:

```powershell
.\benchmarks\run-ponytail-agentic.ps1 -TaskSet loc -Runs 1 -Workers 1 `
  -Arms "baseline,ponytail,minimalist,token-efficient"
```

Workspaces stay in `benchmarks/agentic-upstream/benchmarks/agentic/runs/` so
you can rescore without paying again:

```powershell
cd benchmarks\agentic-upstream\benchmarks\agentic
python run.py --rescore runs\<stamp>
```

## Arms

Every `benchmarks/arms/*.txt` becomes an arm. `baseline.txt` is empty;
`minimalist.txt` is regenerated from the SKILL.md each run. The repo includes
tracked competitor prompt arms for Caveman, Ponytail, Token Efficient, and
Agent Skills Incremental. The Ponytail Windows harness excludes Agent Skills
Incremental by default because its full prompt can exceed the command-line
limit. Cloned source repos used to refresh those arms live under ignored
`benchmarks/competitors/`.

## Outputs

`benchmarks/results/<date>-agentic.{json,md}` and `assets/benchmark-agentic.svg`.
