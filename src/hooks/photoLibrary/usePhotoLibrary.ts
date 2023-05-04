import { TargetDrive } from '@youfoundation/js-lib';
import { getPhotoLibrary } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { buildMetaStructure, sortRecents } from './usePhotoLibraryPart';

const usePhotoLibrary = ({ targetDrive, album }: { targetDrive: TargetDrive; album?: string }) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const fetch = async (album?: string) => {
    // TODO Move into cached meta file on server
    const fullLib = (await getPhotoLibrary(dotYouClient, targetDrive, album, 1200, undefined))
      .results;

    const libStruc = buildMetaStructure(fullLib);
    const totalPhotos = fullLib.length;
    const photoWeight = 100 / totalPhotos;

    const years = sortRecents(Object.keys(libStruc));
    const yearsWithMonths = years.map((year) => {
      const months = Object.keys(libStruc[year]);
      return {
        year: year,
        months: sortRecents(months).map((month) => {
          const days = Object.keys(libStruc[year][month]);

          return {
            month,
            photos: days.flatMap((day) => {
              return libStruc[year][month][day];
            }).length,
          };
        }),
      };
    });

    return { yearsWithMonths, photoWeight };
  };

  return {
    fetchLibrary: useQuery(['photo-library', targetDrive.alias, album], () => fetch(album), {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!targetDrive,
      onError: (err) => console.error(err),
    }),
  };
};

export default usePhotoLibrary;
