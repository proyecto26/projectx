import type { DehydratedState } from "@tanstack/react-query";

import merge from "deepmerge";

import { useMatches } from "react-router";

// Define the type for match data
interface MatchData {
  dehydratedState?: DehydratedState;
  [key: string]: unknown;
}

/**
 * Retrieves and merges dehydrated query states from all matched routes.
 *
 * @description
 * This hook is used to hydrate TanStack Query data that was prefetched in route loaders.
 * It works by collecting all `dehydratedState` objects from route `loader` data
 * and merging them into a single state for the QueryClient to hydrate.
 *
 * @example
 * // In your route loader:
 * export async function loader() {
 *   const queryClient = new QueryClient();
 *   await queryClient.prefetchQuery(["products"], getProducts);
 *   return json({ dehydratedState: dehydrate(queryClient) });
 * }
 *
 * // In your route component:
 * export default function ProductsRoute() {
 *   const { data } = useQuery({ queryKey: ["products"], queryFn: getProducts });
 *
 *   return (
 *     <div>
 *       {data?.map((product) => (
 *         <ProductCard key={product.id} product={product} />
 *       ))}
 *     </div>
 *   );
 * }
 *
 * @returns {DehydratedState | undefined} The merged dehydrated state or undefined if no state exists
 */
export function useDehydratedState(): DehydratedState | undefined {
  const matches = useMatches();

  const dehydratedState = matches
    .map((match) => {
      return (match.data as MatchData)?.dehydratedState;
    })
    .filter((state): state is DehydratedState => Boolean(state));

  return dehydratedState.length
    ? dehydratedState.reduce(
        (accumulator, currentValue) => merge(accumulator, currentValue),
        { mutations: [], queries: [] },
      )
    : undefined;
}
