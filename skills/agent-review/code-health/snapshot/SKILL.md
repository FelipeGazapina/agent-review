---
name: code-health-snapshot
description: >-
  Capture a code-health snapshot (cccc + optional scc/lizard), compare to
  latest or a prior summary, and optionally update docs/code-health narrative.
  Use when baselining metrics, after a refactor chunk, when the user asks for
  health snapshot, before/after numbers, or to refresh a health doc.
---

# Code-health snapshot

Parent: [code-health](../SKILL.md). Metric glossary: [metrics.md](../metrics.md).

## Steps

1. **Choose scope** — default from `health.defaultScope`, or `--scope <id>`, or
   `--path <dir>` for an ad-hoc tree.

2. **Capture**

   ```sh
   bunx agent-review health snapshot
   # or
   bunx agent-review health snapshot --scope src
   bunx agent-review health snapshot --path apps/api
   ```

3. **Read outputs**

   - Printed path: `<outputDir>/code-health/<stamp>-<scope>/`
   - `summary.md` — human table (prefer for chat replies)
   - `summary.json` / `latest-<scope>.json` — machine compare
   - Per-tool: `cccc.json`, `scc.json`, optional `lizard.json`

4. **Compare** (when a prior exists)

   Diff at least:

   | Field | Source |
   |-------|--------|
   | `cccc.cognitiveHotspotCount` | cognitive gate |
   | `cccc.cyclomaticHotspotCount` | cyclomatic gate |
   | `cccc.cognitive.max` / `p95` | tail complexity |
   | `cccc.cyclomatic.max` / `p95` | tail paths |
   | `scc.totalCode` | volume (informational) |
   | `lizard.hotspotCount` | only if lizard ran |

   Call **improved** if hotspot counts and max/p95 drop or stay flat while the
   intentional change lands. Call **regress** if hotspot count jumps or max
   cognitive/cyclomatic rises without an intentional reason.

5. **Report** — short verdict + table of deltas. Link the snapshot dir path.
   Do not paste full tool JSON unless asked.

6. **Docs** (only when user asks, or as part of a planned baseline/final chunk)

   Update `docs/code-health/<scope>.md` (consumer convention) with timestamp,
   before → after table, and top hotspots. Runtime dumps stay under
   `<outputDir>/code-health/`.

## Do not

- Commit `<outputDir>/code-health/**`
- Treat missing cccc/scc/lizard as failure — note skip and continue
- Feed health scores into review `blockOn`
