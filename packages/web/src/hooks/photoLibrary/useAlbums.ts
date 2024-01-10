import { useQuery } from '@tanstack/react-query';
import { getAllAlbums } from '../../provider/photos/AlbumProvider';
import useAuth from '../auth/useAuth';

const useAlbums = () => {
  const { getDotYouClient, isAuthenticated } = useAuth();
  const dotYouClient = getDotYouClient();

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
      enabled: isAuthenticated,
    }),
  };
};

export default useAlbums;
