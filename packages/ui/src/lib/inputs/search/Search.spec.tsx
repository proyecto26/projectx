import { render } from "@testing-library/react";

import Search from "./Search";

describe("Search", () => {
  it("should render successfully", () => {
    const { baseElement } = render(<Search />);
    expect(baseElement).toBeTruthy();
  });
});
