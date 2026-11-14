import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  IMAGES,
  PROJECT_NAME,
  SPACING,
} from "./constants";

export const getHeaderTemplate = () => `
  <mj-section padding="0" css-class="header">
    <mj-column>
      <mj-image src="${IMAGES.LOGO}" alt="${PROJECT_NAME} Logo" width="150px" align="center" href="https://www.marketplace.com" />
    </mj-column>
  </mj-section>

  <mj-section background-url="${IMAGES.HERO}" background-size="cover" background-repeat="no-repeat">
    <mj-column>
      <mj-text align="center" color="${COLORS.white}" font-size="${FONT_SIZES.xl}" font-weight="${FONT_WEIGHTS.bold}" padding-top="${SPACING.xl}" padding-bottom="${SPACING.xl}">
        Welcome to ${PROJECT_NAME}
      </mj-text>
    </mj-column>
  </mj-section>
`;
