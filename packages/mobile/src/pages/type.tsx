import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { RootStackParamList } from '../app/App';
import PhotoLibrary from '../components/PhotoLibrary/PhotoLibrary';
import PhotoSelection from '../components/PhotoSelection/PhotoSelection';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import usePhotoSelection from '../hooks/photoLibrary/usePhotoSelection';
import { PhotoConfig } from '../provider/photos/PhotoTypes';

type TypeProps = NativeStackScreenProps<RootStackParamList, 'Type'>;

const TypePage = ({ navigation, route }: TypeProps) => {
  const { typeId } = route.params;
  const {
    toggleSelection,
    selectRange,
    isSelected,
    selection,
    clearSelection,
    isSelecting,
  } = usePhotoSelection();

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
        selectRange={selectRange}
        isSelected={isSelected}
        isSelecting={isSelecting}
      />

      <PhotoSelection
        isSelecting={isSelecting}
        selection={selection}
        clearSelection={clearSelection}
        albumKey={typeId === 'favorites' ? PhotoConfig.FavoriteTag : undefined}
        type={typeId === 'favorites' ? undefined : typeId}
      />
    </SafeAreaView>
  );
};

export default TypePage;
