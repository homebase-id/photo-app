import { Alert, Button, Dimensions, FlatList, RefreshControl, View } from 'react-native';
import { Text } from '../ui/Text/Text';
import { PhotoItem } from '../Photos/PhotoDay/PhotoDay';
import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAlbum, usePhotosInfinte, useSiblingsRangeInfinte, PhotoConfig } from 'photo-app-common';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal/Modal';
import { Input } from '../ui/Form/Input';
import { Colors } from '../../app/Colors';
import { addError } from '../../hooks/errors/useErrors';

const targetDrive = PhotoConfig.PhotoDrive;

const PREFFERED_IMAGE_SIZE = 90;
const PhotoAlbum = ({
  albumKey,
  toggleSelection,
  selectRange,
  isSelected,
  isSelecting,
}: {
  albumKey?: string;
  toggleSelection: (fileId: string) => void;
  selectRange: (fileIds: string[]) => void;
  isSelected: (fileId: string) => boolean;
  isSelecting?: boolean;
}) => {
  const queryClient = useQueryClient();

  const [selectionRangeFrom, setSelectionRangeFrom] = useState<string | undefined>();
  const [selectionRangeTo, setSelectionRangeTo] = useState<string | undefined>();
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

  const { data: selection } = useSiblingsRangeInfinte({
    targetDrive: PhotoConfig.PhotoDrive,
    album: albumKey,
    fromFileId: selectionRangeFrom,
    toFileId: selectionRangeTo,
  });

  const doToggleSelection = (fileId: string) => {
    if (!isSelected(fileId)) setSelectionRangeFrom(fileId);
    toggleSelection(fileId);
  };

  useEffect(() => {
    if (selection && selectionRangeFrom && selectionRangeTo) {
      selectRange(selection);

      setSelectionRangeFrom(undefined);
      setSelectionRangeTo(undefined);
    }
  }, [
    selection,
    selectRange,
    setSelectionRangeFrom,
    setSelectionRangeTo,
    selectionRangeFrom,
    selectionRangeTo,
  ]);

  useEffect(() => {
    if (!isSelecting) {
      setSelectionRangeFrom(undefined);
      setSelectionRangeTo(undefined);
    }
  }, [isSelecting]);

  const windowSize = Dimensions.get('window');
  const numColums = Math.round(windowSize.width / PREFFERED_IMAGE_SIZE);
  const size = Math.round(windowSize.width / numColums);

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} />}
        data={flatPhotos}
        key={numColums}
        renderItem={(item) => (
          <View
            key={item.item.fileId}
            style={{
              width: size,
              padding: 1,
            }}
          >
            <PhotoItem
              type="photos"
              targetDrive={targetDrive}
              photoDsr={item.item}
              album={albumKey}
              key={item.item.fileId}
              toggleSelection={doToggleSelection}
              isSelected={isSelected}
              isSelecting={isSelecting}
              size={size - 2} // -2 for the gap
            />
          </View>
        )}
        numColumns={numColums}
        onEndReached={() => hasMorePhotos && !isFetchingNextPage && fetchNextPage()}
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
