import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { readApiKey } from "../api-key.ts";
import type { LlmProviderAdapter, LlmProviderContext } from "../types.ts";

export const anthropicAdapter: LlmProviderAdapter = {
  id: "anthropic",
  label: "Anthropic",
  defaultApiKeyEnv: "ANTHROPIC_API_KEY",
  createModel(ctx: LlmProviderContext): LanguageModel {
    const id = ctx.modelId.trim();
    if (id.length === 0) throw new Error("model is required");
    const envName = ctx.apiKeyEnv?.trim() || anthropicAdapter.defaultApiKeyEnv;
    const apiKey = readApiKey(envName);
    const baseURL =
      typeof ctx.baseURL === "string" && ctx.baseURL.trim().length > 0
        ? ctx.baseURL.trim()
        : undefined;
    const headers =
      ctx.headers !== null && ctx.headers !== undefined && typeof ctx.headers === "object"
        ? ctx.headers
        : undefined;
    const provider = createAnthropic({
      apiKey,
      ...(baseURL !== undefined ? { baseURL } : {}),
      ...(headers !== undefined ? { headers } : {}),
    });
    return provider(id) as LanguageModel;
  },
};
