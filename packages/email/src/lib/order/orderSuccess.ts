import { getEmailHtml } from "../common/mjml";

export type OrderSuccessEmailData = {
  orderId: string;
};

export function getOrderSuccessEmailHtml<T extends OrderSuccessEmailData>(
  data: T,
): string {
  const body = `
    <mj-section>
      <mj-column>
        <mj-text>Your order ${data.orderId} was successful!</mj-text>
      </mj-column>
    </mj-section>
  `;
  return getEmailHtml(body);
}
