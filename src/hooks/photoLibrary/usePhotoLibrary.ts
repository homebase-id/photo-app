import { DriveSearchResult, TargetDrive } from '@youfoundation/js-lib';
import { getPhotoLibrary } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';
import { useQuery } from '@tanstack/react-query';

export const sortRecents = (elements: string[]) =>
  elements.sort((a, b) => parseInt(b) - parseInt(a));

export const buildMetaStructure = (headers: DriveSearchResult[]) => {
  // Filter duplicates:
  headers = headers.reduce((curVal, head) => {
    if (!curVal.find((h) => h.fileId === head.fileId)) return [...curVal, head];
    else return curVal;
  }, [] as DriveSearchResult[]);

  return headers.reduce((curVal, head) => {
    const currDate = new Date(head.fileMetadata.appData.userDate || head.fileMetadata.created);
    const year = currDate.getFullYear();
    const month = currDate.getMonth() + 1;
    const day = currDate.getDate();

    const returnObj = { ...curVal };
    returnObj[year] = {
      ...returnObj[year],
    };
    returnObj[year][month] = {
      ...returnObj[year][month],
    };

    returnObj[year][month][day] = returnObj[year][month][day]
      ? [...returnObj[year][month][day], head]
      : [head];

    return returnObj;
  }, {} as Record<string, Record<string, Record<string, DriveSearchResult[]>>>);
};

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
        year: parseInt(year),
        months: sortRecents(months).map((month) => {
          const days = Object.keys(libStruc[year][month]);

          return {
            month: parseInt(month),
            days: sortRecents(days).map((day) => ({
              day: parseInt(day),
              photosThisDay: libStruc[year][month][day].length,
            })),
            photosThisMonth: days.flatMap((day) => {
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
      enabled: !!targetDrive && album !== 'new',
      onError: (err) => console.error(err),
    }),
  };
};

export default usePhotoLibrary;
