import fs from "fs-extra";
import path from "path";
import { resolveSmidgeKey } from "../smidge/auth.js";
import { generateSkill } from "../smidge/index.js";
import { logger } from "../utils/logger.js";

interface AddSkillOptions {
  from: string;
  smidgeKey?: string;
}

export async function addSkillCommand(options: AddSkillOptions): Promise<void> {
  try {
    // Check .claude/ directory exists
    const claudeDir = path.join(process.cwd(), ".claude");
    if (!(await fs.pathExists(claudeDir))) {
      logger.warn("No .claude/ directory found. Run `claude-toad init` first.");
      return;
    }

    // Resolve Smidge key
    const smidgeKey = await resolveSmidgeKey(options.smidgeKey);

    if (!smidgeKey) {
      logger.info(
        "add-skill integrates with Smidge for custom skill generation."
      );
      logger.blank();
      logger.info("Get your API key at https://smdg.app/account");
      return;
    }

    // Ensure skills directory exists
    const skillsDir = path.join(claudeDir, "skills");
    await fs.ensureDir(skillsDir);

    // Generate the skill via Smidge API
    logger.start(`Generating skill from: ${options.from}`);

    const result = await generateSkill(options.from, smidgeKey);

    // Write to .claude/skills/
    const outputPath = path.join(skillsDir, result.filename);
    await fs.writeFile(outputPath, result.content, "utf-8");

    logger.success(`Created: .claude/skills/${result.filename}`);
    logger.blank();
    logger.log("  Skill added. Claude Code will load it when relevant.");
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes("insufficient_credits")) {
      logger.error("No Smidge credits remaining.");
      logger.info("Purchase credits at https://smdg.app/pricing");
    } else if (err.message.includes("Invalid or missing API key")) {
      logger.error("Smidge API key is invalid or revoked.");
      logger.info("Check your key at https://smdg.app/account");
    } else {
      logger.error(`Generation failed: ${err.message}`);
    }
  }
}
