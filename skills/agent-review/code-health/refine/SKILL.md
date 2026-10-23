---
name: code-health-refine
description: >-
  Measure-driven refactor loop using agent-review health: snapshot → change →
  re-snapshot → accept or fix regressions. Pairs with agent-review workstream
  commit-chunks when autoCommit is true. Use when chasing complexity hotspots,
  lowering cognitive/cyclomatic tails, or gating structural commits on cccc
  metrics.
---

# Code-health refine

Parent: [code-health](../SKILL.md). Capture/compare: [snapshot](../snapshot/SKILL.md).
Workstream landing: [workstream](../../workstream/SKILL.md) +
[commit-chunks](../../commit/commit-chunks/SKILL.md).

## Goal

Change code **against numbers**, not by folder reshuffle alone.

```text
snapshot → implement one scoped change → snapshot → improved|neutral? → next
                                         └─ regress → fix or split chunk
```

## Loop (one chunk)

1. **Baseline** — [snapshot](../snapshot/SKILL.md) for the active scope. Note
   path (or `latest-<scope>.json`). Log path in workstream if active:
   `bunx agent-review workstream log --event artifact --message "…"`.

2. **Target** — Pick **one** measurable aim, e.g.:

   | Aim | Watch |
   |-----|--------|
   | Cut cognitive hotspots | `cccc.cognitiveHotspotCount` |
   | Lower cognitive tail | `cccc.cognitive.max` / `p95` |
   | Cut cyclomatic outliers | `cccc.cyclomaticHotspotCount` / max |
   | Lizard-only fallback | `lizard.hotspotCount` when cccc unavailable |

3. **Implement** — Smallest change that can move the metric. Stay in scope.
   Run the consumer’s typecheck / tests as appropriate for the repo.

4. **Re-measure** — `bunx agent-review health snapshot` again. Compare per
   snapshot skill.

5. **Decide**

   - **Improved / neutral** → land chunk (commit-chunks if workstream
     `autoCommit: true`; otherwise leave for user commit / complete-feature).
     Mark chunk done.
   - **Regress** → fix or split; do not mark the chunk done until neutral+.

6. **Docs** — On planned baseline/final chunks only, update
   `docs/code-health/` narrative with the delta table.

## With workstream

When `workstreams.autoCommit` is true (or user asked to commit):

1. Drive from `chunks.json` / `todo.md`.
2. One chunk → stage only that chunk → `commit-message` → `git commit`.
3. On hook block → [remediate-all](../../remediation/remediate-all/SKILL.md).
4. Attach snapshot path in commit body or workstream log.

When `autoCommit` is false (default): land via
[complete-feature](../../remediation/complete-feature/SKILL.md) without committing.

Do not batch-skip reviews (`skip: true` in `.agent-review.json`).

## Explicit non-goals (unless user overrides)

- Blocking CI on cccc/scc/lizard by default
- Ecosystem dead-code tools (knip, etc.) — out of scope for this pack
- Raising consumer linter complexity rules as part of this skill

## Stop

Stop when chunk list is done, metrics match the chunk’s measure gate, consumer
checks are green, and (if closing a workstream) retro cites deltas.
