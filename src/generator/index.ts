import Anthropic from "@anthropic-ai/sdk";
import { ProjectFingerprint } from "../scanner/types.js";
import {
  buildClaudeMdPrompt,
  buildSkillsPrompt,
  buildAgentsPrompt,
  buildCommandsPrompt,
} from "./prompts.js";
import { parseSingleFile, parseMultipleFiles } from "./parser.js";
import { logger } from "../utils/logger.js";

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GeneratedFiles {
  claudeMd: string;
  skills: GeneratedFile[];
  agents: GeneratedFile[];
  commands: GeneratedFile[];
  hooks: Record<string, unknown> | null;
  settings: string;
  mcp: string | null;
}

export interface GenerateOptions {
  verbose?: boolean;
  skipAgents?: boolean;
  skipMcp?: boolean;
}

interface TokenUsage {
  call: string;
  inputTokens: number;
  outputTokens: number;
}

export async function generate(
  fingerprint: ProjectFingerprint,
  apiKey: string,
  model: string = "claude-opus-4-6",
  options: GenerateOptions = {}
): Promise<GeneratedFiles> {
  const client = new Anthropic({ apiKey });
  const usage: TokenUsage[] = [];

  const totalCalls = options.skipAgents ? 3 : 4;
  let currentCall = 0;

  const phaseMessages: Record<string, string[]> = {
    "CLAUDE.md": [
      "Archaeologically excavating your repo...",
      "Triangulating your stack choices...",
      "Transmuting your codebase into Claude's language...",
      "Snooping (we were invited)...",
    ],
    "skills": [
      "Crystallizing your framework knowledge...",
      "Desiccating your stack into concentrated wisdom...",
      "Enshrining the context that usually evaporates...",
      "Alchemizing your setup...",
    ],
    "agents": [
      "Summoning the dream reviewer...",
      "Manifesting the teammate who reads the diff...",
      "Osmosing Claude with your definition of good...",
      "Calibrating taste...",
    ],
    "commands": [
      "Materializing slash commands you didn't know you needed...",
      "Suturing the finishing touches...",
      "Festooning with a bow...",
      "Almost there. The toad is thorough.",
    ],
  };

  const progressStart = (label: string): ReturnType<typeof setInterval> => {
    currentCall++;
    const messages = phaseMessages[label] ?? [label];
    let i = 0;
    const msg = `(${currentCall}/${totalCalls})  ${messages[0]}`;
    if (currentCall === 1) {
      logger.start(msg);
    } else {
      logger.updateSpinner(msg);
    }
    return setInterval(() => {
      i = (i + 1) % messages.length;
      logger.updateSpinner(`(${currentCall}/${totalCalls})  ${messages[i]}`);
    }, 2500);
  };

  // Call 1: CLAUDE.md
  let interval = progressStart("CLAUDE.md");
  const claudeMdResponse = await callApi(
    client,
    model,
    buildClaudeMdPrompt(fingerprint)
  );
  clearInterval(interval);
  const claudeMd = parseSingleFile(claudeMdResponse.content);
  usage.push({
    call: "CLAUDE.md",
    inputTokens: claudeMdResponse.inputTokens,
    outputTokens: claudeMdResponse.outputTokens,
  });

  // Call 2: Skills
  interval = progressStart("skills");
  const skillsResponse = await callApi(
    client,
    model,
    buildSkillsPrompt(fingerprint, claudeMd)
  );
  clearInterval(interval);
  const skills = parseMultipleFiles(skillsResponse.content);
  usage.push({
    call: "Skills",
    inputTokens: skillsResponse.inputTokens,
    outputTokens: skillsResponse.outputTokens,
  });

  // Call 3: Agents (optional)
  let agents: GeneratedFile[] = [];
  if (!options.skipAgents) {
    interval = progressStart("agents");
    const agentsResponse = await callApi(
      client,
      model,
      buildAgentsPrompt(fingerprint, claudeMd)
    );
    clearInterval(interval);
    agents = parseMultipleFiles(agentsResponse.content);
    usage.push({
      call: "Agents",
      inputTokens: agentsResponse.inputTokens,
      outputTokens: agentsResponse.outputTokens,
    });
  }

  // Call 4: Commands + Hooks
  interval = progressStart("commands");
  const commandsResponse = await callApi(
    client,
    model,
    buildCommandsPrompt(fingerprint)
  );
  clearInterval(interval);
  const commandFiles = parseMultipleFiles(commandsResponse.content);
  usage.push({
    call: "Commands",
    inputTokens: commandsResponse.inputTokens,
    outputTokens: commandsResponse.outputTokens,
  });

  // Separate commands from hooks
  const commands = commandFiles.filter((f) => f.path.startsWith("commands/"));
  const hooksFile = commandFiles.find((f) => f.path === "hooks.json");
  let hooks: Record<string, unknown> | null = null;
  if (hooksFile) {
    try {
      const parsed = JSON.parse(hooksFile.content);
      hooks = parsed.hooks || parsed;
    } catch {
      logger.warn("Could not parse hooks output — skipping hooks");
    }
  }
  logger.success(`Generating configuration... (${totalCalls}/${totalCalls})`);

  // Template-based: settings.json (no API call)
  const settings = generateSettings(fingerprint, hooks);

  // Template-based: .mcp.json (no API call)
  const mcp = options.skipMcp ? null : generateMcp(fingerprint);

  // Log usage if verbose
  if (options.verbose) {
    logger.blank();
    logger.log("Token usage:");
    let totalInput = 0;
    let totalOutput = 0;
    for (const u of usage) {
      logger.log(
        `  ${u.call}: ${u.inputTokens} input, ${u.outputTokens} output`
      );
      totalInput += u.inputTokens;
      totalOutput += u.outputTokens;
    }
    logger.log(`  Total: ${totalInput} input, ${totalOutput} output`);
  }

  return { claudeMd, skills, agents, commands, hooks, settings, mcp };
}

