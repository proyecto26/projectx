import path from "node:path";
import fs from "fs-extra";

/**
 * Find the root of the ProjectX monorepo by looking for turbo.json
 */
export function findProjectRoot(
  startDir: string = process.cwd(),
): string | null {
  let currentDir = startDir;

  while (currentDir !== path.parse(currentDir).root) {
    const turboJsonPath = path.join(currentDir, "turbo.json");
    const packageJsonPath = path.join(currentDir, "package.json");

    if (fs.existsSync(turboJsonPath) && fs.existsSync(packageJsonPath)) {
      const pkg = fs.readJsonSync(packageJsonPath);
      if (pkg.workspaces) {
        return currentDir;
      }
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Get the apps directory path
 */
export function getAppsDir(projectRoot: string): string {
  return path.join(projectRoot, "apps");
}

/**
 * Get the packages directory path
 */
export function getPackagesDir(projectRoot: string): string {
  return path.join(projectRoot, "packages");
}

/**
 * Check if a service exists
 */
export function serviceExists(
  projectRoot: string,
  serviceName: string,
): boolean {
  const servicePath = path.join(getAppsDir(projectRoot), serviceName);
  return fs.existsSync(servicePath);
}

/**
 * Get list of existing services
 */
export function getExistingServices(projectRoot: string): string[] {
  const appsDir = getAppsDir(projectRoot);
  if (!fs.existsSync(appsDir)) return [];

  return fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

/**
 * Get list of Temporal-enabled services
 */
export function getTemporalServices(projectRoot: string): string[] {
  const appsDir = getAppsDir(projectRoot);
  if (!fs.existsSync(appsDir)) return [];

  return fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((dirent) => {
      if (!dirent.isDirectory()) return false;
      const temporalConfig = path.join(
        appsDir,
        dirent.name,
        "src/config/temporal.config.ts",
      );
      return fs.existsSync(temporalConfig);
    })
    .map((dirent) => dirent.name);
}

/**
 * Get next available port based on existing services
 */
export function getNextAvailablePort(projectRoot: string): number {
  const appsDir = getAppsDir(projectRoot);
  const defaultPorts = [8081, 8082, 8083]; // auth, order, product

  if (!fs.existsSync(appsDir)) {
    return Math.max(...defaultPorts) + 1;
  }

  const existingPorts = [...defaultPorts];
  const services = getExistingServices(projectRoot);

  for (const service of services) {
    const appConfigPath = path.join(
      appsDir,
      service,
      "src/config/app.config.ts",
    );
    if (fs.existsSync(appConfigPath)) {
      const content = fs.readFileSync(appConfigPath, "utf-8");
      const portMatch = content.match(/\|\|\s*(\d+)/);
      if (portMatch?.[1]) {
        existingPorts.push(Number.parseInt(portMatch[1], 10));
      }
    }
  }

  return Math.max(...existingPorts) + 1;
}

/**
 * Get next available debug port
 */
export function getNextDebugPort(projectRoot: string): number {
  const baseDebugPort = 9229;
  const services = getExistingServices(projectRoot);
  return baseDebugPort + services.length;
}
