import path from "node:path";
import * as prompts from "@clack/prompts";
import chalk from "chalk";
import { execa } from "execa";
import fs from "fs-extra";
import ora from "ora";
import { kebabCase } from "../utils/case.js";
import { findProjectRoot } from "../utils/paths.js";

interface InitOptions {
  name?: string;
  skipInstall?: boolean;
}

export async function initCommand(options: InitOptions = {}): Promise<void> {
  const projectRoot = findProjectRoot();

  if (!projectRoot) {
    console.error(
      chalk.red(
        "\nError: Could not find ProjectX root directory. Make sure you're inside a ProjectX project.",
      ),
    );
    process.exit(1);
  }

  console.log(chalk.cyan("\n🎨 Initialize/Customize ProjectX\n"));
  console.log(
    chalk.gray(
      "This command helps you customize the template for your project.\n",
    ),
  );

  // Get new project name
  let projectName = options.name;
  if (!projectName) {
    const currentName = await getCurrentProjectName(projectRoot);
    const nameInput = await prompts.text({
      message: "Project name:",
      placeholder: "my-project",
      defaultValue: currentName !== "projectx" ? currentName : "",
      validate: (value) => {
        if (!value || value.trim() === "") return "Project name is required";
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return "Must be lowercase with hyphens (e.g., my-awesome-project)";
        }
        return undefined;
      },
    });

    if (prompts.isCancel(nameInput)) {
      console.log(chalk.yellow("\nOperation cancelled."));
      process.exit(0);
    }

    projectName = kebabCase(nameInput);
  }

  // Ask what to customize
  const customizations = await prompts.multiselect({
    message: "What would you like to customize?",
    options: [
      {
        value: "rename",
        label: "Rename project",
        hint: "Update package names and references",
      },
      {
        value: "cleanup",
        label: "Clean up example services",
        hint: "Remove auth, order, product services",
      },
      {
        value: "docker",
        label: "Update Docker configuration",
        hint: "Update docker-compose.yml",
      },
    ],
    required: false,
  });

  if (prompts.isCancel(customizations)) {
    console.log(chalk.yellow("\nOperation cancelled."));
    process.exit(0);
  }

  if (customizations.length === 0) {
    console.log(chalk.yellow("\nNo customizations selected. Exiting."));
    return;
  }

  // Confirmation
  console.log(chalk.cyan("\n📋 Actions to perform:\n"));
  if (customizations.includes("rename")) {
    console.log(`  • Rename project to: ${chalk.green(projectName)}`);
  }
  if (customizations.includes("cleanup")) {
    console.log("  • Remove example services (auth, order, product)");
  }
  if (customizations.includes("docker")) {
    console.log("  • Update Docker configuration");
  }

  const confirm = await prompts.confirm({
    message: "Proceed with these changes?",
  });

  if (prompts.isCancel(confirm) || !confirm) {
    console.log(chalk.yellow("\nOperation cancelled."));
    process.exit(0);
  }

  // Perform customizations
  const spinner = ora("Customizing project...").start();

  try {
    if (customizations.includes("rename")) {
      spinner.text = "Renaming project...";
      await renameProject(projectRoot, projectName);
    }

    if (customizations.includes("cleanup")) {
      spinner.text = "Removing example services...";
      await cleanupExampleServices(projectRoot);
    }

    if (customizations.includes("docker")) {
      spinner.text = "Updating Docker configuration...";
      await updateDockerConfig(projectRoot, projectName);
    }

    spinner.succeed("Project customized successfully!");

    // Run pnpm install unless skipped
    if (!options.skipInstall) {
      const installSpinner = ora("Installing dependencies...").start();
      try {
        await execa("pnpm", ["install"], { cwd: projectRoot, stdio: "pipe" });
        installSpinner.succeed("Dependencies installed!");
      } catch {
        installSpinner.warn(
          "Could not install dependencies. Run 'pnpm install' manually.",
        );
      }
    }

    console.log(chalk.cyan("\n✅ Project customization complete!\n"));
    console.log(chalk.white("Next steps:\n"));
    console.log(chalk.gray("  1. Review the changes in your code"));
    console.log(chalk.gray("  2. Update .env file as needed"));
    console.log(chalk.gray(`  3. Run: ${chalk.yellow("pnpm dev")}`));
  } catch (error) {
    spinner.fail("Failed to customize project");
    console.error(chalk.red("\nError:"), error);
    process.exit(1);
  }
}

