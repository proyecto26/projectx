# ProjectX

## Overview

ProjectX is a comprehensive full-stack template designed to streamline the development of resilient and scalable applications. By leveraging advanced workflow orchestration, ProjectX facilitates durable executions and seamless communication between microservices, ensuring robust and maintainable system architectures.

## Architecture

ProjectX employs a microservices architecture, where each service is responsible for specific business functionalities. Workflows orchestrate the interactions and data flow between these services, managing complex processes and ensuring reliable execution even in the face of failures.

### Worker Registration

The `WorkflowsModule` provides a dynamic module for registering Temporal workers in NestJS applications:

```ts
// app.module.ts
@Module({
  imports: [
    WorkflowsModule.registerAsync({
      imports: [ActivitiesModule],
      useFactory: async (activitiesService: ActivitiesService) => ({
        activitiesService,
        workflowsPath: path.join(__dirname, '/workflows'),
      }),
      inject: [ActivitiesService],
    }),
  ],
})
export class AppModule {}
```

### Workflow Client Usage
The `ClientService` allows services to interact with Temporal workflows. Here's an example of starting a workflow:

```ts
// my.service.ts
@Injectable()
export class MyService {
  constructor(
    private readonly configService: ConfigService,
    private readonly clientService: ClientService,
  ) {}

  async startmyFlow(correlationID: string, email: string) {
    // Get task queue from config
    const taskQueue = this.configService.get<string>('temporal.taskQueue');

    // Start the workflow
    await this.clientService.client?.workflow.start(myWorkflow, {
      // Pass workflow arguments
      args: [{ email }],
      // Specify task queue
      taskQueue,
      // Set unique workflow ID
      workflowId: `myworkflow-${correlationID}`,
      // Add searchable attributes
      searchAttributes: {
        Email: [email],
      },
    });
  }
}
```


## Key Features

- **Durable Executions:** Ensures that critical processes continue to run reliably, even in the event of interruptions or system failures.
- **Workflow Orchestration:** Coordinates and manages the sequence of operations across multiple microservices, enabling complex business logic to be executed efficiently.
- **Microservices Communication:** Facilitates robust and efficient communication between independently deployable services, enhancing modularity and scalability.
- **Event-Driven Design:** Implements event-driven principles to respond dynamically to changes and events within the system, improving responsiveness and flexibility.
- **Scalability and Resilience:** Designed to scale horizontally and withstand failures, ensuring high availability and performance under varying loads.

## Benefits

- **Simplified Development:** Provides a solid foundation with pre-configured workflows and microservices, reducing the time and effort required to build complex applications.
- **Enhanced Reliability:** Durable executions and robust communication mechanisms minimize downtime and ensure consistent performance.
- **Modular and Maintainable:** Microservices architecture promotes separation of concerns, making the system easier to understand, develop, and maintain.
- **Flexible and Scalable:** Easily accommodates growing application demands and adapts to changing business requirements through scalable workflows and services.
- **Improved Efficiency:** Streamlined orchestration and communication enhance overall system efficiency, enabling faster and more reliable operations.

## How It Works

ProjectX integrates workflow orchestration with microservices to manage and coordinate complex business processes. Workflows define the sequence of tasks and interactions between services, ensuring that each step is executed in the correct order and handling any errors or retries as necessary. This approach allows developers to focus on building individual services, while the workflow orchestrator manages the overall process flow and reliability.

By utilizing durable executions, ProjectX ensures that workflows persist their state and can recover from failures, providing a dependable foundation for mission-critical applications. Communication between microservices is handled efficiently, enabling seamless data exchange and coordination without tight coupling, thus promoting a scalable and maintainable system architecture.