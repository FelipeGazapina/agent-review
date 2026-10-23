/** Named analysis scope for code-health collectors. */
export type HealthScope = {
  id: string;
  /** Repo-relative path to analyze. */
  path: string;
  /** Exclude path segments (matched as directory names). */
  excludeDirNames: string[];
};

export type HealthScopeConfig = {
  path: string;
  excludeDirNames?: string[];
};

export type HealthConfig = {
  defaultScope: string;
  scopes: Record<string, HealthScopeConfig>;
  /** Functions at/above this cognitive score count as hotspots. */
  cognitiveHotspotThreshold: number;
  cyclomaticHotspotThreshold: number;
  topN: number;
  /** When true, also run lizard even if cccc succeeded. */
  alwaysRunLizard: boolean;
};

export type ComplexityDistribution = {
  sum: number;
  max: number;
  median: number;
  p90: number;
  p95: number;
};

export type CcccHotspot = {
  file: string;
  name: string;
  line: number;
  cognitive: number;
  cyclomatic: number;
};

export type CcccMetrics = {
  tool: "cccc";
  available: boolean;
  skipReason?: string;
  cognitiveHotspotThreshold: number;
  cyclomaticHotspotThreshold: number;
  cognitiveHotspotCount: number;
  cyclomaticHotspotCount: number;
  fileCount: number;
  functionCount: number;
  parseErrorCount: number;
  cognitive: ComplexityDistribution | null;
  cyclomatic: ComplexityDistribution | null;
  hotspots: CcccHotspot[];
  /** Raw cccc JSON when available (for snapshot sidecars). */
  raw?: unknown;
};

export type LizardHotspot = {
  file: string;
  name: string;
  ccn: number;
  nloc: number;
  line: number;
};

export type LizardMetrics = {
  tool: "lizard";
  available: boolean;
  skipReason?: string;
  threshold: number;
  totalNloc: number;
  functionCount: number;
  hotspotCount: number;
  maxCcn: number;
  avgCcn: number;
  topHotspots: LizardHotspot[];
};

export type SccLanguageRow = {
  name: string;
  files: number;
  code: number;
  comment: number;
  blank: number;
  complexity: number;
};

export type SccMetrics = {
  tool: "scc";
  available: boolean;
  skipReason?: string;
  totalFiles: number;
  totalCode: number;
  totalComment: number;
  totalBlank: number;
  totalComplexity: number;
  languages: SccLanguageRow[];
};

export type HealthSummary = {
  scope: string;
  createdAt: string;
  cccc: CcccMetrics;
  scc: SccMetrics;
  lizard: LizardMetrics | null;
};
