import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  TargetDrive,
  DriveSearchResult,
  DotYouClient,
  CursoredResult,
} from '@youfoundation/js-lib/core';
import { createDateObject, getPhotos } from '../../provider/photos/PhotoProvider';
import { useFlatMonthsFromMeta } from './usePhotoLibraryRange';
import { useRef } from 'react';
import { getQueryBatchCursorFromTime } from '@youfoundation/js-lib/helpers';
import { PhotoConfig } from '../../provider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export type useInfintePhotosReturn = {
  results: DriveSearchResult[];
  cursorState?: string;
};

const PAGE_SIZE = 1000;

export const sortDsrFunction = (a: DriveSearchResult, b: DriveSearchResult) => {
  const aDate = a.fileMetadata.appData.userDate || a.fileMetadata.created;
  const bDate = b.fileMetadata.appData.userDate || b.fileMetadata.created;
  return bDate - aDate;
};

export const fetchPhotosByMonth = async ({
  dotYouClient,
  targetDrive,
  type,
  date,
  cursorState,
}: {
  dotYouClient: DotYouClient;
  targetDrive: TargetDrive;
  type?: 'archive' | 'bin' | 'apps' | 'favorites';
  date: Date;
  cursorState?: string;
}): Promise<useInfintePhotosReturn> => {
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const beginOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

  const dateCursor = getQueryBatchCursorFromTime(endOfMonth.getTime(), beginOfMonth.getTime());
  return await getPhotos(
    dotYouClient,
    targetDrive,
    type,
    undefined, // album
    PAGE_SIZE,
    cursorState || dateCursor
  );
};

const fetchPhotosByCursor = async ({
  dotYouClient,
  targetDrive,
  type,
  album,
  cursorState,
  direction,
}: {
  dotYouClient: DotYouClient;
  targetDrive: TargetDrive;
  type?: 'archive' | 'bin' | 'apps' | 'favorites';
  album?: string;
  cursorState?: string;
  direction?: 'older' | 'newer';
}): Promise<CursoredResult<DriveSearchResult[]>> => {
  return await getPhotos(dotYouClient, targetDrive, type, album, PAGE_SIZE, cursorState, direction);
};

