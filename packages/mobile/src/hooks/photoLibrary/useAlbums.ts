import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllAlbums } from '../../provider/photos/AlbumProvider';
import useAuth from '../auth/useAuth';

const useAlbums = () => {
  const { getDotYouClient, isAuthenticated } = useAuth();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const fetchAllAlbums = async () => {
    return await getAllAlbums(dotYouClient);
  };

  return {
    fetch: useQuery({
      queryKey: ['albums'],
      queryFn: () => fetchAllAlbums(),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      gcTime: 300000,
      enabled: isAuthenticated,
    }),
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['albums'] }),
  };
};

export default useAlbums;
