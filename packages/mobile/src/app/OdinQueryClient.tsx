import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import {
  PersistQueryClientOptions,
  PersistQueryClientProvider,
} from '@tanstack/react-query-persist-client';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      gcTime: Infinity,
      retry: 0,
    },
    queries: {
      retry: 2,
      gcTime: Infinity,
    },
  },
});

const asyncPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1000,
});

// Explicit includes to avoid persisting media items, or large data in general
const INCLUDED_QUERY_KEYS = [
  'album',
  'album-thumb',
  'albums',
  'photo-header',
  'photo-library',
  'photo-meta',
  'photos',
  'photos-infinite',

  'image',
  'tinyThumb',
];

const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  buster: '20240917',
  maxAge: Infinity,
  persister: asyncPersister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      if (
        query.state.status === 'pending' ||
        query.state.status === 'error' ||
        (query.state.data &&
          typeof query.state.data === 'object' &&
          !Array.isArray(query.state.data) &&
          Object.keys(query.state.data).length === 0)
      ) {
        return false;
      }
      const { queryKey } = query;
      return INCLUDED_QUERY_KEYS.some((key) => queryKey.includes(key));
    },
  },
};

export const OdinQueryClient = ({ children }: { children: ReactNode }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => queryClient.resumePausedMutations()}
    >
      {children}
    </PersistQueryClientProvider>
  );
};
