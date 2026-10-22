import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  packagedExampleConfigPath,
  packagedOperatorSkillPath,
  resolvePackageRoot,
} from "./package-root.ts";

export type InitOptions = {
  cwd?: string;
  force?: boolean;
  /** Injectable for tests. */
  runSkillsCli?: (
    args: string[],
    opts: { cwd?: string; env?: NodeJS.ProcessEnv },
  ) => { exitCode: number; stdout: string; stderr: string };
};

export type InitResult = {
  configPath: string;
  configWritten: boolean;
  skillPath: string;
  skillWritten: boolean;
  messages: string[];
};

function writeIfNeeded(dest: string, contents: string, force: boolean, mode?: number): boolean {
  if (existsSync(dest) && !force) return false;
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, contents, mode !== undefined ? { mode } : undefined);
  if (mode !== undefined) {
    try {
      chmodSync(dest, mode);
    } catch {
      // Best-effort: some filesystems ignore or reject chmod after write.
    }
  }
  return true;
}

function defaultSkillsCliRunner(
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv },
): { exitCode: number; stdout: string; stderr: string } {
  try {
    const result = Bun.spawnSync(["bunx", "skills", ...args], {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      exitCode: result.exitCode ?? 1,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `failed to spawn bunx skills: ${message}` };
  }
}

function installOperatorSkill(opts: {
  cwd: string;
  force: boolean;
  runSkillsCli: NonNullable<InitOptions["runSkillsCli"]>;
}): boolean {
  const skillPath = path.join(opts.cwd, ".agents", "skills", "agent-review");
  if (existsSync(skillPath) && !opts.force) return false;

  const packageRoot = resolvePackageRoot();
  const leaf = packagedOperatorSkillPath();
  if (!existsSync(path.join(leaf, "SKILL.md"))) {
    throw new Error(`operator skill not found at ${leaf}`);
  }

  if (opts.force && existsSync(skillPath)) {
    const remove = opts.runSkillsCli(["remove", "agent-review", "-y"], { cwd: opts.cwd });
    if (remove.exitCode !== 0) {
      console.warn(
        `skills remove exited ${remove.exitCode}: ${remove.stderr.trim() || remove.stdout.trim()}`,
      );
      rmSync(skillPath, { recursive: true, force: true });
    }
  }

  const add = opts.runSkillsCli(["add", packageRoot, "--skill", "agent-review", "-y"], {
    cwd: opts.cwd,
  });
  if (add.exitCode !== 0) {
    throw new Error(
      `bunx skills add failed (${add.exitCode}): ${add.stderr.trim() || add.stdout.trim()}`,
    );
  }
  if (!existsSync(path.join(skillPath, "SKILL.md"))) {
    throw new Error(
      `bunx skills add reported success but ${skillPath}/SKILL.md is missing:\n${add.stdout}\n${add.stderr}`,
    );
  }
  return true;
}

/** Scaffold config and operator skill for a consumer repo (husky hook: see `hook`). */
export function runInit(options: InitOptions = {}): InitResult {
  const cwd = options.cwd ?? process.cwd();
  const force = options.force === true;
  const messages: string[] = [];
  const runSkillsCli = options.runSkillsCli ?? defaultSkillsCliRunner;

  const configPath = path.join(cwd, ".agent-review.json");
  const examplePath = packagedExampleConfigPath();
  const example = existsSync(examplePath)
    ? readFileSync(examplePath, "utf8")
    : `${JSON.stringify(
        {
          model: "google/gemini-3.5-flash",
          skillsDirs: [".agents/skills"],
          blockOn: ["error"],
          maxDiffBytes: 200000,
          defaultScope: "staged",
          outputDir: ".data/agent-review",
          analystConcurrency: 4,
          includeWorkstream: false,
          skip: false,
        },
        null,
        2,
      )}\n`;
  const configWritten = writeIfNeeded(configPath, example, force);
  messages.push(
    configWritten
      ? `wrote ${path.relative(cwd, configPath) || ".agent-review.json"}`
      : `kept existing ${path.relative(cwd, configPath) || ".agent-review.json"} (use --force to overwrite)`,
  );

  const skillPath = path.join(cwd, ".agents", "skills", "agent-review");
  const skillWritten = installOperatorSkill({ cwd, force, runSkillsCli });
  messages.push(
    skillWritten
      ? `installed operator skill at ${path.relative(cwd, skillPath)}`
      : `kept existing ${path.relative(cwd, skillPath)} (use --force to overwrite)`,
  );

  messages.push("");
  messages.push("Next steps:");
  messages.push("  1. Add AI_GATEWAY_API_KEY to .env");
  messages.push("  2. Optional package.json scripts:");
  messages.push('       "agent-review": "agent-review",');
  messages.push('       "review": "agent-review run --scope staged --include-workstream"');
  messages.push("  3. Optional husky commit-msg: bunx husky (if needed), then agent-review hook");

  return {
    configPath,
    configWritten,
    skillPath,
    skillWritten,
    messages,
  };
}
