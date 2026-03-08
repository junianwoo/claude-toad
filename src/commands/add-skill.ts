import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { checkbox, confirm } from "@inquirer/prompts";
import { resolveSmidgeKey } from "../smidge/auth.js";
import { detectTopics, generateSkill, generateCatalogue } from "../smidge/index.js";
import type { DetectedTopic } from "../smidge/index.js";
import { logger } from "../utils/logger.js";

interface AddSkillOptions {
  from: string;
  smidgeKey?: string;
}

function countLines(content: string): number {
  return content.split("\n").length;
}

function formatFileList(
  files: Array<{ relativePath: string; lines: number }>
): void {
  const pathWidth = Math.max(...files.map((f) => f.relativePath.length));
  for (const file of files) {
    const padded = file.relativePath.padEnd(pathWidth + 2);
    logger.log(`    ${chalk.dim(padded)}${chalk.dim(file.lines + " lines")}`);
  }
}

export async function addSkillCommand(options: AddSkillOptions): Promise<void> {
  try {
    // Check .claude/ directory exists
    const claudeDir = path.join(process.cwd(), ".claude");
    if (!(await fs.pathExists(claudeDir))) {
      logger.warn("No .claude/ directory found. Run `claude-toad init` first.");
      return;
    }

    // Smidge attribution
    logger.blank();
    logger.log(chalk.dim("  Smidge  skill generation"));
    logger.blank();

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

    const skillsDir = path.join(claudeDir, "skills");
    await fs.ensureDir(skillsDir);

    // Phase 1 — detect topics
    logger.start("Analyzing source...");
    let detection: { shouldCatalogue: boolean; wordCount: number; topics: DetectedTopic[]; isUnlimited: boolean };
    try {
      detection = await detectTopics(options.from, smidgeKey);
    } catch (err) {
      logger.stopSpinner();
      throw err;
    }
    logger.stopSpinner();

    // Phase 2a — single skill
    if (!detection.shouldCatalogue) {
      logger.start("Pass 1: Normalizing content...");
      let result: Awaited<ReturnType<typeof generateSkill>>;
      try {
        result = await generateSkill(options.from, smidgeKey);
      } catch (err) {
        logger.stopSpinner();
        throw err;
      }
      logger.stopSpinner();

      const wordLabel = result.wordCount > 0 ? ` (${result.wordCount.toLocaleString()} words)` : "";
      logger.success(`${result.filename} generated${wordLabel}`);
      logger.blank();

      const outputPath = path.join(skillsDir, result.filename);
      await fs.writeFile(outputPath, result.content, "utf-8");

      const fileList: Array<{ relativePath: string; lines: number }> = [
        {
          relativePath: `.claude/skills/${result.filename}`,
          lines: countLines(result.content),
        },
      ];

      for (const ref of result.referenceFiles) {
        const refDir = path.join(skillsDir, "references");
        await fs.ensureDir(refDir);
        await fs.writeFile(path.join(refDir, ref.filename), ref.content, "utf-8");
        fileList.push({
          relativePath: `.claude/skills/references/${ref.filename}`,
          lines: countLines(ref.content),
        });
      }

      formatFileList(fileList);
      logger.blank();
      logger.log(detection.isUnlimited ? `  Unlimited plan` : `  Credits remaining: ${result.creditsRemaining}`);
      logger.blank();
      return;
    }

    // Phase 2b — catalogue
    const wordCount = detection.wordCount;
    logger.success(
      `Analyzed (${wordCount.toLocaleString()} words — catalogue opportunity detected)`
    );
    logger.blank();

    const topics = detection.topics;

    let selected: DetectedTopic[] = [];
    let confirmed = false;
    let previouslySelected: Set<string> = new Set(topics.map((t) => t.slug));

    while (!confirmed) {
      selected = await checkbox<DetectedTopic>({
        message: "Select topics to generate (↑↓ navigate, space select, enter confirm):",
        choices: topics.map((t) => ({
          name: `${chalk.bold(t.topicName)}  ${chalk.dim(t.description)}`,
          value: t,
          checked: previouslySelected.has(t.slug),
        })),
        loop: false,
        theme: {
          style: {
            answer: () => chalk.dim("selection complete"),
          },
        },
      });

      if (selected.length === 0) {
        logger.warn("No topics selected. Exiting.");
        return;
      }

      // Show formatted selection summary
      logger.blank();
      logger.log("  Selected:");
      logger.blank();
      const nameWidth = Math.max(...selected.map((t) => t.topicName.length));
      for (const t of selected) {
        logger.log(`    ${chalk.green("✓")} ${t.topicName.padEnd(nameWidth + 2)}${chalk.dim(detection.isUnlimited ? "unlimited" : "1 credit")}`);
      }
      logger.blank();

      if (detection.isUnlimited) {
        confirmed = true;
      } else {
        const ok = await confirm({
          message: `Use ${selected.length} credit${selected.length !== 1 ? "s" : ""}? Continue?`,
          default: true,
        });

        if (ok) {
          confirmed = true;
        } else {
          // Go back — preserve the current selection for the next round
          previouslySelected = new Set(selected.map((t) => t.slug));
          logger.blank();
        }
      }
    }

    logger.blank();
    logger.start(`Generating ${selected[0].topicName}...`);

    let catalogue: Awaited<ReturnType<typeof generateCatalogue>>;
    try {
      catalogue = await generateCatalogue(
        options.from,
        selected,
        smidgeKey,
        (msg) => logger.updateSpinner(msg)
      );
    } catch (err) {
      logger.stopSpinner();
      throw err;
    }
    logger.stopSpinner();

    // Write all skill files
    const fileList: Array<{ relativePath: string; lines: number }> = [];

    for (const skill of catalogue.skills) {
      const slug = skill.topic.slug;
      const topicDir = path.join(skillsDir, slug);
      await fs.ensureDir(topicDir);

      const skillPath = path.join(topicDir, skill.filename);
      await fs.writeFile(skillPath, skill.content, "utf-8");
      logger.success(`${skill.filename}`);

      fileList.push({
        relativePath: `.claude/skills/${slug}/${skill.filename}`,
        lines: countLines(skill.content),
      });

      for (const ref of skill.referenceFiles) {
        const refDir = path.join(topicDir, "references");
        await fs.ensureDir(refDir);
        await fs.writeFile(path.join(refDir, ref.filename), ref.content, "utf-8");
        fileList.push({
          relativePath: `.claude/skills/${slug}/references/${ref.filename}`,
          lines: countLines(ref.content),
        });
      }
    }

    // Write master index
    const indexPath = path.join(skillsDir, catalogue.masterIndex.filename);
    await fs.writeFile(indexPath, catalogue.masterIndex.content, "utf-8");
    logger.success(`${catalogue.masterIndex.filename} ${chalk.dim("(master index — free)")}`);

    fileList.push({
      relativePath: `.claude/skills/${catalogue.masterIndex.filename}`,
      lines: countLines(catalogue.masterIndex.content),
    });

    logger.blank();
    formatFileList(fileList);
    logger.blank();
    logger.log(detection.isUnlimited ? `  Unlimited plan` : `  Credits remaining: ${catalogue.creditsRemaining}`);
    logger.blank();
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
