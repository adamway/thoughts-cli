#!/usr/bin/env node
import { Command } from "commander";
import { thoughtsInitCommand } from "./commands/init.js";
import { thoughtsUninitCommand } from "./commands/uninit.js";
import { thoughtsSyncCommand } from "./commands/sync.js";
import { thoughtsStatusCommand } from "./commands/status.js";
import { thoughtsConfigCommand } from "./commands/config.js";
import { profileCreateCommand } from "./commands/profile/create.js";
import { profileListCommand } from "./commands/profile/list.js";
import { profileShowCommand } from "./commands/profile/show.js";
import { profileDeleteCommand } from "./commands/profile/delete.js";

const program = new Command();

program
  .name("thoughts")
  .description("Manage developer thoughts and notes")
  .version(process.env.PACKAGE_VERSION || "0.0.0");

program
  .command("init")
  .description("Initialize thoughts for current repository")
  .option("--force", "Force reconfiguration even if already set up")
  .option("--config-file <path>", "Path to config file")
  .option(
    "--directory <name>",
    "Specify the repository directory name (skips interactive prompt)",
  )
  .option("--profile <name>", "Use a specific thoughts profile")
  .action(thoughtsInitCommand);

program
  .command("uninit")
  .description("Remove thoughts setup from current repository")
  .option("--force", "Force removal even if not in configuration")
  .option("--config-file <path>", "Path to config file")
  .action(thoughtsUninitCommand);

program
  .command("sync")
  .description("Manually sync thoughts to thoughts repository")
  .option("-m, --message <message>", "Commit message for sync")
  .option("--config-file <path>", "Path to config file")
  .action(thoughtsSyncCommand);

program
  .command("status")
  .description("Show status of thoughts repository")
  .option("--config-file <path>", "Path to config file")
  .action(thoughtsStatusCommand);

program
  .command("config")
  .description("View or edit thoughts configuration")
  .option("--edit", "Open configuration in editor")
  .option("--json", "Output configuration as JSON")
  .option("--config-file <path>", "Path to config file")
  .action(thoughtsConfigCommand);

// Profile management commands
const profile = program
  .command("profile")
  .description("Manage thoughts profiles");

profile
  .command("create <name>")
  .description("Create a new thoughts profile")
  .option("--repo <path>", "Thoughts repository path")
  .option("--repos-dir <name>", "Repos directory name")
  .option("--global-dir <name>", "Global directory name")
  .option("--config-file <path>", "Path to config file")
  .action(profileCreateCommand);

profile
  .command("list")
  .description("List all thoughts profiles")
  .option("--json", "Output as JSON")
  .option("--config-file <path>", "Path to config file")
  .action(profileListCommand);

profile
  .command("show <name>")
  .description("Show details of a specific profile")
  .option("--json", "Output as JSON")
  .option("--config-file <path>", "Path to config file")
  .action(profileShowCommand);

profile
  .command("delete <name>")
  .description("Delete a thoughts profile")
  .option("--force", "Force deletion even if in use")
  .option("--config-file <path>", "Path to config file")
  .action(profileDeleteCommand);

program.parse();
