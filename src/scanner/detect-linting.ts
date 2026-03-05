import fs from "fs-extra";
import path from "path";

export async function detectLinting(
  projectPath: string
): Promise<{ linter: string | null; formatter: string | null; lintCommand: string | null }> {
  const result = {
    linter: null as string | null,
    formatter: null as string | null,
    lintCommand: null as string | null,
  };

  // Check for Biome (handles both linting and formatting)
  if (await fs.pathExists(path.join(projectPath, "biome.json")) ||
      await fs.pathExists(path.join(projectPath, "biome.jsonc"))) {
    result.linter = "biome";
    result.formatter = "biome";
  }

  // Check for ESLint
  const eslintConfigs = [
    "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs",
    ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json", ".eslintrc.yml", ".eslintrc.yaml", ".eslintrc",
  ];
  for (const config of eslintConfigs) {
    if (await fs.pathExists(path.join(projectPath, config))) {
      result.linter = "eslint";
      break;
    }
  }

  // Check for Prettier
  const prettierConfigs = [
    ".prettierrc", ".prettierrc.json", ".prettierrc.yml", ".prettierrc.yaml",
    ".prettierrc.js", ".prettierrc.cjs", ".prettierrc.mjs", "prettier.config.js",
    "prettier.config.cjs", "prettier.config.mjs",
  ];
  for (const config of prettierConfigs) {
    if (await fs.pathExists(path.join(projectPath, config))) {
      result.formatter = "prettier";
      break;
    }
  }

  // Check for Python linters
  const pyprojectPath = path.join(projectPath, "pyproject.toml");
  if (await fs.pathExists(pyprojectPath)) {
    try {
      const content = await fs.readFile(pyprojectPath, "utf-8");
      if (content.includes("[tool.ruff]") || content.includes("ruff")) {
        result.linter = "ruff";
        result.formatter = "ruff";
        result.lintCommand = "ruff check .";
      }
      if (content.includes("[tool.black]") || content.includes("black")) {
        result.formatter = "black";
      }
      if (content.includes("flake8")) {
        result.linter = "flake8";
      }
    } catch {}
  }

  // Check for Go (gofmt is built-in)
  if (await fs.pathExists(path.join(projectPath, "go.mod"))) {
    result.formatter = "gofmt";
    if (await fs.pathExists(path.join(projectPath, ".golangci.yml")) ||
        await fs.pathExists(path.join(projectPath, ".golangci.yaml"))) {
      result.linter = "golangci-lint";
      result.lintCommand = "golangci-lint run";
    }
  }

  // Check for Ruby
  if (await fs.pathExists(path.join(projectPath, ".rubocop.yml"))) {
    result.linter = "rubocop";
    result.formatter = "rubocop";
    result.lintCommand = "rubocop";
  }

  // Check package.json deps for linting/formatting tools
  const pkgPath = path.join(projectPath, "package.json");
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      // Check deps for prettier if not already found via config file
      if (!result.formatter && deps.prettier) {
        result.formatter = "prettier";
      }

      // Check deps for biome if not already found
      if (!result.linter && deps["@biomejs/biome"]) {
        result.linter = "biome";
        result.formatter = "biome";
      }

      // Detect lint command from scripts
      if (!result.lintCommand && pkg.scripts?.lint) {
        const pm = await detectPm(projectPath);
        result.lintCommand = `${pm} run lint`;
      }
    } catch {}
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
