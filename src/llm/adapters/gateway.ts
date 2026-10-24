import type { LanguageModel } from "ai";
import type { LlmProviderAdapter, LlmProviderContext } from "../types.ts";

function readApiKey(envName: string): string {
  const value = process.env[envName]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`${envName} environment variable not set`);
  }
  return value;
}

export const gatewayAdapter: LlmProviderAdapter = {
  id: "gateway",
  label: "Vercel AI Gateway",
  defaultApiKeyEnv: "AI_GATEWAY_API_KEY",
  createModel(ctx: LlmProviderContext): LanguageModel {
    const envName = ctx.apiKeyEnv?.trim() || gatewayAdapter.defaultApiKeyEnv;
    readApiKey(envName);
    const id = ctx.modelId.trim();
    if (id.length === 0) throw new Error("model is required");
    // AI SDK treats bare provider/model strings as AI Gateway models.
    return id;
  },
};
