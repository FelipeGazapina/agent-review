import { registerBuiltInAdapters } from "./builtins.ts";

registerBuiltInAdapters();

export { gatewayAdapter } from "./adapters/gateway.ts";
export { ensureBuiltInAdapters, registerBuiltInAdapters } from "./builtins.ts";
export {
  clearAdaptersForTests,
  getAdapter,
  listProviderIds,
  registerAdapter,
} from "./registry.ts";
export { resolveLanguageModel } from "./resolve.ts";
export {
  DEFAULT_LLM_CONFIG,
  type LlmConfig,
  type LlmProviderAdapter,
  type LlmProviderContext,
} from "./types.ts";
