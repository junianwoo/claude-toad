import ora, { type Ora } from "ora";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import os from "os";

let spinner: Ora | null = null;

const FIRST_RUN_FLAG = path.join(os.homedir(), ".claude-toad", ".first-run-done");

const SPLASH_ART = [
  " ▄▄▄▄▄▄▄ ▄▄▄        ▄▄▄▄   ▄▄▄  ▄▄▄ ▄▄▄▄▄▄    ▄▄▄▄▄▄▄   ▄▄▄▄▄▄▄▄▄   ▄▄▄▄▄     ▄▄▄▄   ▄▄▄▄▄▄",
  "███▀▀▀▀▀ ███      ▄██▀▀██▄ ███  ███ ███▀▀██▄ ███▀▀▀▀▀   ▀▀▀███▀▀▀ ▄███████▄ ▄██▀▀██▄ ███▀▀██▄",
  "███      ███      ███  ███ ███  ███ ███  ███ ███▄▄         ███    ███   ███ ███  ███ ███  ███",
  "███      ███      ███▀▀███ ███▄▄███ ███  ███ ███           ███    ███▄▄▄███ ███▀▀███ ███  ███",
  "▀███████ ████████ ███  ███ ▀██████▀ ██████▀  ▀███████      ███     ▀█████▀  ███  ███ ██████▀ ",
];

const TOAD_ART = [
  "  @..@   ",
  " (----) ",
  "( >__< )",
  "^^ ~~ ^^",
];

export const logger = {
  start(message: string): void {
    if (spinner) spinner.stop();
    spinner = ora(message).start();
  },

  success(message: string): void {
    if (spinner) {
      spinner.succeed(message);
      spinner = null;
    } else {
      console.log(chalk.green("✓") + " " + message);
    }
  },

  warn(message: string): void {
    if (spinner) {
      spinner.warn(message);
      spinner = null;
    } else {
      console.log(chalk.yellow("⚠") + " " + message);
    }
  },

  error(message: string): void {
    if (spinner) {
      spinner.fail(message);
      spinner = null;
    } else {
      console.log(chalk.red("✗") + " " + message);
    }
  },

  info(message: string): void {
    if (spinner) spinner.stop();
    console.log(chalk.blue("ℹ") + " " + message);
    if (spinner) spinner.start();
  },

  log(message: string): void {
    if (spinner) spinner.stop();
    console.log(message);
    if (spinner) spinner.start();
  },

  blank(): void {
    console.log();
  },

  banner(version: string): void {
    const isFirstRun = !fs.pathExistsSync(FIRST_RUN_FLAG);
    if (isFirstRun) {
      this.splash(version);
      try {
        fs.ensureDirSync(path.dirname(FIRST_RUN_FLAG));
        fs.writeFileSync(FIRST_RUN_FLAG, "");
      } catch {}
    } else {
      console.log();
      // Pad each toad line to the same width so right-side text aligns
      const artWidth = Math.max(...TOAD_ART.map((l) => l.length));
      const pad = (s: string) => s.padEnd(artWidth);
      console.log(chalk.green(pad(TOAD_ART[0])) + `  ${chalk.bold("Claude Toad")} ${chalk.dim("v" + version)}`);
      console.log(chalk.green(pad(TOAD_ART[1])));
      console.log(chalk.green(pad(TOAD_ART[2])) + `  ${chalk.dim("Be calm. The toad's got it.")}`);
      console.log(chalk.green(pad(TOAD_ART[3])));
      console.log();
    }
  },

  splash(version: string): void {
    console.log();
    for (const line of SPLASH_ART) {
      console.log(chalk.green(line));
    }
    console.log();
    console.log(
      `  ${chalk.bold("Claude Toad")} ${chalk.dim("v" + version)}  ${chalk.dim("·")}  ${chalk.dim("Be calm. The toad's got it.")}`
    );
    console.log();
  },

  updateSpinner(message: string): void {
    if (spinner) {
      spinner.text = message;
    }
  },
};