async function getCurrentProjectName(projectRoot: string): Promise<string> {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const pkg = await fs.readJson(packageJsonPath);
  return pkg.name || "projectx";
}

async function renameProject(
  projectRoot: string,
  newName: string,
): Promise<void> {
  const oldName = "projectx";
  const oldScope = "@projectx";
  const newScope = `@${newName}`;

  // Files to update
  const filesToUpdate = [
    "package.json",
    "docker-compose.yml",
    ".env.example",
    "README.md",
    "CLAUDE.md",
  ];

  // Update root files
  for (const file of filesToUpdate) {
    const filePath = path.join(projectRoot, file);
    if (await fs.pathExists(filePath)) {
      let content = await fs.readFile(filePath, "utf-8");
      content = content.replace(new RegExp(oldScope, "g"), newScope);
      content = content.replace(new RegExp(oldName, "g"), newName);
      await fs.writeFile(filePath, content);
    }
  }

  // Update package.json files in apps and packages
  const dirs = ["apps", "packages"];
  for (const dir of dirs) {
    const dirPath = path.join(projectRoot, dir);
    if (await fs.pathExists(dirPath)) {
      const items = await fs.readdir(dirPath);
      for (const item of items) {
        const packageJsonPath = path.join(dirPath, item, "package.json");
        if (await fs.pathExists(packageJsonPath)) {
          let content = await fs.readFile(packageJsonPath, "utf-8");
          content = content.replace(new RegExp(oldScope, "g"), newScope);
          await fs.writeFile(packageJsonPath, content);
        }

        // Update tsconfig.json paths
        const tsconfigPath = path.join(dirPath, item, "tsconfig.json");
        if (await fs.pathExists(tsconfigPath)) {
          let content = await fs.readFile(tsconfigPath, "utf-8");
          content = content.replace(new RegExp(oldScope, "g"), newScope);
          await fs.writeFile(tsconfigPath, content);
        }
      }
    }
  }
}

async function cleanupExampleServices(projectRoot: string): Promise<void> {
  const servicesToRemove = ["auth", "order", "product"];
  const appsDir = path.join(projectRoot, "apps");

  for (const service of servicesToRemove) {
    const servicePath = path.join(appsDir, service);
    if (await fs.pathExists(servicePath)) {
      await fs.remove(servicePath);
    }
  }

  // Update root package.json to remove service scripts
  const packageJsonPath = path.join(projectRoot, "package.json");
  const pkg = await fs.readJson(packageJsonPath);

  for (const service of servicesToRemove) {
    delete pkg.scripts[`dev:${service}`];
    delete pkg.scripts[`build:${service}`];
  }

  await fs.writeJson(packageJsonPath, pkg, { spaces: 2 });

  // Update docker-compose.yml to remove services
  const dockerComposePath = path.join(projectRoot, "docker-compose.yml");
  if (await fs.pathExists(dockerComposePath)) {
    let content = await fs.readFile(dockerComposePath, "utf-8");

    for (const service of servicesToRemove) {
      // Remove service block (simplified - may need adjustment for complex cases)
      const servicePattern = new RegExp(
        `\\n  ${service}:[\\s\\S]*?(?=\\n  \\w+:|\\nnetworks:|\\nvolumes:|$)`,
        "g",
      );
      content = content.replace(servicePattern, "");

      // Remove from builder filter
      content = content.replace(
        new RegExp(`\\s*--filter=${service}\\^\\.\\.\\.*`, "g"),
        "",
      );

      // Remove node_modules volume
      content = content.replace(
        new RegExp(`\\s*- /app/apps/${service}/node_modules\\n?`, "g"),
        "",
      );
    }

    await fs.writeFile(dockerComposePath, content);
  }
}

async function updateDockerConfig(
  projectRoot: string,
  projectName: string,
): Promise<void> {
  const dockerComposePath = path.join(projectRoot, "docker-compose.yml");

  if (await fs.pathExists(dockerComposePath)) {
    let content = await fs.readFile(dockerComposePath, "utf-8");
    content = content.replace(/projectx/g, projectName);
    await fs.writeFile(dockerComposePath, content);
  }

  // Update .env.example
  const envExamplePath = path.join(projectRoot, ".env.example");
  if (await fs.pathExists(envExamplePath)) {
    let content = await fs.readFile(envExamplePath, "utf-8");
    content = content.replace(
      /COMPOSE_PROJECT_NAME=projectx/g,
      `COMPOSE_PROJECT_NAME=${projectName}`,
    );
    await fs.writeFile(envExamplePath, content);
  }
}
