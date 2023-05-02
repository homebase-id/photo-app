import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { removeAlbumDefintion, saveAlbum } from '../../provider/photos/AlbumProvider';
import { AlbumDefinition, PhotoConfig } from '../../provider/photos/PhotoTypes';
import useAuth from '../auth/useAuth';
import useAlbums from './useAlbums';
import { getAlbumThumbnail } from '../../provider/photos/PhotoProvider';
import { stringGuidsEqual } from '@youfoundation/js-lib';

const useAlbum = (albumKey?: string) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const queryClient = useQueryClient();

  const { data: albums } = useAlbums().fetch;

  const fetch = async (albumKey?: string) => {
    if (!albumKey) return null;

    return albums?.find((album) => album.tag === albumKey) || null;
  };

  const save = async (album: AlbumDefinition) => {
    return await saveAlbum(dotYouClient, album);
  };

  const remove = async (album: AlbumDefinition) => {
    if (!album) return;

    await removeAlbumDefintion(dotYouClient, album);
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
        setTimeout(() => {
          queryClient.invalidateQueries(['albums']);
        }, 100);
      },
    }),
    remove: useMutation(remove, {
      onMutate(toRemoveAlbum) {
        const prevAlbums = queryClient.getQueryData<AlbumDefinition[]>(['albums']);
        queryClient.setQueryData(
          ['albums'],
          [
            ...(prevAlbums?.filter((album) => !stringGuidsEqual(album.tag, toRemoveAlbum.tag)) ||
              []),
          ]
        );
      },
    }),
  };
};

export const useAlbumThumbnail = (albumKey?: string) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const fetch = async (albumKey?: string) => {
    if (!albumKey) return null;
    return getAlbumThumbnail(dotYouClient, PhotoConfig.PhotoDrive, albumKey);
  };

  return {
    fetch: useQuery(['album-thumb', albumKey], () => fetch(albumKey), {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!albumKey,
    }),
  };
};

export default useAlbum;