interface ApiResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

async function callApi(
  client: Anthropic,
  model: string,
  prompt: string,
  retries: number = 1
): Promise<ApiResponse> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 16384,
        thinking: {
          type: "enabled",
          budget_tokens: 1024,
        },
        messages: [{ role: "user", content: prompt }],
      });

      // Extract text content (skip thinking blocks)
      const textBlocks = response.content.filter(
        (block) => block.type === "text"
      );
      const content = textBlocks.map((block) => {
        if (block.type === "text") return block.text;
        return "";
      }).join("\n");

      return {
        content,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (attempt < retries && (err.status === 429 || (err.status && err.status >= 500))) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(`API error (${err.status}), retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unreachable");
}

function generateSettings(
  fingerprint: ProjectFingerprint,
  hooks: Record<string, unknown> | null
): string {
  const settings: Record<string, unknown> = {};

  // Build permissions based on detected tools
  const allow: string[] = ["Read", "Grep", "Glob"];

  // Track wildcard prefixes to avoid redundant specific commands
  const wildcardPrefixes: string[] = [];

  if (fingerprint.packageManager) {
    const wildcard = `Bash(${fingerprint.packageManager} run *)`;
    allow.push(wildcard);
    wildcardPrefixes.push(`${fingerprint.packageManager} run `);
  }

  const isRedundant = (cmd: string) =>
    wildcardPrefixes.some((prefix) => cmd.startsWith(prefix));

  if (fingerprint.testing.testCommand && !isRedundant(fingerprint.testing.testCommand)) {
    allow.push(`Bash(${fingerprint.testing.testCommand})`);
  }

  if (fingerprint.linting.lintCommand && !isRedundant(fingerprint.linting.lintCommand)) {
    allow.push(`Bash(${fingerprint.linting.lintCommand})`);
  }

  settings.permissions = { allow };

  // Build hooks: start with preCommit lint hook if linter detected, then merge AI-generated hooks
  const mergedHooks: Record<string, unknown> = {};

  if (fingerprint.linting.lintCommand) {
    mergedHooks.preCommit = [
      {
        command: `${fingerprint.linting.lintCommand} 2>&1 | head -50`,
        description: "Lint check before committing changes",
      },
    ];
  }

  if (hooks && Object.keys(hooks).length > 0) {
    Object.assign(mergedHooks, hooks);
  }

  if (Object.keys(mergedHooks).length > 0) {
    settings.hooks = mergedHooks;
  }

  return JSON.stringify(settings, null, 2);
}

function generateMcp(fingerprint: ProjectFingerprint): string | null {
  const servers: Record<string, unknown> = {};

  // GitHub MCP if GitHub detected
  if (
    fingerprint.services.ci === "github-actions" ||
    fingerprint.services.all.includes("github")
  ) {
    servers.github = {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
    };
  }

  if (Object.keys(servers).length === 0) return null;

  return JSON.stringify({ mcpServers: servers }, null, 2);
}
