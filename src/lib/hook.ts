import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export type HookOptions = {
  cwd?: string;
  force?: boolean;
};

export type HookResult = {
  hookPath: string;
  hookWritten: boolean;
  messages: string[];
};

/** Consumer commit-msg: PATH-first (global or local .bin), bunx fallback. */
export const COMMIT_MSG_HOOK = `#!/usr/bin/env sh
set -e
# Resolve $1 before cd — git may pass a cwd-relative COMMIT_EDITMSG path.
case "$1" in
  /*) MSG_FILE="$1" ;;
  *) MSG_FILE="$(pwd)/$1" ;;
esac
cd "$(git rev-parse --show-toplevel)"
export PATH="./node_modules/.bin:$PATH"
if command -v agent-review >/dev/null 2>&1; then
  agent-review run --scope staged --include-workstream --message-file "$MSG_FILE"
else
  bunx agent-review run --scope staged --include-workstream --message-file "$MSG_FILE"
fi
`;

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

/** Write husky commit-msg hook for a consumer repo (opt-in; not part of init). */
export function runHook(options: HookOptions = {}): HookResult {
  const cwd = options.cwd ?? process.cwd();
  const force = options.force === true;
  const messages: string[] = [];
  const hookPath = path.join(cwd, ".husky", "commit-msg");
  let hookWritten = false;

  if (existsSync(path.join(cwd, ".husky")) || force) {
    mkdirSync(path.join(cwd, ".husky"), { recursive: true });
    hookWritten = writeIfNeeded(hookPath, COMMIT_MSG_HOOK, force, 0o755);
    messages.push(
      hookWritten
        ? `wrote ${path.relative(cwd, hookPath)}`
        : `kept existing ${path.relative(cwd, hookPath)} (use --force to overwrite)`,
    );
  } else {
    messages.push("skipped husky commit-msg (no .husky/; run bunx husky then re-run hook)");
  }

  messages.push("");
  messages.push("Next steps:");
  messages.push("  1. Ensure agent-review is on PATH (bun add -g) or installed in this repo");
  messages.push("  2. Commit with husky enabled to run the review pipeline");

  return { hookPath, hookWritten, messages };
}
