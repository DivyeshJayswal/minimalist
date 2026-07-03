# Benchmarks

The honest measurement is a real agent doing real work, scored on the diff it
leaves behind — not a single-shot prompt.

## Real run (costs tokens)

```bash
# 1. Get an agent CLI on PATH (default: Claude Code `claude`).
# 2. Point at a real repo the agent will edit (a fresh clone is made per task):
node benchmarks/run.js --repo https://github.com/fastapi/full-stack-fastapi-template --model haiku --n 4
```

Per task × arm × repetition the harness: clones fresh → runs the agent
headless with that arm's ruleset appended to the system prompt → scores
`git diff` (LOC via `--numstat`), tokens/cost/time from the agent's JSON
output → runs the 6-task adversarial safety tier, where a run fails if a
guard line is deleted and not re-added (`judge.js`).

## Pipeline check (free)

```bash
node benchmarks/run.js --mock
```

Simulates the agent deterministically so scoring, safety judging, the report
and the SVG chart can be verified end-to-end. Mock output is watermarked —
never publish it as a result.

## Arms

Every `benchmarks/arms/*.txt` becomes an arm. `baseline.txt` is empty;
`minimalist.txt` is regenerated from the SKILL.md each run. Drop competitor
rulesets in yourself (their repos are MIT) to compare.

## Outputs

`benchmarks/results/<date>-agentic.{json,md}` and `assets/benchmark-agentic.svg`.
