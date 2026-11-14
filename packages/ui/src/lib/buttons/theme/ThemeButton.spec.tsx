import { render } from "@testing-library/react";

import ThemeButton from "./ThemeButton";

describe("ThemeButton", () => {
  it("should render successfully", () => {
    const { baseElement } = render(<ThemeButton />);
    expect(baseElement).toBeTruthy();
  });
});
