import type { LanguageModel } from "ai";

/** Context passed to a provider adapter when building a LanguageModel. */
export type LlmProviderContext = {
  modelId: string;
  /** Env var name for the API key; adapter default if omitted. */
  apiKeyEnv?: string;
  baseURL?: string;
  /** Extra HTTP headers (e.g. OpenRouter HTTP-Referer / X-Title). */
  headers?: Record<string, string>;
};

/** Runtime adapter: one module per LLM token API. */
export type LlmProviderAdapter = {
  id: string;
  label: string;
  defaultApiKeyEnv: string;
  createModel(ctx: LlmProviderContext): LanguageModel;
};

/** Config slice for selecting and tuning a provider. */
export type LlmConfig = {
  provider: string;
  apiKeyEnv?: string;
  baseURL?: string;
  headers?: Record<string, string>;
};

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  provider: "gateway",
};
