import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithRouter } from "../../test-utils";
import { Navigation } from "./Navigation";

const mockSections = [
  {
    title: "Test Section",
    links: [
      {
        title: "Test Link",
        href: "/test",
      },
    ],
  },
];

describe("Navigation", () => {
  it("renders navigation links correctly", async () => {
    renderWithRouter(<Navigation sections={mockSections} />, {
      path: "/",
      initialEntries: ["/"],
    });

    expect(screen.getByText("Test Section")).toBeTruthy();
    expect(screen.getByText("Test Link")).toBeTruthy();
  });

  it("handles navigation correctly", async () => {
    const user = userEvent.setup();
    const { container } = renderWithRouter(
      <Navigation sections={mockSections} />,
      {
        path: "/",
        initialEntries: ["/"],
        routes: [
          {
            path: "/test",
            element: <div>Test Page</div>,
          },
        ],
      },
    );

    const link = screen.getByRole("link", { name: "Test Link" });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/test");
  });

  it("handles loader data", async () => {
    const testData = { message: "Test Data" };

    renderWithRouter(<Navigation sections={mockSections} />, {
      path: "/",
      initialEntries: ["/"],
      loader: () => testData,
    });

    // Add assertions for loader data if your component uses useLoaderData
  });
});
