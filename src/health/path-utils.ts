import path from "node:path";

/** Normalize to POSIX separators for stable substring checks. */
export function asPosix(p: string): string {
  return p.split(path.sep).join("/");
}

/** True if path contains `/dirName/` as a directory segment. */
export function pathHasDir(filePath: string, dirName: string): boolean {
  const posix = `/${asPosix(filePath)}/`;
  return posix.includes(`/${dirName}/`);
}
