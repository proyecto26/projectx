import { redirect } from "react-router";

import HomePage from "../pages/HomePage";

export const loader = () => {
  // Set default route to marketplace
  throw redirect("/marketplace");
};

export default function Index() {
  return <HomePage />;
}
