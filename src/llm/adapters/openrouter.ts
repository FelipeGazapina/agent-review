import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { readApiKey } from "../api-key.ts";
import type { LlmProviderAdapter, LlmProviderContext } from "../types.ts";

export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

export const openrouterAdapter: LlmProviderAdapter = {
  id: "openrouter",
  label: "OpenRouter",
  defaultApiKeyEnv: "OPENROUTER_API_KEY",
  createModel(ctx: LlmProviderContext): LanguageModel {
    const id = ctx.modelId.trim();
    if (id.length === 0) throw new Error("model is required");
    const envName = ctx.apiKeyEnv?.trim() || openrouterAdapter.defaultApiKeyEnv;
    const apiKey = readApiKey(envName);
    const baseURL =
      typeof ctx.baseURL === "string" && ctx.baseURL.trim().length > 0
        ? ctx.baseURL.trim()
        : OPENROUTER_DEFAULT_BASE_URL;
    const headers =
      ctx.headers !== null && ctx.headers !== undefined && typeof ctx.headers === "object"
        ? ctx.headers
        : undefined;
    const provider = createOpenAI({
      apiKey,
      baseURL,
      ...(headers !== undefined ? { headers } : {}),
      name: "openrouter",
    });
    return provider(id);
  },
};
