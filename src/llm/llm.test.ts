import { afterEach, describe, expect, test } from "bun:test";
import {
  clearAdaptersForTests,
  ensureBuiltInAdapters,
  listProviderIds,
  OPENROUTER_DEFAULT_BASE_URL,
  registerBuiltInAdapters,
  resolveLanguageModel,
} from "./index.ts";

const PREV_GATEWAY = process.env.AI_GATEWAY_API_KEY;
const PREV_OPENROUTER = process.env.OPENROUTER_API_KEY;
const PREV_OPENAI = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (PREV_GATEWAY === undefined) delete process.env.AI_GATEWAY_API_KEY;
  else process.env.AI_GATEWAY_API_KEY = PREV_GATEWAY;
  if (PREV_OPENROUTER === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = PREV_OPENROUTER;
  if (PREV_OPENAI === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = PREV_OPENAI;
  clearAdaptersForTests();
  registerBuiltInAdapters();
});

describe("llm registry", () => {
  test("lists built-in providers including openrouter", () => {
    ensureBuiltInAdapters();
    const ids = listProviderIds();
    expect(ids).toContain("gateway");
    expect(ids).toContain("openrouter");
    expect(ids).toContain("openai");
    expect(ids).toContain("anthropic");
    expect(ids).toContain("openai-compatible");
  });

  test("unknown provider throws with known list", () => {
    expect(() => resolveLanguageModel("m", { provider: "nope" })).toThrow(/Unknown llm provider/);
  });

  test("ensureBuiltInAdapters recovers after clear", () => {
    clearAdaptersForTests();
    expect(listProviderIds()).toEqual([]);
    ensureBuiltInAdapters();
    expect(listProviderIds()).toContain("gateway");
  });
});

describe("gateway adapter", () => {
  test("requires AI_GATEWAY_API_KEY", () => {
    delete process.env.AI_GATEWAY_API_KEY;
    expect(() => resolveLanguageModel("google/x", { provider: "gateway" })).toThrow(
      /AI_GATEWAY_API_KEY/,
    );
  });

  test("returns trimmed model id string", () => {
    process.env.AI_GATEWAY_API_KEY = "gw-key";
    expect(resolveLanguageModel("  google/gemini  ", { provider: "gateway" })).toBe(
      "google/gemini",
    );
  });

  test("rejects baseURL and headers", () => {
    process.env.AI_GATEWAY_API_KEY = "gw-key";
    expect(() =>
      resolveLanguageModel("google/x", { provider: "gateway", baseURL: "https://example.com" }),
    ).toThrow(/baseURL/);
    expect(() =>
      resolveLanguageModel("google/x", {
        provider: "gateway",
        headers: { "X-Title": "x" },
      }),
    ).toThrow(/headers/);
  });
});

describe("openrouter adapter", () => {
  test("requires OPENROUTER_API_KEY", () => {
    delete process.env.OPENROUTER_API_KEY;
    expect(() => resolveLanguageModel("google/x", { provider: "openrouter" })).toThrow(
      /OPENROUTER_API_KEY/,
    );
  });

  test("creates a language model with default base URL constant", () => {
    process.env.OPENROUTER_API_KEY = "or-key";
    const model = resolveLanguageModel("google/gemini-2.5-flash", { provider: "openrouter" });
    expect(model).not.toBeTypeOf("string");
    expect(OPENROUTER_DEFAULT_BASE_URL).toBe("https://openrouter.ai/api/v1");
  });
});

describe("openai-compatible adapter", () => {
  test("requires baseURL", () => {
    process.env.OPENAI_API_KEY = "k";
    expect(() => resolveLanguageModel("gpt-4o", { provider: "openai-compatible" })).toThrow(
      /baseURL/,
    );
  });
});
