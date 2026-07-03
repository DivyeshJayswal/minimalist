---
name: minimalist-gain
description: >
  Report what minimalist actually measured in this session or project —
  LOC avoided, scope rejected, dependencies declined. Use when the user
  says "minimalist gain", "what did you save", or asks for the savings report.
license: MIT
---

# Minimalist Gain

Report only measured or directly countable facts from this session:
- Scope rejected (each YAGNI call you made, one line each).
- Dependencies declined and what replaced them.
- LOC of the shipped diff vs. the LOC of the approach you rejected, when both were actually drafted; otherwise say "not measured".

Never extrapolate to cost or percentages you did not compute. If nothing was
measured, say exactly that and point to `benchmarks/` for reproducible numbers.