export const usePhotosByMonth = ({
  targetDrive,
  type,
  date,
}: {
  targetDrive?: TargetDrive;
  type?: 'archive' | 'bin' | 'apps' | 'favorites';
  date?: Date;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  return {
    fetchPhotos: useInfiniteQuery({
      queryKey: [
        'photos',
        targetDrive?.alias,
        type || '',
        date && `${date.getFullYear()}-${date.getMonth()}`,
      ],
      queryFn: async ({ pageParam }) =>
        await fetchPhotosByMonth({
          dotYouClient,
          targetDrive: targetDrive as TargetDrive,
          type,
          date: date as Date,
          cursorState: pageParam,
        }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage?.results?.length >= PAGE_SIZE ? lastPage?.cursorState : undefined,
      refetchOnMount: false,
      enabled: !!targetDrive && !!date,
      staleTime: 1000 * 60 * 10, // 10min => react query will fire a background refetch after this time; (Or if invalidated manually after an update)
    }),
    invalidateQueries: (type?: 'archive' | 'bin' | 'apps' | 'favorites') => {
      queryClient.invalidateQueries({
        queryKey: ['photos', PhotoConfig.PhotoDrive.alias, type || ''],
        exact: false,
      });
    },
  };
};

export const useFlatPhotosByMonth = ({
  targetDrive,
  type,
  date,
}: {
  targetDrive: TargetDrive;
  type?: 'archive' | 'bin' | 'apps' | 'favorites';
  date?: Date;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const { data: flatMonths } = useFlatMonthsFromMeta({
    targetDrive,
    type,
  });

  const startMonthIndex =
    flatMonths?.findIndex(
      (flatDay) => flatDay.year === date?.getFullYear() && flatDay.month === date?.getMonth() + 1
    ) || 0;

  const startMonth = useRef<{ year: number; month: number }>();
  if (!startMonth.current) startMonth.current = flatMonths?.[startMonthIndex];

  // Cache key is the starting point (first Photo month that was openend)
  return {
    fetchPhotos: useInfiniteQuery({
      queryKey: [
        'flat-photos',
        targetDrive?.alias,
        type,
        startMonth.current ? `${startMonth.current.year}-${startMonth.current.month}` : undefined,
      ],
      queryFn: async ({ pageParam }) => {
        const pageDateParam = pageParam instanceof Date ? pageParam : undefined;
        const cursorState = pageParam instanceof Date ? undefined : pageParam;

        const dateParam = pageDateParam || (date as Date);
        //  ||
        // (startMonth?.current
        //   ? createDateObject(startMonth.current.year, startMonth.current?.month)
        //   : new Date());
        const currentData = await queryClient.fetchInfiniteQuery({
          queryKey: [
            'photos',
            targetDrive?.alias,
            type || '',
            dateParam && `${dateParam.getFullYear()}-${dateParam.getMonth()}`,
          ],
          initialPageParam: undefined as string | undefined,
          queryFn: async () =>
            await fetchPhotosByMonth({
              dotYouClient,
              targetDrive: targetDrive as TargetDrive,
              type,
              date: dateParam,
              cursorState: cursorState,
            }),
          gcTime: 1000 * 60 * 60 * 1, // 1 hour
        });

        const currentMonthIndex =
          flatMonths?.findIndex(
            (flatDay) =>
              flatDay.year === dateParam?.getFullYear() &&
              flatDay.month === dateParam?.getMonth() + 1
          ) || 0;

        const nextMonth = flatMonths?.[currentMonthIndex + 1];
        const prevMonth = flatMonths?.[currentMonthIndex - 1];

        return {
          results: currentData.pages.flatMap((page) => page.results),
          // Pass cursorState of the last page of this month, but only if there is a next page
          cursorState:
            currentData.pages[currentData.pages.length - 1]?.results?.length >= PAGE_SIZE
              ? currentData.pages[currentData.pages.length - 1].cursorState
              : undefined,
          prevMonth: prevMonth,
          nextMonth: nextMonth,
        };
      },
      initialPageParam: undefined as string | Date | undefined,
      enabled: !!targetDrive && !!date,
      getPreviousPageParam: (firstPage) => {
        // TODO: Check if we need something special here to fetch them reverted? And support pages inside of the months (not only a page per month)
        if (firstPage.prevMonth) {
          return createDateObject(firstPage.prevMonth?.year, firstPage.prevMonth?.month);
        }
        return undefined;
      },
      getNextPageParam: (lastPage) => {
        if (lastPage?.cursorState) {
          return lastPage.cursorState;
        } else if (lastPage.nextMonth) {
          return createDateObject(lastPage.nextMonth?.year, lastPage.nextMonth?.month);
        }
        return undefined;
      },
      gcTime: Infinity,
      staleTime: 1000 * 60 * 60 * 1, // 1h
    }),
  };
};

export const usePhotosInfinte = ({
  targetDrive,
  album,
  type,
  startFromDate,
  direction,
  disabled,
}: {
  targetDrive?: TargetDrive;
  album?: string;
  type?: 'archive' | 'bin' | 'apps' | 'favorites';
  startFromDate?: Date;
  direction?: 'older' | 'newer';
  disabled?: boolean;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const startFromDateCursor = startFromDate
    ? getQueryBatchCursorFromTime(startFromDate.getTime())
    : undefined;

  return {
    fetchPhotos: useInfiniteQuery({
      queryKey: [
        'photos-infinite',
        targetDrive?.alias,
        type,
        album,
        startFromDate?.getTime(),
        direction,
      ],
      queryFn: ({ pageParam }) =>
        fetchPhotosByCursor({
          dotYouClient,
          targetDrive: targetDrive as TargetDrive,
          type,
          album,
          cursorState: pageParam || startFromDateCursor,
          direction: direction,
        }),

      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage?.results?.length === PAGE_SIZE ? lastPage?.cursorState : undefined,
      enabled: !!targetDrive && album !== 'new' && !disabled,

      staleTime: 1000 * 60 * 10, //10min
    }),
    invalidatePhotosInfinite: (album?: string, type?: 'archive' | 'bin' | 'apps') => {
      const queryKey = ['photos-infinite', targetDrive?.alias, type];
      if (album) queryKey.push(album);

      queryClient.invalidateQueries({ queryKey, exact: false });
    },
  };
};
