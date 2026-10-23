import { spawnSync } from "node:child_process";
import path from "node:path";
import type { HealthScope, SccLanguageRow, SccMetrics } from "./types.ts";

type SccRow = {
  Name?: string;
  Bytes?: number;
  CodeBytes?: number;
  Lines?: number;
  Code?: number;
  Comment?: number;
  Blank?: number;
  Complexity?: number;
  Count?: number;
  WeightedComplexity?: number;
  Files?: number;
};

function unavailable(reason: string): SccMetrics {
  return {
    tool: "scc",
    available: false,
    skipReason: reason,
    totalFiles: 0,
    totalCode: 0,
    totalComment: 0,
    totalBlank: 0,
    totalComplexity: 0,
    languages: [],
  };
}

export function normalizeSccJson(raw: unknown): SccMetrics {
  const rows = Array.isArray(raw) ? (raw as SccRow[]) : [];
  const languages: SccLanguageRow[] = [];
  let totalFiles = 0;
  let totalCode = 0;
  let totalComment = 0;
  let totalBlank = 0;
  let totalComplexity = 0;

  for (const row of rows) {
    const name = row.Name ?? "Unknown";
    if (name === "Total") continue;
    const files = Number(row.Count ?? row.Files) || 0;
    const code = Number(row.Code) || 0;
    const comment = Number(row.Comment) || 0;
    const blank = Number(row.Blank) || 0;
    const complexity = Number(row.Complexity) || 0;
    languages.push({ name, files, code, comment, blank, complexity });
    totalFiles += files;
    totalCode += code;
    totalComment += comment;
    totalBlank += blank;
    totalComplexity += complexity;
  }

  languages.sort((a, b) => b.code - a.code);

  return {
    tool: "scc",
    available: true,
    totalFiles,
    totalCode,
    totalComment,
    totalBlank,
    totalComplexity,
    languages,
  };
}

/** Build scc argv including --exclude-dir for each scope exclude (exported for tests). */
export function buildSccArgs(target: string, excludeDirNames: string[]): string[] {
  const args = ["--format", "json"];
  for (const dir of excludeDirNames) {
    const trimmed = dir.trim();
    if (trimmed.length > 0) args.push("--exclude-dir", trimmed);
  }
  args.push(target);
  return args;
}

export function collectSccMetrics(input: { repoRoot: string; scope: HealthScope }): SccMetrics {
  const target = path.resolve(input.repoRoot, input.scope.path);
  const args = buildSccArgs(target, input.scope.excludeDirNames);
  const result = spawnSync("scc", args, {
    encoding: "utf8",
    cwd: input.repoRoot,
    maxBuffer: 32 * 1024 * 1024,
  });

  if (result.error !== null && result.error !== undefined) {
    const code = (result.error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return unavailable("scc not found on PATH (optional; install boyter/scc)");
    }
    return unavailable(`scc failed to start: ${result.error.message}`);
  }

  const stdout = result.stdout?.trim() ?? "";
  if (!stdout) {
    return unavailable(
      result.stderr?.trim() || `scc produced no JSON (exit ${String(result.status)})`,
    );
  }

  try {
    return normalizeSccJson(JSON.parse(stdout) as unknown);
  } catch (err) {
    return unavailable(
      `scc JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
