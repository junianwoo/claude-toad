import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { createPackage, installPackage } from "../../src/packager/index.js";

describe("packager", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `claude-toad-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("throws when no .claude/ directory exists", async () => {
    await expect(createPackage(tempDir)).rejects.toThrow(
      "No .claude/ directory found"
    );
  });

  it("creates a zip with .claude/ contents", async () => {
    // Create a .claude directory with some files
    const claudeDir = path.join(tempDir, ".claude");
    await fs.ensureDir(path.join(claudeDir, "skills"));
    await fs.writeFile(
      path.join(claudeDir, "CLAUDE.md"),
      "# Test Project\n",
      "utf-8"
    );
    await fs.writeFile(
      path.join(claudeDir, "skills", "test.md"),
      "# Test Skill\n",
      "utf-8"
    );
    await fs.writeFile(
      path.join(claudeDir, "settings.json"),
      "{}",
      "utf-8"
    );

    const zipPath = await createPackage(tempDir, "test-plugin.zip");
    expect(await fs.pathExists(zipPath)).toBe(true);
  });

  it("round-trips package and install", async () => {
    // Create source project with .claude/
    const sourceDir = path.join(tempDir, "source");
    const claudeDir = path.join(sourceDir, ".claude");
    await fs.ensureDir(path.join(claudeDir, "skills"));
    await fs.writeFile(
      path.join(claudeDir, "CLAUDE.md"),
      "# Test Project\nSome content.\n",
      "utf-8"
    );
    await fs.writeFile(
      path.join(claudeDir, "skills", "test.md"),
      "---\nname: test\n---\nSkill content.\n",
      "utf-8"
    );
    await fs.writeFile(
      path.join(claudeDir, "settings.json"),
      '{ "permissions": {} }',
      "utf-8"
    );

    // Package
    const zipPath = await createPackage(sourceDir, "test-plugin.zip");

    // Install to a different directory
    const targetDir = path.join(tempDir, "target");
    await fs.ensureDir(targetDir);
    const installed = await installPackage(zipPath, targetDir, {
      force: true,
    });

    // Verify files were installed
    expect(installed.length).toBeGreaterThan(0);
    expect(
      await fs.pathExists(path.join(targetDir, ".claude", "CLAUDE.md"))
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(targetDir, ".claude", "skills", "test.md")
      )
    ).toBe(true);

    // Verify content matches
    const installedContent = await fs.readFile(
      path.join(targetDir, ".claude", "CLAUDE.md"),
      "utf-8"
    );
    expect(installedContent).toContain("Test Project");
  });
});
