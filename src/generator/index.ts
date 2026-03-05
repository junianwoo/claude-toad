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

  // Call 1: CLAUDE.md
  logger.start("Generating CLAUDE.md...");
  const claudeMdResponse = await callApi(
    client,
    model,
    buildClaudeMdPrompt(fingerprint)
  );
  const claudeMd = parseSingleFile(claudeMdResponse.content);
  usage.push({
    call: "CLAUDE.md",
    inputTokens: claudeMdResponse.inputTokens,
    outputTokens: claudeMdResponse.outputTokens,
  });
  logger.success("CLAUDE.md generated");

  // Call 2: Skills
  logger.start("Generating skills...");
  const skillsResponse = await callApi(
    client,
    model,
    buildSkillsPrompt(fingerprint, claudeMd)
  );
  const skills = parseMultipleFiles(skillsResponse.content);
  usage.push({
    call: "Skills",
    inputTokens: skillsResponse.inputTokens,
    outputTokens: skillsResponse.outputTokens,
  });
  logger.success(`${skills.length} skill(s) generated`);

  // Call 3: Agents (optional)
  let agents: GeneratedFile[] = [];
  if (!options.skipAgents) {
    logger.start("Generating agents...");
    const agentsResponse = await callApi(
      client,
      model,
      buildAgentsPrompt(fingerprint, claudeMd)
    );
    agents = parseMultipleFiles(agentsResponse.content);
    usage.push({
      call: "Agents",
      inputTokens: agentsResponse.inputTokens,
      outputTokens: agentsResponse.outputTokens,
    });
    logger.success(`${agents.length} agent(s) generated`);
  }

  // Call 4: Commands + Hooks
  logger.start("Generating commands and hooks...");
  const commandsResponse = await callApi(
    client,
    model,
    buildCommandsPrompt(fingerprint)
  );
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
  logger.success(`${commands.length} command(s) generated`);

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

  if (fingerprint.packageManager) {
    allow.push(`Bash(${fingerprint.packageManager} run *)`);
  }

  if (fingerprint.testing.testCommand) {
    allow.push(`Bash(${fingerprint.testing.testCommand})`);
  }

  if (fingerprint.linting.lintCommand) {
    allow.push(`Bash(${fingerprint.linting.lintCommand})`);
  }

  settings.permissions = { allow };

  // Add hooks if generated
  if (hooks && Object.keys(hooks).length > 0) {
    settings.hooks = hooks;
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
