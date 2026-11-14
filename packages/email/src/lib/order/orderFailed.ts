import { getEmailHtml } from "../common/mjml";

export type OrderFailedEmailData = {
  orderId: string;
};

export function getOrderFailedEmailHtml<T extends OrderFailedEmailData>(
  data: T,
): string {
  const body = `
    <mj-section>
      <mj-column>
        <mj-text>Unfortunately, your order ${data.orderId} failed.</mj-text>
      </mj-column>
    </mj-section>
  `;
  return getEmailHtml(body);
}
