# order-processing Specification

## Purpose
TBD - created by archiving change projectx-platform-spec. Update Purpose after archive.
## Requirements
### Requirement: Order lifecycle management with Temporal
The order service SHALL manage the complete order lifecycle (creation, payment, fulfillment) using Temporal workflows for durable execution and guaranteed completion.

#### Scenario: Creating an order
- **WHEN** a customer submits an order through the checkout flow
- **THEN** the system SHALL create an order record and start a Temporal workflow to process it

#### Scenario: Order compensation on failure
- **WHEN** a step in order processing fails (e.g., payment declined)
- **THEN** the Temporal workflow SHALL execute compensation logic to reverse any completed steps

### Requirement: Stripe payment integration for orders
The order service SHALL integrate with Stripe via the `@projectx/payment` package for checkout sessions, payment processing, and webhook handling.

#### Scenario: Processing a payment
- **WHEN** an order workflow reaches the payment step
- **THEN** the system SHALL create a Stripe checkout session and wait for payment confirmation via webhook

#### Scenario: Webhook receipt
- **WHEN** Stripe sends a payment webhook event
- **THEN** the order service SHALL verify the webhook signature and signal the corresponding Temporal workflow

### Requirement: Admin dashboard API
The order service SHALL expose admin API endpoints for dashboard statistics, order listing with filters, and order count aggregation.

#### Scenario: Fetching dashboard stats
- **WHEN** an admin requests dashboard statistics
- **THEN** the API SHALL return sales revenue, order counts, customer insights, and product performance data

#### Scenario: Listing orders with filters
- **WHEN** an admin queries orders with status, date range, or search filters
- **THEN** the API SHALL return paginated results with order details including customer and payment information

### Requirement: Order status tracking
The system SHALL maintain order status (pending, processing, paid, shipped, delivered, cancelled) and allow real-time status queries via Temporal workflow queries.

#### Scenario: Checking order status
- **WHEN** a customer or admin queries an order's status
- **THEN** the system SHALL return the current status from the Temporal workflow state

