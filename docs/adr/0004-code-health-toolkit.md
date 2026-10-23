# ADR 0004: Language-generic code-health toolkit

## Status

Accepted

## Context

Operators need measure-driven refactor loops (snapshot → change → re-measure)
beyond adversarial diff review. A JS/TS-only toolkit (knip, Biome cognitive
rule, custom import-graph) would lock the package to one ecosystem and add
fragile tooling deps.

Forces:

- Prefer polyglot AST metrics over ecosystem dead-code / lint collectors
- Keep health scores out of review findings and `blockOn`
- Avoid shipping heavy binaries in the npm package

## Decision

We will add `agent-review health` with config-driven scopes and operator skills
under `skills/agent-review/code-health/`. Collectors call external PATH tools:

- **cccc** — primary cognitive + cyclomatic (many languages)
- **scc** — optional volume / language mix
- **lizard** — cyclomatic fallback when cccc is missing (or `alwaysRunLizard`)

Artifacts live under `<outputDir>/code-health/`. Missing tools set
`available: false` and continue. Health is exempt from `config.skip` /
`SKIP_AGENT_REVIEW`.

## Consequences

### Positive

- Useful across mixed-language repos without knip/biome/graph in-tree
- Snapshot / refine skills share one metrics vocabulary
- Graceful degrade when binaries are absent

### Negative

- Consumers must install `cccc` (and optionally scc/lizard) themselves
- No unused-export or import-graph metrics in v1

### Neutral

- Operator skills are not activated on the review LLM
- Review/analyze/`blockOn` semantics unchanged

## References

- Operator skill: `skills/agent-review/code-health/SKILL.md`
- CLI: `agent-review health all|snapshot|complexity|scc|lizard`
