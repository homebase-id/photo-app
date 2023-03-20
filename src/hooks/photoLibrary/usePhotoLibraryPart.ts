import { useInfiniteQuery } from '@tanstack/react-query';
import {
  TargetDrive,
  ApiType,
  DotYouClient,
  getPhotoLibrary,
  DriveSearchResult,
} from '@youfoundation/dotyoucore-js';
import useAuth from '../auth/useAuth';

export interface usePhotoLibraryPartReturn {
  results: DriveSearchResult[];
  cursorState: string;
}

const usePhotoLibraryPart = ({
  targetDrive,
  pageSize,
}: {
  targetDrive: TargetDrive;
  pageSize: number;
}) => {
  const { getDotYouClient } = useAuth();

  const dotYouClient = getDotYouClient();

  const fetchLibraryPart = async ({
    targetDrive,
    cursorState,
  }: {
    targetDrive: TargetDrive;
    cursorState?: string;
  }): Promise<usePhotoLibraryPartReturn> => {
    return await getPhotoLibrary(dotYouClient, targetDrive, pageSize, cursorState);
  };

  return {
    fetchLibraryPart: useInfiniteQuery(
      ['photo-library-parts', targetDrive.alias],
      ({ pageParam }) => fetchLibraryPart({ targetDrive, cursorState: pageParam }),
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
