import type { LanguageModel } from "ai";
import { getAdapter } from "./registry.ts";
import { DEFAULT_LLM_CONFIG, type LlmConfig, type LlmProviderContext } from "./types.ts";

export function resolveLanguageModel(
  modelId: string,
  llm: LlmConfig = DEFAULT_LLM_CONFIG,
): LanguageModel {
  const adapter = getAdapter(llm.provider);
  const ctx: LlmProviderContext = {
    modelId,
    ...(llm.apiKeyEnv !== undefined ? { apiKeyEnv: llm.apiKeyEnv } : {}),
    ...(llm.baseURL !== undefined ? { baseURL: llm.baseURL } : {}),
    ...(llm.headers !== undefined ? { headers: llm.headers } : {}),
  };
  return adapter.createModel(ctx);
}
