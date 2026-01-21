# ProjectX - Full-Stack E-Commerce Platform

## Project Overview

This is a modern full-stack e-commerce platform built with a microservices architecture using TypeScript throughout.

## Tech Stack

### Monorepo
- **Turborepo** for build orchestration and caching
- **pnpm** (v9.12.3) as package manager
- **Node.js** v25

### Backend (NestJS Microservices)
- **auth** - Authentication service (JWT, Passport)
- **order** - Order management with Temporal workflows
- **product** - Product catalog service

### Frontend
- **React Router v7** - Full-stack React with SSR
- **Tailwind CSS v4** with DaisyUI
- **TanStack Query** for data fetching
- **Framer Motion** for animations

### Database
- **PostgreSQL** with PostGIS extension
- **Prisma** ORM (v7)

### Workflow Orchestration
- **Temporal** for durable execution

### Payments
- **Stripe** integration

### Email
- **SendGrid** with MJML templates

## Project Structure

```
projectx/
├── apps/
│   ├── auth/           # NestJS auth microservice
│   ├── order/          # NestJS order microservice
│   ├── product/        # NestJS product microservice
│   ├── storybook/      # Component documentation
│   └── web/            # React Router v7 frontend
├── packages/
│   ├── core/           # Shared NestJS modules
│   ├── db/             # Prisma schema and client
│   ├── email/          # Email templates (MJML + SendGrid)
│   ├── models/         # Shared TypeScript models
│   ├── payment/        # Stripe integration
│   ├── ui/             # React component library
│   └── workflows/      # Temporal workflow definitions
└── docker-compose.yml
```

## Common Commands

```bash
# Development
pnpm dev                    # Run all services in parallel
pnpm dev:web               # Run frontend only
pnpm dev:auth              # Run auth service only

# Building
pnpm build                 # Build all packages
pnpm build:web            # Build frontend

# Database
pnpm prisma:generate      # Generate Prisma client
pnpm prisma:migrate:dev   # Run migrations (dev)
pnpm prisma:seed          # Seed database

# Testing
pnpm test                  # Run all tests

# Linting
pnpm lint:fix             # Fix lint issues with Biome
pnpm check                # Run Biome check
```

## Code Style

- **Biome** for linting and formatting (replaces ESLint/Prettier)
- **Husky** + **lint-staged** for pre-commit hooks
- TypeScript strict mode enabled

## Architecture Patterns

### Backend Services
- Each microservice is a NestJS application
- Services communicate via HTTP/REST
- Temporal handles long-running workflows (order processing)
- Prisma for database access with repository pattern

### Frontend
- React Router v7 with file-based routing
- Server-side rendering (SSR) enabled
- TanStack Query for server state management
- Component library in `packages/ui` documented with Storybook

### Shared Packages
- `@projectx/core` - NestJS shared modules (guards, interceptors)
- `@projectx/db` - Prisma client and repository services
- `@projectx/models` - Shared TypeScript types/interfaces
- `@projectx/ui` - Reusable React components

## Environment Variables

See `.env.example` for required environment variables.

## Docker Development

```bash
docker-compose up -d       # Start all services
docker-compose down        # Stop all services
```

Services include: PostgreSQL + PostGIS, Temporal server + UI, Elasticsearch
