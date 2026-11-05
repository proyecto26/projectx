# @proyecto26/temporal-workflows

Run [Temporal](https://temporal.io/) workers and clients inside a [NestJS](https://nestjs.com/) application.

Register a module with your activities and workflows, and it starts the worker with the app, retries while Temporal isn't ready yet, and shuts down cleanly.

## Contents

- [Features](#features-)
- [Installation](#installation-)
- [Quick start](#quick-start-)
- [Importing from workflows](#importing-from-workflows-%EF%B8%8F)
- [Options](#options-%EF%B8%8F)
- [Helpers](#helpers-)
- [Connect your frontend](#connect-your-frontend-%EF%B8%8F)

## Features ✨

- 🧩 **`WorkflowsModule`** starts a worker from a NestJS provider holding your activities.
- 🔗 **`ClientService`** is an injectable Temporal client.
- 🔁 **Connection retries** while Temporal is starting.
- 📦 **Bundle at startup or ahead of time** for production.
- 🔎 **Helpers** to check the status of a workflow and find executions by search attribute.

## Installation 📦

```bash
npm install @proyecto26/temporal-workflows @nestjs/common @nestjs/config @temporalio/client @temporalio/proto @temporalio/worker
```

Requires NestJS 10, 11 or 12, `@nestjs/config` 3, 4 or 12, and the Temporal TypeScript SDK 1.25 or later.

## Quick start 🚀

```ts
import path from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WorkflowsModule } from "@proyecto26/temporal-workflows";

import { ActivitiesModule } from "./activities/activities.module";
import { ActivitiesService } from "./activities/activities.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => ({
          temporal: {
            host: "localhost:7233",
            namespace: "default",
            taskQueue: "orders",
          },
        }),
      ],
    }),
    WorkflowsModule.registerAsync({
      imports: [ActivitiesModule],
      inject: [ActivitiesService],
      useFactory: (activitiesService: ActivitiesService) => ({
        activitiesService,
        workflowsPath: path.join(__dirname, "../workflows"),
      }),
    }),
  ],
})
export class AppModule {}
```

Every public method of `activitiesService` becomes an activity, bound to the instance so it can use its injected dependencies.

Start workflows with the client:

```ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientService } from "@proyecto26/temporal-workflows";

@Injectable()
export class OrdersService {
  constructor(
    private readonly configService: ConfigService,
    private readonly clientService: ClientService,
  ) {}

  startOrder(input: OrderInput) {
    return this.clientService.client?.workflow.start(orderWorkflow, {
      workflowId: `order-${input.id}`,
      taskQueue: this.configService.getOrThrow<string>("temporal.taskQueue"),
      args: [input],
    });
  }
}
```

## Importing from workflows ⚠️

Workflows run in a [sandbox](https://docs.temporal.io/develop/typescript/core-application#workflow-logic-requirements) and get bundled with webpack. They can't load NestJS, so this fails with errors such as `Can't resolve '@nestjs/microservices'`:

```ts
// A barrel that also exports DTOs with decorators brings NestJS with it
import { OrderStatus } from "@my-app/models";
```

**Import only pure modules from a workflow.** Publish enums and workflow definitions in their own entry point, and use `import type` for everything else, which is removed at compile time:

```ts
import type { OrderDto } from "@my-app/models";
import { OrderStatus } from "@my-app/models/enums";
import type { ActivitiesService } from "../app/activities/activities.service";
```

No bundler configuration is needed for this. Avoid replacing NestJS with mocks in the bundle, because a wrong import then stops failing at build time and misbehaves while the workflow runs.

A test that bundles your workflows and looks for those packages protects you from this:

```ts
const { code } = await bundleWorkflowCode({ workflowsPath });
expect(code).not.toContain("@nestjs");
```

## Options ⚙️

`useFactory` returns:

| Option | Default | Description |
|---|---|---|
| `activitiesService` | Required | Instance whose public methods are the activities |
| `workflowsPath` | | Workflows to bundle when the worker starts |
| `workflowBundle` | | Bundle built ahead of time. Replaces `workflowsPath` |
| `bundlerOptions` | | Options for `bundleWorkflowCode`, such as `ignoreModules` or `webpackConfigHook` |
| `connectionOptions` | `{ address: temporal.host }` | Options for `NativeConnection.connect`, such as TLS |
| `namespace` | `temporal.namespace` | Temporal namespace |
| `taskQueue` | `temporal.taskQueue` | Task queue of the worker |

Either `workflowsPath` or `workflowBundle` is required. The defaults are read with `ConfigService`, and `ClientService` reads `temporal.host` and `temporal.namespace` the same way. The worker's log level comes from `app.logLevel`.

### Bundling for production

Bundling takes a few seconds on every start. Build the bundle in your image instead:

```ts
// scripts/bundle-workflows.ts
import { writeFile } from "node:fs/promises";
import { bundleWorkflowCode } from "@temporalio/worker";

const { code } = await bundleWorkflowCode({
  workflowsPath: require.resolve("../src/workflows"),
});
await writeFile("dist/workflow-bundle.js", code);
```

```ts
useFactory: (activitiesService: ActivitiesService) => ({
  activitiesService,
  workflowBundle: { codePath: path.join(__dirname, "../workflow-bundle.js") },
}),
```

## Helpers 🔎

```ts
import {
  getWorkflowDescription,
  isWorkflowCompleted,
  isWorkflowFailed,
  isWorkflowRunning,
} from "@proyecto26/temporal-workflows";

const description = await getWorkflowDescription(client.workflow, workflowId);
if (isWorkflowRunning(description)) {
  // ...
}
```

`getWorkflowExecutionByEmail`, `getWorkflowExecutionByUserId` and `getWorkflowExecutionByOrderId` find running executions using the `Email`, `UserId` and `OrderId` search attributes, which must be registered in your namespace.

## Connect your frontend 🖥️

Use [`@proyecto26/temporal-workflow-client`](https://www.npmjs.com/package/@proyecto26/temporal-workflow-client) to follow these workflows from the browser with React hooks: by querying them, or with live updates if they publish to a stream.

## Sponsors 💜

This project is free and open source. Sponsors help keep it maintained and growing.

[**Become a Sponsor**](https://github.com/sponsors/proyecto26) | [Sponsorship Program](https://proyecto26.com/sponsors/)

## Contribution 🤝

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.
 
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated** ❤️.
 
You can learn more about how you can contribute to this project in the [contribution guide](https://github.com/proyecto26/.github/blob/master/CONTRIBUTING.md).

## License ⚖️
This repository is available under the [MIT License](./LICENSE).

## Happy vibe coding 💯

Made with ❤️ by [Proyecto 26](https://proyecto26.com)

<pre role="img" aria-label="ASCII Made with Temporal">
╔╦╗╔═╗╔╦╗╔═╗╔═╗╦═╗╔═╗╦   <img width="150px" src="https://avatars0.githubusercontent.com/u/28855608?s=200&v=4" align="right">
 ║ ║╣ ║║║╠═╝║ ║╠╦╝╠═╣║  
 ╩ ╚═╝╩ ╩╩  ╚═╝╩╚═╩ ╩╩═╝⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
</pre>


