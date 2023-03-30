import { useQuery } from '@tanstack/react-query';
import { getAllAlbums } from '../../provider/photos/AlbumProvider';
import useAuth from '../auth/useAuth';

const useAblums = () => {
  const { getDotYouClient, isAuthenticated } = useAuth();
  const dotYouClient = getDotYouClient();

  const fetchAllAlbums = async () => {
    return await getAllAlbums(dotYouClient);
  };

  return {
    fetch: useQuery(['albums'], () => fetchAllAlbums(), {
      enabled: isAuthenticated,
    }),
  };
};

export default useAblums;
