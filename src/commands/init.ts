import { confirm } from "@inquirer/prompts";
import { scanProject } from "../scanner/index.js";
import { generate } from "../generator/index.js";
import { writeFiles } from "../writer/index.js";
import { resolveApiKey, resolveModel } from "../utils/api-key.js";
import { logger } from "../utils/logger.js";

interface InitOptions {
  dryRun?: boolean;
  verbose?: boolean;
  force?: boolean;
  agents?: boolean;
  mcp?: boolean;
  apiKey?: string;
  model?: string;
  regenerate?: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const projectPath = process.cwd();

  try {
    // Scan project first (no API key needed)
    logger.start("Scanning project...");
    const fingerprint = await scanProject(projectPath);
    logger.success("Project scanned");

    // Display findings
    logger.blank();
    displayFingerprint(fingerprint, options.verbose);

    // Confirm unless --force or --dry-run
    if (!options.force && !options.dryRun) {
      logger.blank();
      const proceed = await confirm({
        message: "Generate .claude/ configuration?",
        default: true,
      });
      if (!proceed) {
        logger.info("Cancelled.");
        return;
      }
    }

    // Resolve API key (only needed for generation)
    const apiKey = await resolveApiKey(options.apiKey);

    // Resolve model
    const model = resolveModel(options.model || "opus");

    // Generate
    logger.blank();
    const files = await generate(fingerprint, apiKey, model, {
      verbose: options.verbose,
      skipAgents: options.agents === false,
      skipMcp: options.mcp === false,
    });

    // Write
    logger.blank();
    const written = await writeFiles(projectPath, files, {
      force: options.force,
      dryRun: options.dryRun,
    });

    if (written.length > 0) {
      logger.blank();
      logger.success("Configuration generated!");
      logger.blank();
      logger.log("  Created:");
      for (const file of written) {
        logger.log(`    ${file}`);
      }
      logger.blank();
      logger.log("  Claude Code is ready for this project.");
    }
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(err.message);
    process.exit(1);
  }
}

function displayFingerprint(
  fingerprint: import("../scanner/types.js").ProjectFingerprint,
  verbose?: boolean
): void {
  if (verbose) {
    logger.log(JSON.stringify(fingerprint, null, 2));
    return;
  }

  const parts: string[] = [];

  if (fingerprint.framework.name) {
    let fw = fingerprint.framework.name;
    if (fingerprint.framework.version) fw += ` ${fingerprint.framework.version}`;
    if (fingerprint.framework.variant) fw += ` (${fingerprint.framework.variant.replace("-", " ")})`;
    parts.push(fw);
  }

  if (fingerprint.language.primary) {
    let lang = fingerprint.language.primary;
    if (fingerprint.language.strict) lang += " (strict)";
    parts.push(lang);
  }

  if (fingerprint.database.orm) {
    let db = fingerprint.database.orm;
    if (fingerprint.database.provider) db += ` + ${fingerprint.database.provider}`;
    parts.push(db);
  }

  if (fingerprint.testing.unit) {
    let test = fingerprint.testing.unit;
    if (fingerprint.testing.e2e) test += ` + ${fingerprint.testing.e2e}`;
    parts.push(test);
  }

  if (fingerprint.services.hosting) parts.push(fingerprint.services.hosting);
  if (fingerprint.services.payments) parts.push(fingerprint.services.payments);
  if (fingerprint.services.auth) parts.push(fingerprint.services.auth);

  logger.log("  Detected:");
  logger.log(`    ${parts.join(" · ")}`);
}
