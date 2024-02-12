import { HeaderBackButton, Header } from '@react-navigation/elements';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Text } from '../components/ui/Text/Text';
import { RootStackParamList } from '../app/App';
import PhotoAlbum, { PhotoAlbumEditDialog } from '../components/PhotoAlbum/PhotoAlbum';
import PhotoSelection from '../components/PhotoSelection/PhotoSelection';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { useAlbum, usePhotoSelection } from 'photo-app-common';
import { useDarkMode } from '../hooks/useDarkMode';
import { Colors } from '../app/Colors';
import { TouchableOpacity } from 'react-native';
import { Pencil } from '../components/ui/Icons/icons';

type AlbumProps = NativeStackScreenProps<RootStackParamList, 'Album'>;

export const AlbumTitle = ({ albumId }: { albumId: string }) => {
  const { data: album } = useAlbum(albumId).fetch;

  return <Text>{album?.name || 'An album'}</Text>;
};

const AlbumPage = ({ navigation, route }: AlbumProps) => {
  const { albumId } = route.params;
  const { data: album } = useAlbum(albumId).fetch;

  const [isEditDialog, setIsEditDialog] = useState(false);
  const { isDarkMode } = useDarkMode();

  const { toggleSelection, selectRange, isSelected, selection, clearSelection, isSelecting } =
    usePhotoSelection();

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      clearSelection();
    });

    return unsubscribe;
  }, [navigation, clearSelection]);

  const headerLeft = () => (
    <HeaderBackButton
      style={{ position: 'absolute', left: 0 }}
      canGoBack={true}
      onPress={() => navigation.goBack()}
      label={'Library'}
      labelVisible={true}
      tintColor={isDarkMode ? Colors.white : Colors.black}
    />
  );

  const headerRight = () => (
    <TouchableOpacity onPress={() => setIsEditDialog(true)} style={{ padding: 5 }}>
      <Pencil color={isDarkMode ? Colors.white : Colors.black} size={'md'} />
    </TouchableOpacity>
  );

  return (
    <>
      <Header
        headerStyle={{
          backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
        }}
        headerShadowVisible={false}
        title={album?.name || 'An album'}
        headerTitleAlign="center"
        headerTitle={album?.name || 'An album'}
        headerLeft={headerLeft}
        headerRight={headerRight}
      />
      <SafeAreaView>
        <PhotoAlbum
          toggleSelection={toggleSelection}
          selectRange={selectRange}
          albumKey={albumId}
          isSelected={isSelected}
          isSelecting={isSelecting}
        />
        <PhotoSelection
          type="photos"
          albumKey={albumId}
          isSelecting={isSelecting}
          selection={selection}
          clearSelection={clearSelection}
        />
        {isEditDialog ? (
          <PhotoAlbumEditDialog albumId={albumId} onClose={() => setIsEditDialog(false)} />
        ) : null}
      </SafeAreaView>
    </>
  );
};

export default AlbumPage;
