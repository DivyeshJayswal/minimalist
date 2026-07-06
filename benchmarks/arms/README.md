# Arms

Each `.txt` file here is appended to the agent's system prompt for one arm.

- `baseline.txt` - empty (no skill). The gray 100% bars.
- `minimalist.txt` - generated from `skills/minimalist/SKILL.md` by `run.js`.
- `caveman.txt` - Caveman ruleset.
- `ponytail.txt` - Ponytail ruleset.
- `token-efficient.txt` - prompt rules from `drona23/claude-token-efficient`.
- `agent-skills-incremental.txt` - incremental implementation skill from
  `addyosmani/agent-skills`.

Any `*.txt` in this folder becomes an arm in the local benchmark. The Ponytail
agentic wrapper copies the non-plugin competitor arms into the cloned upstream
repo before registering them in `run.py`.
