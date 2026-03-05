import fs from "fs-extra";
import path from "path";

export async function detectAuth(
  projectPath: string
): Promise<string | null> {
  // Check package.json for JS/TS auth libraries
  const pkgPath = path.join(projectPath, "package.json");
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps["next-auth"] || deps["@auth/core"]) return "nextauth";
      if (deps["@clerk/nextjs"] || deps["@clerk/clerk-sdk-node"]) return "clerk";
      if (deps["auth0"] || deps["@auth0/nextjs-auth0"]) return "auth0";
      if (deps.passport) return "passport";
      if (deps["better-auth"]) return "better-auth";
      if (deps["lucia"] || deps["lucia-auth"]) return "lucia";
    } catch {}
  }

  // Check pyproject.toml for Python auth
  const pyprojectPath = path.join(projectPath, "pyproject.toml");
  if (await fs.pathExists(pyprojectPath)) {
    try {
      const content = await fs.readFile(pyprojectPath, "utf-8");
      if (content.includes("python-jose") || content.includes("pyjwt")) return "jwt";
      if (content.includes("authlib")) return "authlib";
    } catch {}
  }

  return null;
}
