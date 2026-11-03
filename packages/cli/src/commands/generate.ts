import * as prompts from "@clack/prompts";
import chalk from "chalk";
import { execa } from "execa";
import ora from "ora";
import { kebabCase } from "../utils/case.js";
import {
  findProjectRoot,
  getNextAvailablePort,
  getTemporalServices,
  serviceExists,
} from "../utils/paths.js";

interface GenerateOptions {
  name?: string;
  port?: string;
  withEmail?: boolean;
  withPayment?: boolean;
  service?: string;
}

export async function generateCommand(
  inputType?: string,
  options: GenerateOptions = {},
): Promise<void> {
  const projectRoot = findProjectRoot();

  if (!projectRoot) {
    console.error(
      chalk.red(
        "\nError: Could not find ProjectX root directory. Make sure you're inside a ProjectX project.",
      ),
    );
    process.exit(1);
  }

  // If type not provided, ask for it
  let generatorType = inputType;
  if (!generatorType) {
    const selectedType = await prompts.select({
      message: "What would you like to generate?",
      options: [
        {
          value: "service",
          label: "Basic NestJS service",
          hint: "Without Temporal workflows",
        },
        {
          value: "temporal-service",
          label: "Temporal-enabled service",
          hint: "With workflows and activities",
        },
        {
          value: "workflow",
          label: "Workflow",
          hint: "Add to existing service",
        },
      ],
    });

    if (prompts.isCancel(selectedType)) {
      console.log(chalk.yellow("\nOperation cancelled."));
      process.exit(0);
    }

    generatorType = selectedType;
  }

  switch (generatorType) {
    case "service":
      await generateService(projectRoot, options, false);
      break;
    case "temporal-service":
      await generateService(projectRoot, options, true);
      break;
    case "workflow":
      await generateWorkflow(projectRoot, options);
      break;
    default:
      console.error(chalk.red(`\nUnknown generator type: ${generatorType}`));
      console.log(
        chalk.gray("Available types: service, temporal-service, workflow"),
      );
      process.exit(1);
  }
}

