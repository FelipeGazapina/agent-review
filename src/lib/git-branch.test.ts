import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { assertValidBranchName, createAndCheckoutBranch } from "./git-branch.ts";

const tmpDirs: string[] = [];

afterEach(() => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (dir !== undefined) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

async function git(cwd: string, args: string[]): Promise<string> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`git ${args.join(" ")}: ${stderr.trim()}`);
  }
  return stdout.trim();
}

async function makeRepo(): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-review-branch-"));
  tmpDirs.push(dir);
  await git(dir, ["init"]);
  await git(dir, ["config", "user.email", "test@example.com"]);
  await git(dir, ["config", "user.name", "Test"]);
  fs.writeFileSync(path.join(dir, "a.txt"), "a\n");
  await git(dir, ["add", "a.txt"]);
  await git(dir, ["commit", "-m", "add a"]);
  return dir;
}

describe("assertValidBranchName", () => {
  test("accepts conventional names", () => {
    expect(assertValidBranchName("feat/workstream-auto-branch")).toBe(
      "feat/workstream-auto-branch",
    );
    expect(assertValidBranchName("fix/hook-exit")).toBe("fix/hook-exit");
  });

  test("rejects invalid names", () => {
    expect(() => assertValidBranchName("")).toThrow(/required/);
    expect(() => assertValidBranchName("  feat/x  ")).toThrow(/whitespace/);
    expect(() => assertValidBranchName("feat x")).toThrow(/whitespace/);
    expect(() => assertValidBranchName("-bad")).toThrow(/start with/);
    expect(() => assertValidBranchName("a..b")).toThrow(/\.\./);
    expect(() => assertValidBranchName("a\\b")).toThrow(/\\/);
    expect(() => assertValidBranchName("feat/x/")).toThrow(/end with/);
  });
});

describe("createAndCheckoutBranch", () => {
  test("creates and checks out a new branch", async () => {
    const dir = await makeRepo();
    const name = await createAndCheckoutBranch(dir, "feat/auto-branch");
    expect(name).toBe("feat/auto-branch");
    expect(await git(dir, ["branch", "--show-current"])).toBe("feat/auto-branch");
  });

  test("fails when branch already exists", async () => {
    const dir = await makeRepo();
    await createAndCheckoutBranch(dir, "feat/once");
    await git(dir, ["switch", "-"]);
    await expect(createAndCheckoutBranch(dir, "feat/once")).rejects.toThrow(/git switch -c/);
  });
});
