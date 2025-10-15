import { COLORS, FONT_SIZES, PROJECT_LINKS } from "./constants";

export const getFooterTemplate = () => `
  <mj-section background-color="${COLORS.white}">
    <mj-column>
      <mj-divider border-color="${COLORS.divider}" border-width="1px" />
      <mj-text font-size="${FONT_SIZES.sm}" color="${
        COLORS.textLight
      }" align="center">
        If you have any questions, please don't hesitate to <a href="${
          PROJECT_LINKS.CONTACT_US
        }" style="color: ${COLORS.primary};">contact our support team</a>
      </mj-text>
    </mj-column>
  </mj-section>

  <mj-section background-color="${COLORS.background}" css-class="footer">
    <mj-column>
      <mj-text font-size="${FONT_SIZES.xs}" color="${
        COLORS.textLight
      }" align="center">
        © ${new Date().getFullYear()} MarketPlace. All rights reserved.
        <br />
        123 Market Street, City, State 12345
      </mj-text>
      <mj-social font-size="${
        FONT_SIZES.xs
      }" icon-size="20px" mode="horizontal" align="center">
        <mj-social-element name="facebook" href="https://www.facebook.com/marketplace" background-color="${
          COLORS.primary
        }"></mj-social-element>
        <mj-social-element name="twitter" href="https://www.twitter.com/marketplace" background-color="${
          COLORS.primary
        }"></mj-social-element>
        <mj-social-element name="instagram" href="https://www.instagram.com/marketplace" background-color="${
          COLORS.primary
        }"></mj-social-element>
        <mj-social-element name="linkedin" href="https://www.linkedin.com/company/marketplace" background-color="${
          COLORS.primary
        }"></mj-social-element>
      </mj-social>
      <mj-text font-size="${FONT_SIZES.xs}" color="${
        COLORS.textLight
      }" align="center">
        <a href="https://www.marketplace.com/unsubscribe" class="link-nostyle">Unsubscribe</a> | <a href="https://www.marketplace.com/privacy" class="link-nostyle">Privacy Policy</a> | <a href="https://www.marketplace.com/terms" class="link-nostyle">Terms of Service</a>
      </mj-text>
    </mj-column>
  </mj-section>
`;
