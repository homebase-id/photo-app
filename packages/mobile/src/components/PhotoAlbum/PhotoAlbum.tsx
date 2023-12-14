import { Dimensions, FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import { Text } from '../ui/Text/Text';
import { PhotoItem } from '../Photos/PhotoDay/PhotoDay';
import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ellipsis } from '../ui/Icons/icons';
import { useSiblingsRangeInfinte } from '../../hooks/photoLibrary/usePhotoLibraryRangeInfinte';
import { useFlatPhotosFromDate } from '../../hooks/photoLibrary/usePhotos';
import { PhotoConfig } from '../../provider/photos/PhotoTypes';
import { useAlbum } from '../../hooks/photoLibrary/useAlbum';
import { ActionSheet, ActionSheetItem } from '../ui/Modal/ActionSheet';

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
  const [selectionRangeFrom, setSelectionRangeFrom] = useState<string | undefined>();
  const [selectionRangeTo, setSelectionRangeTo] = useState<string | undefined>();
  const {
    data: photos,
    hasNextPage: hasMorePhotos,
    fetchNextPage,
    refetch: refetchPhotos,
  } = useFlatPhotosFromDate({
    album: albumKey,
    ordering: 'newer',
  }).fetchPhotos;
  const flatPhotos = photos?.pages.flatMap((page) => page.results) ?? [];

  const [refreshing, setRefreshing] = useState(false);
  const doRefresh = async () => {
    setRefreshing(true);

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

  const doRangeSelection = (fileId: string) => {
    toggleSelection(fileId);
    if (selectionRangeFrom) setSelectionRangeTo(fileId);
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

  if (!flatPhotos?.length)
    return (
      <Text style={{ padding: 5 }}>{'Mmh, this looks empty... Time to add some photos?'}</Text>
    );

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
              targetDrive={targetDrive}
              photoDsr={item.item}
              album={albumKey}
              key={item.item.fileId}
              toggleSelection={doToggleSelection}
              rangeSelection={doRangeSelection}
              isSelected={isSelected}
              isSelecting={isSelecting}
              size={size - 2} // -2 for the gap
            />
          </View>
        )}
        numColumns={numColums}
        onEndReached={() => hasMorePhotos && fetchNextPage()}
      />
    </View>
  );
};

export const PhotoAlbumContextToggle = ({ albumId }: { albumId: string }) => {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const navigation = useNavigation();

  const {
    fetch: { data: album },
    remove: { mutate: removeAlbum, status: removeAlbumStatus, error: removeAlbumError },
  } = useAlbum(albumId);

  const doRemove = () => {
    if (!album) return;

    removeAlbum(album);
    setIsInfoOpen(false);
    navigation.goBack();
  };

  return (
    <>
      <TouchableOpacity onPress={() => setIsInfoOpen(true)}>
        <Ellipsis color={'blue.400'} />
      </TouchableOpacity>
      <ActionSheet isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)}>
        <ActionSheetItem
          onPress={() => {
            doRemove();
          }}
        >
          <Text>Remove</Text>
        </ActionSheetItem>
      </ActionSheet>
    </>
  );
};

export default PhotoAlbum;
