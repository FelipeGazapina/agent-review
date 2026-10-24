/**
 * Validate and create/checkout a local git branch for workstream start.
 */

export function assertValidBranchName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error("branch name is required");
  }
  if (trimmed !== name) {
    throw new Error("branch name must not have leading or trailing whitespace");
  }
  if (/\s/.test(trimmed)) {
    throw new Error("branch name must not contain whitespace");
  }
  if (trimmed.startsWith("-")) {
    throw new Error("branch name must not start with '-'");
  }
  if (trimmed.includes("..")) {
    throw new Error("branch name must not contain '..'");
  }
  if (trimmed.includes("\\")) {
    throw new Error("branch name must not contain '\\'");
  }
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      throw new Error("branch name contains invalid characters");
    }
  }
  if (/[~^:?*[\]]/.test(trimmed)) {
    throw new Error("branch name contains invalid characters");
  }
  if (trimmed.endsWith(".") || trimmed.endsWith("/")) {
    throw new Error("branch name must not end with '.' or '/'");
  }
  if (trimmed.includes("//")) {
    throw new Error("branch name must not contain '//'");
  }
  return trimmed;
}

export async function createAndCheckoutBranch(cwd: string, name: string): Promise<string> {
  const branch = assertValidBranchName(name);
  const proc = Bun.spawn(["git", "switch", "-c", branch], {
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
    const detail = stderr.trim() || stdout.trim() || `exit ${exitCode}`;
    throw new Error(`git switch -c ${branch} failed: ${detail}`);
  }
  return branch;
}
