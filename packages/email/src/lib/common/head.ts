import {
  COLORS,
  FONT_SIZES,
  FONT_URLS,
  FONT_WEIGHTS,
  FONTS,
  PROJECT_NAME,
  SPACING,
} from "./constants";

export const getHeadTemplate = (title?: string, preview?: string) => `
  <mj-head>
    <mj-title>${[PROJECT_NAME, title].filter(Boolean).join(" - ")}</mj-title>
    <mj-preview>${preview}</mj-preview>
    <mj-attributes>
      <mj-all font-family="${FONTS.primary}"></mj-all>
      <mj-text font-weight="${FONT_WEIGHTS.normal}" font-size="${
        FONT_SIZES.base
      }" color="${COLORS.text}" line-height="24px"></mj-text>
      <mj-section background-color="${COLORS.white}" padding="${
        SPACING.lg
      } 0"></mj-section>
      <mj-column width="600px"></mj-column>
    </mj-attributes>
    <mj-font name="Roboto" href="${FONT_URLS.ROBOTO}" />
    <mj-font name="Open Sans" href="${FONT_URLS.OPEN_SANS}" />
    <mj-style inline="inline">
      .header td {
        padding: ${SPACING.lg} 0;
      }
      .social-icon {
        display: inline-block;
        margin: 0 ${SPACING.xs};
      }
      .link-nostyle {
        color: inherit;
        text-decoration: none;
      }
      .text-center {
        text-align: center;
      }
    </mj-style>
  </mj-head>
`;
