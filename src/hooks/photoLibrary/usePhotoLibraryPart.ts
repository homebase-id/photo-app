import { useInfiniteQuery } from '@tanstack/react-query';
import { TargetDrive, DriveSearchResult } from '@youfoundation/dotyoucore-js';
import { getPhotoLibrary } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';

export interface usePhotoLibraryPartReturn {
  results: DriveSearchResult[];
  cursorState: string;
}

const usePhotoLibraryPart = ({
  targetDrive,
  album,
  pageSize,
}: {
  targetDrive: TargetDrive;
  album?: string;
  pageSize: number;
}) => {
  const { getDotYouClient } = useAuth();

  const dotYouClient = getDotYouClient();

  const fetchLibraryPart = async ({
    targetDrive,
    album,
    cursorState,
  }: {
    targetDrive: TargetDrive;
    album?: string;
    cursorState?: string;
  }): Promise<usePhotoLibraryPartReturn> => {
    return await getPhotoLibrary(dotYouClient, targetDrive, album, pageSize, cursorState);
  };

  return {
    fetchLibraryPart: useInfiniteQuery(
      ['photo-library-parts', targetDrive.alias, album],
      ({ pageParam }) => fetchLibraryPart({ targetDrive, album, cursorState: pageParam }),
      {
        getNextPageParam: (lastPage) =>
          (lastPage?.results?.length === pageSize && lastPage?.cursorState) ?? undefined,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        enabled: !!targetDrive,
        onError: (err) => console.error(err),
      }
    ),
  };
};

export default usePhotoLibraryPart;
