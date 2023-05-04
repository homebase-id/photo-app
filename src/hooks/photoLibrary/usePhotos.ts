import { useQuery } from '@tanstack/react-query';
import { TargetDrive, DriveSearchResult } from '@youfoundation/js-lib';
import { buildCursor, getPhotoLibrary } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';

export type usePhotosReturn = DriveSearchResult[];

const PAGE_SIZE = 100;

export const usePhotos = ({
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

  const fetchPhotos = async ({
    targetDrive,
    album,
    date,
  }: {
    targetDrive: TargetDrive;
    album?: string;
    date: Date;
  }): Promise<usePhotosReturn> => {
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const cursorState = buildCursor(endOfMonth.getTime());
    const results = await getPhotoLibrary(dotYouClient, targetDrive, album, PAGE_SIZE, cursorState);

    const filteredResults = results.results.filter((result) => {
      const userDate = new Date(
        result.fileMetadata.appData.userDate || result.fileMetadata.created
      );
      if (
        userDate.getFullYear() === date.getFullYear() &&
        userDate.getMonth() === date.getMonth() &&
        userDate.getDate() === date.getDate()
      )
        return true;
      else return false;
    });

    filteredResults.sort((a, b) => {
      const aDate = a.fileMetadata.appData.userDate || a.fileMetadata.created;
      const bDate = b.fileMetadata.appData.userDate || b.fileMetadata.created;
      return bDate - aDate;
    });

    return filteredResults;
  };

  return {
    fetchPhotos: useQuery(
      [
        'photos',
        targetDrive?.alias,
        album,
        date && `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      ],
      () => fetchPhotos({ targetDrive: targetDrive as TargetDrive, album, date: date as Date }),
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        enabled: !!targetDrive && !!date,
        onError: (err) => console.error(err),
      }
    ),
  };
};
