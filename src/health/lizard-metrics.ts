import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathHasDir } from "./path-utils.ts";
import type { HealthScope, LizardHotspot, LizardMetrics } from "./types.ts";

function unavailable(reason: string, threshold: number): LizardMetrics {
  return {
    tool: "lizard",
    available: false,
    skipReason: reason,
    threshold,
    totalNloc: 0,
    functionCount: 0,
    hotspotCount: 0,
    maxCcn: 0,
    avgCcn: 0,
    topHotspots: [],
  };
}

function lizardEnv(vendorDir: string): NodeJS.ProcessEnv {
  const pythonPath = [vendorDir, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter);
  return { ...process.env, PYTHONPATH: pythonPath };
}

function systemLizardAvailable(): boolean {
  const result = spawnSync("lizard", ["--version"], { encoding: "utf8" });
  return result.status === 0;
}

function ensureVendor(vendorDir: string): boolean {
  if (existsSync(path.join(vendorDir, "lizard.py"))) return true;
  mkdirSync(vendorDir, { recursive: true });
  const result = spawnSync("python3", ["-m", "pip", "install", "lizard", "-t", vendorDir, "-q"], {
    encoding: "utf8",
  });
  return result.status === 0 && existsSync(path.join(vendorDir, "lizard.py"));
}

function runLizardCsv(targetPath: string, vendorDir: string): string | null {
  const attempts: { cmd: string; args: string[]; env?: NodeJS.ProcessEnv }[] = [];

  if (systemLizardAvailable()) {
    attempts.push({ cmd: "lizard", args: [targetPath, "--csv"] });
  } else if (ensureVendor(vendorDir)) {
    attempts.push({
      cmd: "python3",
      args: ["-m", "lizard", targetPath, "--csv"],
      env: lizardEnv(vendorDir),
    });
  }

  for (const attempt of attempts) {
    const result = spawnSync(attempt.cmd, attempt.args, {
      encoding: "utf8",
      env: attempt.env ?? process.env,
      maxBuffer: 32 * 1024 * 1024,
    });
    if (result.status === 0 && result.stdout) return result.stdout;
  }
  return null;
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === undefined) continue;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cols.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cols.push(cur);
  return cols;
}

/**
 * Parse lizard CSV. Columns (typical):
 * NLOC,CCN,token,PARAM,length,location,file,function,...,start,end
 */
export function parseLizardCsv(
  csv: string,
  input: {
    repoRoot: string;
    scope: HealthScope;
    threshold: number;
    topN: number;
  },
): LizardMetrics {
  const hotspots: LizardHotspot[] = [];
  let totalNloc = 0;
  let functionCount = 0;
  let ccnSum = 0;
  let maxCcn = 0;

  for (const line of csv.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("NLOC")) continue;
    const cols = parseCsvLine(trimmed);
    if (cols.length < 8) continue;
    const nloc = Number(cols[0]);
    const ccn = Number(cols[1]);
    const fileRaw = cols[6] ?? "";
    const name = cols[7] ?? "";
    const parsedLine = Number(cols[cols.length - 2] ?? 0);
    const lineNo = Number.isFinite(parsedLine) ? parsedLine : 0;
    if (!Number.isFinite(ccn) || !Number.isFinite(nloc)) continue;

    if (input.scope.excludeDirNames.some((d) => pathHasDir(fileRaw, d))) {
      continue;
    }

    functionCount += 1;
    totalNloc += nloc;
    ccnSum += ccn;
    maxCcn = Math.max(maxCcn, ccn);
    if (ccn >= input.threshold) {
      const absOrRel = path.isAbsolute(fileRaw) ? path.relative(input.repoRoot, fileRaw) : fileRaw;
      hotspots.push({
        file: absOrRel || fileRaw,
        name,
        ccn,
        nloc,
        line: lineNo,
      });
    }
  }

  hotspots.sort((a, b) => b.ccn - a.ccn);

  return {
    tool: "lizard",
    available: true,
    threshold: input.threshold,
    totalNloc,
    functionCount,
    hotspotCount: hotspots.length,
    maxCcn,
    avgCcn: functionCount === 0 ? 0 : Number((ccnSum / functionCount).toFixed(2)),
    topHotspots: hotspots.slice(0, input.topN),
  };
}

export function collectLizardMetrics(input: {
  repoRoot: string;
  scope: HealthScope;
  threshold: number;
  topN: number;
  /** Directory for on-demand pip install of lizard (under outputDir/code-health/.vendor). */
  vendorDir: string;
}): LizardMetrics {
  const target = path.resolve(input.repoRoot, input.scope.path);
  const csv = runLizardCsv(target, input.vendorDir);
  if (csv === null) {
    return unavailable(
      "lizard not available (install system lizard or python3 + pip)",
      input.threshold,
    );
  }
  return parseLizardCsv(csv, {
    repoRoot: input.repoRoot,
    scope: input.scope,
    threshold: input.threshold,
    topN: input.topN,
  });
}
