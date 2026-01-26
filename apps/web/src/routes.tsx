import {
  index,
  layout,
  prefix,
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

export default [
  layout("./routes/layouts/auth-layout.tsx", [
    route("login", "./routes/login.tsx"),
  ]),

  layout("./routes/layouts/root-layout.tsx", [
    index("./routes/home.tsx"),
    route("*", "./routes/$.tsx"),

    // Auth routes
    route("logout", "./routes/logout.tsx"),

    // Checkout + Email templates (dynamic)
    route("checkout/:referenceId", "./routes/checkout.tsx"),
    route("email/:template", "./routes/email.tsx"),

    // Marketplace & product
    route("marketplace", "./routes/marketplace.tsx"),
    route("product", "./routes/product.tsx"),

    // Orders
    ...prefix("order/:orderId", [
      route("detail", "./routes/order/detail.tsx"),
      route("history", "./routes/order/history.tsx"),
      route("summary", "./routes/order/summary.tsx"),
    ]),

    // Profile
    route("profile", "./routes/profile.tsx"),
  ]),

  // Admin
  layout("./routes/admin/layout.tsx", [
    ...prefix("admin", [
      route("/", "./routes/admin/index.tsx"),
      route("orders", "./routes/admin/orders.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
