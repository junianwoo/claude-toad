import path from "path";
import { installPackage } from "../packager/index.js";
import { logger } from "../utils/logger.js";

interface InstallOptions {
  force?: boolean;
}

export async function installCommand(
  plugin: string,
  options: InstallOptions
): Promise<void> {
  try {
    const pluginPath = path.resolve(plugin);
    logger.start("Installing plugin...");
    const installed = await installPackage(pluginPath, process.cwd(), {
      force: options.force,
    });

    if (installed.length > 0) {
      logger.success("Plugin installed!");
      logger.blank();
      logger.log("  Installed:");
      for (const file of installed) {
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
