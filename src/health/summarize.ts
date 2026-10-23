import type { HealthSummary } from "./types.ts";

export function buildSummary(input: {
  scope: string;
  cccc: HealthSummary["cccc"];
  scc: HealthSummary["scc"];
  lizard: HealthSummary["lizard"];
}): HealthSummary {
  return {
    scope: input.scope,
    createdAt: new Date().toISOString(),
    cccc: input.cccc,
    scc: input.scc,
    lizard: input.lizard,
  };
}

export function summaryMarkdown(summary: HealthSummary): string {
  const cccc = summary.cccc;
  const scc = summary.scc;
  const lizard = summary.lizard;

  const ccccBlock = cccc.available
    ? `| Metric | Value |
|---|---:|
| Files | ${cccc.fileCount} |
| Functions | ${cccc.functionCount} |
| Parse errors | ${cccc.parseErrorCount} |
| Cognitive max / p95 | ${cccc.cognitive?.max ?? "—"} / ${cccc.cognitive?.p95 ?? "—"} |
| Cyclomatic max / p95 | ${cccc.cyclomatic?.max ?? "—"} / ${cccc.cyclomatic?.p95 ?? "—"} |
| Cognitive hotspots (≥ ${cccc.cognitiveHotspotThreshold}) | ${cccc.cognitiveHotspotCount} |
| Cyclomatic hotspots (≥ ${cccc.cyclomaticHotspotThreshold}) | ${cccc.cyclomaticHotspotCount} |`
    : `Unavailable: ${cccc.skipReason ?? "unknown"}`;

  const hotspotRows = cccc.hotspots
    .slice(0, 10)
    .map(
      (h) =>
        `| ${h.cognitive} | ${h.cyclomatic} | \`${h.file}:${h.line}\` | ${h.name.replace(/\|/g, "/")} |`,
    )
    .join("\n");

  const langRows = scc.languages
    .slice(0, 15)
    .map((l) => `| ${l.name} | ${l.files} | ${l.code} | ${l.complexity} |`)
    .join("\n");

  const sccBlock = scc.available
    ? `| Metric | Value |
|---|---:|
| Files | ${scc.totalFiles} |
| Code lines | ${scc.totalCode} |
| Comment | ${scc.totalComment} |
| Blank | ${scc.totalBlank} |
| Complexity (heuristic) | ${scc.totalComplexity} |

### Languages

| Language | Files | Code | Complexity |
|---|---:|---:|---:|
${langRows || "| — | 0 | 0 | 0 |"}`
    : `Unavailable: ${scc.skipReason ?? "unknown"}`;

  let lizardBlock = "_Not run_";
  if (lizard !== null) {
    lizardBlock = lizard.available
      ? `| Metric | Value |
|---|---:|
| Functions | ${lizard.functionCount} |
| Total NLOC | ${lizard.totalNloc} |
| Max CCN | ${lizard.maxCcn} |
| Avg CCN | ${lizard.avgCcn} |
| Hotspots (CCN ≥ ${lizard.threshold}) | ${lizard.hotspotCount} |`
      : `Unavailable: ${lizard.skipReason ?? "unknown"}`;
  }

  return `# Code health: ${summary.scope}

Generated: ${summary.createdAt}

## cccc (cognitive + cyclomatic)

${ccccBlock}

### Top hotspots (by cognitive)

| Cognitive | Cyclomatic | Location | Name |
|---:|---:|---|---|
${hotspotRows || "| — | — | — | — |"}

## scc (volume)

${sccBlock}

## lizard (fallback)

${lizardBlock}
`;
}
