import { describe, it, expect } from "vitest";
import path from "path";
import { fileURLToPath } from "url";
import { detectFramework } from "../../src/scanner/detect-framework.js";
import { detectLanguage } from "../../src/scanner/detect-language.js";
import { detectDatabase } from "../../src/scanner/detect-database.js";
import { detectTesting } from "../../src/scanner/detect-testing.js";
import { detectServices } from "../../src/scanner/detect-services.js";
import { detectAuth } from "../../src/scanner/detect-auth.js";
import { detectLinting } from "../../src/scanner/detect-linting.js";
import { readReadme } from "../../src/scanner/read-readme.js";
import { readStructure } from "../../src/scanner/read-structure.js";
import { scanProject } from "../../src/scanner/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "..", "fixtures");

// --- Framework Detection ---

describe("detectFramework", () => {
  it("detects Next.js with App Router", async () => {
    const result = await detectFramework(path.join(fixtures, "nextjs-app"));
    expect(result.name).toBe("nextjs");
    expect(result.version).toBe("14.1.0");
    expect(result.variant).toBe("app-router");
  });

  it("detects FastAPI", async () => {
    const result = await detectFramework(path.join(fixtures, "fastapi-app"));
    expect(result.name).toBe("fastapi");
  });

  it("detects Go with Gin", async () => {
    const result = await detectFramework(path.join(fixtures, "go-service"));
    expect(result.name).toBe("go");
    expect(result.variant).toBe("gin");
    expect(result.version).toBe("1.22");
  });

  it("detects Express", async () => {
    const result = await detectFramework(path.join(fixtures, "express-api"));
    expect(result.name).toBe("express");
  });

  it("returns null for bare project", async () => {
    const result = await detectFramework(path.join(fixtures, "bare-project"));
    expect(result.name).toBeNull();
  });
});

// --- Language Detection ---

describe("detectLanguage", () => {
  it("detects TypeScript with strict mode", async () => {
    const result = await detectLanguage(path.join(fixtures, "nextjs-app"));
    expect(result.primary).toBe("typescript");
    expect(result.strict).toBe(true);
    expect(result.version).toBe("5.3.0");
  });

  it("detects Python", async () => {
    const result = await detectLanguage(path.join(fixtures, "fastapi-app"));
    expect(result.primary).toBe("python");
    expect(result.version).toBe("3.12");
  });

  it("detects Go", async () => {
    const result = await detectLanguage(path.join(fixtures, "go-service"));
    expect(result.primary).toBe("go");
    expect(result.strict).toBe(true);
  });
});

// --- Database Detection ---

describe("detectDatabase", () => {
  it("detects Prisma with PostgreSQL", async () => {
    const result = await detectDatabase(path.join(fixtures, "nextjs-app"));
    expect(result.orm).toBe("prisma");
    expect(result.provider).toBe("postgresql");
    expect(result.migrations).toBe("prisma");
  });

  it("detects SQLAlchemy with Alembic", async () => {
    const result = await detectDatabase(path.join(fixtures, "fastapi-app"));
    expect(result.orm).toBe("sqlalchemy");
    expect(result.migrations).toBe("alembic");
    expect(result.provider).toBe("postgresql");
  });

  it("detects Mongoose with MongoDB", async () => {
    const result = await detectDatabase(path.join(fixtures, "express-api"));
    expect(result.orm).toBe("mongoose");
    expect(result.provider).toBe("mongodb");
  });

  it("returns null for bare project", async () => {
    const result = await detectDatabase(path.join(fixtures, "bare-project"));
    expect(result.orm).toBeNull();
    expect(result.provider).toBeNull();
  });
});

// --- Testing Detection ---

describe("detectTesting", () => {
  it("detects Vitest and Playwright", async () => {
    const result = await detectTesting(path.join(fixtures, "nextjs-app"));
    expect(result.unit).toBe("vitest");
    expect(result.e2e).toBe("playwright");
    expect(result.testDir).toBe("tests");
  });

  it("detects pytest", async () => {
    const result = await detectTesting(path.join(fixtures, "fastapi-app"));
    expect(result.unit).toBe("pytest");
  });

  it("detects Go test", async () => {
    const result = await detectTesting(path.join(fixtures, "go-service"));
    expect(result.unit).toBe("go-test");
    expect(result.testCommand).toBe("go test ./...");
  });

  it("detects Jest", async () => {
    const result = await detectTesting(path.join(fixtures, "express-api"));
    expect(result.unit).toBe("jest");
  });
});

// --- Services Detection ---

describe("detectServices", () => {
  it("detects GitHub Actions and Stripe", async () => {
    const result = await detectServices(path.join(fixtures, "nextjs-app"));
    expect(result.ci).toBe("github-actions");
    expect(result.payments).toBe("stripe");
  });
});

// --- Auth Detection ---

describe("detectAuth", () => {
  it("detects NextAuth", async () => {
    const result = await detectAuth(path.join(fixtures, "nextjs-app"));
    expect(result).toBe("nextauth");
  });

  it("returns null for bare project", async () => {
    const result = await detectAuth(path.join(fixtures, "bare-project"));
    expect(result).toBeNull();
  });
});

// --- Linting Detection ---

describe("detectLinting", () => {
  it("detects ESLint and Prettier", async () => {
    const result = await detectLinting(path.join(fixtures, "nextjs-app"));
    expect(result.linter).toBe("eslint");
    expect(result.formatter).toBe("prettier");
  });

  it("detects Ruff", async () => {
    const result = await detectLinting(path.join(fixtures, "fastapi-app"));
    expect(result.linter).toBe("ruff");
    expect(result.formatter).toBe("ruff");
  });
});

// --- README ---

describe("readReadme", () => {
  it("reads README.md", async () => {
    const result = await readReadme(path.join(fixtures, "nextjs-app"));
    expect(result.exists).toBe(true);
    expect(result.summary).toContain("SaaS");
  });

  it("handles missing README", async () => {
    const result = await readReadme(path.join(fixtures, "bare-project"));
    expect(result.exists).toBe(false);
    expect(result.summary).toBeNull();
  });
});

// --- Structure ---

describe("readStructure", () => {
  it("reads directory structure", async () => {
    const result = await readStructure(path.join(fixtures, "nextjs-app"));
    expect(result.tree).toContain("app");
    expect(result.tree).toContain("prisma");
    expect(result.tree).toContain("tests");
    expect(result.keyDirs).toContain("app");
  });
});

// --- Full Scanner ---

describe("scanProject", () => {
  it("produces a complete fingerprint for Next.js project", async () => {
    const fp = await scanProject(path.join(fixtures, "nextjs-app"));
    expect(fp.framework.name).toBe("nextjs");
    expect(fp.language.primary).toBe("typescript");
    expect(fp.database.orm).toBe("prisma");
    expect(fp.testing.unit).toBe("vitest");
    expect(fp.services.payments).toBe("stripe");
    expect(fp.services.auth).toBe("nextauth");
    expect(fp.linting.linter).toBe("eslint");
    expect(fp.readme.exists).toBe(true);
    expect(fp.projectName).toBe("my-saas-app");
  });
});
