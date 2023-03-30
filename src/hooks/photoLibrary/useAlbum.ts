import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { saveAlbum } from '../../provider/photos/AlbumProvider';
import { AlbumDefinition } from '../../provider/photos/PhotoTypes';
import useAuth from '../auth/useAuth';
import useAlbums from './useAlbums';

const useAlbum = (albumKey?: string) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const queryClient = useQueryClient();

  const { data: albums } = useAlbums().fetch;

  const fetch = async (albumKey?: string) => {
    if (!albumKey) return null;

    return albums?.find((album) => album.tag === albumKey) || null;
  };

  const save = async (albume: AlbumDefinition) => {
    return await saveAlbum(dotYouClient, albume);
  };

  return {
    fetch: useQuery(['album', albumKey], () => fetch(albumKey), {
      enabled: !!albumKey && !!albums,
    }),
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
