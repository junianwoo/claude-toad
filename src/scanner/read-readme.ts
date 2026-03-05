import fs from "fs-extra";
import path from "path";

export async function readReadme(
  projectPath: string
): Promise<{ exists: boolean; summary: string | null }> {
  const readmeNames = ["README.md", "readme.md", "README.MD", "README", "README.txt"];

  for (const name of readmeNames) {
    const readmePath = path.join(projectPath, name);
    if (await fs.pathExists(readmePath)) {
      try {
        const content = await fs.readFile(readmePath, "utf-8");
        // First 500 words
        const words = content.split(/\s+/).slice(0, 500).join(" ");
        return { exists: true, summary: words };
      } catch {
        return { exists: true, summary: null };
      }
    }
  }

  return { exists: false, summary: null };
}
