# ADR 0005: Workstream auto-branch on start

## Status

Accepted

## Context

`workstream start` creates a catalog under `workstreams/<id>/` but does not
touch git refs. Operators often want each workstream on its own branch; agents
invent names inconsistently and may edit on `main` by mistake.

Land/link already live under nested `workstreams` config ([ADR 0003](./0003-workstream-land-mode.md)).
Branch creation should be an explicit opt-in with fail-closed semantics: a failed
`git switch -c` must not leave a half-started catalog.

The CLI should not call an LLM for the name. The operator (or coding agent)
supplies a conventional branch name via `--branch`.

## Decision

We will add:

```json
"workstreams": {
  "autoCommit": false,
  "autoLink": true,
  "autoBranch": false
}
```

- **`autoBranch` default `false`:** `workstream start` behaves as today; `--branch`
  is rejected with a clear error.
- **`autoBranch: true`:** `--branch <name>` is required. Validate the name, run
  `git switch -c <name>` **before** `startWorkstream`, record optional `branch`
  on the `workstreams.jsonl` index line, and print the branch on stderr. If git
  fails, exit non-zero and create **no** catalog files.
- **`resume` / `done`:** do not switch or delete branches.
- Name ownership stays with the operator/LLM (e.g. `feat/…`, `fix/…`, `chore/…`).

## Consequences

### Positive

- Opt-in alignment of catalog start with a feature branch
- Fail-closed avoids orphan workstream directories without a branch
- No in-process model dependency for naming

### Negative

- Agents must invent and pass `--branch` when the flag is enabled
- A successful switch followed by a catalog write failure leaves the new branch

### Neutral

- [ADR 0001](./0001-workstream-catalog.md) layout unchanged; [ADR 0003](./0003-workstream-land-mode.md) land modes unchanged

## References

- Operator skill: `skills/agent-review/workstream/SKILL.md`
- CLI: `workstream start --branch <name>`
