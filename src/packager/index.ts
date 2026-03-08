import fs from "fs-extra";
import path from "path";
import archiver from "archiver";
import { createWriteStream } from "fs";
import { PluginManifest } from "./manifest.js";
import { getVersion } from "../utils/version.js";
import { logger } from "../utils/logger.js";

export async function createPackage(
  projectPath: string,
  outputPath?: string
): Promise<string> {
  const claudeDir = path.join(projectPath, ".claude");

  if (!(await fs.pathExists(claudeDir))) {
    throw new Error(
      "No .claude/ directory found. Run `claude-toad init` first."
    );
  }

  // Read project name from package.json or directory name
  let projectName = path.basename(projectPath);
  const pkgPath = path.join(projectPath, "package.json");
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      if (pkg.name) projectName = pkg.name;
    } catch {}
  }

  // Collect files
  const files: string[] = [];
  const claudeFiles = await collectFiles(claudeDir, "");
  files.push(...claudeFiles);

  // Check for .mcp.json in project root
  const hasMcp = await fs.pathExists(path.join(projectPath, ".mcp.json"));

  // Build manifest
  const manifest: PluginManifest = {
    name: projectName,
    version: "1.0.0",
    description: `Claude Code configuration for ${projectName}`,
    generator: `claude-toad@${getVersion()}`,
    created: new Date().toISOString(),
    framework: null,
    language: "unknown",
    files: claudeFiles,
    mcp: hasMcp,
  };

  // Try to detect framework/language from CLAUDE.md or settings
  const claudeMdPath = path.join(claudeDir, "CLAUDE.md");
  if (await fs.pathExists(claudeMdPath)) {
    const content = await fs.readFile(claudeMdPath, "utf-8");
    if (content.includes("TypeScript")) manifest.language = "typescript";
    else if (content.includes("Python")) manifest.language = "python";
    else if (content.includes("Go")) manifest.language = "go";
  }

  // Create zip
  const zipName =
    outputPath || `claude-toad-plugin-${projectName.replace(/[^a-z0-9-]/gi, "-")}.zip`;
  const zipPath = path.resolve(projectPath, zipName);

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);

    // Add manifest
    archive.append(JSON.stringify(manifest, null, 2), {
      name: "manifest.json",
    });

    // Add all .claude/ files
    archive.directory(claudeDir, "");

    // Add .mcp.json if it exists
    if (hasMcp) {
      archive.file(path.join(projectPath, ".mcp.json"), {
        name: ".mcp.json",
      });
    }

    archive.finalize();
  });

  return zipPath;
}

export async function installPackage(
  pluginPath: string,
  targetPath: string,
  options: { force?: boolean } = {}
): Promise<string[]> {
  if (!(await fs.pathExists(pluginPath))) {
    throw new Error(`Plugin file not found: ${pluginPath}`);
  }

  // Use unzipper or built-in approach
  // For simplicity, use extract-zip or manual approach
  const { default: unzipper } = await import("unzipper");
  const claudeDir = path.join(targetPath, ".claude");

  // Handle existing .claude/
  if (await fs.pathExists(claudeDir)) {
    if (!options.force) {
      const { select } = await import("@inquirer/prompts");
      const action = await select({
        message: ".claude/ directory already exists. What do you want to do?",
        choices: [
          { name: "Overwrite (backup existing)", value: "overwrite" },
          { name: "Merge", value: "merge" },
          { name: "Cancel", value: "cancel" },
        ],
      });

      if (action === "cancel") {
        logger.info("Cancelled.");
        return [];
      }

      if (action === "overwrite") {
        const backupDir = path.join(targetPath, ".claude.backup");
        await fs.remove(backupDir);
        await fs.copy(claudeDir, backupDir);
        await fs.remove(claudeDir);
        logger.info("Backed up existing .claude/ to .claude.backup/");
      }
    } else {
      const backupDir = path.join(targetPath, '.claude.backup');
      await fs.remove(backupDir);
      await fs.copy(claudeDir, backupDir);
      await fs.remove(claudeDir);
      logger.info('Backed up existing .claude/ to .claude.backup/');
    }
  }

  // Extract zip
  const installedFiles: string[] = [];

  const directory = await unzipper.Open.file(pluginPath);

  for (const file of directory.files) {
    if (file.path === "manifest.json") continue;
    // Skip directory entries
    if (file.type === "Directory" || file.path.endsWith("/")) continue;

    if (file.path === ".mcp.json") {
      // .mcp.json goes to project root
      const content = await file.buffer();
      await fs.writeFile(
        path.join(targetPath, ".mcp.json"),
        content
      );
      installedFiles.push(".mcp.json");
    } else {
      // Everything else goes to .claude/
      const destPath = path.join(claudeDir, file.path);
      await fs.ensureDir(path.dirname(destPath));
      const content = await file.buffer();
      await fs.writeFile(destPath, content);
      installedFiles.push(`.claude/${file.path}`);
    }
  }

  return installedFiles;
}

async function collectFiles(
  dir: string,
  prefix: string
): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path.join(dir, entry.name), relative)));
    } else {
      files.push(relative);
    }
  }

  return files;
}
