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
      return { exitCode: 0, stdout: JSON.stringify(rest, null, 2) };
    }
    const lizard = collectLizardMetrics({
      repoRoot: input.cwd,
      scope,
      threshold: input.config.health.cyclomaticHotspotThreshold,
      topN: input.config.health.topN,
      vendorDir: lizardVendorDir(outputDirAbs),
    });
    return {
      exitCode: lizard.available ? 0 : 1,
      stdout: JSON.stringify(lizard, null, 2),
      message: lizard.available ? undefined : lizard.skipReason,
    };
  }

  if (input.subcommand === "scc") {
    const scc = collectSccMetrics({ repoRoot: input.cwd, scope });
    return {
      exitCode: scc.available ? 0 : 1,
      stdout: JSON.stringify(scc, null, 2),
      message: scc.available ? undefined : scc.skipReason,
    };
  }

  if (input.subcommand === "lizard") {
    const lizard = collectLizardMetrics({
      repoRoot: input.cwd,
      scope,
      threshold: input.config.health.cyclomaticHotspotThreshold,
      topN: input.config.health.topN,
      vendorDir: lizardVendorDir(outputDirAbs),
    });
    return {
      exitCode: lizard.available ? 0 : 1,
      stdout: JSON.stringify(lizard, null, 2),
      message: lizard.available ? undefined : lizard.skipReason,
    };
  }

  if (input.subcommand === "snapshot") {
    const snap = await writeHealthSnapshot({
      cwd: input.cwd,
      repoRoot: input.cwd,
      scope,
      health: input.config.health,
      outputDirAbs,
    });
    return {
      exitCode: 0,
      stdout: snap.relativeDir,
      message: `agent-review: health snapshot ${snap.relativeDir} (scope=${scope.id})\nagent-review: analyzed ${targetAbs}`,
    };
  }

  // all
  const { summary } = await collectHealthBundle({
    repoRoot: input.cwd,
    scope,
    health: input.config.health,
    outputDirAbs,
  });
  const stdout = input.json === true ? JSON.stringify(summary, null, 2) : summaryMarkdown(summary);
  return { exitCode: 0, stdout };
}
