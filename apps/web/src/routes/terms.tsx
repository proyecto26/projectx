import type { MetaFunction } from "react-router";

import { TermsPage } from "@/pages/TermsPage";

export const meta: MetaFunction = () => {
  return [
    { title: "ProjectX - Terms of Use" },
    {
      name: "description",
      content:
        "Read our terms of use and conditions for using ProjectX marketplace.",
    },
  ];
};

export default function Terms() {
  return <TermsPage />;
}
