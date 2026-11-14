import { COLORS, FONT_SIZES, FONT_WEIGHTS } from "../common/constants";
import { getEmailHtml } from "../common/mjml";

export type LoginEmailData = {
  token: string;
  userName: string;
};

export function getLoginEmailHtml<T extends LoginEmailData>(data: T): string {
  const body = `
    <mj-section>
      <mj-column>
        <mj-text font-size="${FONT_SIZES.xl}" font-weight="${FONT_WEIGHTS.bold}" align="center" color="${COLORS.text}">
          Let's sign you up
        </mj-text>
        <mj-text font-size="${FONT_SIZES.base}" align="center" color="${COLORS.text}">
          ${["Hi", data.userName].filter(Boolean).join(", ")}
        </mj-text>
        <mj-text font-size="${FONT_SIZES.base}" align="center" color="${COLORS.text}">
          Here is the security code to verify your account
        </mj-text>
        <mj-text font-size="${FONT_SIZES.xxl}" font-weight="${FONT_WEIGHTS.bold}" align="center" color="${COLORS.primary}">
          ${data.token}
        </mj-text>
        <mj-text font-size="${FONT_SIZES.sm}" align="center" color="${COLORS.textLight}">
          This code will expire in 20 minutes.
        </mj-text>
      </mj-column>
    </mj-section>
  `;
  return getEmailHtml(body);
}
