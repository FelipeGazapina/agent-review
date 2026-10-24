import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { readApiKey } from "../api-key.ts";
import type { LlmProviderAdapter, LlmProviderContext } from "../types.ts";

export const openaiAdapter: LlmProviderAdapter = {
  id: "openai",
  label: "OpenAI",
  defaultApiKeyEnv: "OPENAI_API_KEY",
  createModel(ctx: LlmProviderContext): LanguageModel {
    const id = ctx.modelId.trim();
    if (id.length === 0) throw new Error("model is required");
    const envName = ctx.apiKeyEnv?.trim() || openaiAdapter.defaultApiKeyEnv;
    const apiKey = readApiKey(envName);
    const baseURL =
      typeof ctx.baseURL === "string" && ctx.baseURL.trim().length > 0
        ? ctx.baseURL.trim()
        : undefined;
    const headers =
      ctx.headers !== null && ctx.headers !== undefined && typeof ctx.headers === "object"
        ? ctx.headers
        : undefined;
    const provider = createOpenAI({
      apiKey,
      ...(baseURL !== undefined ? { baseURL } : {}),
      ...(headers !== undefined ? { headers } : {}),
    });
    return provider(id) as LanguageModel;
  },
};
