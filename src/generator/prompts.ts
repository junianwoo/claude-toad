import { ProjectFingerprint } from "../scanner/types.js";

export function buildClaudeMdPrompt(fingerprint: ProjectFingerprint): string {
  return `You are an expert Claude Code configurator. Generate a CLAUDE.md file for this project.

<project_analysis>
${JSON.stringify(fingerprint, null, 2)}
</project_analysis>

RULES:
- Maximum 120 lines (leave headroom under the 150 line recommendation)
- First line: "# ${fingerprint.projectName || "Project"}"
- Second line: One-sentence description from the README summary or inferred from the stack
- Sections: Tech Stack, Architecture, Key Commands, Conventions, Gotchas
- Key Commands: use ACTUAL commands from the project analysis (e.g., the real test command, build command). If a package manager is detected, use it (e.g., "pnpm dev" not "npm run dev").
- Conventions: language-specific and project-specific (e.g., "functional components with hooks" for React, "type hints on all functions" for Python)
- Do NOT include deep framework patterns (those go in skills — reference them with @import)
- Do NOT include detailed testing strategies (those go in skills)
- Do NOT include agent configurations or commands
- Reference skills using: @import skills/[name].md
- Use concise bullet points. No prose paragraphs. No filler.
- End with a Gotchas section listing non-obvious project specifics
- Every line must earn its place. If it's obvious, omit it.

Output ONLY the file content. No wrapping tags. No explanation. No markdown code fences.`;
}

export function buildSkillsPrompt(
  fingerprint: ProjectFingerprint,
  claudeMd: string
): string {
  return `You are an expert Claude Code configurator. Generate skill files for this project.

<project_analysis>
${JSON.stringify(fingerprint, null, 2)}
</project_analysis>

<claude_md>
${claudeMd}
</claude_md>

The CLAUDE.md above is already generated. Your skills must COMPLEMENT it, not duplicate it. CLAUDE.md has the overview. Skills have the deep domain knowledge.

Generate one skill per detected domain. Only generate skills for domains that are actually detected in the project analysis. Typical skills:
- Framework skill (e.g., nextjs-patterns, django-patterns, go-patterns) — if a framework is detected
- Database skill (e.g., prisma-patterns, sqlalchemy-patterns) — if an ORM/database is detected
- Testing skill (e.g., vitest-testing, pytest-testing) — if a test framework is detected

RULES for each skill:
- YAML frontmatter with: name, description, and globs (array of file patterns for lazy loading)
- The globs field is critical — Claude Code uses it to decide when to load this skill
- Under 200 lines per skill
- Be specific to THIS project's detected setup, not generic framework documentation
- Include: patterns to follow, patterns to avoid, file organization conventions
- Be concrete: reference actual directories and file patterns from the project structure
- If the project has specific conventions visible in the analysis, encode them

Format: wrap each skill in XML tags:
<file path="skills/[name].md">
---
name: skill-name
description: What this skill covers
globs: ["pattern1/**", "pattern2/**"]
---
[Skill content]
</file>

Output ONLY the file tags. No explanation outside the tags.`;
}

export function buildAgentsPrompt(
  fingerprint: ProjectFingerprint,
  claudeMd: string
): string {
  return `You are an expert Claude Code configurator. Generate agent definition files for this project.

<project_analysis>
${JSON.stringify(fingerprint, null, 2)}
</project_analysis>

<claude_md>
${claudeMd}
</claude_md>

Generate two agents:

1. code-reviewer: Reviews code changes against this project's conventions.
   - Model: claude-sonnet-4-6 (Sonnet for cost efficiency on reviews)
   - Include project-specific review criteria based on the detected language, framework, and conventions
   - Reference the actual conventions from CLAUDE.md
   - Be specific about what to check for THIS stack

2. pr-writer: Generates PR descriptions for this project.
   - Model: claude-sonnet-4-6
   - Include a checklist relevant to this project's workflow and stack
   - Reference actual commands and tools from the project

Format for each:
<file path="agents/[name].md">
---
name: agent-name
model: claude-sonnet-4-6
description: What this agent does
---
[Agent instructions — be specific to this project's stack and conventions]
</file>

Output ONLY the file tags. No explanation outside the tags.`;
}

export function buildCommandsPrompt(fingerprint: ProjectFingerprint): string {
  const testCmd = fingerprint.testing.testCommand || "npm test";
  const hosting = fingerprint.services.hosting;
  const linter = fingerprint.linting.linter;
  const lintCmd = fingerprint.linting.lintCommand;

  return `You are an expert Claude Code configurator. Generate slash command files for this project.

<project_analysis>
${JSON.stringify(fingerprint, null, 2)}
</project_analysis>

COMMANDS to generate:
- test command: Use the actual test command: "${testCmd}"
  - Should run the test suite and report results
  - Should not auto-fix without asking
${hosting ? `- deploy command: For ${hosting} hosting platform. Use the real deploy mechanism for that platform.` : "- No deploy command (no hosting platform detected)"}

Format for each command:
<file path="commands/[name].md">
[Command instructions]
</file>

HOOKS to generate (output as a JSON object):
${linter && lintCmd ? `- Pre-commit lint hook using: "${lintCmd}"` : "- No lint hook (no linter detected)"}
${fingerprint.language.primary === "typescript" ? "- Post-write type check hook" : "- No type check hook"}
- All hooks must be read-only safe. No hooks that auto-modify files.

Format hooks as:
<file path="hooks.json">
{
  "hooks": { ... }
}
</file>

If no hooks are needed, output an empty hooks object.

Output ONLY the file tags. No explanation outside the tags.`;
}
