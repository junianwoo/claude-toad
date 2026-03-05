import fs from "fs-extra";
import path from "path";
import { globby } from "globby";

const KNOWN_DIRS = [
  "src", "app", "lib", "components", "pages", "api", "public", "static",
  "assets", "styles", "utils", "helpers", "hooks", "services", "models",
  "schemas", "routes", "controllers", "middleware", "config", "scripts",
  "tests", "__tests__", "test", "spec", "e2e", "cypress", "prisma",
  "migrations", "cmd", "internal", "pkg", "docs", "dist", "build",
];

export async function readStructure(
  projectPath: string
): Promise<{ tree: string[]; keyDirs: string[]; fileCount: Record<string, number> }> {
  const result = {
    tree: [] as string[],
    keyDirs: [] as string[],
    fileCount: {} as Record<string, number>,
  };

  // Get top-level directory listing
  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });
    result.tree = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "vendor" && e.name !== ".venv" && e.name !== "target")
      .map((e) => e.name)
      .sort();
  } catch {}

  // Identify known/key directories
  result.keyDirs = result.tree.filter((dir) => KNOWN_DIRS.includes(dir));

  // Count files by extension (top 3 levels)
  try {
    const files = await globby(["**/*"], {
      cwd: projectPath,
      ignore: ["node_modules/**", "vendor/**", ".venv/**", "target/**", "dist/**", "build/**", ".git/**"],
      deep: 3,
      onlyFiles: true,
    });

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext) {
        result.fileCount[ext] = (result.fileCount[ext] || 0) + 1;
      }
    }
  } catch {}

  return result;
}
