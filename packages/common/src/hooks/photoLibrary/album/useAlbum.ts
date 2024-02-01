import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { removeAlbumDefintion, saveAlbum } from '../../../provider/photos/AlbumProvider';
import { AlbumDefinition, PhotoConfig } from '../../../provider/photos/PhotoTypes';
import { useAlbums } from './useAlbums';
import { getAlbumThumbnail } from '../../../provider/photos/PhotoProvider';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';

export const useAlbum = (albumKey?: string) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetchAlbums = useAlbums().fetch;

  const save = async (album: AlbumDefinition) => {
    await saveAlbum(dotYouClient, album);
    return album;
  };

  const remove = async (album: AlbumDefinition) => {
    if (!album.fileId) throw new Error('Album has no fileId');
    await removeAlbumDefintion(dotYouClient, album);
  };

  return {
    fetch: {
      ...fetchAlbums,
      data: fetchAlbums.data?.find((album) => album.tag === albumKey) || null,
    },
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
  const dotYouClient = useDotYouClientContext();
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
      staleTime: 1000 * 60 * 60 * 1, // 1 hours
      enabled: !!albumKey,
    }),
    invalidateAlbumCover: (albumKey: string) =>
      queryClient.invalidateQueries({ queryKey: ['album-thumb', albumKey] }),
  };
};
