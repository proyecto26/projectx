#!/usr/bin/env node
import chalk from "chalk";
import { program } from "commander";
import { generateCommand } from "./commands/generate.js";
import { infoCommand } from "./commands/info.js";
import { initCommand } from "./commands/init.js";

const VERSION = "1.0.0";

console.log(
  chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ${chalk.bold("ProjectX CLI")} - Temporal-Powered Full-Stack Template    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`),
);

program
  .name("projectx")
  .description(
    "CLI tool for ProjectX - Generate services, workflows, and customize your Temporal-powered application",
  )
  .version(VERSION);

// Generate command
program
  .command("generate")
  .alias("g")
  .description("Generate a new service or workflow")
  .argument("[type]", "Type to generate: service | temporal-service | workflow")
  .option("-n, --name <name>", "Name of the service or workflow")
  .option("-p, --port <port>", "Port number for the service")
  .option("--with-email", "Include Email module")
  .option("--with-payment", "Include Payment module")
  .option("-s, --service <service>", "Target service (for workflow generation)")
  .action(generateCommand);

// Init command - customize template for a new project
program
  .command("init")
  .description("Initialize and customize ProjectX for your project")
  .option("-n, --name <name>", "Project name")
  .option("--skip-install", "Skip pnpm install")
  .action(initCommand);

// Info command - show project information
program
  .command("info")
  .description("Display information about the current ProjectX setup")
  .action(infoCommand);

// Interactive mode (default when no command specified)
program
  .command("interactive", { isDefault: true })
  .description("Run in interactive mode")
  .action(async () => {
    const { select } = await import("@clack/prompts");

    const action = await select({
      message: "What would you like to do?",
      options: [
        {
          value: "service",
          label: "Generate a basic NestJS service",
          hint: "Without Temporal workflows",
        },
        {
          value: "temporal-service",
          label: "Generate a Temporal-enabled service",
          hint: "With workflows and activities",
        },
        {
          value: "workflow",
          label: "Add a workflow to existing service",
          hint: "Create a new workflow file",
        },
        {
          value: "init",
          label: "Initialize/customize project",
          hint: "Rename project, update configs",
        },
        {
          value: "info",
          label: "Show project info",
          hint: "Display current setup",
        },
      ],
    });

    if (typeof action === "symbol") {
      console.log(chalk.yellow("\nOperation cancelled."));
      process.exit(0);
    }

    switch (action) {
      case "service":
        await generateCommand("service", {});
        break;
      case "temporal-service":
        await generateCommand("temporal-service", {});
        break;
      case "workflow":
        await generateCommand("workflow", {});
        break;
      case "init":
        await initCommand({});
        break;
      case "info":
        await infoCommand();
        break;
    }
  });

program.parse();
