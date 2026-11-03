import fs from "node:fs";
import path from "node:path";
import type { PlopTypes } from "@turbo/gen";

// Helper to find next available port
function getNextAvailablePort(basePath: string): number {
  const appsDir = path.join(basePath, "apps");
  const existingPorts = [8081, 8082, 8083]; // auth, order, product defaults

  if (fs.existsSync(appsDir)) {
    const apps = fs.readdirSync(appsDir, { withFileTypes: true });
    for (const app of apps) {
      if (app.isDirectory()) {
        const envConfigPath = path.join(
          appsDir,
          app.name,
          "src/config/env.config.ts",
        );
        if (fs.existsSync(envConfigPath)) {
          const content = fs.readFileSync(envConfigPath, "utf-8");
          const portMatch = content.match(/(\w+)_PORT/);
          if (portMatch) {
            // Try to find the default port in app.config.ts
            const appConfigPath = path.join(
              appsDir,
              app.name,
              "src/config/app.config.ts",
            );
            if (fs.existsSync(appConfigPath)) {
              const appContent = fs.readFileSync(appConfigPath, "utf-8");
              const defaultPort = appContent.match(/\|\|\s*(\d+)/);
              if (defaultPort?.[1]) {
                existingPorts.push(Number.parseInt(defaultPort[1], 10));
              }
            }
          }
        }
      }
    }
  }

  const maxPort = Math.max(...existingPorts);
  return maxPort + 1;
}

