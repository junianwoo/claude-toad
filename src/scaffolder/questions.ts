import { select, checkbox, confirm, input, Separator } from "@inquirer/prompts";

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
      { name: "Nuxt", value: "nuxt" },
      { name: "Remix", value: "remix" },
      { name: "SvelteKit", value: "sveltekit" },
      { name: "Astro", value: "astro" },
      { name: "Vite + React", value: "vite-react" },
      { name: "Vite + Vue", value: "vite-vue" },
      { name: "Solid Start", value: "solid" },
      { name: "Angular", value: "angular" },
    ],
    api: [
      { name: "Express", value: "express" },
      { name: "Fastify", value: "fastify" },
      { name: "Hono", value: "hono" },
      { name: "NestJS", value: "nestjs" },
      { name: "FastAPI", value: "fastapi" },
      { name: "Django", value: "django" },
      { name: "Flask", value: "flask" },
      { name: "Go (net/http)", value: "go" },
      { name: "Go (Gin)", value: "gin" },
      { name: "Rails", value: "rails" },
      { name: "Spring Boot", value: "spring" },
    ],
    cli: [
      { name: "Node.js (TypeScript)", value: "node-ts" },
      { name: "Python (Click)", value: "python-click" },
      { name: "Python (Typer)", value: "python-typer" },
      { name: "Go", value: "go" },
      { name: "Rust (clap)", value: "rust" },
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
      new Separator("── Hosting ──────────────────"),
      { name: "Vercel", value: "vercel" },
      { name: "Netlify", value: "netlify" },
      { name: "Railway", value: "railway" },
      { name: "Fly.io", value: "fly" },
      { name: "AWS", value: "aws" },
      { name: "Cloudflare Workers", value: "cloudflare" },
      { name: "Docker", value: "docker" },
      new Separator("── Database ─────────────────"),
      { name: "PostgreSQL", value: "postgresql" },
      { name: "MySQL", value: "mysql" },
      { name: "MongoDB", value: "mongodb" },
      { name: "Redis", value: "redis" },
      { name: "Supabase", value: "supabase" },
      { name: "Firebase", value: "firebase" },
      { name: "PlanetScale", value: "planetscale" },
      { name: "Neon", value: "neon" },
      new Separator("── ORM ──────────────────────"),
      { name: "Prisma", value: "prisma" },
      { name: "Drizzle", value: "drizzle" },
      new Separator("── Payments ─────────────────"),
      { name: "Stripe", value: "stripe" },
      { name: "Paddle", value: "paddle" },
      new Separator("── Auth ─────────────────────"),
      { name: "Auth0", value: "auth0" },
      { name: "Clerk", value: "clerk" },
      { name: "NextAuth", value: "nextauth" },
      new Separator("── Source Control ───────────"),
      { name: "GitHub", value: "github" },
      { name: "GitLab", value: "gitlab" },
    ],
  });

  const testingChoices: Record<string, { name: string; value: string }[]> = {
    nextjs:          [{ name: "Vitest", value: "vitest" }, { name: "Jest", value: "jest" }],
    nuxt:            [{ name: "Vitest", value: "vitest" }],
    remix:           [{ name: "Vitest", value: "vitest" }, { name: "Jest", value: "jest" }],
    sveltekit:       [{ name: "Vitest", value: "vitest" }],
    astro:           [{ name: "Vitest", value: "vitest" }],
    "vite-react":    [{ name: "Vitest", value: "vitest" }],
    "vite-vue":      [{ name: "Vitest", value: "vitest" }],
    solid:           [{ name: "Vitest", value: "vitest" }],
    angular:         [{ name: "Jest", value: "jest" }, { name: "Karma", value: "karma" }],
    express:         [{ name: "Vitest", value: "vitest" }, { name: "Jest", value: "jest" }],
    fastify:         [{ name: "Vitest", value: "vitest" }, { name: "Jest", value: "jest" }],
    hono:            [{ name: "Vitest", value: "vitest" }, { name: "Jest", value: "jest" }],
    nestjs:          [{ name: "Jest", value: "jest" }, { name: "Vitest", value: "vitest" }],
    fastapi:         [{ name: "Pytest", value: "pytest" }],
    django:          [{ name: "Pytest", value: "pytest" }],
    flask:           [{ name: "Pytest", value: "pytest" }],
    go:              [{ name: "Go test", value: "go-test" }],
    gin:             [{ name: "Go test", value: "go-test" }],
    rails:           [{ name: "RSpec", value: "rspec" }, { name: "Minitest", value: "minitest" }],
    spring:          [{ name: "JUnit", value: "junit" }],
    "node-ts":       [{ name: "Vitest", value: "vitest" }, { name: "Jest", value: "jest" }],
    "python-click":  [{ name: "Pytest", value: "pytest" }],
    "python-typer":  [{ name: "Pytest", value: "pytest" }],
    python:          [{ name: "Pytest", value: "pytest" }],
    rust:            [{ name: "Cargo test", value: "cargo-test" }],
    typescript:      [{ name: "Vitest", value: "vitest" }, { name: "Jest", value: "jest" }],
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
