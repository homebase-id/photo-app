import { QueryClient } from '@tanstack/react-query';
import {
  PersistQueryClientOptions,
  PersistQueryClientProvider,
  removeOldestQuery,
} from '@tanstack/react-query-persist-client';
import { ReactNode, useMemo } from 'react';
import { createIDBPersister } from './createIdbPersister';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

export const OdinQueryClient = ({
  children,
  cacheKey,
  cachedQueryKeys,
  type,
}: {
  children: ReactNode;
  cacheKey: string;
  cachedQueryKeys: string[];
  type: 'local' | 'indexeddb';
}) => {
  const persistOptions = useMemo(() => {
    const persister =
      type === 'indexeddb'
        ? createIDBPersister(cacheKey)
        : createSyncStoragePersister({
            storage: window.localStorage,
            retry: removeOldestQuery,
            key: cacheKey,
          });

    const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
      buster: '20240524',
      maxAge: Infinity,
      persister: persister,
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          if (
            query.state.status === 'pending' ||
            query.state.status === 'error' ||
            (query.state.data &&
              typeof query.state.data === 'object' &&
              !Array.isArray(query.state.data) &&
              Object.keys(query.state.data).length === 0)
          )
            return false;
          const { queryKey } = query;
          return cachedQueryKeys.some((key) => queryKey.includes(key));
        },
      },
    };

    return persistOptions;
  }, [cacheKey, cachedQueryKeys]);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
};
