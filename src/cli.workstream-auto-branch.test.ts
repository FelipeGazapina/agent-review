import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { main } from "./cli.ts";

const tmpDirs: string[] = [];
let previousCwd: string | undefined;

afterEach(() => {
  if (previousCwd !== undefined) {
    process.chdir(previousCwd);
    previousCwd = undefined;
  }
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

async function makeRepo(autoBranch: boolean): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-review-ws-ab-"));
  tmpDirs.push(dir);
  await git(dir, ["init"]);
  await git(dir, ["config", "user.email", "test@example.com"]);
  await git(dir, ["config", "user.name", "Test"]);
  fs.writeFileSync(path.join(dir, "a.txt"), "a\n");
  await git(dir, ["add", "a.txt"]);
  await git(dir, ["commit", "-m", "add a"]);
  fs.writeFileSync(
    path.join(dir, ".agent-review.json"),
    JSON.stringify({
      outputDir: ".data/agent-review",
      workstreams: { autoCommit: false, autoLink: true, autoBranch },
    }),
    "utf8",
  );
  return dir;
}

describe("workstream start autoBranch", () => {
  test("creates branch then catalog when autoBranch and --branch", async () => {
    const dir = await makeRepo(true);
    previousCwd = process.cwd();
    process.chdir(dir);

    const code = await main([
      "workstream",
      "start",
      "--title",
      "Auto",
      "--branch",
      "feat/from-start",
    ]);
    expect(code).toBe(0);
    expect(await git(dir, ["branch", "--show-current"])).toBe("feat/from-start");

    const workstreamsRoot = path.join(dir, ".data/agent-review/workstreams");
    expect(fs.existsSync(workstreamsRoot)).toBe(true);
    const ids = fs.readdirSync(workstreamsRoot);
    expect(ids.length).toBe(1);

    const index = fs.readFileSync(path.join(dir, ".data/agent-review/workstreams.jsonl"), "utf8");
    const line = JSON.parse(index.trim()) as { branch?: string };
    expect(line.branch).toBe("feat/from-start");
  });

  test("exits 2 when autoBranch without --branch", async () => {
    const dir = await makeRepo(true);
    previousCwd = process.cwd();
    process.chdir(dir);

    const code = await main(["workstream", "start", "--title", "NoBranch"]);
    expect(code).toBe(2);
    expect(fs.existsSync(path.join(dir, ".data/agent-review/workstreams"))).toBe(false);
  });

  test("exits 2 when --branch and autoBranch false", async () => {
    const dir = await makeRepo(false);
    previousCwd = process.cwd();
    process.chdir(dir);

    const code = await main(["workstream", "start", "--branch", "feat/should-reject"]);
    expect(code).toBe(2);
    expect(fs.existsSync(path.join(dir, ".data/agent-review/workstreams"))).toBe(false);
  });

  test("git failure leaves no catalog", async () => {
    const dir = await makeRepo(true);
    await createExistingBranch(dir, "feat/collision");
    previousCwd = process.cwd();
    process.chdir(dir);

    const code = await main(["workstream", "start", "--branch", "feat/collision"]);
    expect(code).not.toBe(0);
    expect(fs.existsSync(path.join(dir, ".data/agent-review/workstreams"))).toBe(false);
    expect(fs.existsSync(path.join(dir, ".data/agent-review/workstreams.jsonl"))).toBe(false);
  });
});

async function createExistingBranch(dir: string, name: string): Promise<void> {
  await git(dir, ["switch", "-c", name]);
  await git(dir, ["switch", "-"]);
}
