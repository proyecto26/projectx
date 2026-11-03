import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import {
  findProjectRoot,
  getExistingServices,
  getTemporalServices,
} from "../utils/paths.js";

export async function infoCommand(): Promise<void> {
  const projectRoot = findProjectRoot();

  if (!projectRoot) {
    console.error(
      chalk.red(
        "\nError: Could not find ProjectX root directory. Make sure you're inside a ProjectX project.",
      ),
    );
    process.exit(1);
  }

  console.log(chalk.cyan("\n📊 ProjectX Information\n"));
  console.log(chalk.gray("─".repeat(50)));

  // Project info
  const packageJsonPath = path.join(projectRoot, "package.json");
  const pkg = await fs.readJson(packageJsonPath);

  console.log(chalk.white("\n📁 Project"));
  console.log(`   Name:     ${chalk.green(pkg.name)}`);
  console.log(`   Root:     ${chalk.gray(projectRoot)}`);
  console.log(
    `   Package Manager: ${chalk.green(pkg.packageManager || "pnpm")}`,
  );

  // Services
  const services = getExistingServices(projectRoot);
  const temporalServices = getTemporalServices(projectRoot);

  console.log(chalk.white("\n🏗️  Services"));
  if (services.length === 0) {
    console.log(chalk.gray("   No services found"));
  } else {
    for (const service of services) {
      const hasTemporal = temporalServices.includes(service);
      const icon = hasTemporal ? "🔄" : "📦";
      const badge = hasTemporal ? chalk.blue(" [Temporal]") : "";
      const port = await getServicePort(projectRoot, service);
      console.log(
        `   ${icon} ${chalk.green(service)}${badge} - Port: ${chalk.yellow(port || "N/A")}`,
      );
    }
  }

  // Packages
  const packagesDir = path.join(projectRoot, "packages");
  if (await fs.pathExists(packagesDir)) {
    const packages = await fs.readdir(packagesDir);
    console.log(chalk.white("\n📦 Packages"));
    for (const pkg of packages) {
      const pkgPath = path.join(packagesDir, pkg, "package.json");
      if (await fs.pathExists(pkgPath)) {
        const pkgJson = await fs.readJson(pkgPath);
        console.log(
          `   • ${chalk.green(pkgJson.name)} - ${chalk.gray(pkgJson.description || "")}`,
        );
      }
    }
  }

  // Available scripts
  console.log(chalk.white("\n📜 Generator Scripts"));
  console.log(
    `   ${chalk.yellow("pnpm gen:service")}          - Create basic NestJS service`,
  );
  console.log(
    `   ${chalk.yellow("pnpm gen:temporal-service")} - Create Temporal-enabled service`,
  );
  console.log(
    `   ${chalk.yellow("pnpm gen:workflow")}         - Add workflow to existing service`,
  );

  // Docker status
  console.log(chalk.white("\n🐳 Docker Services"));
  console.log(`   PostgreSQL:   ${chalk.gray("localhost:5432")}`);
  console.log(`   Temporal:     ${chalk.gray("localhost:7233")}`);
  console.log(`   Temporal UI:  ${chalk.blue("http://localhost:8080")}`);

  console.log(chalk.gray(`\n${"─".repeat(50)}`));
  console.log(
    chalk.cyan(
      `\n💡 Run ${chalk.yellow("projectx generate")} to create a new service or workflow\n`,
    ),
  );
}

async function getServicePort(
  projectRoot: string,
  serviceName: string,
): Promise<string | null> {
  const appConfigPath = path.join(
    projectRoot,
    "apps",
    serviceName,
    "src/config/app.config.ts",
  );

  if (await fs.pathExists(appConfigPath)) {
    const content = await fs.readFile(appConfigPath, "utf-8");
    const portMatch = content.match(/\|\|\s*(\d+)/);
    if (portMatch?.[1]) {
      return portMatch[1];
    }
  }

  return null;
}
