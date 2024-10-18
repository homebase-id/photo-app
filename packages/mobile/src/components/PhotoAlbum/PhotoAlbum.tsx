import {
  Alert,
  Button,
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  View,
} from 'react-native';
import { Text } from '../ui/Text/Text';
import { PhotoItem } from '../Photos/PhotoDay/PhotoDay';
import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAlbum, usePhotosInfinte, PhotoConfig } from 'photo-app-common';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal/Modal';
import { Input } from '../ui/Form/Input';
import { Colors } from '../../app/Colors';
import { addError } from '../../hooks/errors/useErrors';
import { HomebaseFile } from '@homebase-id/js-lib/core';

const PREFFERED_IMAGE_SIZE = 90;
const targetDrive = PhotoConfig.PhotoDrive;

const RENDERED_PAGE_SIZE = 32;
const PhotoAlbum = ({
  albumKey,
  toggleSelection,
  isSelecting,
  clearingSelection,
}: {
  albumKey?: string;
  toggleSelection: (fileId: string) => Promise<boolean>;
  isSelecting?: boolean;
  clearingSelection?: number;
}) => {
  const queryClient = useQueryClient();

  const {
    data: photos,
    hasNextPage: hasMorePhotos,
    fetchNextPage,
    isFetchingNextPage,
    refetch: refetchPhotos,
  } = usePhotosInfinte({
    targetDrive: PhotoConfig.PhotoDrive,
    album: albumKey,
    type: 'photos',
  }).fetchPhotos;
  const flatPhotos = photos?.pages.flatMap((page) => page.results) ?? [];

  const [refreshing, setRefreshing] = useState(false);
  const doRefresh = async () => {
    setRefreshing(true);

    queryClient.invalidateQueries();

    // Refetch photos;
    await refetchPhotos();
    setRefreshing(false);
  };

  const windowSize = Dimensions.get('window');
  const numColums = Math.round(windowSize.width / PREFFERED_IMAGE_SIZE);
  const size = Math.round(windowSize.width / numColums);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<HomebaseFile<string>>) => (
      <View
        key={item.fileId}
        style={{
          width: size,
          height: size,
          padding: 1,
        }}
      >
        <PhotoItem
          type="photos"
          targetDrive={targetDrive}
          photoDsr={item}
          key={item.fileId}
          toggleSelection={toggleSelection}
          isSelecting={isSelecting}
          clearingSelection={clearingSelection}
          size={size - 2} // -2 for the gap
        />
      </View>
    ),
    [size, toggleSelection, isSelecting, clearingSelection]
  );

  if (!flatPhotos) return null;

  if (!flatPhotos?.length) {
    return (
      <Text style={{ padding: 5 }}>{'Mmh, this looks empty... Time to add some photos?'}</Text>
    );
  }

  return (
    <View
      style={{
        margin: -1,
      }}
    >
      <FlatList
        data={flatPhotos}
        keyExtractor={(item) => item.fileId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} />}
        renderItem={renderItem}
        numColumns={numColums}
        onEndReached={() => hasMorePhotos && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.9}
        initialNumToRender={RENDERED_PAGE_SIZE}
        maxToRenderPerBatch={RENDERED_PAGE_SIZE}
        getItemLayout={(_data, index) => ({
          length: size,
          offset: size * index,
          index,
        })}
        windowSize={2}
      />
    </View>
  );
};

export const PhotoAlbumEditDialog = ({
  albumId,
  onClose,
}: {
  albumId: string;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const navigation = useNavigation();

  const {
    fetch: { data: album },
    save: { mutateAsync: saveAlbum },
    remove: { mutateAsync: removeAlbum },
  } = useAlbum(albumId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const doRemoveAlbum = useCallback(async () => {
    try {
      if (!album) return;

      await Alert.alert(
        'Are you sure',
        `Delete your album "${album.name}"? Pictures will stay available in your library`,
        [
          {
            text: 'Confirm',
            style: 'destructive',
            onPress: async () => {
              await removeAlbum(album);
              navigation.goBack();
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (err) {
      addError(queryClient, err);
    }
  }, [album, navigation, queryClient, removeAlbum]);

  const doSaveAlbum = useCallback(async () => {
    try {
      if (!album) return;
      await saveAlbum({
        ...album,
        name: name || album.name,
        description: description || album.description,
      });
      onClose();
    } catch (err) {
      addError(queryClient, err);
    }
  }, [album, description, name, onClose, queryClient, saveAlbum]);

  return (
    <Modal onClose={onClose} title={`Edit ${album?.name}`}>
      <View style={{ marginBottom: 30, width: '100%' }}>
        <Text style={{ marginBottom: 5, fontWeight: '600' }}>Name</Text>
        <Input
          placeholder="Add a name"
          defaultValue={album?.name}
          onChangeText={(val) => setName(val)}
          onSubmitEditing={name ? doSaveAlbum : undefined}
        />
      </View>
      <View style={{ width: '100%' }}>
        <Text style={{ marginBottom: 5, fontWeight: '600' }}>Description</Text>
        <Input
          placeholder="Add a description"
          defaultValue={album?.description}
          onChangeText={(val) => setDescription(val)}
          style={{
            height: 70,
          }}
          multiline={true}
          onSubmitEditing={name ? doSaveAlbum : undefined}
        />
      </View>
      <Button title="Save" onPress={doSaveAlbum} />
      <Button title="Delete Album" onPress={doRemoveAlbum} color={Colors.red[500]} />
    </Modal>
  );
};

export default PhotoAlbum;
