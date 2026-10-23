import path from "node:path";
import type { AgentReviewConfig, HealthSubcommand } from "../config.ts";
import {
  collectCcccMetrics,
  collectHealthBundle,
  collectLizardMetrics,
  collectSccMetrics,
  lizardVendorDir,
  resolveHealthScope,
  summaryMarkdown,
  writeHealthSnapshot,
} from "../health/index.ts";
import type { HealthScope } from "../health/types.ts";
import { resolveOutputDir } from "../lib/observability.ts";

export type HealthPhaseInput = {
  config: AgentReviewConfig;
  cwd: string;
  subcommand: HealthSubcommand;
  healthScopeId?: string;
  pathOverride?: string;
  json?: boolean;
};

export type HealthPhaseOutcome = {
  exitCode: number;
  message?: string;
  /** Printed on stdout (path for snapshot, or empty when body already printed). */
  stdout?: string;
};

export async function runHealthPhase(input: HealthPhaseInput): Promise<HealthPhaseOutcome> {
  const outputDirAbs = resolveOutputDir(input.cwd, input.config.outputDir);

  let scope: HealthScope;
  try {
    scope = resolveHealthScope({
      health: input.config.health,
      scopeId: input.healthScopeId,
      pathOverride: input.pathOverride,
    });
  } catch (err) {
    return {
      exitCode: 2,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  const targetAbs = path.resolve(input.cwd, scope.path);
  if (input.subcommand === "complexity") {
    const cccc = collectCcccMetrics({
      repoRoot: input.cwd,
      scope,
      cognitiveHotspotThreshold: input.config.health.cognitiveHotspotThreshold,
      cyclomaticHotspotThreshold: input.config.health.cyclomaticHotspotThreshold,
      topN: input.config.health.topN,
    });
    if (cccc.available) {
      const { raw: _raw, ...rest } = cccc;
      console.log(JSON.stringify(rest, null, 2));
      return { exitCode: 0 };
    }
    const lizard = collectLizardMetrics({
      repoRoot: input.cwd,
      scope,
      threshold: input.config.health.cyclomaticHotspotThreshold,
      topN: input.config.health.topN,
      vendorDir: lizardVendorDir(outputDirAbs),
    });
    console.log(JSON.stringify(lizard, null, 2));
    return { exitCode: lizard.available ? 0 : 0 };
  }

  if (input.subcommand === "scc") {
    const scc = collectSccMetrics({ repoRoot: input.cwd, scope });
    console.log(JSON.stringify(scc, null, 2));
    return { exitCode: 0 };
  }

  if (input.subcommand === "lizard") {
    const lizard = collectLizardMetrics({
      repoRoot: input.cwd,
      scope,
      threshold: input.config.health.cyclomaticHotspotThreshold,
      topN: input.config.health.topN,
      vendorDir: lizardVendorDir(outputDirAbs),
    });
    console.log(JSON.stringify(lizard, null, 2));
    return { exitCode: 0 };
  }

  if (input.subcommand === "snapshot") {
    const snap = await writeHealthSnapshot({
      cwd: input.cwd,
      repoRoot: input.cwd,
      scope,
      health: input.config.health,
      outputDirAbs,
    });
    console.error(`agent-review: health snapshot ${snap.relativeDir} (scope=${scope.id})`);
    console.error(`agent-review: analyzed ${targetAbs}`);
    return { exitCode: 0, stdout: snap.relativeDir };
  }

  // all
  const { summary } = await collectHealthBundle({
    repoRoot: input.cwd,
    scope,
    health: input.config.health,
    outputDirAbs,
  });
  if (input.json === true) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(summaryMarkdown(summary));
  }
  return { exitCode: 0 };
}
