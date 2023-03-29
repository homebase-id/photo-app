import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveAlbum } from '../../provider/photos/AlbumProvider';
import { AlbumDefinition } from '../../provider/photos/PhotoTypes';
import useAuth from '../auth/useAuth';

const useAlbum = () => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const queryClient = useQueryClient();

  const save = async (albume: AlbumDefinition) => {
    return await saveAlbum(dotYouClient, albume);
  };

  return {
    save: useMutation(save, {
      onMutate(newAlbum) {
        const prevAlbums = queryClient.getQueryData<AlbumDefinition[]>(['albums']);
        queryClient.setQueryData(['albums'], [...(prevAlbums || []), newAlbum]);
      },
      onSettled() {
        queryClient.invalidateQueries(['albums']);
      },
    }),
  };
};

export default useAlbum;
