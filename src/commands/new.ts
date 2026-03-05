import path from "path";
import { askProjectQuestions } from "../scaffolder/questions.js";
import { scaffoldProject, buildSyntheticFingerprint } from "../scaffolder/index.js";
import { generate } from "../generator/index.js";
import { writeFiles } from "../writer/index.js";
import { resolveApiKey, resolveModel } from "../utils/api-key.js";
import { logger } from "../utils/logger.js";

interface NewOptions {
  apiKey?: string;
  model?: string;
  verbose?: boolean;
}

export async function newCommand(options: NewOptions): Promise<void> {
  try {
    // Ask project questions
    const answers = await askProjectQuestions();

    // Resolve API key
    const apiKey = await resolveApiKey(options.apiKey);

    // Resolve model
    const model = resolveModel(options.model || "opus");

    // Build synthetic fingerprint from answers
    const fingerprint = buildSyntheticFingerprint(answers);

    // Scaffold project files
    const projectPath = path.join(process.cwd(), answers.projectName);
    logger.start("Scaffolding project...");
    await scaffoldProject(projectPath, answers);
    logger.success("Project scaffolded");

    // Generate .claude/ configuration
    logger.blank();
    const files = await generate(fingerprint, apiKey, model, {
      verbose: options.verbose,
    });

    // Write .claude/ into the new project
    const written = await writeFiles(projectPath, files, { force: true });

    logger.blank();
    logger.success(`Project created at ./${answers.projectName}`);
    logger.blank();
    logger.log("  Created:");
    for (const file of written) {
      logger.log(`    ${file}`);
    }
    logger.blank();
    logger.log("  Next steps:");
    logger.log(`    cd ${answers.projectName}`);

    if (["nextjs", "remix", "sveltekit", "astro", "express", "node-ts", "typescript"].includes(answers.stack)) {
      logger.log("    npm install");
    } else if (["fastapi", "python"].includes(answers.stack)) {
      logger.log("    python -m venv .venv && pip install -e '.[dev]'");
    } else if (answers.stack === "go") {
      logger.log("    go mod tidy");
    }

    logger.log("    claude");
    logger.blank();
    logger.log("  Claude Code is ready for this project.");
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(err.message);
    process.exit(1);
  }
}