async function generateService(
  projectRoot: string,
  options: GenerateOptions,
  withTemporal: boolean,
): Promise<void> {
  console.log(
    chalk.cyan(
      `\n${withTemporal ? "🔄" : "🏗️"} Creating ${withTemporal ? "Temporal-enabled" : "basic"} NestJS service...\n`,
    ),
  );

  // Get service name
  let serviceName = options.name;
  if (!serviceName) {
    const nameInput = await prompts.text({
      message: "Service name (lowercase, e.g., inventory):",
      placeholder: "my-service",
      validate: (value) => {
        if (!value || value.trim() === "") return "Service name is required";
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return "Must be lowercase, start with a letter, contain only letters, numbers, and hyphens";
        }
        if (serviceExists(projectRoot, value)) {
          return `Service "${value}" already exists`;
        }
        return undefined;
      },
    });

    if (prompts.isCancel(nameInput)) {
      console.log(chalk.yellow("\nOperation cancelled."));
      process.exit(0);
    }

    serviceName = kebabCase(nameInput);
  }

  // Get port
  let port = options.port;
  if (!port) {
    const suggestedPort = getNextAvailablePort(projectRoot);
    const portInput = await prompts.text({
      message: "Port number:",
      placeholder: suggestedPort.toString(),
      defaultValue: suggestedPort.toString(),
      validate: (value) => {
        const p = Number.parseInt(value, 10);
        if (Number.isNaN(p) || p < 1 || p > 65535) {
          return "Port must be a valid number between 1 and 65535";
        }
        return undefined;
      },
    });

    if (prompts.isCancel(portInput)) {
      console.log(chalk.yellow("\nOperation cancelled."));
      process.exit(0);
    }

    port = portInput;
  }

  // Get description
  const descriptionInput = await prompts.text({
    message: "Service description:",
    placeholder: `${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} microservice`,
    defaultValue: `${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} microservice${withTemporal ? " with Temporal workflows" : ""}`,
  });

  if (prompts.isCancel(descriptionInput)) {
    console.log(chalk.yellow("\nOperation cancelled."));
    process.exit(0);
  }

  // Optional modules
  let includeEmail = options.withEmail;
  let includePayment = options.withPayment;

  if (includeEmail === undefined || includePayment === undefined) {
    const modules = await prompts.multiselect({
      message: "Include optional modules:",
      options: [
        {
          value: "email",
          label: "Email (@projectx/email)",
          hint: "SendGrid integration",
        },
        {
          value: "payment",
          label: "Payment (@projectx/payment)",
          hint: "Stripe integration",
        },
      ],
      required: false,
    });

    if (prompts.isCancel(modules)) {
      console.log(chalk.yellow("\nOperation cancelled."));
      process.exit(0);
    }

    includeEmail = modules.includes("email");
    includePayment = modules.includes("payment");
  }

  // For Temporal services, get workflow name
  let workflowName = "process";
  if (withTemporal) {
    const workflowInput = await prompts.text({
      message: "Initial workflow name (camelCase):",
      placeholder: "process",
      defaultValue: "process",
      validate: (value) => {
        if (!value || value.trim() === "") return "Workflow name is required";
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return "Must be camelCase (e.g., processOrder, handlePayment)";
        }
        return undefined;
      },
    });

    if (prompts.isCancel(workflowInput)) {
      console.log(chalk.yellow("\nOperation cancelled."));
      process.exit(0);
    }

    workflowName = workflowInput;
  }

  // Confirmation
  console.log(chalk.cyan("\n📋 Configuration Summary:\n"));
  console.log(`  Service Name:  ${chalk.green(serviceName)}`);
  console.log(`  Port:          ${chalk.green(port)}`);
  console.log(`  Temporal:      ${chalk.green(withTemporal ? "Yes" : "No")}`);
  if (withTemporal) {
    console.log(`  Workflow:      ${chalk.green(workflowName)}`);
  }
  console.log(`  Email Module:  ${chalk.green(includeEmail ? "Yes" : "No")}`);
  console.log(
    `  Payment Module: ${chalk.green(includePayment ? "Yes" : "No")}`,
  );

  const confirm = await prompts.confirm({
    message: "Generate service with these settings?",
  });

  if (prompts.isCancel(confirm) || !confirm) {
    console.log(chalk.yellow("\nOperation cancelled."));
    process.exit(0);
  }

  // Run Turborepo generator
  const spinner = ora("Generating service files...").start();

  try {
    const generatorName = withTemporal
      ? "nestjs-temporal-service"
      : "nestjs-service";

    // Build arguments for turbo gen
    // Args are passed positionally in order of prompts (plop bypass feature)
    // Order for nestjs-service: serviceName, port, description, includeEmail, includePayment
    // Order for nestjs-temporal-service: serviceName, port, description, workflowName, includeEmail, includePayment
    const args = ["gen", generatorName];

    if (withTemporal) {
      // nestjs-temporal-service prompt order: serviceName, port, description, workflowName, includeEmail, includePayment
      args.push(
        "--args",
        serviceName,
        "--args",
        port,
        "--args",
        descriptionInput,
        "--args",
        workflowName,
        "--args",
        includeEmail ? "yes" : "no",
        "--args",
        includePayment ? "yes" : "no",
      );
    } else {
      // nestjs-service prompt order: serviceName, port, description, includeEmail, includePayment
      args.push(
        "--args",
        serviceName,
        "--args",
        port,
        "--args",
        descriptionInput,
        "--args",
        includeEmail ? "yes" : "no",
        "--args",
        includePayment ? "yes" : "no",
      );
    }

    await execa("turbo", args, {
      cwd: projectRoot,
      stdio: "pipe",
    });

    spinner.succeed("Service files generated successfully!");

    // Show next steps
    console.log(chalk.cyan("\n✅ Service created successfully!\n"));
    console.log(chalk.white("Next steps:\n"));
    console.log(
      chalk.gray(
        `  1. Add to .env: ${chalk.yellow(`${serviceName.toUpperCase().replace(/-/g, "_")}_PORT=${port}`)}`,
      ),
    );
    console.log(
      chalk.gray(`  2. Install dependencies: ${chalk.yellow("pnpm install")}`),
    );
    console.log(
      chalk.gray(
        `  3. Start the service: ${chalk.yellow(`pnpm dev:${serviceName}`)}`,
      ),
    );
    console.log(
      chalk.gray(
        `\n  Service URL: ${chalk.blue(`http://localhost:${port}/${serviceName}`)}`,
      ),
    );
    console.log(
      chalk.gray(
        `  Swagger docs: ${chalk.blue(`http://localhost:${port}/${serviceName}/docs`)}`,
      ),
    );
    if (withTemporal) {
      console.log(
        chalk.gray(`  Temporal UI: ${chalk.blue("http://localhost:8080")}`),
      );
    }
  } catch (error) {
    spinner.fail("Failed to generate service");
    console.error(chalk.red("\nError:"), error);
    process.exit(1);
  }
}

