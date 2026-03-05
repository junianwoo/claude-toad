import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

export function getVersion(): string {
  try {
    // Walk up from the current file to find package.json
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    let dir = __dirname;
    for (let i = 0; i < 5; i++) {
      const pkgPath = path.join(dir, "package.json");
      if (fs.pathExistsSync(pkgPath)) {
        const pkg = fs.readJsonSync(pkgPath);
        if (pkg.name === "claude-toad") return pkg.version;
      }
      dir = path.dirname(dir);
    }
  } catch {}
  return "0.1.0";
}
