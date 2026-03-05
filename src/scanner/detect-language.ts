import fs from "fs-extra";
import path from "path";
import { globby } from "globby";

export async function detectLanguage(
  projectPath: string
): Promise<{ primary: string; version: string | null; strict: boolean }> {
  const result = { primary: "javascript", version: null as string | null, strict: false };

  // Check for TypeScript
  const tsconfigPath = path.join(projectPath, "tsconfig.json");
  if (await fs.pathExists(tsconfigPath)) {
    result.primary = "typescript";
    try {
      const tsconfig = await fs.readJson(tsconfigPath);
      result.strict = tsconfig.compilerOptions?.strict === true;
      // Try to get TS version from package.json
      const pkgPath = path.join(projectPath, "package.json");
      if (await fs.pathExists(pkgPath)) {
        const pkg = await fs.readJson(pkgPath);
        const tsVersion = pkg.devDependencies?.typescript || pkg.dependencies?.typescript;
        if (tsVersion) {
          result.version = tsVersion.replace(/[\^~]/g, "");
        }
      }
    } catch {}
    return result;
  }

  // Check for Python
  const pyFiles = [
    path.join(projectPath, "pyproject.toml"),
    path.join(projectPath, "setup.py"),
    path.join(projectPath, "requirements.txt"),
    path.join(projectPath, ".python-version"),
  ];
  for (const pyFile of pyFiles) {
    if (await fs.pathExists(pyFile)) {
      result.primary = "python";
      // Check .python-version for version
      const pvPath = path.join(projectPath, ".python-version");
      if (await fs.pathExists(pvPath)) {
        try {
          const ver = (await fs.readFile(pvPath, "utf-8")).trim();
          result.version = ver;
        } catch {}
      }
      // Check pyproject.toml for python version requirement
      if (await fs.pathExists(path.join(projectPath, "pyproject.toml"))) {
        try {
          const content = await fs.readFile(path.join(projectPath, "pyproject.toml"), "utf-8");
          const match = content.match(/requires-python\s*=\s*"[>=<]*(\d+\.\d+)/);
          if (match && !result.version) result.version = match[1];
          // Check for type checking strictness
          if (content.includes("[tool.mypy]") || content.includes("[tool.pyright]")) {
            result.strict = true;
          }
        } catch {}
      }
      return result;
    }
  }

  // Check for Go
  if (await fs.pathExists(path.join(projectPath, "go.mod"))) {
    result.primary = "go";
    try {
      const content = await fs.readFile(path.join(projectPath, "go.mod"), "utf-8");
      const match = content.match(/^go\s+(\d+\.\d+)/m);
      result.version = match?.[1] || null;
    } catch {}
    result.strict = true; // Go is always strict
    return result;
  }

  // Check for Rust
  if (await fs.pathExists(path.join(projectPath, "Cargo.toml"))) {
    result.primary = "rust";
    result.strict = true; // Rust is always strict
    return result;
  }

  // Check for Ruby
  if (await fs.pathExists(path.join(projectPath, "Gemfile"))) {
    result.primary = "ruby";
    const rvPath = path.join(projectPath, ".ruby-version");
    if (await fs.pathExists(rvPath)) {
      try {
        result.version = (await fs.readFile(rvPath, "utf-8")).trim();
      } catch {}
    }
    return result;
  }

  // Fallback: count file extensions
  try {
    const files = await globby(["**/*.{ts,tsx,js,jsx,py,go,rs,rb}"], {
      cwd: projectPath,
      ignore: ["node_modules/**", "vendor/**", ".venv/**", "target/**"],
      deep: 3,
    });
    const counts: Record<string, number> = {};
    for (const f of files) {
      const ext = path.extname(f);
      if (ext === ".ts" || ext === ".tsx") counts.typescript = (counts.typescript || 0) + 1;
      else if (ext === ".js" || ext === ".jsx") counts.javascript = (counts.javascript || 0) + 1;
      else if (ext === ".py") counts.python = (counts.python || 0) + 1;
      else if (ext === ".go") counts.go = (counts.go || 0) + 1;
      else if (ext === ".rs") counts.rust = (counts.rust || 0) + 1;
      else if (ext === ".rb") counts.ruby = (counts.ruby || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      result.primary = sorted[0][0];
    }
  } catch {}

  return result;
}
