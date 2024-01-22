import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Text } from '../components/ui/Text/Text';
import { RootStackParamList } from '../app/App';
import PhotoAlbum from '../components/PhotoAlbum/PhotoAlbum';
import PhotoSelection from '../components/PhotoSelection/PhotoSelection';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { useAlbum, usePhotoSelection } from 'photo-app-common';

type AlbumProps = NativeStackScreenProps<RootStackParamList, 'Album'>;

export const AlbumTitle = ({ albumId }: { albumId: string }) => {
  const { data: album } = useAlbum(albumId).fetch;

  return <Text>{album?.name || 'An album'}</Text>;
};

const AlbumPage = ({ navigation, route }: AlbumProps) => {
  const { albumId } = route.params;

  const { toggleSelection, selectRange, isSelected, selection, clearSelection, isSelecting } =
    usePhotoSelection();

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      clearSelection();
    });

    return unsubscribe;
  }, [navigation, clearSelection]);

  return (
    <SafeAreaView>
      <PhotoAlbum
        toggleSelection={toggleSelection}
        selectRange={selectRange}
        // setFileSelectorOpen={setFileSelectorOpen}
        albumKey={albumId}
        isSelected={isSelected}
        isSelecting={isSelecting}
      />
      <PhotoSelection
        albumKey={albumId}
        isSelecting={isSelecting}
        selection={selection}
        clearSelection={clearSelection}
      />
    </SafeAreaView>
  );
};

export default AlbumPage;
