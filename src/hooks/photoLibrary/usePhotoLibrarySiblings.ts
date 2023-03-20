import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { DriveSearchResult, TargetDrive } from '@youfoundation/dotyoucore-js';

const usePhotoLibrarySiblings = ({
  targetDrive,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  photoFileId: string;
}) => {
  const queryClient = useQueryClient();
  const cachedResults = queryClient.getQueryData<
    InfiniteData<{
      results: DriveSearchResult[];
      cursorState: string;
    }>
  >(['photo-library-parts', targetDrive.alias]);

  const flatLib = cachedResults?.pages
    .flatMap((page) => page.results)
    .sort((dsrA, dsrB) => dsrB.fileMetadata.appData.userDate - dsrA.fileMetadata.appData.userDate);

  let nextSibling: DriveSearchResult = undefined;
  let current: DriveSearchResult = undefined;
  let prevSibling: DriveSearchResult = undefined;

  if (flatLib) {
    const index = flatLib.findIndex((dsr) => dsr.fileId === photoFileId);
    if (index !== -1) {
      nextSibling = flatLib[index + 1];
      current = flatLib[index];
      prevSibling = flatLib[index - 1];
    }
  }

  // Todo add support to fetch extra pages in the library...

  return {
    nextSibling,
    current,
    prevSibling,
  };
};

export default usePhotoLibrarySiblings;
