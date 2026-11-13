/**
 * A cart has products that are missing or no longer for sale
 * (for example a discontinued demo product).
 */
export class ProductUnavailableError extends Error {
  /** Same value as PRODUCT_UNAVAILABLE in @projectx/core/workflows */
  static readonly type = "ProductUnavailable";

  constructor(readonly productIds: number[]) {
    super(`These products aren't available: ${productIds.join(", ")}`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = ProductUnavailableError.type;
  }
}
