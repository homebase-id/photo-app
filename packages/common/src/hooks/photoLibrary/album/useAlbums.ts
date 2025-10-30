import { useQuery } from '@tanstack/react-query';
import { getAllAlbums } from '../../../provider/photos/AlbumProvider';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';
import useTargetDrive from '../../../../../web/src/hooks/drive/useTargetDrive';

export const useAlbums = () => {
  const dotYouClient = useDotYouClientContext();
  const { targetDrive } = useTargetDrive();
  const fetchAllAlbums = async () => await getAllAlbums(dotYouClient, targetDrive);

  return {
    fetch: useQuery({
      queryKey: ['albums'],
      staleTime: 1000 * 60 * 5, // 5 minute
      queryFn: () => fetchAllAlbums(),
    }),
  };
};
