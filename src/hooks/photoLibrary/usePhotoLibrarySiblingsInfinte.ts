// Hooks for infinte data without meta files
import { useQuery } from '@tanstack/react-query';
import { usePhotosInfinte } from './usePhotos';
import { TargetDrive } from '@youfoundation/js-lib';

export const usePhotoLibrarySiblingsInfinite = ({
  targetDrive,
  album,
  photoFileId,
}: {
  targetDrive: TargetDrive;
  album?: string;
  photoFileId: string;
}) => {
  const { data: photos } = usePhotosInfinte({
    targetDrive: targetDrive,
    album: album,
  }).fetchPhotos;

  const flatPhotos = photos?.pages.flatMap((page) => page.results) ?? [];

  const currentIndex = flatPhotos.findIndex((photo) => photo.fileId === photoFileId);
  const current = flatPhotos[currentIndex];
  const nextSibling = flatPhotos[currentIndex + 1];
  const prevSibling = flatPhotos[currentIndex - 1];

  return {
    current,
    nextSibling,
    prevSibling,
  };
};

export const useSiblingsRangeInfinte = ({
  targetDrive,
  album,
  fromFileId,
  toFileId,
}: {
  targetDrive: TargetDrive;
  album?: string;
  fromFileId?: string;
  toFileId?: string;
}) => {
  const { data: photos } = usePhotosInfinte({
    targetDrive: targetDrive,
    album: album,
  }).fetchPhotos;

  const getRange = async () => {
    const flatPhotos = photos?.pages.flatMap((page) => page.results) ?? [];
    const fromIndex = flatPhotos.findIndex((photo) => photo.fileId === fromFileId);
    const toIndex = flatPhotos.findIndex((photo) => photo.fileId === toFileId);

    if (fromIndex === -1 || toIndex === -1) {
      return [];
    }

    return flatPhotos.slice(fromIndex, toIndex + 1);
  };

  return useQuery(
    ['siblings-range-infinte', targetDrive?.alias, album, fromFileId, toFileId],
    getRange,
    {
      enabled: !!photos,
      select: (data) => data.map((dsr) => dsr.fileId),
    }
  );
};
