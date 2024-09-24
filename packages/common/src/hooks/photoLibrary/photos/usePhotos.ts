import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { TargetDrive, HomebaseFile, DotYouClient, CursoredResult } from '@homebase-id/js-lib/core';
import { createDateObject, getPhotos } from '../../../provider/photos/PhotoProvider';
import { useFlatMonthsFromMeta } from '../library/usePhotoLibraryRange';
import { getQueryBatchCursorFromTime } from '@homebase-id/js-lib/helpers';
import { LibraryType, PhotoConfig } from '../../../provider';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';

export type useInfintePhotosReturn = CursoredResult<HomebaseFile[]>;
const PAGE_SIZE = 1000;

export const sortDsrFunction = (a: HomebaseFile, b: HomebaseFile) => {
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
  type: LibraryType;
  date: Date;
  cursorState?: string;
}): Promise<CursoredResult<HomebaseFile[]>> => {
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
  type: LibraryType;
  album?: string;
  cursorState?: string;
  direction?: 'older' | 'newer';
}): Promise<CursoredResult<HomebaseFile[]>> => {
  return await getPhotos(dotYouClient, targetDrive, type, album, PAGE_SIZE, cursorState, direction);
};

// Directional infinite query of photos, for a given month
// Eg: Used by photos overview, to render per month
export const usePhotosByMonth = ({
  targetDrive,
  type,
  date,
}: {
  targetDrive?: TargetDrive;
  type: LibraryType;
  date?: Date;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  return {
    fetchPhotos: useInfiniteQuery({
      queryKey: [
        'photos',
        targetDrive?.alias,
        type,
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
      // refetchOnMount: false,
      enabled: !!targetDrive && !!date,
      staleTime: 1000 * 60 * 10, // 10min => react query will fire a background refetch after this time; (Or if invalidated manually after an update)
    }),
    invalidateQueries: (type: LibraryType) => {
      queryClient.invalidateQueries({
        queryKey: ['photos', PhotoConfig.PhotoDrive.alias, type],
        exact: false,
      });
    },
  };
};

// Directional infinite query of photos, starting with a given month
// Eg: Used by photo albums, to render all their photos; Or mobile photo preview because of the double flatLists
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
  type: LibraryType;
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
    invalidatePhotosInfinite: (album: string | undefined, type: LibraryType) => {
      const queryKey = ['photos-infinite', targetDrive?.alias, type];
      if (album) queryKey.push(album);

      queryClient.invalidateQueries({ queryKey, exact: false });
    },
  };
};

// Bi-directional infinite query of flat photos, starting from an exact given date
// Eg: Used by photo preview, to render individual photos with siblings directly available
export const useFlatPhotosByMonth = ({
  targetDrive,
  type,
  date,
}: {
  targetDrive: TargetDrive;
  type: LibraryType;
  date?: Date;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const { data: flatMonths } = useFlatMonthsFromMeta({
    targetDrive,
    type,
  });

  // Cache key is the starting point (first Photo month that was openend)
  return {
    fetchPhotos: useInfiniteQuery({
      queryKey: ['flat-photos', targetDrive?.alias, type],
      queryFn: async ({ pageParam }) => {
        const pageParamAsDate =
          pageParam instanceof Date
            ? pageParam
            : typeof pageParam === 'string'
              ? (!isNaN(new Date(pageParam) as any) && new Date(pageParam)) || undefined
              : undefined;

        const pageDateParam = pageParamAsDate instanceof Date ? pageParamAsDate : undefined;
        const cursorState = pageParamAsDate instanceof Date ? undefined : (pageParam as string);

        const dateParam = pageDateParam || (date as Date);
        const currentData = await queryClient.fetchInfiniteQuery({
          queryKey: [
            'photos',
            targetDrive?.alias,
            type,
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
          results: currentData?.pages?.flatMap((page) => page?.results) || [],
          // Pass cursorState of the last page of this month, but only if there is a next page
          cursorState:
            currentData?.pages[currentData?.pages?.length - 1]?.results?.length >= PAGE_SIZE
              ? currentData?.pages[currentData?.pages?.length - 1].cursorState
              : undefined,
          prevMonth: prevMonth,
          nextMonth: nextMonth,
        };
      },
      initialPageParam: undefined as string | Date | undefined,
      enabled: !!flatMonths && !!targetDrive && !!date,
      getPreviousPageParam: (firstPage) => {
        // TODO: Check if we need something special here to fetch them reverted? And support pages inside of the months (not only a page per month)
        if (firstPage?.prevMonth) {
          return createDateObject(firstPage.prevMonth?.year, firstPage.prevMonth?.month);
        }
        return undefined;
      },
      getNextPageParam: (lastPage) => {
        if (lastPage?.cursorState) {
          return lastPage.cursorState;
        } else if (lastPage?.nextMonth) {
          return createDateObject(lastPage.nextMonth?.year, lastPage.nextMonth?.month);
        }
        return undefined;
      },
      gcTime: Infinity,
      // We don't cache as the source data has a 10min stale time already
      staleTime: 0,
    }),
  };
};
