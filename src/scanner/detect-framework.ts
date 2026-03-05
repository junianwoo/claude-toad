import fs from "fs-extra";
import path from "path";

export async function detectFramework(
  projectPath: string
): Promise<{ name: string | null; version: string | null; variant: string | null }> {
  const result = { name: null as string | null, version: null as string | null, variant: null as string | null };

  // Check package.json for JS/TS frameworks
  const pkgPath = path.join(projectPath, "package.json");
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.next) {
        result.name = "nextjs";
        result.version = deps.next.replace(/[\^~]/g, "");
        // Detect App Router vs Pages Router
        if (await fs.pathExists(path.join(projectPath, "app"))) {
          result.variant = "app-router";
        } else if (await fs.pathExists(path.join(projectPath, "pages"))) {
          result.variant = "pages-router";
        }
        return result;
      }

      if (deps.remix || deps["@remix-run/node"]) {
        result.name = "remix";
        result.version = (deps.remix || deps["@remix-run/node"])?.replace(/[\^~]/g, "") || null;
        return result;
      }

      if (deps["@sveltejs/kit"]) {
        result.name = "sveltekit";
        result.version = deps["@sveltejs/kit"].replace(/[\^~]/g, "");
        return result;
      }

      if (deps.astro) {
        result.name = "astro";
        result.version = deps.astro.replace(/[\^~]/g, "");
        return result;
      }

      if (deps["@nestjs/core"]) {
        result.name = "nestjs";
        result.version = deps["@nestjs/core"].replace(/[\^~]/g, "");
        return result;
      }

      if (deps.fastify) {
        result.name = "fastify";
        result.version = deps.fastify.replace(/[\^~]/g, "");
        return result;
      }

      if (deps.express) {
        result.name = "express";
        result.version = deps.express.replace(/[\^~]/g, "");
        return result;
      }
    } catch {
      // Invalid package.json
    }
  }

  // Check pyproject.toml for Python frameworks
  const pyprojectPath = path.join(projectPath, "pyproject.toml");
  if (await fs.pathExists(pyprojectPath)) {
    try {
      const content = await fs.readFile(pyprojectPath, "utf-8");
      if (content.includes("fastapi")) {
        result.name = "fastapi";
        const match = content.match(/fastapi[>=<~!]*(\d+\.\d+(?:\.\d+)?)/);
        result.version = match?.[1] || null;
        return result;
      }
      if (content.includes("django")) {
        result.name = "django";
        const match = content.match(/django[>=<~!]*(\d+\.\d+(?:\.\d+)?)/);
        result.version = match?.[1] || null;
        return result;
      }
      if (content.includes("flask")) {
        result.name = "flask";
        const match = content.match(/flask[>=<~!]*(\d+\.\d+(?:\.\d+)?)/);
        result.version = match?.[1] || null;
        return result;
      }
    } catch {
      // Invalid pyproject.toml
    }
  }

  // Check requirements.txt as fallback
  const reqPath = path.join(projectPath, "requirements.txt");
  if (await fs.pathExists(reqPath)) {
    try {
      const content = await fs.readFile(reqPath, "utf-8");
      if (content.includes("fastapi")) { result.name = "fastapi"; return result; }
      if (content.includes("django")) { result.name = "django"; return result; }
      if (content.includes("flask")) { result.name = "flask"; return result; }
    } catch {}
  }

  // Check go.mod for Go
  const goModPath = path.join(projectPath, "go.mod");
  if (await fs.pathExists(goModPath)) {
    try {
      const content = await fs.readFile(goModPath, "utf-8");
      result.name = "go";
      if (content.includes("github.com/gin-gonic/gin")) {
        result.variant = "gin";
      } else if (content.includes("github.com/labstack/echo")) {
        result.variant = "echo";
      } else if (content.includes("github.com/gofiber/fiber")) {
        result.variant = "fiber";
      }
      const goMatch = content.match(/^go\s+(\d+\.\d+)/m);
      result.version = goMatch?.[1] || null;
      return result;
    } catch {}
  }

  // Check Gemfile for Ruby
  const gemfilePath = path.join(projectPath, "Gemfile");
  if (await fs.pathExists(gemfilePath)) {
    try {
      const content = await fs.readFile(gemfilePath, "utf-8");
      if (content.includes("rails")) {
        result.name = "rails";
        const match = content.match(/gem\s+['"]rails['"],\s*['"]~>\s*(\d+\.\d+)/);
        result.version = match?.[1] || null;
        return result;
      }
    } catch {}
  }

  // Check Cargo.toml for Rust
  if (await fs.pathExists(path.join(projectPath, "Cargo.toml"))) {
    result.name = "rust";
    return result;
  }

  return result;
}
