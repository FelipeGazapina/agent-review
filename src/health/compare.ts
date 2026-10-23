import type { HealthSummary } from "./types.ts";

export type HealthDelta = {
  cognitiveHotspotCount: number | null;
  cyclomaticHotspotCount: number | null;
  cognitiveMax: number | null;
  cyclomaticMax: number | null;
  cognitiveP95: number | null;
  sccTotalCode: number | null;
  lizardHotspotCount: number | null;
};

function numDelta(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a === null || a === undefined || b === null || b === undefined) return null;
  return b - a;
}

/** Delta = after − before. Negative hotspot/max deltas are improvements. */
export function compareSummaries(before: HealthSummary, after: HealthSummary): HealthDelta {
  return {
    cognitiveHotspotCount: numDelta(
      before.cccc.available ? before.cccc.cognitiveHotspotCount : null,
      after.cccc.available ? after.cccc.cognitiveHotspotCount : null,
    ),
    cyclomaticHotspotCount: numDelta(
      before.cccc.available ? before.cccc.cyclomaticHotspotCount : null,
      after.cccc.available ? after.cccc.cyclomaticHotspotCount : null,
    ),
    cognitiveMax: numDelta(before.cccc.cognitive?.max ?? null, after.cccc.cognitive?.max ?? null),
    cyclomaticMax: numDelta(
      before.cccc.cyclomatic?.max ?? null,
      after.cccc.cyclomatic?.max ?? null,
    ),
    cognitiveP95: numDelta(before.cccc.cognitive?.p95 ?? null, after.cccc.cognitive?.p95 ?? null),
    sccTotalCode: numDelta(
      before.scc.available ? before.scc.totalCode : null,
      after.scc.available ? after.scc.totalCode : null,
    ),
    lizardHotspotCount: numDelta(
      before.lizard?.available ? before.lizard.hotspotCount : null,
      after.lizard?.available ? after.lizard.hotspotCount : null,
    ),
  };
}

export function formatDeltaMarkdown(delta: HealthDelta): string {
  const row = (label: string, value: number | null): string =>
    `| ${label} | ${value === null ? "—" : value > 0 ? `+${value}` : String(value)} |`;

  return `| Field | Δ (after − before) |
|---|---:|
${row("Cognitive hotspots", delta.cognitiveHotspotCount)}
${row("Cyclomatic hotspots", delta.cyclomaticHotspotCount)}
${row("Cognitive max", delta.cognitiveMax)}
${row("Cyclomatic max", delta.cyclomaticMax)}
${row("Cognitive p95", delta.cognitiveP95)}
${row("scc code lines", delta.sccTotalCode)}
${row("lizard hotspots", delta.lizardHotspotCount)}
`;
}
