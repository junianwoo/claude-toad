import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { newCommand } from "./commands/new.js";
import { packageCommand } from "./commands/package.js";
import { installCommand } from "./commands/install.js";
import { addSkillCommand } from "./commands/add-skill.js";
import { getVersion } from "./utils/version.js";

const program = new Command();

program
  .name("claude-toad")
  .description("One command. Your entire Claude Code setup. Done.")
  .version(getVersion());

program
  .command("init")
  .description("Scan existing project, generate full .claude/ config")
  .option("--dry-run", "See what would be generated without writing files")
  .option("--verbose", "Show detailed scan and generation output")
  .option("--force", "Skip confirmation prompts")
  .option("--no-agents", "Skip agent generation")
  .option("--no-mcp", "Skip MCP configuration")
  .option("--api-key <key>", "Anthropic API key")
  .option("--model <model>", "Model to use (opus or sonnet)", "opus")
  .action(initCommand);

program
  .command("new")
  .description("Start a new project with Claude Code baked in")
  .option("--api-key <key>", "Anthropic API key")
  .option("--model <model>", "Model to use (opus or sonnet)", "opus")
  .option("--verbose", "Show detailed output")
  .action(newCommand);

program
  .command("package")
  .description("Bundle your .claude/ directory into a shareable plugin")
  .option("-o, --output <path>", "Output path for the plugin zip")
  .action(packageCommand);

program
  .command("install <plugin>")
  .description("Install a Claude Toad plugin package")
  .option("--force", "Skip confirmation prompts")
  .action(installCommand);

program
  .command("add-skill")
  .description("Generate a custom skill from any source via Smidge")
  .requiredOption("--from <source>", "Source URL, file path, or text")
  .option("--smidge-key <key>", "Smidge API key")
  .action(addSkillCommand);

program.parse();
