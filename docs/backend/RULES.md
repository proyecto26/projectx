# Backend Rules & Conventions

## NestJS Architecture

### Module Structure
- Follow standard NestJS modular architecture.
- **DTOs**: Use `class-validator` and `class-transformer` for all Data Transfer Objects.
  ```typescript
  export class CreateOrderDto {
    @IsString()
    @IsNotEmpty()
    email: string;
  }
  ```
- **Services**: Business logic belongs in services, not controllers.
- **Controllers**: Keep controllers thin; handle HTTP requests and delegate to services.

### Database Access
- Use the shared `@projectx/db` package for all database interactions.
- leverage the `PrismaService` or repository pattern where applicable.
- **Migrations**: Manage schema changes via Prisma migrations (`pnpm prisma:migrate`).

### Authentication
- Authentication is handled via the **Auth Service** (Port 8081).
- Use JWT Guards to protect endpoints.
- Communications between services inside the private network may use internal auth mechanisms or shared secrets if configured.

## Temporal Integration

### Client Usage
- Use `ClientService` to interact with Temporal.
- Start workflows with typed arguments and specific Task Queues.
```typescript
await this.clientService.client.workflow.start(myWorkflow, {
  args: [input],
  taskQueue: 'my-queue',
  workflowId: `my-workflow-${id}`,
});
```

### Worker Registration
- Register workers using the `WorkflowsModule` dynamic import.
- Ensure Activities are properly injected into the Worker context.

## Best Practices
- **Error Handling**: Use NestJS Exception Filters.
- **Logging**: Use the configured logger (Pino) for consistent log formats.
- **Config**: Use `@nestjs/config` for environment variables.
