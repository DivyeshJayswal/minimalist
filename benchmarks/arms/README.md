# Arms

Each `.txt` file here is appended to the agent's system prompt for one arm.

- `baseline.txt` — empty (no skill). The gray 100% bars.
- `minimalist.txt` — generated from `skills/minimalist/SKILL.md` by `run.js`.
- To benchmark against competitors, drop their ruleset here yourself, e.g.
  `caveman.txt`, `ponytail.txt` (copy from their MIT-licensed repos).
  Any `*.txt` in this folder becomes an arm automatically.
