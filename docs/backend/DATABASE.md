# Database Schema & Models

## Overview
The project uses **PostgreSQL** with **Prisma ORM**.
Schema location: `packages/db/prisma/schema.prisma`

## Core Models

### User
- Central entity for authentication and profile management.
- **Fields**: `email` (unique), `username`, `status` (Enum).
- **Relations**: `Products`, `Orders`, `Reviews`, `Roles`.

### Product & Manufacturer
- **Product**: `sku` (unique), `estimatedPrice`, `createdBy` (User).
- **Manufacturer**: Linked to a `User` (1-to-1).
- **ManufacturerPrice**: Tracks prices per manufacturer/product pair.

### Order Processing
- **Order**: Contains `items`, `payment`, `shippingAddress`.
- **Payment**: Tracks `transactionId`, `provider` (Stripe), `status`.
- **OrderItem**: Snapshot of product price/details at purchase time.

## Rules & Conventions
- **Enums**: Use Enums for fixed states (e.g., `OrderStatus`, `PaymentStatus`).
- **Timestamps**: All models must have `createdAt` and `updatedAt`.
- **Naming**: camelCase for fields in Prisma schema (mapped to snake_case in DB).
- **Migration**: Never modify `migrations/` manually. Use Prisma CLI.

## Relationships
- **Cascading**:
  - `onUpdate: Cascade`: Generally enabled.
  - `onDelete`: Carefully configured (usually `NoAction` or `SetNull` to prevent accidental data loss).

For specific field definitions, strictly refer to `packages/db/prisma/schema.prisma`.
