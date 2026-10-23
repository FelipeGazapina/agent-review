import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathHasDir } from "./path-utils.ts";
import type { CcccHotspot, CcccMetrics, ComplexityDistribution, HealthScope } from "./types.ts";

type CcccFunction = {
  name?: string;
  kind?: string;
  line?: number;
  cognitive?: number;
  cyclomatic?: number;
  children?: CcccFunction[];
};

type CcccFile = {
  path?: string;
  cognitive?: number;
  cyclomatic?: number;
  functions?: CcccFunction[];
  parse_errors?: string[];
};

type CcccJson = {
  files?: CcccFile[];
  summary?: {
    file_count?: number;
    function_count?: number;
    parse_error_count?: number;
    cognitive?: Partial<ComplexityDistribution>;
    cyclomatic?: Partial<ComplexityDistribution>;
  };
};

function emptyDistribution(): ComplexityDistribution {
  return { sum: 0, max: 0, median: 0, p90: 0, p95: 0 };
}

function asDistribution(raw: Partial<ComplexityDistribution> | undefined): ComplexityDistribution {
  if (raw === undefined) return emptyDistribution();
  return {
    sum: Number(raw.sum) || 0,
    max: Number(raw.max) || 0,
    median: Number(raw.median) || 0,
    p90: Number(raw.p90) || 0,
    p95: Number(raw.p95) || 0,
  };
}

function walkFunctions(fns: CcccFunction[], file: string, out: CcccHotspot[]): void {
  for (const fn of fns) {
    out.push({
      file,
      name: fn.name ?? "(anonymous)",
      line: Number(fn.line) || 0,
      cognitive: Number(fn.cognitive) || 0,
      cyclomatic: Number(fn.cyclomatic) || 0,
    });
    if (fn.children && fn.children.length > 0) {
      walkFunctions(fn.children, file, out);
    }
  }
}

export function normalizeCcccJson(
  raw: unknown,
  input: {
    repoRoot: string;
    scope: HealthScope;
    cognitiveHotspotThreshold: number;
    cyclomaticHotspotThreshold: number;
    topN: number;
  },
): CcccMetrics {
  const parsed = (raw ?? {}) as CcccJson;
  const all: CcccHotspot[] = [];

  for (const file of parsed.files ?? []) {
    const filePath = file.path ?? "";
    if (input.scope.excludeDirNames.some((d) => pathHasDir(filePath, d))) {
      continue;
    }
    const rel = path.isAbsolute(filePath) ? path.relative(input.repoRoot, filePath) : filePath;
    walkFunctions(file.functions ?? [], rel || filePath, all);
  }

  const cognitiveHotspots = all.filter((h) => h.cognitive >= input.cognitiveHotspotThreshold);
  const cyclomaticHotspots = all.filter((h) => h.cyclomatic >= input.cyclomaticHotspotThreshold);

  const byCognitive = [...all].sort((a, b) => b.cognitive - a.cognitive);
  const hotspots = byCognitive.slice(0, input.topN);

  return {
    tool: "cccc",
    available: true,
    cognitiveHotspotThreshold: input.cognitiveHotspotThreshold,
    cyclomaticHotspotThreshold: input.cyclomaticHotspotThreshold,
    cognitiveHotspotCount: cognitiveHotspots.length,
    cyclomaticHotspotCount: cyclomaticHotspots.length,
    fileCount: Number(parsed.summary?.file_count) || (parsed.files?.length ?? 0),
    functionCount: Number(parsed.summary?.function_count) || all.length,
    parseErrorCount: Number(parsed.summary?.parse_error_count) || 0,
    cognitive: asDistribution(parsed.summary?.cognitive),
    cyclomatic: asDistribution(parsed.summary?.cyclomatic),
    hotspots,
    raw,
  };
}

function unavailable(
  reason: string,
  thresholds: {
    cognitiveHotspotThreshold: number;
    cyclomaticHotspotThreshold: number;
  },
): CcccMetrics {
  return {
    tool: "cccc",
    available: false,
    skipReason: reason,
    cognitiveHotspotThreshold: thresholds.cognitiveHotspotThreshold,
    cyclomaticHotspotThreshold: thresholds.cyclomaticHotspotThreshold,
    cognitiveHotspotCount: 0,
    cyclomaticHotspotCount: 0,
    fileCount: 0,
    functionCount: 0,
    parseErrorCount: 0,
    cognitive: null,
    cyclomatic: null,
    hotspots: [],
  };
}

export function collectCcccMetrics(input: {
  repoRoot: string;
  scope: HealthScope;
  cognitiveHotspotThreshold: number;
  cyclomaticHotspotThreshold: number;
  topN: number;
}): CcccMetrics {
  const thresholds = {
    cognitiveHotspotThreshold: input.cognitiveHotspotThreshold,
    cyclomaticHotspotThreshold: input.cyclomaticHotspotThreshold,
  };
  const target = path.resolve(input.repoRoot, input.scope.path);
  const result = spawnSync("cccc", [target, "--pretty"], {
    encoding: "utf8",
    cwd: input.repoRoot,
    maxBuffer: 32 * 1024 * 1024,
  });

  if (result.error !== null && result.error !== undefined) {
    const code = (result.error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return unavailable("cccc not found on PATH (install: cargo install cccc-cli)", thresholds);
    }
    return unavailable(`cccc failed to start: ${result.error.message}`, thresholds);
  }

  const stdout = result.stdout?.trim() ?? "";
  if (!stdout) {
    return unavailable(
      result.stderr?.trim() || `cccc produced no JSON (exit ${String(result.status)})`,
      thresholds,
    );
  }

  try {
    const raw = JSON.parse(stdout) as unknown;
    return normalizeCcccJson(raw, {
      repoRoot: input.repoRoot,
      scope: input.scope,
      cognitiveHotspotThreshold: input.cognitiveHotspotThreshold,
      cyclomaticHotspotThreshold: input.cyclomaticHotspotThreshold,
      topN: input.topN,
    });
  } catch (err) {
    return unavailable(
      `cccc JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
      thresholds,
    );
  }
}
