import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { collectCcccMetrics } from "./cccc-metrics.ts";
import { collectLizardMetrics } from "./lizard-metrics.ts";
import { collectSccMetrics } from "./scc-metrics.ts";
import { buildSummary, summaryMarkdown } from "./summarize.ts";
import type { HealthConfig, HealthScope, HealthSummary, LizardMetrics } from "./types.ts";

export type HealthRunMode = "all" | "snapshot" | "complexity" | "scc" | "lizard";

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function healthOutputRoot(outputDirAbs: string): string {
  return path.join(outputDirAbs, "code-health");
}

export function lizardVendorDir(outputDirAbs: string): string {
  return path.join(healthOutputRoot(outputDirAbs), ".vendor", "lizard-pkg");
}

function stripRaw(cccc: HealthSummary["cccc"]): HealthSummary["cccc"] {
  const { raw: _raw, ...rest } = cccc;
  return rest;
}

export async function collectHealthBundle(input: {
  repoRoot: string;
  scope: HealthScope;
  health: HealthConfig;
  outputDirAbs: string;
  /** Force lizard even when alwaysRunLizard is false (e.g. lizard subcommand). */
  forceLizard?: boolean;
}): Promise<{
  summary: HealthSummary;
  ccccRaw: unknown | undefined;
}> {
  const cccc = collectCcccMetrics({
    repoRoot: input.repoRoot,
    scope: input.scope,
    cognitiveHotspotThreshold: input.health.cognitiveHotspotThreshold,
    cyclomaticHotspotThreshold: input.health.cyclomaticHotspotThreshold,
    topN: input.health.topN,
  });

  const scc = collectSccMetrics({
    repoRoot: input.repoRoot,
    scope: input.scope,
  });

  const runLizard = input.forceLizard === true || input.health.alwaysRunLizard || !cccc.available;

  let lizard: LizardMetrics | null = null;
  if (runLizard) {
    lizard = collectLizardMetrics({
      repoRoot: input.repoRoot,
      scope: input.scope,
      threshold: input.health.cyclomaticHotspotThreshold,
      topN: input.health.topN,
      vendorDir: lizardVendorDir(input.outputDirAbs),
    });
  }

  const ccccRaw = cccc.raw;
  const summary = buildSummary({
    scope: input.scope.id,
    cccc: stripRaw(cccc),
    scc,
    lizard,
  });

  return { summary, ccccRaw };
}

export type SnapshotResult = {
  summary: HealthSummary;
  absoluteDir: string;
  relativeDir: string;
  latestPath: string;
};

export async function writeHealthSnapshot(input: {
  cwd: string;
  repoRoot: string;
  scope: HealthScope;
  health: HealthConfig;
  outputDirAbs: string;
}): Promise<SnapshotResult> {
  const { summary, ccccRaw } = await collectHealthBundle({
    repoRoot: input.repoRoot,
    scope: input.scope,
    health: input.health,
    outputDirAbs: input.outputDirAbs,
  });

  const root = healthOutputRoot(input.outputDirAbs);
  const dirName = `${stamp()}-${input.scope.id}`;
  const absoluteDir = path.join(root, dirName);
  mkdirSync(absoluteDir, { recursive: true });

  writeFileSync(path.join(absoluteDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(path.join(absoluteDir, "summary.md"), summaryMarkdown(summary));

  if (ccccRaw !== undefined) {
    writeFileSync(path.join(absoluteDir, "cccc.json"), `${JSON.stringify(ccccRaw, null, 2)}\n`);
  } else {
    writeFileSync(
      path.join(absoluteDir, "cccc.json"),
      `${JSON.stringify(summary.cccc, null, 2)}\n`,
    );
  }
  writeFileSync(path.join(absoluteDir, "scc.json"), `${JSON.stringify(summary.scc, null, 2)}\n`);
  if (summary.lizard !== null) {
    writeFileSync(
      path.join(absoluteDir, "lizard.json"),
      `${JSON.stringify(summary.lizard, null, 2)}\n`,
    );
  }

  const latestPath = path.join(root, `latest-${input.scope.id}.json`);
  writeFileSync(latestPath, `${JSON.stringify(summary, null, 2)}\n`);

  return {
    summary,
    absoluteDir,
    relativeDir: path.relative(input.cwd, absoluteDir),
    latestPath,
  };
}
