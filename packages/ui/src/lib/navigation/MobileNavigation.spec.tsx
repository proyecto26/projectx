import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MobileNavigation } from "./MobileNavigation";

describe("MobileNavigation", () => {
  it("should render successfully", () => {
    const mockSections = [
      {
        title: "Main",
        links: [
          {
            title: "Home",
            href: "/",
          },
          {
            title: "About",
            href: "/about",
          },
        ],
      },
    ];

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <MobileNavigation sections={mockSections} logoImgSrc="/logo.png" />
          ),
          // Add a loader to provide the data router context
          loader: () => ({ message: "Test Data" }),
          HydrateFallback: () => <div>Loading...</div>,
        },
      ],
      {
        initialEntries: ["/"],
        initialIndex: 0,
      },
    );

    const { baseElement } = render(<RouterProvider router={router} />);
    expect(baseElement).toBeTruthy();
  });
});
