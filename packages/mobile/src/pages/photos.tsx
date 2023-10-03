import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { TabStackParamList } from '../app/App';
import PhotoLibrary from '../components/PhotoLibrary/PhotoLibrary';
import PhotoSelection from '../components/PhotoSelection/PhotoSelection';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';

import usePhotoSelection from '../hooks/photoLibrary/usePhotoSelection';
type PhotosProps = NativeStackScreenProps<TabStackParamList, 'Photos'>;

const PhotosPage = (_props: PhotosProps) => {
  const {
    toggleSelection,
    selectRange,
    isSelected,
    selection,
    clearSelection,
    isSelecting,
  } = usePhotoSelection();

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
        selectRange={selectRange}
        isSelected={isSelected}
        isSelecting={isSelecting}
      />
      <PhotoSelection
        isSelecting={isSelecting}
        selection={selection}
        clearSelection={clearSelection}
      />
    </SafeAreaView>
  );
};

// import { Fab } from 'native-base';
// import { Camera } from '../components/ui/Icons/icons';
// import { Colors } from '../app/Colors';
// import { launchCamera } from 'react-native-image-picker';
// import usePhoto from '../hooks/photoLibrary/usePhoto';
// import { PhotoConfig } from '../provider/photos/PhotoTypes';

// const AddPhotoButton = () => {
//   // {"assets": [{"fileName": "75E224D4-3B9C-48E6-ADBD-3CF1D473A180.jpg", "fileSize": 2498351, "height": 4032, "type": "image/jpg", "uri": "file:///var/mobile/Containers/Data/Application/5824F99E-FCBF-4BAB-B3C9-E92205F50482/tmp/75E224D4-3B9C-48E6-ADBD-3CF1D473A180.jpg", "width": 3024}]}
//   const { mutate: upload } = usePhoto(PhotoConfig.PhotoDrive).upload;

//   return (
//     <Fab
//       renderInPortal={false}
//       shadow={2}
//       size="sm"
//       bg={Colors.indigo[500]}
//       icon={<Camera color="white" size="sm" />}
//       onPress={async () => {
//         const result = await launchCamera({
//           mediaType: 'photo',
//         });

//         if (result?.assets?.[0])
//           upload({
//             targetDrive: PhotoConfig.PhotoDrive,
//             newPhoto: {
//               ...result.assets[0],
//               height: result.assets[0].height || 0,
//               width: result.assets[0].width || 0,
//             },
//           });

//         // TODO: Handle errors to the user
//         if (result.errorCode) console.error(result.errorCode);
//       }}
//     />
//   );
// };

export default PhotosPage;