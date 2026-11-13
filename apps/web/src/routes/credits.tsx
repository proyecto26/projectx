import type { MetaFunction } from "react-router";

import { CreditsPage } from "@/pages/CreditsPage";

export const meta: MetaFunction = () => {
  return [
    { title: "ProjectX - Credits" },
    {
      name: "description",
      content:
        "Sources and licenses of the 3D models in the ProjectX demo catalog.",
    },
  ];
};

export default function Credits() {
  return <CreditsPage />;
}
