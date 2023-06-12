import { InfiniteData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TargetDrive,
  DriveSearchResult,
  DotYouClient,
  CursoredResult,
} from '@youfoundation/js-lib/core';
import { buildCursor, createDateObject, getPhotos } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';
import usePhotoLibrary from './usePhotoLibrary';
import { PhotoConfig } from '../../provider/photos/PhotoTypes';
import { useFlatMonthsFromMeta } from './usePhotoLibraryRange';
import { useState } from 'react';

export type useInfintePhotosReturn = { results: DriveSearchResult[]; cursorState?: string };

// TODO: Decrease page size to 100
const PAGE_SIZE = 100;

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
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 2, 0);
  const beginOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

  const dateCursor = buildCursor(endOfMonth.getTime(), beginOfMonth.getTime());
  const results = await getPhotos(
    dotYouClient,
    targetDrive,
    type,
    undefined, // album
    PAGE_SIZE,
    cursorState || dateCursor
  );

  const filteredResults = results.results.filter((result) => {
    const userDate = new Date(result.fileMetadata.appData.userDate || result.fileMetadata.created);
    if (userDate.getFullYear() === date.getFullYear() && userDate.getMonth() === date.getMonth())
      return true;
    else return false;
  });

  filteredResults.sort(sortDsrFunction);

  return { results: filteredResults, cursorState: results.cursorState };
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
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  return {
    fetchPhotos: useInfiniteQuery(
      ['photos', targetDrive?.alias, type, date && `${date.getFullYear()}-${date.getMonth()}`],
      async ({ pageParam }) => {
        const result = await fetchPhotosByMonth({
          dotYouClient,
          targetDrive: targetDrive as TargetDrive,
          type,
          date: date as Date,
          cursorState: pageParam,
        });
        queryClient.invalidateQueries(['flat-photos', targetDrive?.alias, type]);
        return result;
      },
      {
        getNextPageParam: (lastPage) =>
          (lastPage?.results?.length >= PAGE_SIZE && lastPage?.cursorState) ?? undefined,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        enabled: !!targetDrive && !!date,
        onError: (err) => console.error(err),

        staleTime: 10 * 60 * 1000, // 10min => react query will fire a background refetch after this time; (Or if invalidated manually after an update)
        cacheTime: Infinity, // Never => react query will never remove the data from the cache
      }
    ),
  };
};

export const useFlatPhotosByMonth = ({
  targetDrive,
  album,
  type,
  date,
}: {
  targetDrive?: TargetDrive;
  album?: string;
  type?: 'archive' | 'bin' | 'apps' | 'favorites';
  date?: Date;
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  const { data: currentMonthData } = usePhotosByMonth({
    targetDrive,
    type,
    date: date,
  }).fetchPhotos;

  // const makeMonthsCacheFlat = (type?: 'archive' | 'bin' | 'apps' | 'favorites') => {
  //   const dsrsPerMonth = queryClient
  //     .getQueryCache()
  //     .findAll(['photos', targetDrive?.alias, type])
  //     .map((query) => {
  //       const queryKey = query.queryKey;
  //       const queryData = queryClient.getQueryData<InfiniteData<useInfintePhotosReturn>>(queryKey);

  //       return queryData?.pages?.flatMap((page) => page.results) ?? [];
  //     });

  //   return dsrsPerMonth
  //     .flat()
  //     .sort(
  //       (a, b) =>
  //         (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
  //         (a.fileMetadata.appData.userDate || a.fileMetadata.created)
  //     );
  // };

  return {
    fetchPhotos: useInfiniteQuery(
      ['flat-photos', targetDrive?.alias, type, album, date?.getTime()],
      () => currentMonthData?.pages?.[currentPage],
      {
        getNextPageParam: (lastPage) =>
          (lastPage?.results?.length &&
            lastPage?.results?.length >= PAGE_SIZE &&
            lastPage?.cursorState) ??
          undefined,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        enabled: !!targetDrive && album !== 'new' && !!date,
        onError: (err) => console.error(err),
        staleTime: 0,
        cacheTime: Infinity,
      }
    ),
  };
};

// query SiblingMonths of a date
// export const useSiblingPhotosOfMonths = ({
//   targetDrive,
//   type,
//   currentDate,
// }: {
//   targetDrive: TargetDrive;
//   type?: 'archive' | 'bin' | 'apps' | 'favorites';
//   currentDate?: Date;
// }) => {
//   const { data: flatMonths } = useFlatMonthsFromMeta({
//     targetDrive,
//     type,
//   });

//   // Ensure current month is fetched
//   usePhotosByMonth({
//     targetDrive,
//     type,
//     date: currentDate,
//   }).fetchPhotos;

//   const currentMonth =
//     flatMonths?.findIndex(
//       (flatDay) =>
//         flatDay.year === currentDate?.getFullYear() && flatDay.month === currentDate?.getMonth() + 1
//     ) || 0;

//   const nextMonth = flatMonths?.[currentMonth + 1];
//   const prevMonth = flatMonths?.[currentMonth - 1];

//   // Needs to be fetched til the end...? Or just the next one?
//   usePhotosByMonth({
//     targetDrive,
//     type,
//     date: prevMonth ? createDateObject(prevMonth.year, prevMonth.month) : undefined,
//   }).fetchPhotos;

//   usePhotosByMonth({
//     targetDrive,
//     type,
//     date: nextMonth ? createDateObject(nextMonth.year, nextMonth.month) : undefined,
//   }).fetchPhotos;
// };

export const usePhotosInfinte = ({
  targetDrive,
  album,
  type,
  startFromDate,
  direction,
}: {
  targetDrive?: TargetDrive;
  album?: string;
  type?: 'archive' | 'bin' | 'apps' | 'favorites';
  startFromDate?: Date;
  direction?: 'older' | 'newer';
}) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const startFromDateCursor = startFromDate ? buildCursor(startFromDate.getTime()) : undefined;

  return {
    fetchPhotos: useInfiniteQuery(
      ['photos-infinite', targetDrive?.alias, type, album, startFromDate?.getTime()],
      ({ pageParam }) =>
        fetchPhotosByCursor({
          dotYouClient,
          targetDrive: targetDrive as TargetDrive,
          type,
          album,
          cursorState: pageParam || startFromDateCursor,
          direction: direction,
        }),
      {
        getNextPageParam: (lastPage) =>
          (lastPage?.results?.length === PAGE_SIZE && lastPage?.cursorState) ?? undefined,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        enabled: !!targetDrive && album !== 'new',
        onError: (err) => console.error(err),

        staleTime: 10 * 60 * 1000, // 10min => react query will fire a background refetch after this time; (Or if invalidated manually after an update)
        cacheTime: Infinity, // Never => react query will never remove the data from the cache
      }
    ),
  };
};
