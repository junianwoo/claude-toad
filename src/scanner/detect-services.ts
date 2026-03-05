import fs from "fs-extra";
import path from "path";

export async function detectServices(
  projectPath: string
): Promise<{
  hosting: string | null;
  ci: string | null;
  payments: string | null;
  auth: string | null;
  baas: string | null;
  all: string[];
}> {
  const result = {
    hosting: null as string | null,
    ci: null as string | null,
    payments: null as string | null,
    auth: null as string | null, // Will be set by detect-auth
    baas: null as string | null,
    all: [] as string[],
  };

  // Detect hosting
  if (await fs.pathExists(path.join(projectPath, "vercel.json")) ||
      await fs.pathExists(path.join(projectPath, ".vercel"))) {
    result.hosting = "vercel";
    result.all.push("vercel");
  } else if (await fs.pathExists(path.join(projectPath, "netlify.toml"))) {
    result.hosting = "netlify";
    result.all.push("netlify");
  } else if (await fs.pathExists(path.join(projectPath, "fly.toml"))) {
    result.hosting = "fly";
    result.all.push("fly");
  } else if (await fs.pathExists(path.join(projectPath, "railway.json")) ||
             await fs.pathExists(path.join(projectPath, "railway.toml"))) {
    result.hosting = "railway";
    result.all.push("railway");
  } else if (await fs.pathExists(path.join(projectPath, "Dockerfile"))) {
    result.hosting = "docker";
    result.all.push("docker");
  }

  // Detect CI
  if (await fs.pathExists(path.join(projectPath, ".github", "workflows"))) {
    result.ci = "github-actions";
    result.all.push("github-actions");
  } else if (await fs.pathExists(path.join(projectPath, ".gitlab-ci.yml"))) {
    result.ci = "gitlab-ci";
    result.all.push("gitlab-ci");
  } else if (await fs.pathExists(path.join(projectPath, ".circleci"))) {
    result.ci = "circleci";
    result.all.push("circleci");
  }

  // Detect payments and BaaS from package.json
  const pkgPath = path.join(projectPath, "package.json");
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.stripe || deps["@stripe/stripe-js"]) {
        result.payments = "stripe";
        result.all.push("stripe");
      }

      if (deps["@supabase/supabase-js"]) {
        result.baas = "supabase";
        result.all.push("supabase");
      } else if (deps.firebase || deps["firebase-admin"]) {
        result.baas = "firebase";
        result.all.push("firebase");
      }
    } catch {}
  }

  // Detect GitHub (check for .git remote pointing to GitHub)
  if (await fs.pathExists(path.join(projectPath, ".git"))) {
    try {
      const gitConfig = await fs.readFile(path.join(projectPath, ".git", "config"), "utf-8");
      if (gitConfig.includes("github.com")) {
        result.all.push("github");
      } else if (gitConfig.includes("gitlab.com")) {
        result.all.push("gitlab");
      }
    } catch {}
  }

  return result;
}
