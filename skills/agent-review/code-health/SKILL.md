---
name: code-health
description: >-
  Run and interpret language-agnostic code-health metrics via agent-review
  health (cccc cognitive/cyclomatic, optional scc volume, lizard fallback).
  Capture snapshots under outputDir/code-health/, compare before/after, and
  drive measure → change → re-measure refine loops. Use when the user asks for
  code health, complexity hotspots, cognitive complexity, cyclomatic CCN,
  language/LOC mix, health:snapshot, or a metrics-gated refactor.
---

# Code-health (operator)

Drive `agent-review health` from the repo root. Prefer this CLI over ad-hoc
cccc/scc/lizard invocations so scopes and summaries stay consistent.

## When to use

- Baseline or re-measure a scope before/after a refactor
- Find cognitive / cyclomatic hotspots (cccc) or language mix (scc)
- Gate structural chunks with numbers (workstream / commit-chunks)
- Update a checked-in narrative under `docs/code-health/` (consumer choice)

## Sub-skills

| Path | Use when |
|------|----------|
| [snapshot](snapshot/SKILL.md) | Capture a snapshot, compare to previous/latest, write narrative docs |
| [refine](refine/SKILL.md) | Measure-driven change loop (optionally with workstream commit-chunks) |

Metric meanings: [metrics.md](metrics.md).

## CLI map

```sh
bunx agent-review health all [--scope <id>] [--path <dir>] [--json]
bunx agent-review health snapshot [--scope <id>] [--path <dir>]
bunx agent-review health complexity [--scope <id>] [--path <dir>]
bunx agent-review health scc [--scope <id>] [--path <dir>]
bunx agent-review health lizard [--scope <id>] [--path <dir>]
```

| Subcommand | Purpose |
|------------|---------|
| `all` | Available tools → summary (markdown; `--json` for machine) |
| `snapshot` | Write `<outputDir>/code-health/<stamp>-<scope>/` + `latest-<scope>.json` |
| `complexity` | cccc only (lizard if cccc missing) |
| `scc` | Volume / language mix only |
| `lizard` | Cyclomatic fallback only |

Install tools on PATH (not npm deps of agent-review):

- **cccc** (required for best results): `cargo install cccc-cli`
- **scc** (optional): [boyter/scc](https://github.com/boyter/scc)
- **lizard** (optional fallback): system binary or Python pip

## Config (`.agent-review.json` `health`)

```json
"health": {
  "defaultScope": "src",
  "scopes": {
    "src": { "path": "src", "excludeDirNames": ["node_modules", "dist"] }
  },
  "cognitiveHotspotThreshold": 15,
  "cyclomaticHotspotThreshold": 15,
  "topN": 20,
  "alwaysRunLizard": false
}
```

Do not invent scope ids — add them under `health.scopes` or use `--path`.

## Artifacts

| Location | Tracked? |
|----------|----------|
| `<outputDir>/code-health/<stamp>-<scope>/` | No (under `.data/`) |
| `<outputDir>/code-health/latest-<scope>.json` | No |
| `docs/code-health/*.md` | Yes — optional consumer narrative |

Do **not** commit raw `code-health/**` dumps.

## Quick start

1. Snapshot: follow [snapshot](snapshot/SKILL.md).
2. If refactoring against those numbers: follow [refine](refine/SKILL.md).
3. Cite concrete deltas (hotspot counts, max/p95 cognitive, cyclomatic outliers).

## Rules

- Missing tools degrade gracefully (`available: false`); do not treat as hard failure.
- Health does **not** feed review findings or `blockOn`.
- Do **not** activate this operator skill for the review/analyst LLMs.
