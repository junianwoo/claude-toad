import { createPackage } from "../packager/index.js";
import { logger } from "../utils/logger.js";

interface PackageOptions {
  output?: string;
}

export async function packageCommand(options: PackageOptions): Promise<void> {
  try {
    logger.start("Packaging .claude/ directory...");
    const zipPath = await createPackage(process.cwd(), options.output);
    logger.success(`Created: ${zipPath}`);
    logger.blank();
    logger.log("  Share with your team or install on another project:");
    logger.log("  claude-toad install <plugin.zip>");
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(err.message);
    process.exit(1);
  }
}
