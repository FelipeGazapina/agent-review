# Code-health metrics

How to read toolkit output. Commands: parent [SKILL.md](SKILL.md).

## cccc (`health complexity` / `cccc.json`)

Per-function **cognitive** (SonarSource) and **cyclomatic** (McCabe) complexity
across many languages. JSON from the `cccc` binary.

| Field | Meaning |
|-------|---------|
| `available` | `false` if `cccc` missing on PATH |
| `fileCount` / `functionCount` | Volume analyzed |
| `cognitive` / `cyclomatic` | Distributions: sum, max, median, p90, p95 |
| `cognitiveHotspotCount` | Functions with cognitive ≥ configured threshold |
| `cyclomaticHotspotCount` | Functions with cyclomatic ≥ configured threshold |
| `hotspots` | Top N by cognitive (file, line, name, scores) |
| `parseErrorCount` | Files with partial parse recovery |

**Interpret:** Prefer shrinking hotspot counts and max/p95 cognitive on code you
intentionally touched. Cognitive weights nesting more than flat branches;
cyclomatic counts decision points.

## scc (`health scc` / `scc.json`)

Language / LOC mix ([boyter/scc](https://github.com/boyter/scc)). Complexity here
is a **file-level keyword heuristic**, not per-function AST metrics — use cccc
for refactor gates.

| Field | Meaning |
|-------|---------|
| `totalFiles` / `totalCode` | Volume |
| `languages` | Per-language files, code, comment, blank, complexity |

**Interpret:** Useful for “what languages dominate this scope,” not for hotspot
ranking.

## lizard (`health lizard` / `lizard.json`)

Cyclomatic (CCN) and NLOC when cccc is unavailable, or when
`health.alwaysRunLizard` is true.

| Field | Meaning |
|-------|---------|
| `available` | `false` if binary/vendor missing |
| `hotspotCount` | Functions with CCN ≥ threshold |
| `topHotspots` | Top offenders (file, line, name, CCN) |

**Interpret:** Fallback only when cccc is missing; prefer cccc when both run.

## Snapshot summary

`summary.json` / `summary.md` merge tools with `scope` + `createdAt`. Prefer
`summary.md` for humans; JSON for diffs against `latest-<scope>.json`.
