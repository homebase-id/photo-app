import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { removeAlbumDefintion, saveAlbum } from '../../provider/photos/AlbumProvider';
import { AlbumDefinition, PhotoConfig } from '../../provider/photos/PhotoTypes';
import useAuth from '../auth/useAuth';
import useAlbums from './useAlbums';
import { getAlbumThumbnail } from '../../provider/photos/PhotoProvider';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

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
    fetch: useQuery({
      queryKey: ['album', albumKey],
      queryFn: () => fetch(albumKey),
      enabled: !!albumKey && !!albums,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }),
    save: useMutation({
      mutationFn: save,
      onMutate(newAlbum) {
        const prevAlbums = queryClient.getQueryData<AlbumDefinition[]>(['albums']);
        queryClient.setQueryData(['albums'], [...(prevAlbums || []), newAlbum]);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['albums'] });
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
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
      enabled: !!albumKey,
    }),
    invalidateAlbumCover: (albumKey: string) =>
      queryClient.invalidateQueries({ queryKey: ['album-thumb', albumKey] }),
  };
};

export default useAlbum;
