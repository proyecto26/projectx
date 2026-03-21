import type { MetaFunction } from "react-router";

import { PrivacyPage } from "@/pages/PrivacyPage";

export const meta: MetaFunction = () => {
  return [
    { title: "ProjectX - Privacy Policy" },
    {
      name: "description",
      content:
        "Learn how ProjectX collects, uses, and protects your personal information.",
    },
  ];
};

export default function Privacy() {
  return <PrivacyPage />;
}