async function generateWorkflow(
  projectRoot: string,
  options: GenerateOptions,
): Promise<void> {
  console.log(chalk.cyan("\n🔄 Adding new workflow...\n"));

  const temporalServices = getTemporalServices(projectRoot);

  if (temporalServices.length === 0) {
    console.error(
      chalk.red(
        "\nNo Temporal-enabled services found. Create one first with: projectx generate temporal-service",
      ),
    );
    process.exit(1);
  }

  // Get target service
  let serviceName = options.service;
  if (!serviceName) {
    const serviceInput = await prompts.select({
      message: "Which service should the workflow be added to?",
      options: temporalServices.map((s) => ({ value: s, label: s })),
    });

    if (prompts.isCancel(serviceInput)) {
      console.log(chalk.yellow("\nOperation cancelled."));
      process.exit(0);
    }

    serviceName = serviceInput;
  }

  // Get workflow name
  let workflowName = options.name;
  if (!workflowName) {
    const nameInput = await prompts.text({
      message: "Workflow name (camelCase, e.g., checkout, refund):",
      placeholder: "myWorkflow",
      validate: (value) => {
        if (!value || value.trim() === "") return "Workflow name is required";
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return "Must be camelCase";
        }
        return undefined;
      },
    });

    if (prompts.isCancel(nameInput)) {
      console.log(chalk.yellow("\nOperation cancelled."));
      process.exit(0);
    }

    workflowName = nameInput;
  }

  // Get description
  const descriptionInput = await prompts.text({
    message: "Workflow description:",
    placeholder: `Handles ${workflowName} process`,
    defaultValue: `Handles ${workflowName} process`,
  });

  if (prompts.isCancel(descriptionInput)) {
    console.log(chalk.yellow("\nOperation cancelled."));
    process.exit(0);
  }

  const spinner = ora("Generating workflow...").start();

  try {
    // Args are passed positionally in order of prompts (plop bypass feature)
    // Order for workflow: serviceName, workflowName, workflowDescription
    await execa(
      "turbo",
      [
        "gen",
        "workflow",
        "--args",
        serviceName,
        "--args",
        workflowName,
        "--args",
        descriptionInput,
      ],
      {
        cwd: projectRoot,
        stdio: "pipe",
      },
    );

    spinner.succeed("Workflow generated successfully!");

    console.log(chalk.cyan("\n✅ Workflow created!\n"));
    console.log(
      chalk.gray(
        `  File: apps/${serviceName}/src/workflows/${workflowName}.workflow.ts`,
      ),
    );
    console.log(
      chalk.gray(
        "\n  Don't forget to add your activity proxies and implement the workflow logic.",
      ),
    );
  } catch (error) {
    spinner.fail("Failed to generate workflow");
    console.error(chalk.red("\nError:"), error);
    process.exit(1);
  }
}
