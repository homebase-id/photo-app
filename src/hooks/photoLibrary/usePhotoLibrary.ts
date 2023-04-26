import { TargetDrive } from '@youfoundation/js-lib';
import { getPhotoLibrary } from '../../provider/photos/PhotoProvider';
import useAuth from '../auth/useAuth';
import { useQuery } from '@tanstack/react-query';

const usePhotoLibrary = ({ targetDrive, album }: { targetDrive: TargetDrive; album?: string }) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const fetch = async (album?: string) => {
    return (await getPhotoLibrary(dotYouClient, targetDrive, album, 1200, undefined)).results;
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
