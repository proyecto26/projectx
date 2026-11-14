// Add any utility functions here that can be reused across templates
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
