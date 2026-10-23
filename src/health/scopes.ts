import type { HealthConfig, HealthScope, HealthScopeConfig } from "./types.ts";

export const DEFAULT_EXCLUDE_DIR_NAMES = [
  "node_modules",
  ".git",
  "dist",
  ".data",
  "coverage",
  "vendor",
  "target",
] as const;

export const DEFAULT_ROOT_SCOPE: HealthScopeConfig = {
  path: ".",
  excludeDirNames: [...DEFAULT_EXCLUDE_DIR_NAMES],
};

export function scopeFromConfig(id: string, config: HealthScopeConfig): HealthScope {
  return {
    id,
    path: config.path,
    excludeDirNames: config.excludeDirNames ?? [...DEFAULT_EXCLUDE_DIR_NAMES],
  };
}

/**
 * Resolve a health scope from config, optional CLI scope id, and optional `--path`.
 * `--path` wins and creates an ad-hoc scope id `path`.
 */
export function resolveHealthScope(input: {
  health: HealthConfig;
  scopeId?: string;
  pathOverride?: string;
}): HealthScope {
  const pathOverride = input.pathOverride?.trim();
  if (pathOverride !== undefined && pathOverride.length > 0) {
    return {
      id: "path",
      path: pathOverride,
      excludeDirNames: [...DEFAULT_EXCLUDE_DIR_NAMES],
    };
  }

  const id = (input.scopeId?.trim() || input.health.defaultScope || "root").trim();
  const fromConfig = input.health.scopes[id];
  if (fromConfig !== undefined) {
    return scopeFromConfig(id, fromConfig);
  }

  if (id === "root") {
    return scopeFromConfig("root", DEFAULT_ROOT_SCOPE);
  }

  const known = Object.keys(input.health.scopes);
  const hint = known.length > 0 ? known.join(", ") : "root (default)";
  throw new Error(`Unknown health scope "${id}". Known: ${hint}`);
}
