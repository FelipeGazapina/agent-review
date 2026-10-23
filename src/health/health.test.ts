import { describe, expect, test } from "bun:test";
import { DEFAULT_HEALTH_CONFIG, mergeHealthConfig, parseArgs } from "../config.ts";
import { normalizeCcccJson } from "./cccc-metrics.ts";
import { compareSummaries } from "./compare.ts";
import { asPosix, pathHasDir } from "./path-utils.ts";
import { buildSccArgs, normalizeSccJson } from "./scc-metrics.ts";
import { resolveHealthScope } from "./scopes.ts";
import { buildSummary, summaryMarkdown } from "./summarize.ts";
import type { HealthConfig, HealthSummary } from "./types.ts";

describe("path utils", () => {
  test("asPosix converts backslashes on any platform", () => {
    expect(asPosix("src\\health\\a.ts")).toBe("src/health/a.ts");
    expect(asPosix("src/health/a.ts")).toBe("src/health/a.ts");
  });

  test("pathHasDir matches directory segments with backslash paths", () => {
    expect(pathHasDir("src\\node_modules\\pkg\\index.js", "node_modules")).toBe(true);
    expect(pathHasDir("src/health/a.ts", "node_modules")).toBe(false);
  });
});

describe("resolveHealthScope", () => {
  test("defaults to root", () => {
    const scope = resolveHealthScope({ health: DEFAULT_HEALTH_CONFIG });
    expect(scope.id).toBe("root");
    expect(scope.path).toBe(".");
  });

  test("uses named scope from config", () => {
    const health = mergeHealthConfig(DEFAULT_HEALTH_CONFIG, {
      defaultScope: "src",
      scopes: { src: { path: "src", excludeDirNames: ["dist"] } },
    });
    const scope = resolveHealthScope({ health, scopeId: "src" });
    expect(scope).toEqual({ id: "src", path: "src", excludeDirNames: ["dist"] });
  });

  test("--path creates ad-hoc scope", () => {
    const scope = resolveHealthScope({
      health: DEFAULT_HEALTH_CONFIG,
      scopeId: "src",
      pathOverride: "apps/api",
    });
    expect(scope.id).toBe("path");
    expect(scope.path).toBe("apps/api");
  });

  test("unknown scope throws", () => {
    expect(() => resolveHealthScope({ health: DEFAULT_HEALTH_CONFIG, scopeId: "missing" })).toThrow(
      /Unknown health scope/,
    );
  });

  test("falls back to root when scopes is undefined", () => {
    const health = { ...DEFAULT_HEALTH_CONFIG, scopes: undefined } as unknown as HealthConfig;
    const scope = resolveHealthScope({ health });
    expect(scope.id).toBe("root");
    expect(scope.path).toBe(".");
  });
});

describe("normalizeCcccJson", () => {
  test("builds hotspots and counts from fixture JSON", () => {
    const raw = {
      files: [
        {
          path: "src/a.ts",
          functions: [
            { name: "hot", line: 10, cognitive: 20, cyclomatic: 5, children: [] },
            { name: "cool", line: 40, cognitive: 2, cyclomatic: 1, children: [] },
          ],
        },
      ],
      summary: {
        file_count: 1,
        function_count: 2,
        parse_error_count: 0,
        cognitive: { sum: 22, max: 20, median: 11, p90: 20, p95: 20 },
        cyclomatic: { sum: 6, max: 5, median: 3, p90: 5, p95: 5 },
      },
    };
    const metrics = normalizeCcccJson(raw, {
      repoRoot: "/repo",
      scope: { id: "root", path: ".", excludeDirNames: [] },
      cognitiveHotspotThreshold: 15,
      cyclomaticHotspotThreshold: 15,
      topN: 10,
    });
    expect(metrics.available).toBe(true);
    expect(metrics.cognitiveHotspotCount).toBe(1);
    expect(metrics.cyclomaticHotspotCount).toBe(0);
    expect(metrics.hotspots[0]?.name).toBe("hot");
    expect(metrics.cognitive?.max).toBe(20);
  });
});

describe("scc helpers", () => {
  test("buildSccArgs includes --exclude-dir", () => {
    expect(buildSccArgs("/repo/src", ["node_modules", "dist"])).toEqual([
      "--format",
      "json",
      "--exclude-dir",
      "node_modules",
      "--exclude-dir",
      "dist",
      "/repo/src",
    ]);
  });

  test("normalizeSccJson rolls up languages", () => {
    const metrics = normalizeSccJson([
      { Name: "TypeScript", Code: 100, Comment: 10, Blank: 5, Complexity: 3, Count: 2 },
      { Name: "Total", Code: 100, Count: 2 },
    ]);
    expect(metrics.available).toBe(true);
    expect(metrics.totalCode).toBe(100);
    expect(metrics.languages).toHaveLength(1);
  });
});

describe("summarize / compare", () => {
  function sample(overrides?: Partial<HealthSummary>): HealthSummary {
    const base = buildSummary({
      scope: "root",
      cccc: {
        tool: "cccc",
        available: true,
        cognitiveHotspotThreshold: 15,
        cyclomaticHotspotThreshold: 15,
        cognitiveHotspotCount: 3,
        cyclomaticHotspotCount: 1,
        fileCount: 10,
        functionCount: 40,
        parseErrorCount: 0,
        cognitive: { sum: 50, max: 22, median: 4, p90: 18, p95: 20 },
        cyclomatic: { sum: 30, max: 12, median: 2, p90: 8, p95: 10 },
        hotspots: [],
      },
      scc: {
        tool: "scc",
        available: true,
        totalFiles: 10,
        totalCode: 1000,
        totalComment: 100,
        totalBlank: 50,
        totalComplexity: 40,
        languages: [],
      },
      lizard: null,
    });
    return { ...base, ...overrides };
  }

  test("summaryMarkdown includes scope and hotspot table header", () => {
    const md = summaryMarkdown(sample());
    expect(md).toContain("# Code health: root");
    expect(md).toContain("Cognitive hotspots");
  });

  test("compareSummaries reports after − before deltas", () => {
    const before = sample();
    const after = sample({
      cccc: {
        ...before.cccc,
        cognitiveHotspotCount: 1,
        cognitive: { sum: 40, max: 15, median: 3, p90: 12, p95: 14 },
      },
    });
    const delta = compareSummaries(before, after);
    expect(delta.cognitiveHotspotCount).toBe(-2);
    expect(delta.cognitiveMax).toBe(-7);
  });
});

describe("parseArgs health", () => {
  test("parses health snapshot --scope and --path", () => {
    const args = parseArgs([
      "health",
      "snapshot",
      "--scope",
      "src",
      "--path",
      "apps/api",
      "--json",
    ]);
    expect(args.command).toBe("health");
    expect(args.healthSubcommand).toBe("snapshot");
    expect(args.healthScopeId).toBe("src");
    expect(args.path).toBe("apps/api");
    expect(args.json).toBe(true);
  });

  test("rejects unknown health subcommand", () => {
    expect(() => parseArgs(["health", "knip"])).toThrow(/health subcommand/);
  });
});

describe("mergeHealthConfig", () => {
  test("merges thresholds and replaces scopes when provided", () => {
    const merged = mergeHealthConfig(DEFAULT_HEALTH_CONFIG, {
      cognitiveHotspotThreshold: 20,
      scopes: { lib: { path: "lib" } },
    });
    expect(merged.cognitiveHotspotThreshold).toBe(20);
    expect(merged.scopes.lib?.path).toBe("lib");
    expect(merged.scopes.root).toBeUndefined();
  });
});
