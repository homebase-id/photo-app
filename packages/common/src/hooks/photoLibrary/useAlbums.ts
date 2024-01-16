import { useQuery } from '@tanstack/react-query';
import { getAllAlbums } from '../../provider/photos/AlbumProvider';
import { DotYouClient } from '@youfoundation/js-lib/core';

export const useAlbums = (dotYouClient: DotYouClient) => {
  const fetchAllAlbums = async () => {
    return await getAllAlbums(dotYouClient);
  };

  return {
    fetch: useQuery({
      queryKey: ['albums'],
      queryFn: () => fetchAllAlbums(),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }),
  };
};
