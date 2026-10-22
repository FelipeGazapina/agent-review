import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { COMMIT_MSG_HOOK, runHook } from "./hook.ts";
import { runInit } from "./init.ts";
import { packagedCodeReviewSkillPath, resolvePackageRoot } from "./package-root.ts";

describe("package-root", () => {
  test("resolves this package and packaged code-review skill", () => {
    const root = resolvePackageRoot();
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      name?: string;
    };
    expect(pkg.name).toBe("@khoralabs/agent-review");
    const skill = packagedCodeReviewSkillPath();
    expect(fs.existsSync(path.join(skill, "SKILL.md"))).toBe(true);
  });
});

function mockSkillsCli(cwd: string): {
  calls: string[][];
  runSkillsCli: (args: string[]) => { exitCode: number; stdout: string; stderr: string };
} {
  const calls: string[][] = [];
  const runSkillsCli = (args: string[]) => {
    calls.push([...args]);
    const skillPath = path.join(cwd, ".agents", "skills", "agent-review");
    if (args[0] === "remove") {
      fs.rmSync(skillPath, { recursive: true, force: true });
      return { exitCode: 0, stdout: "removed", stderr: "" };
    }
    fs.mkdirSync(skillPath, { recursive: true });
    fs.writeFileSync(path.join(skillPath, "SKILL.md"), "# agent-review\n");
    return { exitCode: 0, stdout: "installed", stderr: "" };
  };
  return { calls, runSkillsCli };
}

describe("runInit", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir !== undefined && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  test("writes config and operator skill; does not write husky hook", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-review-init-"));
    const cwd = dir;
    fs.mkdirSync(path.join(cwd, ".husky"), { recursive: true });
    const { calls, runSkillsCli } = mockSkillsCli(cwd);

    const result = runInit({ cwd, runSkillsCli });
    expect(result.configWritten).toBe(true);
    expect(result.skillWritten).toBe(true);
    expect(fs.existsSync(path.join(cwd, ".agent-review.json"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, ".husky", "commit-msg"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, ".agents", "skills", "agent-review", "SKILL.md"))).toBe(
      true,
    );
    expect(calls[0]?.[0]).toBe("add");
    expect(calls[0]).toContain("--skill");
    expect(calls[0]).toContain("agent-review");
    expect(result.messages.some((m) => m.includes("agent-review hook"))).toBe(true);

    const again = runInit({ cwd, runSkillsCli });
    expect(again.configWritten).toBe(false);
    expect(again.skillWritten).toBe(false);

    const forced = runInit({ cwd, force: true, runSkillsCli });
    expect(forced.configWritten).toBe(true);
    expect(calls.some((c) => c[0] === "remove")).toBe(true);
    expect(fs.existsSync(path.join(cwd, ".husky", "commit-msg"))).toBe(false);
  });
});

describe("runHook", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir !== undefined && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  test("writes executable PATH-aware commit-msg when .husky exists", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-review-hook-"));
    const cwd = dir;
    fs.mkdirSync(path.join(cwd, ".husky"), { recursive: true });

    const result = runHook({ cwd });
    expect(result.hookWritten).toBe(true);
    const hookPath = path.join(cwd, ".husky", "commit-msg");
    expect(fs.existsSync(hookPath)).toBe(true);
    expect(fs.statSync(hookPath).mode & 0o111).not.toBe(0);
    const body = fs.readFileSync(hookPath, "utf8");
    expect(body).toBe(COMMIT_MSG_HOOK);
    expect(body).toContain('export PATH="./node_modules/.bin:$PATH"');
    expect(body).toContain("command -v agent-review");
    expect(body).toContain("bunx agent-review run");
    expect(body).toContain('MSG_FILE="$(pwd)/$1"');
    expect(body).toContain('--message-file "$MSG_FILE"');
    expect(body.indexOf("MSG_FILE=")).toBeLessThan(body.indexOf("git rev-parse --show-toplevel"));

    const again = runHook({ cwd });
    expect(again.hookWritten).toBe(false);

    const forced = runHook({ cwd, force: true });
    expect(forced.hookWritten).toBe(true);
  });

  test("skips without .husky unless --force", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-review-hook-"));
    const cwd = dir;

    const skipped = runHook({ cwd });
    expect(skipped.hookWritten).toBe(false);
    expect(fs.existsSync(path.join(cwd, ".husky", "commit-msg"))).toBe(false);
    expect(skipped.messages.some((m) => m.includes("skipped husky"))).toBe(true);

    const forced = runHook({ cwd, force: true });
    expect(forced.hookWritten).toBe(true);
    expect(fs.existsSync(path.join(cwd, ".husky", "commit-msg"))).toBe(true);
  });
});
