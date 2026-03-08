import chalk from "chalk";
import { confirm } from "@inquirer/prompts";
import { scanProject } from "../scanner/index.js";
import { generate } from "../generator/index.js";
import { writeFiles } from "../writer/index.js";
import { resolveApiKey, resolveModel } from "../utils/api-key.js";
import { logger } from "../utils/logger.js";
import { getVersion } from "../utils/version.js";

interface InitOptions {
  dryRun?: boolean;
  verbose?: boolean;
  force?: boolean;
  agents?: boolean;
  mcp?: boolean;
  apiKey?: string;
  model?: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const projectPath = process.cwd();

  logger.banner(getVersion());

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
      logger.log("  " + chalk.bold("Created:"));
      logger.blank();

      // Compute path column width for alignment
      const pathWidth = Math.max(...written.map((f) => f.path.length));

      for (const file of written) {
        if (file.lines !== null) {
          const padded = file.path.padEnd(pathWidth + 2);
          logger.log(
            `    ${chalk.dim(padded)}${chalk.dim(file.lines + " lines")}`
          );
        } else {
          logger.log(`    ${chalk.dim(file.path)}`);
        }
      }

      logger.blank();
      logger.log(
        `  ${chalk.bold("Done.")} Claude Code is ready for this project.`
      );
      logger.blank();
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

  const rows: Array<[string, string]> = [];

  if (fingerprint.framework.name) {
    let val = fingerprint.framework.name;
    if (fingerprint.framework.version) val += ` ${fingerprint.framework.version}`;
    if (fingerprint.framework.variant) val += ` (${fingerprint.framework.variant.replace("-", " ")})`;
    rows.push(["Framework", val]);
  }

  if (fingerprint.language.primary) {
    let val = fingerprint.language.primary;
    if (fingerprint.language.strict) val += " (strict)";
    rows.push(["Language", val]);
  }

  if (fingerprint.database.orm) {
    let val = fingerprint.database.orm;
    if (fingerprint.database.provider) val += ` + ${fingerprint.database.provider}`;
    rows.push(["Database", val]);
  }

  if (fingerprint.testing.unit) {
    let val = fingerprint.testing.unit;
    if (fingerprint.testing.e2e) val += ` + ${fingerprint.testing.e2e}`;
    rows.push(["Testing", val]);
  }

  if (fingerprint.services.hosting) rows.push(["Hosting", fingerprint.services.hosting]);

  // Consolidate remaining services into one row
  const extraServices: string[] = [];
  if (fingerprint.services.payments) extraServices.push(fingerprint.services.payments);
  if (fingerprint.services.auth) extraServices.push(fingerprint.services.auth);
  if (fingerprint.services.ci) extraServices.push(fingerprint.services.ci);
  if (extraServices.length > 0) rows.push(["Services", extraServices.join(", ")]);

  if (rows.length === 0) return;

  const labelWidth = Math.max(...rows.map(([l]) => l.length)) + 2;

  for (const [label, value] of rows) {
    const padded = label.padEnd(labelWidth);
    logger.log(`  ${chalk.dim(padded)}${value}`);
  }
}
