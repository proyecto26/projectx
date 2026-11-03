# Order Service - Admin API

This document describes the admin endpoints for the order service.

## Base URL

```
http://localhost:8082/orders/admin
```

## Endpoints

### 1. Get Dashboard Statistics

Returns comprehensive statistics for the admin dashboard.

**Endpoint:** `GET /orders/admin/stats`

**Response:**
```json
{
  "totalRevenue": 10000.00,
  "averageOrderValue": 50.00,
  "pendingOrders": 10,
  "pendingPercentage": 20.0,
  "completedOrders": 40,
  "totalCustomers": 100,
  "conversionRate": 80.0,
  "avgDeliveryTime": 24.5
}
```

**Fields:**
- `totalRevenue` - Total revenue from all orders
- `averageOrderValue` - Average value per order
- `pendingOrders` - Number of pending orders
- `pendingPercentage` - Percentage of pending orders
- `completedOrders` - Number of completed/delivered orders
- `totalCustomers` - Total number of unique customers
- `conversionRate` - Percentage of completed orders vs total orders
- `avgDeliveryTime` - Average delivery time in hours (optional)

---

### 2. Get Orders List

Returns a paginated list of orders with filtering capabilities.

**Endpoint:** `GET /orders/admin/list`

**Query Parameters:**
- `status` (optional) - Filter by status: `all`, `Pending`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`, `Failed`
  - Default: `all`
- `search` (optional) - Search by customer name, email, or order reference
- `page` (optional) - Page number (minimum: 1)
  - Default: `1`
- `limit` (optional) - Items per page (minimum: 1)
  - Default: `10`

**Example Request:**
```
GET /orders/admin/list?status=Pending&search=john&page=1&limit=20
```

**Response:**
```json
{
  "orders": [
    {
      "id": 1,
      "referenceId": "ref-123",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "type": "Standard",
      "status": "Pending",
      "amount": 100.00,
      "date": "2024-01-25T10:30:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

**Fields:**
- `orders` - Array of order items
  - `id` - Order ID
  - `referenceId` - Order reference ID
  - `customerName` - Customer full name
  - `customerEmail` - Customer email
  - `type` - Order type (e.g., "Standard")
  - `status` - Order status
  - `amount` - Total order amount
  - `date` - Order creation date
- `total` - Total number of orders matching the filter
- `page` - Current page number
- `limit` - Items per page

---

### 3. Get Order Counts

Returns order counts grouped by status.

**Endpoint:** `GET /orders/admin/counts`

**Response:**
```json
{
  "total": 100,
  "pending": 20,
  "inProduction": 30,
  "completed": 50
}
```

**Fields:**
- `total` - Total number of orders
- `pending` - Number of pending orders
- `inProduction` - Number of orders in production (Confirmed + Shipped)
- `completed` - Number of completed/delivered orders

---

## Order Status Values

- `Pending` - Order created but payment not confirmed
- `Confirmed` - Payment confirmed
- `Shipped` - Order has been shipped
- `Delivered` - Order delivered to customer
- `Cancelled` - Order cancelled
- `Failed` - Order failed (e.g., payment failed)

---

## Testing

Run the controller tests:
```bash
pnpm --filter order test order-admin.controller.spec
```

Run all order service tests:
```bash
pnpm --filter order test
```

---

## Development

Start the order service in development mode:
```bash
pnpm dev:order
```

The service will be available at `http://localhost:8082`.

Access the Swagger documentation at:
```
http://localhost:8082/api
```
