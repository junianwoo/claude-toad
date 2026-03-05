import fs from "fs-extra";
import path from "path";
import os from "os";
import { input, confirm } from "@inquirer/prompts";
import { readConfig, updateConfig } from "./config.js";
import { logger } from "./logger.js";

export async function resolveApiKey(cliKey?: string): Promise<string> {
  // 1. CLI flag
  if (cliKey) return cliKey;

  // 2. Environment variable
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;

  // 3. Claude Toad config file
  const config = await readConfig();
  if (config.anthropicKey) return config.anthropicKey;

  // 4. Claude Code's existing config
  const claudeConfigPaths = [
    path.join(os.homedir(), ".claude", "config.json"),
    path.join(os.homedir(), ".claude.json"),
  ];
  for (const configPath of claudeConfigPaths) {
    if (await fs.pathExists(configPath)) {
      try {
        const claudeConfig = await fs.readJson(configPath);
        if (claudeConfig.apiKey) return claudeConfig.apiKey;
        if (claudeConfig.anthropicApiKey) return claudeConfig.anthropicApiKey;
      } catch {}
    }
  }

  // 5. Interactive prompt
  logger.blank();
  const key = await input({
    message: "Enter your Anthropic API key (get one at console.anthropic.com):",
    validate: (value) => {
      if (!value.trim()) return "API key is required";
      if (!value.startsWith("sk-ant-")) return "Invalid API key format (should start with sk-ant-)";
      return true;
    },
  });

  const save = await confirm({
    message: "Save for future use?",
    default: true,
  });

  if (save) {
    await updateConfig({ anthropicKey: key });
    logger.success("Saved to ~/.claude-toad/config.json");
  }

  return key;
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    // Make a minimal API call to validate the key
    await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    });
    return true;
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err.status === 401) return false;
    // Other errors (rate limit, etc.) mean the key is valid
    return true;
  }
}

export function resolveModel(model: string): string {
  switch (model.toLowerCase()) {
    case "opus":
      return "claude-opus-4-6";
    case "sonnet":
      return "claude-sonnet-4-6";
    default:
      return model;
  }
}
