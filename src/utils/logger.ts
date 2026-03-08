import ora, { type Ora } from "ora";
import chalk from "chalk";

let spinner: Ora | null = null;

const TOAD_ART = [
  "    ____  ",
  "    |##|  ",
  "   _|##|_ ",
  "    @..@  ",
  "   (----) ",
  "  ( >__< )",
  "  ^^ ~~ ^^",
];

const VERSION_LINE = 3;  // @..@ line
const TAGLINE_LINE = 5;  // ( >__< ) line

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
    console.log();
    const artWidth = Math.max(...TOAD_ART.map((l) => l.length));
    const pad = (s: string) => s.padEnd(artWidth);

    TOAD_ART.forEach((line, i) => {
      let right = "";
      if (i === VERSION_LINE) right = `  ${chalk.bold("Claude Toad")} ${chalk.dim("v" + version)}`;
      if (i === TAGLINE_LINE) right = `  ${chalk.dim("Be calm. The toad's got it.")}`;
      console.log(chalk.green(pad(line)) + right);
    });

    console.log();
  },

  updateSpinner(message: string): void {
    if (spinner) {
      spinner.text = message;
    }
  },

  stopSpinner(): void {
    if (spinner) {
      spinner.stop();
      spinner = null;
    }
  },
};
