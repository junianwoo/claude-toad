import { input, confirm } from "@inquirer/prompts";
import { readConfig, updateConfig } from "../utils/config.js";

export async function resolveSmidgeKey(
  cliKey?: string
): Promise<string | null> {
  // 1. CLI flag
  if (cliKey) return cliKey;

  // 2. Environment variable
  if (process.env.SMIDGE_API_KEY) return process.env.SMIDGE_API_KEY;

  // 3. Config file
  const config = await readConfig();
  if (config.smidgeKey) return config.smidgeKey;

  // 4. Interactive prompt
  const key = await input({
    message:
      "Enter your Smidge API key (get one at smdg.app/settings/api-keys):",
    validate: (value) => {
      if (!value.trim()) return "API key is required. Get one at smdg.app/settings/api-keys";
      return true;
    },
  });

  if (!key.trim()) return null;

  const save = await confirm({
    message: "Save for future use?",
    default: true,
  });

  if (save) {
    await updateConfig({ smidgeKey: key });
  }

  return key;
}
