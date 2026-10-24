# ADR 0006: LLM provider adapters

## Status

Accepted

## Context

agent-review invoked LLMs only through Vercel AI Gateway: a bare
`provider/model` string plus `AI_GATEWAY_API_KEY`. Operators need other token
APIs (especially OpenRouter) without forking review/analyze/commit-message.

Forces:

- Keep Gateway as the zero-config default
- Prefer a registry of small adapters over a growing CLI `switch`
- OpenRouter should be first-class, not only an `openai-compatible` example
- Keys stay in environment variables

## Decision

We will add `src/llm/` with a runtime `LlmProviderAdapter` registry.
`resolveLanguageModel(modelId, llm)` looks up `llm.provider` and calls
`adapter.createModel(ctx)`. Built-ins: `gateway` (default), `openrouter`,
`openai`, `anthropic`, `openai-compatible`. Config key `llm` and CLI
`--provider` / `AGENT_REVIEW_LLM_PROVIDER` select the adapter.

## Consequences

### Positive

- New providers are additive adapter modules
- OpenRouter gets dedicated defaults (`OPENROUTER_API_KEY`, fixed base URL)
- Pipeline phases only pass `config.llm` into the resolver

### Negative

- Extra deps (`@ai-sdk/openai`, `@ai-sdk/anthropic`)
- Model id conventions still differ by provider

### Neutral

- `capabilitiesGenerateText` and structured-output path unchanged

## References

- Operator skill: `skills/agent-review/SKILL.md`
- Config: `.agent-review.example.json` `llm`
