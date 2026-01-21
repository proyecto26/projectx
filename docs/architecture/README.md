# Project Architecture Overview

This document provides a high-level overview of the ProjectX architecture, a full-stack event-driven application using Temporal workflows and React.

## System Architecture

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

## Authentication Flow

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

## Event Flow - Payment Processing

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

## Service Architecture

### Auth Service (Port 8081)
- JWT-based authentication
- User management
- Session handling
- Public endpoints:
  - `/login`: Email-based login
  - `/verify-code`: Verify login code
  - `/health`: Service health check

### Order Service (Port 8082)
- Order management
- Payment processing
- Webhook handling
- Temporal workflow orchestration
- Public endpoints:
  - `/health`: Service health check
- Protected endpoints (require JWT):
  - `/order`: Create and manage orders
  - `/order/:referenceId`: Get order status

### Product Service (Port 8083)
- Product catalog management
- Inventory tracking
- Product search and filtering
- Public endpoints:
  - `/health`: Service health check
- Protected endpoints (require JWT):
  - `/products`: List and manage products
  - `/products/:id`: Get product details

### Shared Libraries
- `@projectx/core`: Core utilities and configurations
  - Authentication middleware
  - Health checks
  - Common security setup
- `@projectx/db`: Database access and models
- `@projectx/email`: Email service integration
- `@projectx/payment`: Payment provider integration
- `@projectx/workflows`: Temporal workflow definitions

## Data Flow

```mermaid
flowchart LR
    subgraph User Flow
        Login --> CreateOrder
        CreateOrder --> ProcessPayment
        ProcessPayment --> SendEmail
    end

    subgraph System Flow
        A[Auth Service] --> D[(Database)]
        O[Order Service] --> D
        P[Product Service] --> D
        O --> T[Temporal]
        T --> P[Payment Service]
        T --> E[Email Service]
    end
```

## Security Architecture

```mermaid
flowchart TB
    subgraph Authentication
        Login[Login Request]
        Verify[Verify Code]
        JWT[JWT Token]
    end

    subgraph Authorization
        Guard[JWT Guard]
        Public[Public Endpoints]
        Protected[Protected Endpoints]
    end

    Login --> Verify
    Verify --> JWT
    JWT --> Guard
    Guard --> Protected
    Public --> Response[Response]
    Protected --> Response
```

## Technology Stack
- **Frontend**: React, React Query, TailwindCSS
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL
- **Workflow Engine**: Temporal
- **Payment Processing**: Stripe
- **Email Service**: SendGrid
- **Development Tools**: Docker, Turbo Monorepo

## Environment Configuration
Each service requires specific environment variables:

### Auth Service
- `AUTH_PORT`: Service port (default: 8081)
- `JWT_SECRET`: Secret for JWT signing
- `SENDGRID_API_KEY`: For email notifications

### Order Service
- `ORDER_PORT`: Service port (default: 8082)
- `JWT_SECRET`: Same secret as Auth service
- `STRIPE_SECRET_KEY`: Stripe API key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `SENDGRID_API_KEY`: For email notifications

### Product Service
- `PRODUCT_PORT`: Service port (default: 8083)
- `JWT_SECRET`: Same secret as Auth service

## Health Monitoring
Both services implement health checks that monitor:
- Database connectivity
- Memory usage (heap and RSS)
- External service dependencies 