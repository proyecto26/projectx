import { data, type LoaderFunction } from "react-router";

export const loader: LoaderFunction = () => {
  return data(null, { status: 404 });
};

export default function NotFoundPage() {
  return <h1>Not Found</h1>;
}