// Helper to get next debug port
function getNextDebugPort(basePath: string): number {
  const baseDebugPort = 9229; // auth uses 9229, order 9230, product 9231
  const appsDir = path.join(basePath, "apps");
  let maxDebugPort = baseDebugPort - 1;

  if (fs.existsSync(appsDir)) {
    const apps = fs.readdirSync(appsDir, { withFileTypes: true });
    maxDebugPort =
      baseDebugPort + apps.filter((a) => a.isDirectory()).length - 1;
  }

  return maxDebugPort + 1;
}

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  // Get the root path
  const rootPath = plop.getDestBasePath();

  // Custom helpers
  plop.setHelper("upperSnakeCase", (text: string) => {
    return text
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/[-\s]+/g, "_")
      .toUpperCase();
  });

  // ============================================
  // PHASE 1: Basic NestJS Service Generator
  // ============================================
  plop.setGenerator("nestjs-service", {
    description:
      "Create a new NestJS microservice (without Temporal workflows)",
    prompts: [
      {
        type: "input",
        name: "serviceName",
        message: "What is the name of the service?",
        validate: (input: string) => {
          if (!input || input.trim() === "") {
            return "Service name is required";
          }
          if (!/^[a-z][a-z0-9-]*$/.test(input)) {
            return "Service name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens";
          }
          const serviceDir = path.join(rootPath, "apps", input);
          if (fs.existsSync(serviceDir)) {
            return `Service "${input}" already exists`;
          }
          return true;
        },
      },
      {
        type: "input",
        name: "port",
        message: "What port should the service run on?",
        default: () => getNextAvailablePort(rootPath).toString(),
        validate: (input: string) => {
          const port = Number.parseInt(input, 10);
          if (Number.isNaN(port) || port < 1 || port > 65535) {
            return "Port must be a valid number between 1 and 65535";
          }
          return true;
        },
      },
      {
        type: "input",
        name: "description",
        message: "Brief description of the service:",
        default: (answers: { serviceName: string }) =>
          `${answers.serviceName.charAt(0).toUpperCase() + answers.serviceName.slice(1)} microservice`,
      },
      {
        type: "confirm",
        name: "includeEmail",
        message: "Include Email module (@projectx/email)?",
        default: false,
      },
      {
        type: "confirm",
        name: "includePayment",
        message: "Include Payment module (@projectx/payment)?",
        default: false,
      },
    ],
    actions: (answers) => {
      if (!answers) return [];

      const debugPort = getNextDebugPort(rootPath);
      const data = {
        ...answers,
        debugPort,
      };

      const actions: PlopTypes.ActionType[] = [
        // Package files
        {
          type: "add",
          path: "apps/{{serviceName}}/package.json",
          templateFile: "templates/nestjs-service/package.json.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/tsconfig.json",
          templateFile: "templates/nestjs-service/tsconfig.json.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/nest-cli.json",
          templateFile: "templates/nestjs-service/nest-cli.json.hbs",
          data,
        },
        // Source files
        {
          type: "add",
          path: "apps/{{serviceName}}/src/main.ts",
          templateFile: "templates/nestjs-service/src/main.ts.hbs",
          data,
        },
        // App files
        {
          type: "add",
          path: "apps/{{serviceName}}/src/app/app.module.ts",
          templateFile: "templates/nestjs-service/src/app/app.module.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/app/app.controller.ts",
          templateFile:
            "templates/nestjs-service/src/app/app.controller.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/app/app.service.ts",
          templateFile: "templates/nestjs-service/src/app/app.service.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/app/app.controller.spec.ts",
          templateFile:
            "templates/nestjs-service/src/app/app.controller.spec.ts.hbs",
          data,
        },
        // Config files
        {
          type: "add",
          path: "apps/{{serviceName}}/src/config/app.config.ts",
          templateFile: "templates/nestjs-service/src/config/app.config.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/config/env.config.ts",
          templateFile: "templates/nestjs-service/src/config/env.config.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/config/swagger.config.ts",
          templateFile:
            "templates/nestjs-service/src/config/swagger.config.ts.hbs",
          data,
        },
        // Test files
        {
          type: "add",
          path: "apps/{{serviceName}}/test/jest-e2e.json",
          templateFile: "templates/nestjs-service/test/jest-e2e.json.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/test/app.e2e-spec.ts",
          templateFile: "templates/nestjs-service/test/app.e2e-spec.ts.hbs",
          data,
        },
      ];

      // Phase 3: Add automation actions
      actions.push(
        // Update root package.json
        {
          type: "modify",
          path: "package.json",
          transform: (content: string, ans: Record<string, unknown>) => {
            const pkg = JSON.parse(content);
            const svcName = ans.serviceName as string;

            // Add dev script
            pkg.scripts[`dev:${svcName}`] = `turbo run dev --filter=${svcName}`;
            // Add build script
            pkg.scripts[`build:${svcName}`] =
              `turbo run build --filter=${svcName}`;

            // Sort scripts alphabetically for consistency
            const sortedScripts: Record<string, string> = {};
            for (const key of Object.keys(pkg.scripts).sort()) {
              sortedScripts[key] = pkg.scripts[key];
            }
            pkg.scripts = sortedScripts;

            return JSON.stringify(pkg, null, 2);
          },
        } as PlopTypes.ActionType,
        // Update docker-compose.yml
        {
          type: "modify",
          path: "docker-compose.yml",
          transform: (content: string, ans: Record<string, unknown>) => {
            const svcName = ans.serviceName as string;
            const svcPort = ans.port as string;
            const upperName = svcName.toUpperCase().replace(/-/g, "_");

            // Find the position to insert (before ngrok-order or at end of services)
            const insertMarker = "  ngrok-order:";
            const serviceBlock = `
  ${svcName}:
    <<: *service-common
    container_name: ${svcName}
    init: true
    depends_on:
      builder:
        condition: service_completed_successfully
    command:
      - /bin/sh
      - -c
      - |
        cd /app/apps/${svcName} && \\
        exec pnpm start:debug
    ports:
      - "\${${upperName}_PORT:-${svcPort}}:\${${upperName}_PORT:-${svcPort}}"
      - "${debugPort}:${debugPort}"

`;
            if (content.includes(insertMarker)) {
              return content.replace(insertMarker, serviceBlock + insertMarker);
            }
            // Fallback: append before networks section
            return content.replace(/\nnetworks:/, `${serviceBlock}\nnetworks:`);
          },
        } as PlopTypes.ActionType,
        // Update x-service-common volumes to include new service node_modules
        {
          type: "modify",
          path: "docker-compose.yml",
          transform: (content: string, ans: Record<string, unknown>) => {
            const svcName = ans.serviceName as string;
            const nodeModulesLine = `    - /app/apps/${svcName}/node_modules`;

            // Find the Apps node_modules section and add after the last app
            const appsNodeModulesPattern =
              /( {4}- \/app\/apps\/\w+\/node_modules\n)( {4}# Packages node_modules)/;
            if (appsNodeModulesPattern.test(content)) {
              return content.replace(
                appsNodeModulesPattern,
                `$1${nodeModulesLine}\n$2`,
              );
            }
            return content;
          },
        } as PlopTypes.ActionType,
        // Update builder command to include new service
        {
          type: "modify",
          path: "docker-compose.yml",
          transform: (content: string, ans: Record<string, unknown>) => {
            const svcName = ans.serviceName as string;

            // Add filter for new service in builder turbo command
            const builderPattern =
              /(pnpm turbo run build --filter=auth\^\.\.\. --filter=order\^\.\.\. --filter=product\^\.\.\.)( &&)/;
            if (builderPattern.test(content)) {
              return content.replace(
                builderPattern,
                `$1 --filter=${svcName}^...$2`,
              );
            }
            return content;
          },
        } as PlopTypes.ActionType,
      );

      // Final message
      actions.push({
        type: "add",
        path: "apps/{{serviceName}}/.generated",
        template: `Service generated successfully!

Next steps:
1. Add {{upperSnakeCase serviceName}}_PORT={{port}} to your .env file
2. Run: pnpm install
3. Run: pnpm dev:{{serviceName}}

Your service will be available at: http://localhost:{{port}}/{{serviceName}}
Swagger docs: http://localhost:{{port}}/{{serviceName}}/docs
`,
        data,
      });

      return actions;
    },
  });

  // ============================================
  // PHASE 2: Temporal-enabled NestJS Service Generator
  // ============================================
  plop.setGenerator("nestjs-temporal-service", {
    description:
      "Create a new NestJS microservice with Temporal workflow support",
    prompts: [
      {
        type: "input",
        name: "serviceName",
        message: "What is the name of the service?",
        validate: (input: string) => {
          if (!input || input.trim() === "") {
            return "Service name is required";
          }
          if (!/^[a-z][a-z0-9-]*$/.test(input)) {
            return "Service name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens";
          }
          const serviceDir = path.join(rootPath, "apps", input);
          if (fs.existsSync(serviceDir)) {
            return `Service "${input}" already exists`;
          }
          return true;
        },
      },
      {
        type: "input",
        name: "port",
        message: "What port should the service run on?",
        default: () => getNextAvailablePort(rootPath).toString(),
        validate: (input: string) => {
          const port = Number.parseInt(input, 10);
          if (Number.isNaN(port) || port < 1 || port > 65535) {
            return "Port must be a valid number between 1 and 65535";
          }
          return true;
        },
      },
      {
        type: "input",
        name: "description",
        message: "Brief description of the service:",
        default: (answers: { serviceName: string }) =>
          `${answers.serviceName.charAt(0).toUpperCase() + answers.serviceName.slice(1)} microservice with Temporal workflows`,
      },
      {
        type: "input",
        name: "workflowName",
        message: "Name of the initial workflow (e.g., 'process', 'handle'):",
        default: "process",
        validate: (input: string) => {
          if (!input || input.trim() === "") {
            return "Workflow name is required";
          }
          if (!/^[a-z][a-zA-Z0-9]*$/.test(input)) {
            return "Workflow name must be camelCase";
          }
          return true;
        },
      },
      {
        type: "confirm",
        name: "includeEmail",
        message: "Include Email module (@projectx/email)?",
        default: true,
      },
      {
        type: "confirm",
        name: "includePayment",
        message: "Include Payment module (@projectx/payment)?",
        default: false,
      },
    ],
    actions: (answers) => {
      if (!answers) return [];

      const debugPort = getNextDebugPort(rootPath);
      const data = {
        ...answers,
        debugPort,
        hasTemporal: true,
      };

      const actions: PlopTypes.ActionType[] = [
        // Package files
        {
          type: "add",
          path: "apps/{{serviceName}}/package.json",
          templateFile: "templates/nestjs-temporal-service/package.json.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/tsconfig.json",
          templateFile: "templates/nestjs-temporal-service/tsconfig.json.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/nest-cli.json",
          templateFile: "templates/nestjs-temporal-service/nest-cli.json.hbs",
          data,
        },
        // Source files
        {
          type: "add",
          path: "apps/{{serviceName}}/src/main.ts",
          templateFile: "templates/nestjs-temporal-service/src/main.ts.hbs",
          data,
        },
        // App files
        {
          type: "add",
          path: "apps/{{serviceName}}/src/app/app.module.ts",
          templateFile:
            "templates/nestjs-temporal-service/src/app/app.module.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/app/app.controller.ts",
          templateFile:
            "templates/nestjs-temporal-service/src/app/app.controller.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/app/app.service.ts",
          templateFile:
            "templates/nestjs-temporal-service/src/app/app.service.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/app/app.controller.spec.ts",
          templateFile:
            "templates/nestjs-temporal-service/src/app/app.controller.spec.ts.hbs",
          data,
        },
        // Activities
        {
          type: "add",
          path: "apps/{{serviceName}}/src/app/activities/activities.module.ts",
          templateFile:
            "templates/nestjs-temporal-service/src/app/activities/activities.module.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/app/activities/activities.service.ts",
          templateFile:
            "templates/nestjs-temporal-service/src/app/activities/activities.service.ts.hbs",
          data,
        },
        // Workflows
        {
          type: "add",
          path: "apps/{{serviceName}}/src/workflows/index.ts",
          templateFile:
            "templates/nestjs-temporal-service/src/workflows/index.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/workflows/{{workflowName}}.workflow.ts",
          templateFile:
            "templates/nestjs-temporal-service/src/workflows/workflow.ts.hbs",
          data,
        },
        // Config files
        {
          type: "add",
          path: "apps/{{serviceName}}/src/config/app.config.ts",
          templateFile:
            "templates/nestjs-temporal-service/src/config/app.config.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/config/env.config.ts",
          templateFile:
            "templates/nestjs-temporal-service/src/config/env.config.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/config/swagger.config.ts",
          templateFile:
            "templates/nestjs-temporal-service/src/config/swagger.config.ts.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/src/config/temporal.config.ts",
          templateFile:
            "templates/nestjs-temporal-service/src/config/temporal.config.ts.hbs",
          data,
        },
        // Test files
        {
          type: "add",
          path: "apps/{{serviceName}}/test/jest-e2e.json",
          templateFile:
            "templates/nestjs-temporal-service/test/jest-e2e.json.hbs",
          data,
        },
        {
          type: "add",
          path: "apps/{{serviceName}}/test/app.e2e-spec.ts",
          templateFile:
            "templates/nestjs-temporal-service/test/app.e2e-spec.ts.hbs",
          data,
        },
      ];

      // Phase 3: Add automation actions (same as basic service)
      actions.push(
        {
          type: "modify",
          path: "package.json",
          transform: (content: string, ans: Record<string, unknown>) => {
            const pkg = JSON.parse(content);
            const svcName = ans.serviceName as string;

            pkg.scripts[`dev:${svcName}`] = `turbo run dev --filter=${svcName}`;
            pkg.scripts[`build:${svcName}`] =
              `turbo run build --filter=${svcName}`;

            const sortedScripts: Record<string, string> = {};
            for (const key of Object.keys(pkg.scripts).sort()) {
              sortedScripts[key] = pkg.scripts[key];
            }
            pkg.scripts = sortedScripts;

            return JSON.stringify(pkg, null, 2);
          },
        } as PlopTypes.ActionType,
        {
          type: "modify",
          path: "docker-compose.yml",
          transform: (content: string, ans: Record<string, unknown>) => {
            const svcName = ans.serviceName as string;
            const svcPort = ans.port as string;
            const upperName = svcName.toUpperCase().replace(/-/g, "_");

            const insertMarker = "  ngrok-order:";
            const serviceBlock = `
  ${svcName}:
    <<: *service-common
    container_name: ${svcName}
    init: true
    depends_on:
      builder:
        condition: service_completed_successfully
    command:
      - /bin/sh
      - -c
      - |
        cd /app/apps/${svcName} && \\
        exec pnpm start:debug
    ports:
      - "\${${upperName}_PORT:-${svcPort}}:\${${upperName}_PORT:-${svcPort}}"
      - "${debugPort}:${debugPort}"

`;
            if (content.includes(insertMarker)) {
              return content.replace(insertMarker, serviceBlock + insertMarker);
            }
            return content.replace(/\nnetworks:/, `${serviceBlock}\nnetworks:`);
          },
        } as PlopTypes.ActionType,
        {
          type: "modify",
          path: "docker-compose.yml",
          transform: (content: string, ans: Record<string, unknown>) => {
            const svcName = ans.serviceName as string;
            const nodeModulesLine = `    - /app/apps/${svcName}/node_modules`;

            const appsNodeModulesPattern =
              /( {4}- \/app\/apps\/\w+\/node_modules\n)( {4}# Packages node_modules)/;
            if (appsNodeModulesPattern.test(content)) {
              return content.replace(
                appsNodeModulesPattern,
                `$1${nodeModulesLine}\n$2`,
              );
            }
            return content;
          },
        } as PlopTypes.ActionType,
        {
          type: "modify",
          path: "docker-compose.yml",
          transform: (content: string, ans: Record<string, unknown>) => {
            const svcName = ans.serviceName as string;

            const builderPattern =
              /(pnpm turbo run build --filter=auth\^\.\.\. --filter=order\^\.\.\. --filter=product\^\.\.\.[^&]*)( &&)/;
            if (builderPattern.test(content)) {
              return content.replace(
                builderPattern,
                `$1 --filter=${svcName}^...$2`,
              );
            }
            return content;
          },
        } as PlopTypes.ActionType,
      );

      // Final message
      actions.push({
        type: "add",
        path: "apps/{{serviceName}}/.generated",
        template: `Temporal-enabled service generated successfully!

Next steps:
1. Add {{upperSnakeCase serviceName}}_PORT={{port}} to your .env file
2. Run: pnpm install
3. Run: pnpm dev:{{serviceName}}

Your service will be available at: http://localhost:{{port}}/{{serviceName}}
Swagger docs: http://localhost:{{port}}/{{serviceName}}/docs
Temporal UI: http://localhost:8080 (to monitor workflows)

Task Queue: {{serviceName}}
Initial Workflow: {{workflowName}}{{pascalCase serviceName}}Workflow
`,
        data,
      });

      return actions;
    },
  });

  // ============================================
  // Workflow Generator (add to existing service)
  // ============================================
  plop.setGenerator("workflow", {
    description: "Add a new Temporal workflow to an existing service",
    prompts: [
      {
        type: "list",
        name: "serviceName",
        message: "Which service should the workflow be added to?",
        choices: () => {
          const appsDir = path.join(rootPath, "apps");
          if (!fs.existsSync(appsDir)) return [];

          return fs
            .readdirSync(appsDir, { withFileTypes: true })
            .filter((dirent) => {
              if (!dirent.isDirectory()) return false;
              // Check if it has Temporal config
              const temporalConfig = path.join(
                appsDir,
                dirent.name,
                "src/config/temporal.config.ts",
              );
              return fs.existsSync(temporalConfig);
            })
            .map((dirent) => dirent.name);
        },
      },
      {
        type: "input",
        name: "workflowName",
        message:
          "What is the name of the workflow (e.g., 'checkout', 'refund')?",
        validate: (input: string) => {
          if (!input || input.trim() === "") {
            return "Workflow name is required";
          }
          if (!/^[a-z][a-zA-Z0-9]*$/.test(input)) {
            return "Workflow name must be camelCase";
          }
          return true;
        },
      },
      {
        type: "input",
        name: "workflowDescription",
        message: "Brief description of the workflow:",
        default: (answers: { workflowName: string }) =>
          `Handles ${answers.workflowName} process`,
      },
    ],
    actions: [
      {
        type: "add",
        path: "apps/{{serviceName}}/src/workflows/{{workflowName}}.workflow.ts",
        templateFile: "templates/workflow/workflow.ts.hbs",
      },
      {
        type: "modify",
        path: "apps/{{serviceName}}/src/workflows/index.ts",
        transform: (content: string, ans: Record<string, unknown>) => {
          const wfName = ans.workflowName as string;
          const exportLine = `export * from "./${wfName}.workflow";`;
          if (content.includes(exportLine)) return content;
          return `${content.trim()}\n${exportLine}\n`;
        },
      },
    ],
  });
}
