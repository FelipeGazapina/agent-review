import type { LlmProviderAdapter } from "./types.ts";

const adapters = new Map<string, LlmProviderAdapter>();

export function registerAdapter(adapter: LlmProviderAdapter): void {
  const id = adapter.id.trim();
  if (id.length === 0) {
    throw new Error("llm provider adapter id is required");
  }
  adapters.set(id, adapter);
}

export function getAdapter(providerId: string): LlmProviderAdapter {
  const id = providerId.trim();
  if (id.length === 0) {
    throw new Error("llm provider is required");
  }
  const adapter = adapters.get(id);
  if (adapter === undefined) {
    const known = listProviderIds();
    const hint = known.length > 0 ? known.join(", ") : "(none registered)";
    throw new Error(`Unknown llm provider "${id}". Known: ${hint}`);
  }
  return adapter;
}

export function listProviderIds(): string[] {
  return [...adapters.keys()].sort();
}

/** Test helper: clear registry (re-register built-ins after). */
export function clearAdaptersForTests(): void {
  adapters.clear();
}
