import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { ClientOnly } from 'remix-utils/client-only';
import { useDehydratedState } from '~/hooks/useDehydratedState';

export function withQueryClientProvider<T extends object>(
  WrappedComponent: ComponentType<T>
): ComponentType<T> {
  return function (props: T) {
    const [queryClient] = useState(() => new QueryClient({
      defaultOptions: {
        queries: {
          // With SSR, we usually want to set some default staleTime
          // above 0 to avoid refetching immediately on the client
          staleTime: 60 * 1000,
          // a back-off delay is gradually applied to each retry attempt
          retryDelay: (attemptIndex: number) =>
            Math.min(1000 * 2 ** attemptIndex, 8000),
        },
      },
    }))
    const dehydratedState = useDehydratedState();
    return (
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydratedState}>
          <WrappedComponent {...props} />
          <ClientOnly>
            {() =>
              createPortal(
                <ReactQueryDevtools initialIsOpen={false} />,
                document.body
              )
            }
          </ClientOnly>
        </HydrationBoundary>
      </QueryClientProvider>
    );
  };
}
