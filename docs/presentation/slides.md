# ProjectX Presentation Slides

## Slide 1: Title
### ProjectX: Full-stack Event-Driven Architecture
Tame full-stack chaos with Temporal workflows and React wizardry, the ultimate event-driven architecture for your apps 🧙✨

## Slide 2: System Architecture Overview
### High-Level System Components
```mermaid
graph TB
    subgraph Frontend
        Web[Web App - React/React Query]
    end

    subgraph Backend
        Auth[Auth Service]
        Order[Order Service]
        Product[Product Service]
        Temporal[Temporal Server]
        DB[(PostgreSQL)]
        Email[Email Service]
        Payment[Payment Service]
    end

    Web --> Auth
    Web --> Order
    Web --> Product
    Auth --> DB
    Order --> DB
    Product --> DB
    Order --> Temporal
    Order --> Payment
    Order --> Email
    Auth --> Email
    Payment --> Stripe[Stripe API]
    Email --> SendGrid[SendGrid API]
```

### Key Components
- Frontend: React-based web application
- Backend Services: Auth, Order, Product
- Infrastructure: Temporal, PostgreSQL
- External Services: Stripe, SendGrid

## Slide 3: Service Architecture
### Service Breakdown

#### Auth Service (Port 8081)
- JWT-based authentication
- User management
- Session handling

#### Order Service (Port 8082)
- Order management
- Payment processing
- Temporal workflow orchestration

#### Product Service (Port 8083)
- Product catalog management
- Inventory tracking
- Product search and filtering

## Slide 4: Authentication Flow
### User Authentication Process
```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth Service
    participant E as Email Service
    participant O as Order Service

    C->>A: POST /login (email)
    A->>E: Send verification code
    E-->>C: Email with code
    C->>A: POST /verify-code
    A-->>C: JWT Token
    C->>O: Request with JWT
    Note over O: Validate JWT
    O-->>C: Protected Resource
```

### Notes
- Email-based authentication
- JWT token generation
- Protected resource access

## Slide 5: Payment Processing Flow
### Order and Payment Workflow
```mermaid
sequenceDiagram
    participant C as Client
    participant O as Order Service
    participant T as Temporal
    participant S as Stripe
    participant E as Email Service

    C->>O: Create Order
    O->>T: Start Payment Workflow
    T->>S: Create Payment Intent
    S-->>T: Payment Intent Created
    T->>C: Return Client Secret
    C->>S: Complete Payment
    S->>O: Webhook: Payment Success
    O->>T: Signal Payment Status
    T->>E: Send Confirmation Email
    E-->>C: Email Sent
```

### Key Points
- Temporal workflow orchestration
- Stripe integration
- Email notifications

## Slide 6: Core Workflow Components
### Workflow Interface
```typescript
interface Workflow<T> {
  referenceId: string;
  step: WorkflowStep;
  maxRetries: number;
  expirationTimeInMilliseconds: number;
  data: T;
  error?: Error;
}

enum WorkflowStep {
  START = 'start',
  PROCESSING = 'processing',
  PAYMENT_PENDING = 'payment_pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

### Notes
- Generic workflow interface
- Step-based progression
- Error handling support

## Slide 7: Frontend Integration
### Component Architecture
```mermaid
graph TB
    subgraph Frontend Components
        C[Checkout Component]
        P[Payment Component]
    end
    subgraph Workflow Providers
        WA[useWorkflowActions]
        WC[useCurrentWorkflow]
        WS[Workflow Store]
    end
    subgraph Backend
        T[Temporal Server]
        O[Order Service]
    end
    C --> WA
    C --> WC
    WA --> WS
    WC --> WS
    WS --> T
    T --> O
```

## Slide 8: React Integration Hooks
### Custom Workflow Hooks
```typescript
// 1. Workflow Actions Hook
const { handleRun, handleError, handleUpdate } = useWorkflowActions<OrderWorkflow>({
  workflowType: WorkflowTypes.ORDER,
});

// 2. Current Workflow Hook
const currentWorkflow = useCurrentWorkflow<OrderWorkflow>(
  WorkflowTypes.ORDER,
  workflow => workflow.referenceId === referenceId
);

// 3. Workflows Collection Hook
const workflows = useWorkflows<OrderWorkflow>(WorkflowTypes.ORDER);
```

### Notes
- Type-safe workflow hooks
- Action management
- State synchronization

## Slide 9: Technology Stack
### Full Stack Overview
- **Frontend**
  - React
  - React Query
  - TailwindCSS

- **Backend**
  - NestJS
  - TypeScript
  - PostgreSQL

- **Workflow Engine**
  - Temporal

- **External Services**
  - Stripe (Payments)
  - SendGrid (Email)

## Slide 10: Next Steps
### Getting Started
1. Clone the ProjectX Template
2. Set up Development Environment
3. Run Example Workflows
4. Explore Code Examples

### Learning Resources
- [Temporal 101 with TypeScript](https://temporal.talentlms.com/catalog/info/id:135)
- [Exploring Durable Execution](https://temporal.talentlms.com/catalog/info/id:165)
- [Workflow Versioning](https://temporal.talentlms.com/catalog/info/id:171)