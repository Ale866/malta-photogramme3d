import path from "path";

export function relativePathFrom(basePath: string, targetPath: string) {
  const relative = path.relative(basePath, targetPath);
  return relative || ".";
}
