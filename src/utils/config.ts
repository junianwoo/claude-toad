import fs from "fs-extra";
import path from "path";
import os from "os";

export interface ToadConfig {
  anthropicKey?: string;
  smidgeKey?: string;
  model?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".claude-toad");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export async function readConfig(): Promise<ToadConfig> {
  try {
    if (await fs.pathExists(CONFIG_PATH)) {
      return await fs.readJson(CONFIG_PATH);
    }
  } catch {}
  return {};
}

export async function writeConfig(config: ToadConfig): Promise<void> {
  await fs.ensureDir(CONFIG_DIR);
  await fs.writeJson(CONFIG_PATH, config, { spaces: 2 });
}

export async function updateConfig(
  updates: Partial<ToadConfig>
): Promise<void> {
  const existing = await readConfig();
  await writeConfig({ ...existing, ...updates });
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
