import { FetchNextPageOptions, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { TargetDrive, DriveSearchResult } from '@youfoundation/js-lib';
import { getPhotoLibrary } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';

export interface usePhotoLibraryPartReturn {
  results: DriveSearchResult[];
  cursorState: string;
}

const PAGE_SIZE = 50;

const usePhotoLibraryPart = ({
  targetDrive,
  album,
}: {
  targetDrive: TargetDrive;
  album?: string;
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
    return await getPhotoLibrary(dotYouClient, targetDrive, album, PAGE_SIZE, cursorState);
  };

  return {
    fetchLibraryPart: useInfiniteQuery(
      ['photo-library-parts', targetDrive.alias, album],
      ({ pageParam }) => fetchLibraryPart({ targetDrive, album, cursorState: pageParam }),
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

export const usePhotoLibraryHigherLevel = ({
  album,
  targetDrive,
}: {
  album?: string;
  targetDrive: TargetDrive;
}) => {
  const queryClient = useQueryClient();

  const {
    data: photoLibraryPart,
    hasNextPage: hasMorePhotos,
    fetchNextPage,
    isFetchingNextPage,
  } = usePhotoLibraryPart({
    targetDrive,
    album: album && album !== 'new' ? album : undefined,
  }).fetchLibraryPart;

  const photoLibrary = photoLibraryPart
    ? buildMetaStructure(photoLibraryPart.pages.flatMap((page) => page.results))
    : undefined;

  const years = photoLibrary ? sortRecents(Object.keys(photoLibrary)) : undefined;
  const monthsToShow = photoLibrary
    ? years?.flatMap((year) =>
        sortRecents(Object.keys(photoLibrary[year])).map((month) => {
          return { monthDate: { year, month }, days: photoLibrary[year][month] };
        })
      )
    : undefined;

  const flatPhotos = monthsToShow?.flatMap((month) =>
    sortRecents(Object.keys(month.days)).flatMap((day) => month.days[day])
  );

  return {
    photoLibrary,
    monthsToShow,
    flatPhotos,

    fetchDirectPage: (options: FetchNextPageOptions) => {
      fetchNextPage(options);
    },

    hasMorePhotos,
    fetchNextPage,
    isFetchingNextPage,
  };
};

export default usePhotoLibraryPart;
