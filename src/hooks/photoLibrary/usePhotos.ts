import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  TargetDrive,
  DriveSearchResult,
  DotYouClient,
  CursoredResult,
} from '@youfoundation/js-lib';
import { buildCursor, getPhotos } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';

export type usePhotosReturn = DriveSearchResult[];

const PAGE_SIZE = 100;

export const sortDsrFunction = (a: DriveSearchResult, b: DriveSearchResult) => {
  const aDate = a.fileMetadata.appData.userDate || a.fileMetadata.created;
  const bDate = b.fileMetadata.appData.userDate || b.fileMetadata.created;
  return bDate - aDate;
};

export const fetchPhotosByDate = async ({
  dotYouClient,
  targetDrive,
  album,
  date,
}: {
  dotYouClient: DotYouClient;
  targetDrive: TargetDrive;
  album?: string;
  date: Date;
}): Promise<usePhotosReturn> => {
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const cursorState = buildCursor(endOfMonth.getTime());
  const results = await getPhotos(dotYouClient, targetDrive, album, PAGE_SIZE, cursorState);

  const filteredResults = results.results.filter((result) => {
    const userDate = new Date(result.fileMetadata.appData.userDate || result.fileMetadata.created);
    if (
      userDate.getFullYear() === date.getFullYear() &&
      userDate.getMonth() === date.getMonth() &&
      userDate.getDate() === date.getDate()
    )
      return true;
    else return false;
  });

  filteredResults.sort(sortDsrFunction);

  return filteredResults;
};

export const fetchPhotosByCursor = async ({
  dotYouClient,
  targetDrive,
  album,
  cursorState,
}: {
  dotYouClient: DotYouClient;
  targetDrive: TargetDrive;
  album?: string;
  cursorState?: string;
}): Promise<CursoredResult<usePhotosReturn>> => {
  return await getPhotos(dotYouClient, targetDrive, album, PAGE_SIZE, cursorState);
};

export const usePhotosByDate = ({
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
    fetchPhotos: useQuery(
      [
        'photos',
        targetDrive?.alias,
        album,
        date && `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      ],
      () =>
        fetchPhotosByDate({
          dotYouClient,
          targetDrive: targetDrive as TargetDrive,
          album,
          date: date as Date,
        }),
      {
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
}: {
  targetDrive?: TargetDrive;
  album?: string;
}) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  return {
    fetchPhotos: useInfiniteQuery(
      ['photos-infinite', targetDrive?.alias, album],
      ({ pageParam }) =>
        fetchPhotosByCursor({
          dotYouClient,
          targetDrive: targetDrive as TargetDrive,
          album,
          cursorState: pageParam,
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
