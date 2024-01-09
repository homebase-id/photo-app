import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { PageParam, getPhotosLocal } from '../../provider/Image/RNPhotoProvider';
import { PhotoConfig } from '../../provider/photos/PhotoTypes';

export type useInfintePhotosReturn = {
  results: DriveSearchResult[];
  pageParam?: PageParam;
};

const PAGE_SIZE = 250;

export const sortDsrFunction = (a: DriveSearchResult, b: DriveSearchResult) => {
  const aDate = a.fileMetadata.appData.userDate || a.fileMetadata.created;
  const bDate = b.fileMetadata.appData.userDate || b.fileMetadata.created;
  return bDate - aDate;
};

const targetDrive = PhotoConfig.PhotoDrive;

export const fetchPhotosByMonth = async ({
  type,
  date,
  pageParam,
}: {
  type?: 'archive' | 'bin' | 'apps' | 'favorites';
  date: Date;
  pageParam?: PageParam;
}): Promise<useInfintePhotosReturn> => {
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const beginOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

  const localResults = await getPhotosLocal(
    targetDrive,
    type,
    undefined,
    beginOfMonth,
    endOfMonth,
    'newer',
    pageParam
  );

  return {
    results: localResults,
    pageParam: {
      skip: localResults.length,
      take: PAGE_SIZE,
    },
  };
};

export const usePhotosByMonth = ({
  type,
  date,
}: {
  type?: 'archive' | 'bin' | 'apps' | 'favorites';
  date?: Date;
}) => {
  const queryClient = useQueryClient();

  return {
    fetchPhotos: useInfiniteQuery({
      queryKey: [
        'photos',
        targetDrive.alias,
        type,
        date && `${date.getFullYear()}-${date.getMonth()}`,
      ],
      initialPageParam: undefined as PageParam | undefined,
      queryFn: async ({ pageParam }) =>
        await fetchPhotosByMonth({
          type,
          date: date as Date,
          pageParam,
        }),
      getNextPageParam: (lastPage) =>
        lastPage?.results?.length >= PAGE_SIZE ? lastPage?.pageParam : undefined,
      enabled: !!date,
    }),
    invalidateQueries: (type?: 'archive' | 'bin' | 'apps' | 'favorites', date?: Date) => {
      const queryKey = ['photos', targetDrive.alias];
      if (type) queryKey.push(type);
      if (date) queryKey.push(`${date.getFullYear()}-${date.getMonth()}`);

      queryClient.invalidateQueries({ queryKey, exact: false });
    },
  };
};

export const useFlatPhotosFromDate = ({
  album,
  type,
  date,
  disabled,
  ordering,
}: {
  album?: string;
  type?: 'archive' | 'bin' | 'apps';
  date?: Date;
  disabled?: boolean;
  ordering?: 'older' | 'newer';
}) => {
  const queryClient = useQueryClient();

  return {
    fetchPhotos: useInfiniteQuery({
      queryKey: [
        'flat-photos',
        targetDrive?.alias,
        type,
        album,
        ordering,
        date ? date.getTime() : undefined,
      ],
      queryFn: async ({ pageParam }) => {
        const localResults = await getPhotosLocal(
          targetDrive,
          type,
          album,
          date,
          undefined,
          ordering || 'newer',
          { skip: pageParam?.skip || 0, take: PAGE_SIZE }
        );

        return {
          results: localResults,
          pageParam: {
            skip: (pageParam?.skip || 0) + PAGE_SIZE,
          },
        };
      },

      enabled: !disabled,
      initialPageParam: undefined as { skip: number } | undefined,
      getNextPageParam: (lastPage) =>
        lastPage?.results?.length === PAGE_SIZE && lastPage?.pageParam
          ? lastPage.pageParam
          : undefined,
      gcTime: Infinity, // Never refetch, unless specified explicitly
      staleTime: Infinity, // Never refetch, unless specified explicitly
    }),
    invalidateFlatPhotos: (album?: string, type?: 'archive' | 'bin' | 'apps') => {
      const queryKey = ['flat-photos', targetDrive?.alias, type];
      if (album) queryKey.push(album);

      queryClient.invalidateQueries({ queryKey, exact: false });
    },
  };
};
