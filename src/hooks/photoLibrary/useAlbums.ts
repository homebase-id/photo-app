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
    fetch: useQuery(['albums'], () => fetchAllAlbums(), {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      cacheTime: 300000,
      enabled: isAuthenticated,
    }),
  };
};

export default useAlbums;
