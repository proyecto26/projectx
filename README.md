# ProjectX

<p align="center">
  <img width="100px" alt="Nx for Monorepo" src="https://avatars.githubusercontent.com/u/23692104?s=200&v=4">
  <img width="100px" alt="Remix for Website" src="https://avatars.githubusercontent.com/u/64235328?s=200&v=4">
  <img width="300px" alt="ProjectX logo" src="https://github.com/user-attachments/assets/eecd8520-1e78-4ec7-8a12-55b62e5771c6">
  <img width="100px" alt="NestJS for Services" src="https://avatars.githubusercontent.com/u/28507035?s=200&v=4">
  <img width="100px" alt="Temporal for Durable Executions" src="https://avatars.githubusercontent.com/u/56493103?s=200&v=4">
</p>

> **ProjectX** is a comprehensive full-stack template designed to simplify the development of scalable and resilient applications using **React** and **Temporal**. By integrating Temporal's advanced workflow orchestration with React's dynamic frontend framework, ProjectX enables developers to build applications with durable executions and seamless communication between services.

## Why Temporal? 🤔

<pre align="center" role="img" aria-label="ASCII Temporal">
████████╗███████╗███╗   ███╗██████╗  ██████╗ ██████╗  █████╗ ██╗     
╚══██╔══╝██╔════╝████╗ ████║██╔══██╗██╔═══██╗██╔══██╗██╔══██╗██║     
   ██║   █████╗  ██╔████╔██║██████╔╝██║   ██║██████╔╝███████║██║     
   ██║   ██╔══╝  ██║╚██╔╝██║██╔═══╝ ██║   ██║██╔══██╗██╔══██║██║     
   ██║   ███████╗██║ ╚═╝ ██║██║     ╚██████╔╝██║  ██║██║  ██║███████╗
   ╚═╝   ╚══════╝╚═╝     ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
</pre>

### Challenges of Maintaining State in Distributed Systems

- Consistency
- Fault Tolerance
- Scalability
- Concurrency Control
- Security

**Temporal** is introduced here as a **Workflow Orchestration** tool for managing long-running operations **(durable execution)**, human-in-the-loop and system lifecycle **(state management, guaranteed completion with compensations and uniqueness)**. 
You can use **Temporal** today to implement sequences of steps/actions in a specific order for your business processes **(workflows)**, 
not only for communication between services **(Microservices Orchestration)** but also within **Monolithic** apps. 
**Workflows** can react to asynchronous and external events **(signals, updates)**, aggregate data and perform actions **(activities)** with exponential retries **(retry policy)** and run for extended periods **(heartbeat)** if needed, then you can check the state of these executions at any time **(queries)**.
Additionally, workflows support scheduled and time-based executions with configurable delays to handle recurring business logic **(scheduling)**.

### Use Cases

•	**Order Processing Systems:** Managing the lifecycle of orders from placement to fulfillment, including inventory checks, payment processing, and shipping.

•	**User Onboarding:** Coordinating steps involved in onboarding new users, such as account creation, email verification, and initial setup tasks.

•	**Data Pipelines:** Orchestrating data ingestion, transformation, and storage processes with reliability and scalability.

•	**Batch Processing:** Handling large-scale batch jobs with retry mechanisms and progress monitoring.

## Getting Started 🚀

### Prerequisites 🧰

