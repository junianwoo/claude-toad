import fs from "fs-extra";
import path from "path";
import { ProjectFingerprint } from "../scanner/types.js";
import { ProjectAnswers } from "./questions.js";

export async function scaffoldProject(
  projectPath: string,
  answers: ProjectAnswers
): Promise<void> {
  await fs.ensureDir(projectPath);

  // Determine language from stack
  const isTypescript = ["nextjs", "remix", "sveltekit", "astro", "express", "node-ts", "typescript"].includes(answers.stack);
  const isPython = ["fastapi", "python"].includes(answers.stack);
  const isGo = answers.stack === "go";
  const isRust = answers.stack === "rust";

  if (isTypescript) {
    await scaffoldTypeScript(projectPath, answers);
  } else if (isPython) {
    await scaffoldPython(projectPath, answers);
  } else if (isGo) {
    await scaffoldGo(projectPath, answers);
  } else if (isRust) {
    await scaffoldRust(projectPath, answers);
  }

  // Create .gitignore
  await createGitignore(projectPath, answers);

  // Create README.md
  await fs.writeFile(
    path.join(projectPath, "README.md"),
    `# ${answers.projectName}\n\nBuilt with Claude Toad.\n`,
    "utf-8"
  );
}

export function buildSyntheticFingerprint(
  answers: ProjectAnswers
): ProjectFingerprint {
  const isTypescript = ["nextjs", "remix", "sveltekit", "astro", "express", "node-ts", "typescript"].includes(answers.stack);
  const isPython = ["fastapi", "python"].includes(answers.stack);
  const isGo = answers.stack === "go";

  return {
    framework: {
      name: mapFramework(answers.stack),
      version: null,
      variant: answers.stack === "nextjs" ? "app-router" : null,
    },
    language: {
      primary: isTypescript ? "typescript" : isPython ? "python" : isGo ? "go" : "rust",
      version: null,
      strict: answers.strictLinting,
    },
    database: {
      orm: answers.services.includes("postgresql") ? (isTypescript ? "prisma" : isPython ? "sqlalchemy" : null) : null,
      provider: answers.services.includes("postgresql") ? "postgresql" : answers.services.includes("mongodb") ? "mongodb" : null,
      migrations: answers.services.includes("postgresql") ? (isTypescript ? "prisma" : isPython ? "alembic" : null) : null,
    },
    testing: {
      unit: answers.testing,
      e2e: null,
      testDir: "tests",
      testCommand: getTestCommand(answers),
    },
    services: {
      hosting: answers.services.find((s) => ["vercel", "railway", "fly"].includes(s)) || null,
      ci: answers.services.includes("github") ? "github-actions" : null,
      payments: answers.services.includes("stripe") ? "stripe" : null,
      auth: answers.services.find((s) => ["auth0", "clerk"].includes(s)) || null,
      baas: answers.services.find((s) => ["supabase", "firebase"].includes(s)) || null,
      all: answers.services,
    },
    linting: {
      linter: isTypescript ? "eslint" : isPython ? "ruff" : null,
      formatter: isTypescript ? "prettier" : isPython ? "ruff" : isGo ? "gofmt" : null,
      lintCommand: isTypescript ? "npm run lint" : isPython ? "ruff check ." : null,
    },
    readme: { exists: true, summary: answers.projectName },
    structure: {
      tree: isTypescript ? ["src"] : isPython ? ["app", "tests"] : isGo ? ["cmd", "internal"] : [],
      keyDirs: isTypescript ? ["src"] : isPython ? ["app", "tests"] : isGo ? ["cmd", "internal"] : [],
      fileCount: {},
    },
    packageManager: isTypescript ? "npm" : null,
    projectName: answers.projectName,
  };
}

function mapFramework(stack: string): string | null {
  const map: Record<string, string> = {
    nextjs: "nextjs",
    remix: "remix",
    sveltekit: "sveltekit",
    astro: "astro",
    express: "express",
    fastapi: "fastapi",
    go: "go",
    rails: "rails",
  };
  return map[stack] || null;
}

function getTestCommand(answers: ProjectAnswers): string {
  switch (answers.testing) {
    case "vitest": return "npm test";
    case "jest": return "npm test";
    case "pytest": return "pytest";
    case "go-test": return "go test ./...";
    case "cargo-test": return "cargo test";
    default: return "npm test";
  }
}

