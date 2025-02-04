// Hooks for infinte data without meta files
import { useQuery } from '@tanstack/react-query';
import { usePhotosInfinte } from '../photos/usePhotos';
import { TargetDrive } from '@homebase-id/js-lib/core';

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
    type: 'photos',
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

  return useQuery({
    queryKey: ['siblings-range-infinte', targetDrive?.alias, album, fromFileId, toFileId],
    queryFn: getRange,
    enabled: !!photos,
    select: (data) => data.map((dsr) => dsr.fileId),
  });
};
