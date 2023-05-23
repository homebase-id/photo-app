import { useInfiniteQuery } from '@tanstack/react-query';
import {
  TargetDrive,
  DriveSearchResult,
  DotYouClient,
  CursoredResult,
} from '@youfoundation/js-lib';
import { buildCursor, getPhotos } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';

export type useInfintePhotosReturn = { results: DriveSearchResult[]; cursorState?: string };

const PAGE_SIZE = 100;

export const sortDsrFunction = (a: DriveSearchResult, b: DriveSearchResult) => {
  const aDate = a.fileMetadata.appData.userDate || a.fileMetadata.created;
  const bDate = b.fileMetadata.appData.userDate || b.fileMetadata.created;
  return bDate - aDate;
};

export const fetchPhotosByMonth = async ({
  dotYouClient,
  targetDrive,
  album,
  date,
  cursorState,
}: {
  dotYouClient: DotYouClient;
  targetDrive: TargetDrive;
  album?: string;
  date: Date;
  cursorState?: string;
}): Promise<useInfintePhotosReturn> => {
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const beginOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

  const dateCursor = buildCursor(endOfMonth.getTime(), beginOfMonth.getTime());
  const results = await getPhotos(
    dotYouClient,
    targetDrive,
    album,
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
  album,
  cursorState,
  direction,
}: {
  dotYouClient: DotYouClient;
  targetDrive: TargetDrive;
  album?: string;
  cursorState?: string;
  direction?: 'older' | 'newer';
}): Promise<CursoredResult<DriveSearchResult[]>> => {
  return await getPhotos(dotYouClient, targetDrive, album, PAGE_SIZE, cursorState, direction);
};

export const usePhotosByMonth = ({
  targetDrive,
  album,
  date,
}: {
  targetDrive?: TargetDrive;
  album?: string;
  date?: Date;
}) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  return {
    fetchPhotos: useInfiniteQuery(
      ['photos', targetDrive?.alias, album, date && `${date.getFullYear()}-${date.getMonth()}}`],
      ({ pageParam }) =>
        fetchPhotosByMonth({
          dotYouClient,
          targetDrive: targetDrive as TargetDrive,
          album,
          date: date as Date,
          cursorState: pageParam,
        }),
      {
        getNextPageParam: (lastPage) =>
          (lastPage?.results?.length >= PAGE_SIZE && lastPage?.cursorState) ?? undefined,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        enabled: !!targetDrive && !!date,
        onError: (err) => console.error(err),
      }
    ),
  };
};

export const usePhotosInfinte = ({
  targetDrive,
  album,
  startFromDate,
  direction,
}: {
  targetDrive?: TargetDrive;
  album?: string;
  startFromDate?: Date;
  direction?: 'older' | 'newer';
}) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const startFromDateCursor = startFromDate ? buildCursor(startFromDate.getTime()) : undefined;

  return {
    fetchPhotos: useInfiniteQuery(
      ['photos-infinite', targetDrive?.alias, album, startFromDate?.getTime()],
      ({ pageParam }) =>
        fetchPhotosByCursor({
          dotYouClient,
          targetDrive: targetDrive as TargetDrive,
          album,
          cursorState: pageParam || startFromDateCursor,
          direction: direction,
        }),
      {
        getNextPageParam: (lastPage) =>
          (lastPage?.results?.length === PAGE_SIZE && lastPage?.cursorState) ?? undefined,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        enabled: !!targetDrive,
        onError: (err) => console.error(err),
      }
    ),
  };
};
