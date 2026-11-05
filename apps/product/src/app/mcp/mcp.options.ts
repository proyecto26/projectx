import type { McpModuleOptions } from "@nestjs/mcp";

/**
 * The product app's MCP server. Its tools and resources only read the public
 * catalog, so the endpoint takes no token.
 */
export const productMcpOptions: McpModuleOptions = {
  name: "projectx-product-catalog",
  title: "ProjectX product catalog",
  version: "0.0.1",
  instructions:
    "Read-only access to the ProjectX store catalog. Use search_products to find products by words, category or price, and get_product for one product by id. Read catalog://categories for the category names search_products accepts. Nothing here places orders or changes products.",
};
