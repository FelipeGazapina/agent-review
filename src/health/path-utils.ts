/** Normalize to POSIX separators for stable substring checks. */
export function asPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

/** True if path contains `/dirName/` as a directory segment. */
export function pathHasDir(filePath: string, dirName: string): boolean {
  const posix = `/${asPosix(filePath)}/`;
  return posix.includes(`/${dirName}/`);
}
