import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { readApiKey } from "../api-key.ts";
import type { LlmProviderAdapter, LlmProviderContext } from "../types.ts";

export const openaiCompatibleAdapter: LlmProviderAdapter = {
  id: "openai-compatible",
  label: "OpenAI-compatible",
  defaultApiKeyEnv: "OPENAI_API_KEY",
  createModel(ctx: LlmProviderContext): LanguageModel {
    const id = ctx.modelId.trim();
    if (id.length === 0) throw new Error("model is required");
    if (typeof ctx.baseURL !== "string" || ctx.baseURL.trim().length === 0) {
      throw new Error("openai-compatible provider requires llm.baseURL");
    }
    const envName = ctx.apiKeyEnv?.trim() || openaiCompatibleAdapter.defaultApiKeyEnv;
    const apiKey = readApiKey(envName);
    const headers =
      ctx.headers !== null && ctx.headers !== undefined && typeof ctx.headers === "object"
        ? ctx.headers
        : undefined;
    const provider = createOpenAI({
      apiKey,
      baseURL: ctx.baseURL.trim(),
      name: "openai-compatible",
      ...(headers !== undefined ? { headers } : {}),
    });
    return provider(id) as LanguageModel;
  },
};
