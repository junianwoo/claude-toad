import fs from "fs-extra";
import path from "path";

export async function detectTesting(
  projectPath: string
): Promise<{ unit: string | null; e2e: string | null; testDir: string | null; testCommand: string | null }> {
  const result = {
    unit: null as string | null,
    e2e: null as string | null,
    testDir: null as string | null,
    testCommand: null as string | null,
  };

  // Check package.json for JS/TS test frameworks
  const pkgPath = path.join(projectPath, "package.json");
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const scripts = pkg.scripts || {};

      // Unit test frameworks
      if (deps.vitest) {
        result.unit = "vitest";
      } else if (deps.jest || deps["@jest/core"]) {
        result.unit = "jest";
      } else if (deps.mocha) {
        result.unit = "mocha";
      }

      // E2E frameworks
      if (deps.playwright || deps["@playwright/test"]) {
        result.e2e = "playwright";
      } else if (deps.cypress) {
        result.e2e = "cypress";
      }

      // Detect test command from scripts
      if (scripts.test) {
        const pm = await detectPm(projectPath);
        result.testCommand = `${pm} test`;
      }

      // Detect test directory
      for (const dir of ["tests", "__tests__", "test", "spec"]) {
        if (await fs.pathExists(path.join(projectPath, dir))) {
          result.testDir = dir;
          break;
        }
      }
    } catch {}
  }

  // Check for Python test frameworks
  const pyprojectPath = path.join(projectPath, "pyproject.toml");
  if (await fs.pathExists(pyprojectPath)) {
    try {
      const content = await fs.readFile(pyprojectPath, "utf-8");
      if (content.includes("pytest")) {
        result.unit = "pytest";
        result.testCommand = "pytest";
      }
    } catch {}
  }

  // Check for pytest.ini or setup.cfg
  if (await fs.pathExists(path.join(projectPath, "pytest.ini")) ||
      await fs.pathExists(path.join(projectPath, "conftest.py"))) {
    result.unit = "pytest";
    result.testCommand = "pytest";
  }

  // Check for Go tests
  if (await fs.pathExists(path.join(projectPath, "go.mod"))) {
    result.unit = "go-test";
    result.testCommand = "go test ./...";
  }

  // Detect test directory for Python/Go
  if (!result.testDir) {
    for (const dir of ["tests", "test", "spec"]) {
      if (await fs.pathExists(path.join(projectPath, dir))) {
        result.testDir = dir;
        break;
      }
    }
  }

  return result;
}

async function detectPm(projectPath: string): Promise<string> {
  const fs = await import("fs-extra");
  const path = await import("path");
  if (await fs.pathExists(path.join(projectPath, "bun.lockb"))) return "bun";
  if (await fs.pathExists(path.join(projectPath, "pnpm-lock.yaml"))) return "pnpm";
  if (await fs.pathExists(path.join(projectPath, "yarn.lock"))) return "yarn";
  return "npm";
}
