import { useQuery } from '@tanstack/react-query';
import { getAllAlbums } from '../../provider/photos/AlbumProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export const useAlbums = () => {
  const dotYouClient = useDotYouClientContext();
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
