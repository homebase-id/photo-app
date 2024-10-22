import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { RootStackParamList } from '../app/App';
import { PhotoLibrary } from '../components/PhotoLibrary/PhotoLibrary';
import PhotoSelection from '../components/PhotoSelection/PhotoSelection';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';

import { usePhotoSelection, PhotoConfig } from 'photo-app-common';

type TypeProps = NativeStackScreenProps<RootStackParamList, 'Type'>;

const TypePage = ({ navigation, route }: TypeProps) => {
  const { typeId } = route.params;
  const { toggleSelection, clearingSelection, selection, clearSelection, isSelecting } =
    usePhotoSelection();

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      clearSelection();
    });

    return unsubscribe;
  }, [navigation, clearSelection]);

  return (
    <SafeAreaView>
      <PhotoLibrary
        type={typeId}
        toggleSelection={toggleSelection}
        isSelecting={isSelecting}
        clearingSelection={clearingSelection}
      />

      <PhotoSelection
        isSelecting={isSelecting}
        selection={selection}
        clearSelection={clearSelection}
        albumKey={typeId === 'favorites' ? PhotoConfig.FavoriteTag : undefined}
        type={typeId === 'favorites' ? 'photos' : typeId}
      />
    </SafeAreaView>
  );
};

export default TypePage;
