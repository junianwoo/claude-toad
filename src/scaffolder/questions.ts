import { select, checkbox, confirm, input } from "@inquirer/prompts";

export interface ProjectAnswers {
  projectName: string;
  projectType: string;
  stack: string;
  services: string[];
  testing: string;
  conventions: string;
  strictLinting: boolean;
}

export async function askProjectQuestions(): Promise<ProjectAnswers> {
  const projectName = await input({
    message: "Project name:",
    validate: (v) => (v.trim() ? true : "Project name is required"),
  });

  const projectType = await select({
    message: "What are you building?",
    choices: [
      { name: "Web app", value: "webapp" },
      { name: "API", value: "api" },
      { name: "CLI tool", value: "cli" },
      { name: "Library", value: "library" },
    ],
  });

  const stackChoices: Record<string, { name: string; value: string }[]> = {
    webapp: [
      { name: "Next.js", value: "nextjs" },
      { name: "Remix", value: "remix" },
      { name: "SvelteKit", value: "sveltekit" },
      { name: "Astro", value: "astro" },
    ],
    api: [
      { name: "Express", value: "express" },
      { name: "FastAPI", value: "fastapi" },
      { name: "Go", value: "go" },
      { name: "Rails", value: "rails" },
    ],
    cli: [
      { name: "Node.js (TypeScript)", value: "node-ts" },
      { name: "Python", value: "python" },
      { name: "Go", value: "go" },
    ],
    library: [
      { name: "TypeScript", value: "typescript" },
      { name: "Python", value: "python" },
      { name: "Go", value: "go" },
      { name: "Rust", value: "rust" },
    ],
  };

  const stack = await select({
    message: "What's your stack?",
    choices: stackChoices[projectType] || stackChoices.webapp,
  });

  const services = await checkbox({
    message: "What services will you use?",
    choices: [
      { name: "GitHub", value: "github" },
      { name: "PostgreSQL", value: "postgresql" },
      { name: "MongoDB", value: "mongodb" },
      { name: "Supabase", value: "supabase" },
      { name: "Firebase", value: "firebase" },
      { name: "Stripe", value: "stripe" },
      { name: "Auth0", value: "auth0" },
      { name: "Clerk", value: "clerk" },
      { name: "Vercel", value: "vercel" },
      { name: "Railway", value: "railway" },
      { name: "Fly.io", value: "fly" },
    ],
  });

  const testingChoices: Record<string, { name: string; value: string }[]> = {
    nextjs: [
      { name: "Vitest", value: "vitest" },
      { name: "Jest", value: "jest" },
    ],
    express: [
      { name: "Vitest", value: "vitest" },
      { name: "Jest", value: "jest" },
    ],
    fastapi: [{ name: "Pytest", value: "pytest" }],
    go: [{ name: "Go test", value: "go-test" }],
    python: [{ name: "Pytest", value: "pytest" }],
    "node-ts": [
      { name: "Vitest", value: "vitest" },
      { name: "Jest", value: "jest" },
    ],
    typescript: [
      { name: "Vitest", value: "vitest" },
      { name: "Jest", value: "jest" },
    ],
    rust: [{ name: "Cargo test", value: "cargo-test" }],
  };

  const testing = await select({
    message: "Testing framework?",
    choices: testingChoices[stack] || [
      { name: "Vitest", value: "vitest" },
      { name: "Minimal", value: "minimal" },
    ],
  });

  const conventions = await select({
    message: "Commit style?",
    choices: [
      { name: "Conventional commits", value: "conventional" },
      { name: "Free-form", value: "freeform" },
    ],
  });

  const strictLinting = await confirm({
    message: "Strict linting?",
    default: true,
  });

  return {
    projectName,
    projectType,
    stack,
    services,
    testing,
    conventions,
    strictLinting,
  };
}
