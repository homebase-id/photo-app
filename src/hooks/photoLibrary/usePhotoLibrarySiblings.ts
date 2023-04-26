import { DriveSearchResult, TargetDrive } from '@youfoundation/js-lib';
import usePhotoLibraryPart from './usePhotoLibraryPart';

const usePhotoLibrarySiblings = ({
  targetDrive,
  album,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  album?: string;
  photoFileId: string;
}) => {
  const {
    data: cachedResults,
    hasNextPage,
    fetchNextPage,
  } = usePhotoLibraryPart({
    targetDrive,
    album,
    pageSize: 50,
  }).fetchLibraryPart;

  const flatLib = cachedResults?.pages
    .flatMap((page) => page.results)
    .sort(
      (dsrA, dsrB) =>
        (dsrB.fileMetadata.appData.userDate || dsrB.fileMetadata.created || 0) -
        (dsrA.fileMetadata.appData.userDate || dsrA.fileMetadata.created || 0)
    );

  let nextSibling: DriveSearchResult | undefined = undefined;
  let current: DriveSearchResult | undefined = undefined;
  let prevSibling: DriveSearchResult | undefined = undefined;

  if (flatLib) {
    const index = flatLib.findIndex((dsr) => dsr.fileId === photoFileId);
    if (index !== -1) {
      nextSibling = flatLib[index + 1];
      current = flatLib[index];
      prevSibling = flatLib[index - 1];
    }
  }

  if (!nextSibling && hasNextPage) {
    fetchNextPage();
  }

  return {
    nextSibling,
    current,
    prevSibling,
  };
};

export default usePhotoLibrarySiblings;
