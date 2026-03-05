import ora, { type Ora } from "ora";
import chalk from "chalk";

let spinner: Ora | null = null;

export const logger = {
  start(message: string): void {
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
};
