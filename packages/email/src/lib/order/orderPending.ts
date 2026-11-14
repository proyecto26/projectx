import { getEmailHtml } from "../common/mjml";

export type OrderPendingEmailData = {
  orderId: string;
};

export function getOrderPendingEmailHtml<T extends OrderPendingEmailData>(
  data: T,
): string {
  const body = `
    <mj-section>
      <mj-column>
        <mj-text>Your order ${data.orderId} is pending.</mj-text>
      </mj-column>
    </mj-section>
  `;
  return getEmailHtml(body);
}