- [Docker Compose](https://docs.docker.com/compose/install)
- [Node.js LTS Version](https://nodejs.org)
- [Git](https://git-scm.com/downloads)

### Quick Setup 🛠️

1. **Clone and Setup Environment:**
```bash
git clone https://github.com/proyecto26/projectx.git
cd projectx
cp .env.example .env
```

2. **Start Development Environment:**
```bash
# Build and start all services (db, temporal, backend services)
docker-compose up -d

# Start web application
npm install
npm run dev:web
```

### Documentation 📚

For detailed information about the project, please refer to:
- [Architecture Overview](./docs/architecture/README.md)
- [Frontend Guide](./docs/frontend/README.md)
- [Backend Guide](./docs/backend/README.md)

## Project Structure Overview

<img width="1643" alt="image" src="https://github.com/user-attachments/assets/82e99efc-640d-4ba4-a485-c92c0184f473">


<details>
  <summary><b>Markmap format 🍬</b></summary>

```markmap
#### Root Directory

- **package.json**: Contains the dependencies and scripts for the entire monorepo.
- **nx.json**: Configuration for Nx, which manages the monorepo structure and build processes.
- **tsconfig.base.json**: Base TypeScript configuration shared across the project.

#### Apps

- **apps/auth**: 
  - **Purpose**: Handles user authentication and data retrieval.
  - **Key Features**: Login, registration, and user profile management.

- **apps/order**: 
  - **Purpose**: Manages order processing, checkout, and payment handling.
  - **Key Features**: Cart management, order tracking, and payment integration.

- **apps/product**: 
  - **Purpose**: Manages product catalog and inventory.
  - **Key Features**: Product listing, details, and inventory management.

- **apps/web**: 
  - **Purpose**: The main web application interface.
  - **Key Features**: User interaction with the system.
  - **Configuration**: 
    - **tsconfig.json**: TypeScript configuration specific to the web app.

#### Libs

- **libs/backend/core**: 
  - **Purpose**: Contains business logic and common utilities.
  - **Key Features**: Shared functions and services used across backend applications.

- **libs/backend/db**: 
  - **Purpose**: Manages database access using Prisma and the Repository pattern.
  - **Key Features**: Database schema definitions and data access layers.
  - **Documentation**: 
    - **README.md**: Provides details on database setup and usage.

- **libs/backend/email**: 
  - **Purpose**: Handles email template creation and sending.
  - **Key Features**: Uses MJML for templates and provides email sending services.

- **libs/models**: 
  - **Purpose**: Defines DTOs and common types.
  - **Key Features**: Ensures consistency across web and backend services.

- **libs/frontend/ui**: 
  - **Purpose**: Contains UI components and themes.
  - **Key Features**: Built with React and TailwindCSS, includes Storybook for component visualization.
  - **Configuration**: 
    - **package.json**: Dependencies and scripts for the UI library.
    - **tsconfig.json**: TypeScript configuration for the UI library.

#### Additional paths

- **prompts**: Contains initial project prompts or guidelines to be used with your AI tools (Cursor, etc).
```
</details>




> [!TIP]
> View the Database diagram [here](./libs/backend/db/README.md).




## Development Tools 🔧

### Monorepo Management
```bash
# View project structure
npx nx show projects
npx nx graph

# Move project location
npx nx g @nx/workspace:move --project core libs/backend/common
```

### UI Development
```bash
# Run Storybook
npm run storybook
```

### Project Updates
```bash
npx nx migrate latest
npx nx migrate --run-migrations
```

## Docker Configuration 🐳

Services defined in [docker-compose.yml](./docker-compose.yml):
- PostgreSQL with PostGIS
- Temporal server and UI
- Auth, Order, and Product services

### Common Commands
```bash
# Build fresh images
docker-compose build --no-cache

# Start services
docker-compose up -d

# Remove services and volumes
docker-compose down --volumes
```

## Notable Links 🤓

- [Get started with Temporal and TypeScript](https://github.com/temporalio/sdk-typescript)
- [Workflow Messages - TypeScript SDK](https://docs.temporal.io/develop/typescript/message-passing)

### Public Courses

- [Temporal 101 with TypeScript](https://temporal.talentlms.com/catalog/info/id:135)
- [Temporal 102: Exploring Durable Execution with TypeScript](https://temporal.talentlms.com/catalog/info/id:165)
- [Versioning Workflows with TypeScript](https://temporal.talentlms.com/catalog/info/id:171)
- [Interacting with Workflows with TypeScript](https://temporal.talentlms.com/catalog/info/id:207)
- [Securing Temporal Applications with TypeScript](https://temporal.talentlms.com/catalog/info/id:211)
- [Introduction to Temporal Cloud](https://temporal.talentlms.com/catalog/info/id:144)
- [Crafting an Error Handling Strategy with TypeScript](https://temporal.talentlms.com/catalog/info/id:244)

## Payment Providers

- Stripe:
  - [Webhooks](https://docs.stripe.com/webhooks?lang=node)
  - [Stripe Webhook integration](https://docs.stripe.com/api/webhook_endpoints)
  - [Stripe Checkout](https://docs.stripe.com/payments/checkout)
  - [Webhooks Dashboard](https://dashboard.stripe.com/test/workbench/webhooks)
  - [Automatic fulfillment Orders](https://docs.stripe.com/checkout/fulfillment)
  - [Interactive webhook endpoint builder](https://docs.stripe.com/webhooks/quickstart)
  - [Trigger webhook events with the Stripe CLI](https://docs.stripe.com/stripe-cli/triggers)
  - [Testing cards](https://docs.stripe.com/testing#cards)
- Stripe commands for testing webhooks:
```bash
brew install stripe/stripe-cli/stripe
stripe login --api-key ...
stripe trigger payment_intent.succeeded
stripe listen --forward-to localhost:8081/order/webhook // or using the secure tunnel created by Ngrok
```

## Supporting 🍻
I believe in Unicorns 🦄
Support [me](http://www.paypal.me/jdnichollsc/2), if you do too.

Donate **Ethereum**, **ADA**, **BNB**, **SHIBA**, **USDT/USDC**, **DOGE**, etc:

> Wallet address: jdnichollsc.eth

Please let us know your contributions! 🙏

## Happy coding 💯
Made with ❤️

<pre role="img" aria-label="ASCII Made with Temporal">
╔╦╗╔═╗╔╦╗╔═╗╔═╗╦═╗╔═╗╦   <img width="150px" src="https://avatars0.githubusercontent.com/u/28855608?s=200&v=4" align="right">
 ║ ║╣ ║║║╠═╝║ ║╠╦╝╠═╣║  
 ╩ ╚═╝╩ ╩╩  ╚═╝╩╚═╩ ╩╩═╝⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
</pre>


