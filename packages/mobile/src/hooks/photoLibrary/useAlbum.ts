import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlbumDefinition, PhotoConfig } from '../../provider/photos/PhotoTypes';
import useAlbums from './useAlbums';
import { getAlbumThumbnail } from '../../provider/photos/PhotoProvider';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { removeAlbumDefintion, saveAlbum } from '../../provider/photos/AlbumProvider';
import useAuth from '../auth/useAuth';

export const useAlbum = (albumKey?: string) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const queryClient = useQueryClient();

  const {
    fetch: { data: albums },
    invalidate,
  } = useAlbums();

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
    fetch: useQuery({
      queryKey: ['album', albumKey],
      queryFn: () => fetch(albumKey),
      enabled: !!albumKey && !!albums,
    }),
    save: useMutation({
      mutationFn: save,
      onMutate(newAlbum) {
        const prevAlbums = queryClient.getQueryData<AlbumDefinition[]>(['albums']);
        queryClient.setQueryData(['albums'], [...(prevAlbums || []), newAlbum]);
      },
      onSettled: () => {
        setTimeout(() => invalidate(), 100);
      },
    }),
    remove: useMutation({
      mutationFn: remove,
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
  const queryClient = useQueryClient();

  const fetch = async (albumKey?: string) => {
    if (!albumKey) return null;
    return getAlbumThumbnail(dotYouClient, PhotoConfig.PhotoDrive, albumKey);
  };

  return {
    fetch: useQuery({
      queryKey: ['album-thumb', albumKey],
      queryFn: () => fetch(albumKey),
      enabled: !!albumKey,
    }),
    invalidateAlbumCover: (albumKey: string) =>
      queryClient.invalidateQueries({ queryKey: ['album-thumb', albumKey] }),
  };
};
