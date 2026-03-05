import { describe, it, expect } from "vitest";
import { ProjectFingerprint } from "../../src/scanner/types.js";

// We can't directly import the private functions, so we test them
// through the generate function's template output behavior.
// For now, test the prompt builders.

import {
  buildClaudeMdPrompt,
  buildSkillsPrompt,
  buildAgentsPrompt,
  buildCommandsPrompt,
} from "../../src/generator/prompts.js";

const mockFingerprint: ProjectFingerprint = {
  framework: { name: "nextjs", version: "14.1.0", variant: "app-router" },
  language: { primary: "typescript", version: "5.3.0", strict: true },
  database: { orm: "prisma", provider: "postgresql", migrations: "prisma" },
  testing: { unit: "vitest", e2e: "playwright", testDir: "tests", testCommand: "npm test" },
  services: {
    hosting: "vercel",
    ci: "github-actions",
    payments: "stripe",
    auth: "nextauth",
    baas: null,
    all: ["vercel", "github-actions", "stripe"],
  },
  linting: { linter: "eslint", formatter: "prettier", lintCommand: "npm run lint" },
  readme: { exists: true, summary: "A Next.js SaaS application" },
  structure: { tree: ["app", "lib", "components", "prisma", "tests"], keyDirs: ["app", "lib", "components"], fileCount: { ".ts": 20, ".tsx": 15 } },
  packageManager: "npm",
  projectName: "my-saas-app",
};

describe("buildClaudeMdPrompt", () => {
  it("includes project name", () => {
    const prompt = buildClaudeMdPrompt(mockFingerprint);
    expect(prompt).toContain("my-saas-app");
  });

  it("includes fingerprint as JSON", () => {
    const prompt = buildClaudeMdPrompt(mockFingerprint);
    expect(prompt).toContain('"framework"');
    expect(prompt).toContain('"nextjs"');
  });

  it("mentions 120 line limit", () => {
    const prompt = buildClaudeMdPrompt(mockFingerprint);
    expect(prompt).toContain("120 lines");
  });
});

describe("buildSkillsPrompt", () => {
  it("includes CLAUDE.md content for context", () => {
    const prompt = buildSkillsPrompt(mockFingerprint, "# My Project\nSome content");
    expect(prompt).toContain("# My Project");
    expect(prompt).toContain("COMPLEMENT");
  });

  it("mentions globs for lazy loading", () => {
    const prompt = buildSkillsPrompt(mockFingerprint, "");
    expect(prompt).toContain("globs");
  });
});

describe("buildAgentsPrompt", () => {
  it("specifies claude-sonnet-4-6 for agent runtime model", () => {
    const prompt = buildAgentsPrompt(mockFingerprint, "");
    expect(prompt).toContain("claude-sonnet-4-6");
  });

  it("generates code-reviewer and pr-writer", () => {
    const prompt = buildAgentsPrompt(mockFingerprint, "");
    expect(prompt).toContain("code-reviewer");
    expect(prompt).toContain("pr-writer");
  });
});

describe("buildCommandsPrompt", () => {
  it("uses actual test command", () => {
    const prompt = buildCommandsPrompt(mockFingerprint);
    expect(prompt).toContain("npm test");
  });

  it("includes deploy for vercel", () => {
    const prompt = buildCommandsPrompt(mockFingerprint);
    expect(prompt).toContain("vercel");
  });

  it("includes lint hook", () => {
    const prompt = buildCommandsPrompt(mockFingerprint);
    expect(prompt).toContain("npm run lint");
  });

  it("skips deploy when no hosting detected", () => {
    const fp = { ...mockFingerprint, services: { ...mockFingerprint.services, hosting: null } };
    const prompt = buildCommandsPrompt(fp);
    expect(prompt).toContain("No deploy command");
  });
});