async function scaffoldTypeScript(projectPath: string, answers: ProjectAnswers): Promise<void> {
  await fs.ensureDir(path.join(projectPath, "src"));
  await fs.ensureDir(path.join(projectPath, "tests"));

  // package.json
  const pkg: Record<string, unknown> = {
    name: answers.projectName,
    version: "0.1.0",
    type: "module",
    scripts: {
      dev: answers.stack === "nextjs" ? "next dev" : "tsx watch src/index.ts",
      build: answers.stack === "nextjs" ? "next build" : "tsc",
      test: answers.testing === "vitest" ? "vitest run" : "jest",
      lint: "eslint src/",
    },
    dependencies: {} as Record<string, string>,
    devDependencies: {
      typescript: "^5.3.0",
    } as Record<string, string>,
  };

  if (answers.stack === "nextjs") {
    (pkg.dependencies as Record<string, string>).next = "^14.1.0";
    (pkg.dependencies as Record<string, string>).react = "^18.2.0";
    (pkg.dependencies as Record<string, string>)["react-dom"] = "^18.2.0";
    await fs.ensureDir(path.join(projectPath, "app"));
    await fs.writeFile(
      path.join(projectPath, "app", "page.tsx"),
      `export default function Home() {\n  return <h1>${answers.projectName}</h1>;\n}\n`,
      "utf-8"
    );
  } else if (answers.stack === "express") {
    (pkg.dependencies as Record<string, string>).express = "^4.18.2";
    await fs.writeFile(
      path.join(projectPath, "src", "index.ts"),
      `import express from "express";\n\nconst app = express();\napp.get("/", (req, res) => res.json({ status: "ok" }));\napp.listen(3000);\n`,
      "utf-8"
    );
  }

  await fs.writeJson(path.join(projectPath, "package.json"), pkg, { spaces: 2 });

  // tsconfig.json
  await fs.writeJson(
    path.join(projectPath, "tsconfig.json"),
    {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: answers.strictLinting,
        esModuleInterop: true,
        skipLibCheck: true,
        outDir: "./dist",
        rootDir: "./src",
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    },
    { spaces: 2 }
  );
}

async function scaffoldPython(projectPath: string, answers: ProjectAnswers): Promise<void> {
  await fs.ensureDir(path.join(projectPath, "app"));
  await fs.ensureDir(path.join(projectPath, "tests"));

  const deps = answers.stack === "fastapi"
    ? '"fastapi>=0.109.0",\n    "uvicorn>=0.27.0",'
    : "";

  await fs.writeFile(
    path.join(projectPath, "pyproject.toml"),
    `[project]\nname = "${answers.projectName}"\nversion = "0.1.0"\nrequires-python = ">=3.12"\ndependencies = [\n    ${deps}\n]\n\n[project.optional-dependencies]\ndev = [\n    "pytest>=7.4.0",\n    "ruff>=0.2.0",\n]\n`,
    "utf-8"
  );

  await fs.writeFile(path.join(projectPath, "app", "__init__.py"), "", "utf-8");
  await fs.writeFile(path.join(projectPath, "tests", "__init__.py"), "", "utf-8");

  if (answers.stack === "fastapi") {
    await fs.writeFile(
      path.join(projectPath, "app", "main.py"),
      `from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/health")\ndef health():\n    return {"status": "ok"}\n`,
      "utf-8"
    );
  }
}

async function scaffoldGo(projectPath: string, answers: ProjectAnswers): Promise<void> {
  await fs.ensureDir(path.join(projectPath, "cmd", "server"));
  await fs.ensureDir(path.join(projectPath, "internal"));

  await fs.writeFile(
    path.join(projectPath, "go.mod"),
    `module github.com/example/${answers.projectName}\n\ngo 1.22\n`,
    "utf-8"
  );

  await fs.writeFile(
    path.join(projectPath, "cmd", "server", "main.go"),
    `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello from ${answers.projectName}")\n}\n`,
    "utf-8"
  );

  await fs.writeFile(
    path.join(projectPath, "Makefile"),
    `.PHONY: build run test\n\nbuild:\n\tgo build -o bin/server ./cmd/server\n\nrun:\n\tgo run ./cmd/server\n\ntest:\n\tgo test ./...\n`,
    "utf-8"
  );
}

async function scaffoldRust(projectPath: string, answers: ProjectAnswers): Promise<void> {
  await fs.ensureDir(path.join(projectPath, "src"));

  await fs.writeFile(
    path.join(projectPath, "Cargo.toml"),
    `[package]\nname = "${answers.projectName}"\nversion = "0.1.0"\nedition = "2021"\n`,
    "utf-8"
  );

  await fs.writeFile(
    path.join(projectPath, "src", "main.rs"),
    `fn main() {\n    println!("Hello from ${answers.projectName}");\n}\n`,
    "utf-8"
  );
}

async function createGitignore(projectPath: string, answers: ProjectAnswers): Promise<void> {
  const isTypescript = ["nextjs", "remix", "sveltekit", "astro", "express", "node-ts", "typescript"].includes(answers.stack);
  const isPython = ["fastapi", "python"].includes(answers.stack);
  const isGo = answers.stack === "go";

  let content = "";
  if (isTypescript) {
    content = "node_modules/\ndist/\n.next/\n.env\n.env.local\n*.log\n.DS_Store\ncoverage/\n";
  } else if (isPython) {
    content = "__pycache__/\n.venv/\n*.pyc\n.env\n.ruff_cache/\n.pytest_cache/\ndist/\n";
  } else if (isGo) {
    content = "bin/\n.env\n*.exe\n";
  } else {
    content = "target/\n.env\n";
  }

  await fs.writeFile(path.join(projectPath, ".gitignore"), content, "utf-8");
}
