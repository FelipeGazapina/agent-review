import { gatewayAdapter } from "./adapters/gateway.ts";
import { registerAdapter } from "./registry.ts";

registerAdapter(gatewayAdapter);

export { gatewayAdapter } from "./adapters/gateway.ts";
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
