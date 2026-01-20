import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
  it("should render successfully", () => {
    const mockSections = [
      {
        title: "Main",
        links: [
          { title: "Home", href: "/" },
          { title: "About", href: "/about" },
        ],
      },
    ];

    const routes = [
      {
        path: "/",
        element: (
          <Header
            logoImgSrc="/logo.png"
            sections={mockSections}
            title="Test Title"
          />
        ),
        // Add a loader to provide the data router context
        loader: () => ({ message: "Test Data" }),
        HydrateFallback: () => <div>Loading...</div>,
      },
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
      initialIndex: 0,
    });

    const { baseElement } = render(<RouterProvider router={router} />);
    expect(baseElement).toBeTruthy();
  });
});
