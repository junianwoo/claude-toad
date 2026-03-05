import { ProjectFingerprint } from "./types.js";
import { detectFramework } from "./detect-framework.js";
import { detectLanguage } from "./detect-language.js";
import { detectDatabase } from "./detect-database.js";
import { detectTesting } from "./detect-testing.js";
import { detectServices } from "./detect-services.js";
import { detectAuth } from "./detect-auth.js";
import { detectLinting } from "./detect-linting.js";
import { readReadme } from "./read-readme.js";
import { readStructure } from "./read-structure.js";

export async function scanProject(
  projectPath: string
): Promise<ProjectFingerprint> {
  const [
    framework,
    language,
    database,
    testing,
    services,
    auth,
    linting,
    readme,
    structure,
  ] = await Promise.all([
    detectFramework(projectPath),
    detectLanguage(projectPath),
    detectDatabase(projectPath),
    detectTesting(projectPath),
    detectServices(projectPath),
    detectAuth(projectPath),
    detectLinting(projectPath),
    readReadme(projectPath),
    readStructure(projectPath),
  ]);

  // Merge auth into services
  services.auth = auth;

  // Detect package manager and project name from package.json
  const { packageManager, projectName } = await detectProjectMeta(projectPath);

  return {
    framework,
    language,
    database,
    testing,
    services,
    linting,
    readme,
    structure,
    packageManager,
    projectName,
  };
}

async function detectProjectMeta(
  projectPath: string
): Promise<{ packageManager: string | null; projectName: string | null }> {
  const fs = await import("fs-extra");
  const path = await import("path");

  let packageManager: string | null = null;
  let projectName: string | null = null;

  // Check for lock files
  if (await fs.pathExists(path.join(projectPath, "bun.lockb"))) {
    packageManager = "bun";
  } else if (await fs.pathExists(path.join(projectPath, "pnpm-lock.yaml"))) {
    packageManager = "pnpm";
  } else if (await fs.pathExists(path.join(projectPath, "yarn.lock"))) {
    packageManager = "yarn";
  } else if (
    await fs.pathExists(path.join(projectPath, "package-lock.json"))
  ) {
    packageManager = "npm";
  }

  // Get project name from package.json
  const pkgPath = path.join(projectPath, "package.json");
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      projectName = pkg.name || null;
    } catch {
      // Invalid package.json
    }
  }

  // Fallback to directory name
  if (!projectName) {
    projectName = path.basename(projectPath);
  }

  return { packageManager, projectName };
}
