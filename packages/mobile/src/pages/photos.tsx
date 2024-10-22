import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { memo, useEffect } from 'react';
import { TabStackParamList } from '../app/App';
import { PhotoLibrary } from '../components/PhotoLibrary/PhotoLibrary';
import PhotoSelection from '../components/PhotoSelection/PhotoSelection';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { usePhotoSelection } from 'photo-app-common';

type PhotosProps = NativeStackScreenProps<TabStackParamList, 'Photos'>;

const PhotosPage = memo((_props: PhotosProps) => {
  const { toggleSelection, clearingSelection, selection, clearSelection, isSelecting } =
    usePhotoSelection();

  useEffect(() => {
    const unsubscribe = _props.navigation.addListener('blur', () => {
      clearSelection();
    });

    return unsubscribe;
  }, [_props.navigation, clearSelection]);

  return (
    <SafeAreaView>
      <PhotoLibrary
        toggleSelection={toggleSelection}
        isSelecting={isSelecting}
        clearingSelection={clearingSelection}
        type="photos"
      />
      <PhotoSelection
        isSelecting={isSelecting}
        selection={selection}
        clearSelection={clearSelection}
        type="photos"
      />
      <AddPhotoButton />
    </SafeAreaView>
  );
});

import { Camera } from '../components/ui/Icons/icons';
import { Colors } from '../app/Colors';
import { launchImageLibrary } from 'react-native-image-picker';
import { TouchableHighlight } from 'react-native';
import { useUploadPhoto } from '../hooks/photo/useUploadPhoto';
import Toast from 'react-native-toast-message';

const AddPhotoButton = () => {
  const { mutate: uploadPhoto, status } = useUploadPhoto().upload;

  useEffect(() => {
    if (status === 'success') {
      Toast.show({
        text1: 'Uploaded to Library',
        type: 'success',
        visibilityTime: 2000,
        position: 'bottom',
      });
    }
  }, [status]);

  return (
    <TouchableHighlight
      style={{
        backgroundColor: Colors.indigo[500],
        position: 'absolute',
        bottom: 20,
        right: 20,
        borderRadius: 50,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onPress={async () => {
        const result = await launchImageLibrary({
          mediaType: 'photo',
        });

        result.assets?.forEach((asset) => {
          uploadPhoto(asset);
        });
      }}
    >
      <Camera color="white" size="md" />
    </TouchableHighlight>
  );
};

export default PhotosPage;
